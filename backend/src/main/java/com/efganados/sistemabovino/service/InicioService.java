package com.efganados.sistemabovino.service;

import java.time.Clock;
import java.time.DateTimeException;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.TreeMap;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.dto.AlertasInicio;
import com.efganados.sistemabovino.dto.DiaCalendario;
import com.efganados.sistemabovino.dto.InicioResumen;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Datos de la pantalla de Inicio: resumen, calendario de pesajes y alertas.
 * No reimplementa ningún cálculo de animales: el peso actual, la GMD del
 * último intervalo, la GMD acumulada y la aptitud para venta salen de
 * {@link AnimalService}, así que Inicio siempre coincide con el resto de la
 * aplicación. "Hoy" y "este mes" se miden con el {@link Clock} inyectado
 * (zona horaria de app.zona-horaria), nunca con el reloj del servidor.
 */
@Service
public class InicioService {

    /** Tipos de alerta permitidos, en un solo lugar (ver PersonaService.TIPOS_PERMITIDOS para el mismo criterio). */
    public static final List<String> TIPOS_ALERTA = List.of("APTOS", "SIN_PESAJE", "GANANCIA_BAJA");

    private static final int LIMITE_POR_DEFECTO = 10;
    private static final int LIMITE_MAXIMO = 100;
    private static final String SIN_LOTE = "Sin lote";

    private final AnimalRepository animalRepository;
    private final PesajesRepository pesajesRepository;
    private final AnimalService animalService;
    private final Clock clock;
    private final int diasSinPesaje;
    private final double gananciaMinima;

    public InicioService(AnimalRepository animalRepository, PesajesRepository pesajesRepository,
            AnimalService animalService, Clock clock,
            @Value("${app.alertas.dias-sin-pesaje:30}") int diasSinPesaje,
            @Value("${app.alertas.ganancia-minima:0.0}") double gananciaMinima) {
        this.animalRepository = animalRepository;
        this.pesajesRepository = pesajesRepository;
        this.animalService = animalService;
        this.clock = clock;
        this.diasSinPesaje = diasSinPesaje;
        this.gananciaMinima = gananciaMinima;
    }

    /** Un animal activo con todo lo que Inicio necesita de él, calculado una sola vez. */
    private record Ficha(Animal animal, Optional<Pesajes> ultimoPesaje, Double gmdUltimoIntervalo,
            AnimalService.RendimientoAcumulado rendimiento, boolean apto, LocalDate referencia) {

        double pesoActual() {
            return rendimiento.pesoActual();
        }
    }

    private List<Ficha> fichasDeActivos() {
        return animalRepository.findAll().stream()
                .filter(animal -> animal.getAniFechaEgreso() == null)
                .map(animal -> {
                    Optional<Pesajes> ultimo = animalService.ultimoPesajeActivo(animal);
                    // Sin pesajes, el ingreso es el punto de referencia para "sin pesaje reciente".
                    LocalDate referencia = ultimo.map(pesaje -> pesaje.getPesaFecha())
                            .orElse(animal.getAniFechaIngreso());
                    return new Ficha(animal, ultimo, animalService.calcularGMD(animal),
                            animalService.rendimientoAcumulado(animal), animalService.estaAptoParaVenta(animal),
                            referencia);
                })
                .toList();
    }

    private LocalDate hoy() {
        return LocalDate.now(clock);
    }

    /** Sin pesaje reciente: la referencia es anterior a hoy menos los días configurados (justo en el límite todavía no cuenta). */
    private boolean sinPesajeReciente(Ficha ficha) {
        return ficha.referencia().isBefore(hoy().minusDays(diasSinPesaje));
    }

    /** Ganancia baja: tiene GMD del último intervalo y es menor al mínimo configurado. */
    private boolean gananciaBaja(Ficha ficha) {
        return ficha.gmdUltimoIntervalo() != null && ficha.gmdUltimoIntervalo() < gananciaMinima;
    }

    private static Double promedio(List<Double> valores) {
        return valores.isEmpty() ? null : valores.stream().mapToDouble(valor -> valor).average().orElseThrow();
    }

    private static Double pesoPromedio(List<Ficha> fichas) {
        return promedio(fichas.stream().filter(ficha -> ficha.ultimoPesaje().isPresent())
                .map(ficha -> ficha.pesoActual()).toList());
    }

    private static Double gmdPromedio(List<Ficha> fichas) {
        return promedio(fichas.stream().filter(ficha -> ficha.rendimiento().gmd() != null)
                .map(ficha -> ficha.rendimiento().gmd()).toList());
    }

    // ---- resumen ----

