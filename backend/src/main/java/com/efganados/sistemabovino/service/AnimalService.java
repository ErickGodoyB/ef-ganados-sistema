package com.efganados.sistemabovino.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Lógica de negocio del animal. El peso actual, la GMD y la aptitud para venta
 * no se guardan en {@link Animal}: se derivan siempre de los registros de
 * {@link Pesajes}, evitando datos duplicados o desincronizados.
 */
@Service
public class AnimalService {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Motivos de salida permitidos, en un solo lugar (ver PersonaService.TIPOS_PERMITIDOS para el mismo criterio). */
    private static final List<String> MOTIVOS_SALIDA_PERMITIDOS = List.of("VENTA", "MUERTE", "OTRO");

    private static final int LARGO_MAXIMO_NOTA_SALIDA = 255;

    private final AnimalRepository animalRepository;
    private final PesajesRepository pesajesRepository;
    private final PersonaRepository personaRepository;
    private final Clock clock;

    public AnimalService(AnimalRepository animalRepository, PesajesRepository pesajesRepository,
            PersonaRepository personaRepository, Clock clock) {
        this.animalRepository = animalRepository;
        this.pesajesRepository = pesajesRepository;
        this.personaRepository = personaRepository;
        this.clock = clock;
    }

    /** El momento actual (fecha y hora), en la zona horaria del {@link Clock} inyectado; ver Animal.aniFechaRegistro. */
    public LocalDateTime momentoActual() {
        return LocalDateTime.now(clock);
    }

    /**
     * El pesaje ACTIVO más reciente del animal, si tiene alguno. Es la base
     * de {@link #pesoActual}; quien necesite tanto el peso actual como su
     * fecha (ver AnimalController.aResumen y AnimalResumen.fechaUltimoPesaje)
     * debería llamar a este método una sola vez en vez de pesoActual(), que
     * dispara esta misma consulta por su cuenta, para no repetirla.
     */
    public Optional<Pesajes> ultimoPesajeActivo(Animal animal) {
        return pesajesRepository.findTop2ByAnimal_AniIdAndPesaEstadoOrderByPesaFechaDesc(
                animal.getAniId(), EstadoPesaje.ACTIVO).stream().findFirst();
    }

    /**
     * Devuelve el peso del pesaje más reciente del animal. Si todavía no tiene
     * ningún pesaje, usa el peso inicial como mejor dato disponible.
     */
    public double pesoActual(Animal animal) {
        return ultimoPesajeActivo(animal).map(pesaje -> pesaje.getPesaPeso()).orElse(animal.getAniPesoInicial());
    }

    /**
     * Calcula la Ganancia Media Diaria del pesaje ACTIVO más reciente del
     * animal contra su "anterior": el segundo pesaje ACTIVO más reciente si
     * existe, o si no (el animal solo tiene un pesaje) el peso inicial y la
     * fecha de ingreso, que pasan a servir de punto de partida (ver
     * {@link #calcularGmdEntre}). Devuelve null si el animal no tiene ningún
     * pesaje ACTIVO.
     */
    public Double calcularGMD(Animal animal) {
        List<Pesajes> pesajes = pesajesRepository.findTop2ByAnimal_AniIdAndPesaEstadoOrderByPesaFechaDesc(
                animal.getAniId(), EstadoPesaje.ACTIVO);
        if (pesajes.isEmpty()) {
            return null;
        }
        Pesajes masReciente = pesajes.get(0);
        if (pesajes.size() >= 2) {
            Pesajes anterior = pesajes.get(1);
            return calcularGmdEntre(masReciente.getPesaPeso(), masReciente.getPesaFecha(),
                    anterior.getPesaPeso(), anterior.getPesaFecha(), false);
        }
        return calcularGmdEntre(masReciente.getPesaPeso(), masReciente.getPesaFecha(),
                animal.getAniPesoInicial(), animal.getAniFechaIngreso(), true);
    }

    /**
     * GMD entre un peso/fecha y su "anterior" (ver {@link #calcularGMD} y
     * {@code PesajeService.aItemSesionPesaje}, los dos lugares que la usan:
     * el resumen del animal solo mira el pesaje más reciente contra el
     * segundo más reciente o el ingreso; el detalle de una sesión la
     * calcula así para CUALQUIER pesaje ACTIVO, no solo el más reciente).
     * Si el anterior es un pesaje real, 0 días de diferencia (mismo día) da
     * 0.0, como siempre. Si el anterior es el ingreso, 0 días significa que
     * el pesaje es del mismo día que el ingreso: no pasó tiempo todavía
     * contra el único dato que hay, así que no hay nada que calcular (null),
     * a diferencia de dos pesajes reales el mismo día (que sí son dos
     * medidas distintas, aunque su diferencia en el tiempo sea cero).
     */
    public static Double calcularGmdEntre(double peso, LocalDate fecha, double pesoAnterior, LocalDate fechaAnterior,
            boolean anteriorEsIngreso) {
        long dias = ChronoUnit.DAYS.between(fechaAnterior, fecha);
        if (dias == 0) {
            return anteriorEsIngreso ? null : 0.0;
        }
        return (peso - pesoAnterior) / dias;
    }

