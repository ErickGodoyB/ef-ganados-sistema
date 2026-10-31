package com.efganados.sistemabovino.service;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Lógica de negocio del animal. El peso actual, la GMD y la aptitud para venta
 * no se guardan en {@link Animal}: se derivan siempre de los registros de
 * {@link Pesajes}, evitando datos duplicados o desincronizados.
 */
@Service
public class AnimalService {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final AnimalRepository animalRepository;
    private final PesajesRepository pesajesRepository;

    public AnimalService(AnimalRepository animalRepository, PesajesRepository pesajesRepository) {
        this.animalRepository = animalRepository;
        this.pesajesRepository = pesajesRepository;
    }

    /**
     * Devuelve el peso del pesaje más reciente del animal. Si todavía no tiene
     * ningún pesaje, usa el peso inicial como mejor dato disponible.
     */
    public double pesoActual(Animal animal) {
        List<Pesajes> pesajes = pesajesRepository.findTop2ByAnimal_AniIdAndPesaEstadoOrderByPesaFechaDesc(
                animal.getAniId(), EstadoPesaje.ACTIVO);
        if (!pesajes.isEmpty()) {
            return pesajes.get(0).getPesaPeso();
        }
        return animal.getAniPesoInicial();
    }

    /**
     * Calcula la Ganancia Media Diaria entre los dos pesajes más recientes,
     * sin importar el intervalo entre ellos. Devuelve null si hay menos de dos
     * pesajes. El peso inicial del animal no participa del cálculo porque es
     * solo informativo; la GMD se basa únicamente en pesajes registrados.
     */
    public Double calcularGMD(Animal animal) {
        List<Pesajes> pesajes = pesajesRepository.findTop2ByAnimal_AniIdAndPesaEstadoOrderByPesaFechaDesc(
                animal.getAniId(), EstadoPesaje.ACTIVO);
        if (pesajes.size() < 2) {
            return null;
        }
        Pesajes masReciente = pesajes.get(0);
        Pesajes anterior = pesajes.get(1);
        long dias = ChronoUnit.DAYS.between(anterior.getPesaFecha(), masReciente.getPesaFecha());
        if (dias == 0) {
            return 0.0;
        }
        return (masReciente.getPesaPeso() - anterior.getPesaPeso()) / dias;
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
     * Busca un animal por su ID. Lanza una excepción si no existe, para que
     * el controlador pueda responder con un error claro (ej. 404).
     */
    public Animal buscarPorId(Long id) {
        return animalRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Animal no encontrado con id: " + id));
    }

}