    /** Resumen de Inicio (ver {@link InicioResumen}). */
    public InicioResumen obtenerResumen() {
        List<Ficha> fichas = fichasDeActivos();
        YearMonth mes = YearMonth.from(hoy());
        List<Pesajes> pesajesDelMes = pesajesRepository.findByPesaEstadoAndPesaFechaBetween(EstadoPesaje.ACTIVO,
                mes.atDay(1), mes.atEndOfMonth());

        Set<Long> animalesPesados = new HashSet<>();
        Set<List<Object>> sesiones = new HashSet<>();
        for (Pesajes pesaje : pesajesDelMes) {
            animalesPesados.add(pesaje.getAnimal().getAniId());
            sesiones.add(claveDeSesion(pesaje));
        }

        return new InicioResumen(
                fichas.size(),
                animalesPesados.size(),
                sesiones.size(),
                fichas.stream().filter(ficha -> ficha.apto()).count(),
                fichas.stream().filter(ficha -> sinPesajeReciente(ficha)).count(),
                fichas.stream().filter(ficha -> gananciaBaja(ficha)).count(),
                resumenPorLote(fichas),
                resumenPorGrupo(fichas),
                new InicioResumen.Parametros(diasSinPesaje, gananciaMinima));
    }

    /** Una sesión es la combinación de fecha y lote (id null = sin lote); la lista tiene equals/hashCode por valor. */
    private static List<Object> claveDeSesion(Pesajes pesaje) {
        SubGrupo lote = pesaje.getAnimal().getSubGrupo();
        List<Object> clave = new ArrayList<>(2);
        clave.add(pesaje.getPesaFecha());
        clave.add(lote != null ? lote.getSbId() : null);
        return clave;
    }