    /**
     * Indica si el peso actual alcanzó el peso objetivo de venta definido en la
     * raza del animal (umbral por raza, usado para las alertas de venta).
     */
    public boolean estaAptoParaVenta(Animal animal) {
        return pesoActual(animal) >= animal.getRaza().getRzPesoObjetivoVenta();
    }

    /**
     * Registra un nuevo pesaje para el animal, luego de validar las reglas
     * de negocio del pesaje (ver {@link #validarPesaje}). Cada pesaje es un
     * registro nuevo (nunca se sobrescribe uno anterior) y no modifica ni
     * guarda nada en {@link Animal}, porque el peso actual se deriva de los
     * pesajes. Centralizado acá (y no en cada controlador) para que tanto el
     * alta individual como el registro de una sesión completa de pesajes
     * (varios animales, misma fecha) respeten exactamente las mismas reglas.
     */
    public Pesajes registrarPesaje(Animal animal, double peso, LocalDate fecha, Persona responsable) {
        validarPesaje(animal, peso, fecha);
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaFecha(fecha);
        pesaje.setResponsable(responsable);
        return pesajesRepository.save(pesaje);
    }

    /**
     * Reglas de negocio de todo pesaje nuevo: peso dentro de rango, fecha
     * presente y no futura, no anterior al ingreso del animal, que el
     * animal no tenga ya registrada su salida (en cuyo caso no se le pueden
     * seguir cargando pesajes), y que no tenga ya un pesaje ACTIVO ese mismo
     * día (uno anulado no cuenta: esa fecha vuelve a estar libre).
     */
    private void validarPesaje(Animal animal, double peso, LocalDate fecha) {
        if (peso <= 0 || peso > 2000) {
            throw new ValidacionException("El peso debe ser mayor a 0 y hasta 2000 kg");
        }
        if (fecha == null) {
            throw new ValidacionException("Falta el campo fecha");
        }
        if (fecha.isAfter(LocalDate.now())) {
            throw new ValidacionException("La fecha del pesaje no puede ser futura");
        }
        if (fecha.isBefore(animal.getAniFechaIngreso())) {
            throw new ValidacionException("La fecha del pesaje no puede ser anterior al ingreso del animal ("
                    + animal.getAniCaravana() + ": " + animal.getAniFechaIngreso() + ")");
        }
        if (animal.getAniFechaEgreso() != null) {
            throw new ConflictoException("El animal " + animal.getAniCaravana() + " ya tiene registrada su salida");
        }
        if (pesajesRepository.findFirstByAnimal_AniIdAndPesaFechaAndPesaEstado(animal.getAniId(), fecha, EstadoPesaje.ACTIVO)
                .isPresent()) {
            throw new ConflictoException("El animal " + animal.getAniCaravana() + " ya tiene un pesaje activo el "
                    + fecha.format(FORMATO_FECHA) + ". Editá ese pesaje o anulalo.");
        }
    }

    /**
     * Valida que la fecha de ingreso de un animal no quede después de su
     * propio pesaje ACTIVO más antiguo (si lo tiene): mover el ingreso para
     * adelante dejaría un pesaje "de antes de que el animal existiera". Un
     * pesaje ANULADO no cuenta (esa fecha vuelve a estar libre, mismo
     * criterio que {@link #validarPesaje}). "animalId" es null al crear un
     * animal nuevo (todavía no puede tener pesajes), en cuyo caso la regla
     * no aplica.
     */
    public void validarFechaIngreso(Long animalId, LocalDate nuevaFechaIngreso) {
        if (animalId == null) {
            return;
        }
        pesajesRepository.findFirstByAnimal_AniIdAndPesaEstadoOrderByPesaFechaAsc(animalId, EstadoPesaje.ACTIVO)
                .ifPresent(primerPesaje -> {
                    if (nuevaFechaIngreso.isAfter(primerPesaje.getPesaFecha())) {
                        throw new ValidacionException("La fecha de ingreso no puede ser posterior al primer pesaje del animal ("
                                + primerPesaje.getPesaFecha().format(FORMATO_FECHA) + ")");
                    }
                });
    }

    /**
     * Registra la salida del animal (venta, muerte u otro motivo). 409 si
     * el animal ya tenía una salida registrada (para cambiarla hay que
     * reactivarlo primero, ver {@link #reactivar}); 400 si la fecha o el
     * motivo faltan o no son válidos, o si viene un comprador con un
     * motivo distinto de VENTA; 404 si el comprador indicado no existe.
     */
    public Animal registrarSalida(Long animalId, LocalDate fecha, String motivo, String nota, Long compradorId) {
        Animal animal = buscarPorId(animalId);
        if (animal.getAniFechaEgreso() != null) {
            throw new ConflictoException("El animal " + animal.getAniCaravana() + " ya tiene una salida registrada");
        }

        validarFechaSalida(animal, fecha);
        String motivoValidado = validarMotivoSalida(motivo);
        String notaValidada = validarNotaSalida(motivoValidado, nota);
        Persona comprador = validarComprador(motivoValidado, compradorId);

        animal.setAniFechaEgreso(fecha);
        animal.setAniMotivoSalida(motivoValidado);
        animal.setAniNotaSalida(notaValidada);
        animal.setComprador(comprador);
        return animalRepository.save(animal);
    }

