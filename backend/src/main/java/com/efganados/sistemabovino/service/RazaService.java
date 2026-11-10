package com.efganados.sistemabovino.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.dto.RazaResumen;
import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.RazaRepository;

/**
 * Lógica de negocio del catálogo de razas: validaciones de alta/edición y
 * el conteo de animales (para el resumen y para bloquear la eliminación de
 * una raza en uso). Centralizada acá para que {@code RazaController} solo
 * delegue, igual que {@code AnimalService}/{@code PesajeService} con sus
 * propios módulos.
 */
@Service
public class RazaService {

    private static final double PESO_OBJETIVO_MAXIMO = 2000;

    private final RazaRepository razaRepository;
    private final AnimalRepository animalRepository;

    public RazaService(RazaRepository razaRepository, AnimalRepository animalRepository) {
        this.razaRepository = razaRepository;
        this.animalRepository = animalRepository;
    }

    /**
     * Resumen de cada raza para el catálogo: sus datos propios más cuántos
     * animales tiene (ver {@code AnimalRepository.countByRaza_RzId}).
     */
    public List<RazaResumen> obtenerResumen() {
        return razaRepository.findAll().stream()
                .map(raza -> new RazaResumen(raza.getRzId(), raza.getRzDescripcion(), raza.getRzPesoObjetivoVenta(),
                        animalRepository.countByRaza_RzId(raza.getRzId())))
                .toList();
    }

    /**
     * Crea una raza nueva. Las validaciones corren en este orden: campos
     * obligatorios primero (400), y recién después la unicidad de la
     * descripción (409) -mismo criterio que AnimalController.crear con la
     * caravana-, para no devolver un conflicto cuando en realidad falta un
     * campo.
     */
    public Raza crear(String descripcion, Double pesoObjetivoVenta) {
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        validarPeso(pesoObjetivoVenta);
        validarDescripcionUnica(descripcionRecortada, null);

        Raza raza = new Raza();
        raza.setRzDescripcion(descripcionRecortada);
        raza.setRzPesoObjetivoVenta(pesoObjetivoVenta);
        return razaRepository.save(raza);
    }

    /**
     * Actualiza una raza existente (404 si no existe, ver {@link #buscarPorId}).
     * La propia descripción de la raza no cuenta como duplicada.
     */
    public Raza actualizar(Long id, String descripcion, Double pesoObjetivoVenta) {
        Raza raza = buscarPorId(id);
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        validarPeso(pesoObjetivoVenta);
        validarDescripcionUnica(descripcionRecortada, id);

        raza.setRzDescripcion(descripcionRecortada);
        raza.setRzPesoObjetivoVenta(pesoObjetivoVenta);
        return razaRepository.save(raza);
    }

    /**
     * Elimina una raza. 404 si no existe; 409 si tiene algún animal
     * registrado, sin importar si tiene salida (la raza sigue en uso en su
     * historial, ver {@code AnimalRepository.countByRaza_RzId}).
     */
    public void eliminar(Long id) {
        Raza raza = buscarPorId(id);
        long cantidadAnimales = animalRepository.countByRaza_RzId(id);
        if (cantidadAnimales > 0) {
            throw new ConflictoException("No se puede eliminar la raza: tiene " + cantidadAnimales + " animales");
        }
        razaRepository.delete(raza);
    }

    /** Valida que la descripción no falte, y la devuelve recortada. */
    private String validarDescripcionPresente(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new ValidacionException("Falta el campo rzDescripcion");
        }
        return descripcion.trim();
    }

    /**
     * Valida que no exista ya otra raza con esa descripción (sin distinguir
     * mayúsculas). "idPropio" es el id de la raza que se está editando (que
     * puede conservar su propia descripción), o null al crear una nueva.
     */
    private void validarDescripcionUnica(String descripcionRecortada, Long idPropio) {
        boolean yaExiste = idPropio == null
                ? razaRepository.existsByRzDescripcionIgnoreCase(descripcionRecortada)
                : razaRepository.existsByRzDescripcionIgnoreCaseAndRzIdNot(descripcionRecortada, idPropio);
        if (yaExiste) {
            throw new ConflictoException("Ya existe una raza con la descripción " + descripcionRecortada);
        }
    }

    /** Valida que el peso objetivo de venta no falte y esté en rango (mayor a 0 y hasta 2000 kg). */
    private void validarPeso(Double pesoObjetivoVenta) {
        if (pesoObjetivoVenta == null) {
            throw new ValidacionException("Falta el campo rzPesoObjetivoVenta");
        }
        if (pesoObjetivoVenta <= 0 || pesoObjetivoVenta > PESO_OBJETIVO_MAXIMO) {
            throw new ValidacionException("El peso objetivo de venta debe ser mayor a 0 y hasta 2000 kg");
        }
    }

    /**
     * Busca una raza por su ID. Lanza una excepción si no existe, para que
     * el controlador pueda responder con un error claro (404, vía
     * {@code GlobalExceptionHandler}).
     */
    public Raza buscarPorId(Long id) {
        return razaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Raza no encontrada con id: " + id));
    }
}