    private List<InicioResumen.Lote> resumenPorLote(List<Ficha> fichas) {
        Map<Long, List<Ficha>> porLote = new LinkedHashMap<>();
        for (Ficha ficha : fichas) {
            SubGrupo lote = ficha.animal().getSubGrupo();
            porLote.computeIfAbsent(lote != null ? lote.getSbId() : null, id -> new ArrayList<>()).add(ficha);
        }

        List<InicioResumen.Lote> lotes = new ArrayList<>();
        porLote.forEach((loteId, delLote) -> {
            SubGrupo lote = delLote.get(0).animal().getSubGrupo();
            Grupo grupo = lote != null ? lote.getGrupo() : null;
            lotes.add(new InicioResumen.Lote(loteId, lote != null ? lote.getSbDescripcion() : SIN_LOTE,
                    grupo != null ? grupo.getGrpDescripcion() : null, delLote.size(), pesoPromedio(delLote),
                    gmdPromedio(delLote)));
        });
        lotes.sort(Comparator
                .comparing((InicioResumen.Lote lote) -> lote.gmdPromedio(),
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(lote -> lote.loteDescripcion(), String.CASE_INSENSITIVE_ORDER));
        return lotes;
    }

    private List<InicioResumen.Grupo> resumenPorGrupo(List<Ficha> fichas) {
        Map<Long, List<Ficha>> porGrupo = new LinkedHashMap<>();
        for (Ficha ficha : fichas) {
            Grupo grupo = grupoDe(ficha);
            porGrupo.computeIfAbsent(grupo != null ? grupo.getGrpId() : null, id -> new ArrayList<>()).add(ficha);
        }

        List<InicioResumen.Grupo> grupos = new ArrayList<>();
        porGrupo.forEach((grupoId, delGrupo) -> {
            Grupo grupo = grupoDe(delGrupo.get(0));
            long lotes = delGrupo.stream().map(ficha -> ficha.animal().getSubGrupo()).filter(lote -> lote != null)
                    .map(lote -> lote.getSbId()).distinct().count();
            grupos.add(new InicioResumen.Grupo(grupoId, grupo != null ? grupo.getGrpDescripcion() : SIN_LOTE, lotes,
                    delGrupo.size(), pesoPromedio(delGrupo), gmdPromedio(delGrupo)));
        });
        grupos.sort(Comparator
                .comparing((InicioResumen.Grupo grupo) -> grupo.gmdPromedio(),
                        Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(grupo -> grupo.grupoDescripcion(), String.CASE_INSENSITIVE_ORDER));
        return grupos;
    }

    private static Grupo grupoDe(Ficha ficha) {
        SubGrupo lote = ficha.animal().getSubGrupo();
        return lote != null ? lote.getGrupo() : null;
    }

    // ---- calendario ----

    /**
     * Convierte un parámetro de texto a entero, o null si no es un número. Los
     * parámetros llegan como texto a propósito: un valor no numérico se
     * responde con el 400 en español de las validaciones de abajo, en vez del
     * error genérico que daría la conversión automática de Spring.
     */
    private static Integer aEntero(String texto) {
        try {
            return Integer.valueOf(texto.trim());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    /**
     * Días del mes con pesajes ACTIVOS (solo esos), por fecha ascendente. 400 si
     * falta el año o el mes, si el mes no está entre 1 y 12 o si el año no es válido.
     */
    public List<DiaCalendario> obtenerCalendario(String anioTexto, String mesTexto) {
        if (anioTexto == null || anioTexto.isBlank()) {
            throw new ValidacionException("Falta el campo anio");
        }
        if (mesTexto == null || mesTexto.isBlank()) {
            throw new ValidacionException("Falta el campo mes");
        }
        Integer mes = aEntero(mesTexto);
        if (mes == null || mes < 1 || mes > 12) {
            throw new ValidacionException("El mes debe estar entre 1 y 12");
        }
        Integer anio = aEntero(anioTexto);
        YearMonth anioMes;
        try {
            if (anio == null) {
                throw new DateTimeException("año no numérico");
            }
            anioMes = YearMonth.of(anio, mes);
        } catch (DateTimeException e) {
            throw new ValidacionException("El año no es válido");
        }

        Map<LocalDate, List<Pesajes>> porDia = new TreeMap<>();
        for (Pesajes pesaje : pesajesRepository.findByPesaEstadoAndPesaFechaBetween(EstadoPesaje.ACTIVO,
                anioMes.atDay(1), anioMes.atEndOfMonth())) {
            porDia.computeIfAbsent(pesaje.getPesaFecha(), fecha -> new ArrayList<>()).add(pesaje);
        }

        List<DiaCalendario> dias = new ArrayList<>();
        porDia.forEach((fecha, pesajes) -> dias.add(new DiaCalendario(fecha,
                pesajes.stream().map(pesaje -> claveDeSesion(pesaje)).distinct().count(),
                pesajes.stream().map(pesaje -> pesaje.getAnimal().getAniId()).distinct().count())));
        return dias;
    }

    // ---- alertas ----

    /**
     * Animales activos que cumplen la alerta pedida (APTOS, SIN_PESAJE o
     * GANANCIA_BAJA), con el total y los primeros "limite" (por defecto 10, entre
     * 1 y 100). Orden: APTOS por peso actual de mayor a menor, SIN_PESAJE por días
     * sin pesaje de mayor a menor y GANANCIA_BAJA por GMD de menor a mayor. 400 si
     * el tipo falta o no es válido, o si el límite está fuera de rango.
     */
    public AlertasInicio obtenerAlertas(String tipo, String limiteTexto) {
        if (tipo == null || tipo.isBlank()) {
            throw new ValidacionException("Falta el campo tipo");
        }
        String tipoValidado = tipo.trim();
        if (!TIPOS_ALERTA.contains(tipoValidado)) {
            throw new ValidacionException("El tipo debe ser APTOS, SIN_PESAJE o GANANCIA_BAJA");
        }
        int limiteEfectivo = LIMITE_POR_DEFECTO;
        if (limiteTexto != null && !limiteTexto.isBlank()) {
            Integer limite = aEntero(limiteTexto);
            if (limite == null || limite < 1 || limite > LIMITE_MAXIMO) {
                throw new ValidacionException("El límite debe estar entre 1 y " + LIMITE_MAXIMO);
            }
            limiteEfectivo = limite;
        }

        List<Ficha> coincidentes = fichasDeActivos().stream()
                .filter(ficha -> switch (tipoValidado) {
                    case "APTOS" -> ficha.apto();
                    case "SIN_PESAJE" -> sinPesajeReciente(ficha);
                    default -> gananciaBaja(ficha);
                })
                .toList();

        List<AlertasInicio.Animal> items = coincidentes.stream().map(ficha -> aItem(ficha))
                .sorted(comparadorDe(tipoValidado)).limit(limiteEfectivo).toList();
        return new AlertasInicio(tipoValidado, coincidentes.size(), items);
    }

    private AlertasInicio.Animal aItem(Ficha ficha) {
        Animal animal = ficha.animal();
        SubGrupo lote = animal.getSubGrupo();
        return new AlertasInicio.Animal(animal.getAniId(), animal.getAniCaravana(),
                animal.getRaza().getRzDescripcion(), lote != null ? lote.getSbDescripcion() : null,
                ficha.pesoActual(), ficha.gmdUltimoIntervalo(),
                ficha.ultimoPesaje().map(pesaje -> pesaje.getPesaFecha()).orElse(null),
                ChronoUnit.DAYS.between(ficha.referencia(), hoy()));
    }

    /** Orden propio de cada tipo; a igual valor, por caravana, para que el resultado sea estable. */
    private static Comparator<AlertasInicio.Animal> comparadorDe(String tipo) {
        Comparator<AlertasInicio.Animal> principal = switch (tipo) {
            case "APTOS" -> Comparator.comparingDouble((AlertasInicio.Animal item) -> item.pesoActual()).reversed();
            case "SIN_PESAJE" -> Comparator.comparingLong((AlertasInicio.Animal item) -> item.diasSinPesaje())
                    .reversed();
            default -> Comparator.comparingDouble((AlertasInicio.Animal item) -> item.gmd());
        };
        return principal.thenComparing(item -> item.caravana());
    }
}