    /**
     * Fecha de salida obligatoria, no futura, no anterior al ingreso del
     * animal, y no anterior a la fecha de su último pesaje ACTIVO (no tiene
     * sentido que el animal haya "salido" antes de la última vez que se lo
     * pesó, mientras seguía en el campo).
     */
    private void validarFechaSalida(Animal animal, LocalDate fecha) {
        if (fecha == null) {
            throw new ValidacionException("Falta el campo fecha");
        }
        if (fecha.isAfter(LocalDate.now(clock))) {
            throw new ValidacionException("La fecha de salida no puede ser futura");
        }
        if (fecha.isBefore(animal.getAniFechaIngreso())) {
            throw new ValidacionException("La fecha de salida no puede ser anterior al ingreso del animal ("
                    + animal.getAniCaravana() + ": " + animal.getAniFechaIngreso() + ")");
        }
        Optional<Pesajes> ultimoPesaje = ultimoPesajeActivo(animal);
        if (ultimoPesaje.isPresent() && fecha.isBefore(ultimoPesaje.get().getPesaFecha())) {
            throw new ValidacionException("La fecha de salida no puede ser anterior al último pesaje del animal ("
                    + animal.getAniCaravana() + ": " + ultimoPesaje.get().getPesaFecha().format(FORMATO_FECHA) + ")");
        }
    }

    /** Valida que el motivo no falte y sea uno de los permitidos (ver MOTIVOS_SALIDA_PERMITIDOS), y lo devuelve recortado. */
    private String validarMotivoSalida(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new ValidacionException("Falta el campo motivo");
        }
        String motivoRecortado = motivo.trim();
        if (!MOTIVOS_SALIDA_PERMITIDOS.contains(motivoRecortado)) {
            throw new ValidacionException("El motivo debe ser " + String.join(", ", MOTIVOS_SALIDA_PERMITIDOS));
        }
        return motivoRecortado;
    }

    /**
     * La nota es obligatoria si el motivo es OTRO (no hay otra forma de
     * saber qué pasó); opcional en los demás casos. Cuando viene vacía o de
     * solo espacios se guarda como null, igual que el resto de los campos
     * de texto opcionales del sistema (ver PersonaService.aNuloSiVacio).
     */
    private String validarNotaSalida(String motivoValidado, String nota) {
        String notaRecortada = nota == null || nota.isBlank() ? null : nota.trim();
        if ("OTRO".equals(motivoValidado) && notaRecortada == null) {
            throw new ValidacionException("Falta el campo nota");
        }
        if (notaRecortada != null && notaRecortada.length() > LARGO_MAXIMO_NOTA_SALIDA) {
            throw new ValidacionException("La nota no puede tener más de " + LARGO_MAXIMO_NOTA_SALIDA + " caracteres");
        }
        return notaRecortada;
    }

    /** El comprador solo tiene sentido si el motivo es VENTA; si viene, la persona debe existir. */
    private Persona validarComprador(String motivoValidado, Long compradorId) {
        if (compradorId == null) {
            return null;
        }
        if (!"VENTA".equals(motivoValidado)) {
            throw new ValidacionException("El comprador solo se puede indicar cuando el motivo es VENTA");
        }
        return personaRepository.findById(compradorId)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada con id: " + compradorId));
    }

    /**
     * Reactiva un animal con salida registrada: borra la fecha de salida,
     * el motivo, la nota y el comprador, dejándolo otra vez productivo. 409
     * si el animal no tenía una salida registrada; 409 si quedó algún
     * pesaje ACTIVO posterior a esa fecha de salida (ej. por un cambio de
     * fecha de sesión posterior, ver {@code PesajeService.cambiarFechaSesion}):
     * reactivarlo en ese estado dejaría un pesaje "después de la salida",
     * así que hay que resolver ese pesaje primero.
     */
    public Animal reactivar(Long animalId) {
        Animal animal = buscarPorId(animalId);
        LocalDate fechaSalida = animal.getAniFechaEgreso();
        if (fechaSalida == null) {
            throw new ConflictoException("El animal " + animal.getAniCaravana() + " no tiene una salida registrada");
        }
        if (pesajesRepository.existsByAnimal_AniIdAndPesaEstadoAndPesaFechaAfter(animalId, EstadoPesaje.ACTIVO, fechaSalida)) {
            throw new ConflictoException("No se puede reactivar el animal " + animal.getAniCaravana()
                    + ": tiene un pesaje activo posterior a su salida");
        }

        animal.setAniFechaEgreso(null);
        animal.setAniMotivoSalida(null);
        animal.setAniNotaSalida(null);
        animal.setComprador(null);
        return animalRepository.save(animal);
    }

    /**
     * Busca un animal por su ID. Lanza una excepción si no existe, para que
     * el controlador pueda responder con un error claro (ej. 404).
     */
    public Animal buscarPorId(Long id) {
        return animalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Animal no encontrado con id: " + id));
    }

}
