package com.efganados.sistemabovino.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.dto.ItemSesionPesaje;
import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Lógica de "sesión de pesaje" (conjunto de pesajes con la misma fecha y el
 * mismo lote de un animal; sin lote = sesión "Sin lote", ver {@link Pesajes}):
 * registrar varios pesajes de una sola vez reutilizando
 * {@code AnimalService.registrarPesaje} para cada uno (así las reglas de
 * negocio son las mismas que al registrar un pesaje individual), y las
 * operaciones sobre pesajes ya existentes (resumen y detalle de sesiones,
 * edición y borrado de un pesaje puntual) que no encajan en
 * {@code AnimalService} porque no giran alrededor de un {@link Animal} sino
 * de los pesajes en sí.
 */
@Service
public class PesajeService {

    private final AnimalService animalService;
    private final AnimalRepository animalRepository;
    private final PersonaRepository personaRepository;
    private final PesajesRepository pesajesRepository;

    public PesajeService(AnimalService animalService, AnimalRepository animalRepository,
            PersonaRepository personaRepository, PesajesRepository pesajesRepository) {
        this.animalService = animalService;
        this.animalRepository = animalRepository;
        this.personaRepository = personaRepository;
        this.pesajesRepository = pesajesRepository;
    }

    /**
     * Registra un pesaje por cada ítem de la sesión, todo o nada: si
     * cualquiera falla (regla de negocio de {@code AnimalService.registrarPesaje},
     * animal repetido o animal/responsable inexistente), la transacción se
     * revierte y no queda ningún pesaje guardado.
     */
    @Transactional
    public List<Pesajes> registrarSesion(LocalDate fecha, Long responsableId, List<ItemPesaje> items) {
        Persona responsable = personaRepository.findById(responsableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Persona responsable no encontrada con id: " + responsableId));

        Set<Long> animalesVistos = new HashSet<>();
        List<Pesajes> creados = new ArrayList<>();
        for (ItemPesaje item : items) {
            if (item.animalId() == null) {
                throw new ValidacionException("Falta el campo animalId");
            }
            Animal animal = animalRepository.findById(item.animalId())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Animal no encontrado con id: " + item.animalId()));
            if (!animalesVistos.add(animal.getAniId())) {
                throw new ValidacionException("El animal " + animal.getAniCaravana() + " está repetido en la sesión");
            }
            creados.add(animalService.registrarPesaje(animal, item.peso(), fecha, responsable));
        }
        return creados;
    }

    /** Resumen agregado de todas las sesiones de pesaje (ver {@code PesajesRepository.resumenDeSesiones}). */
    public List<SesionPesajeResumen> obtenerResumenSesiones() {
        return pesajesRepository.resumenDeSesiones();
    }

    /**
     * Detalle de una sesión (misma fecha + mismo lote; subGrupoId null =
     * sesión "Sin lote"): un ítem por animal pesado ese día en ese lote, con
     * el peso anterior y la GMD calculados contra el pesaje inmediatamente
     * previo de cada animal (sin importar en qué sesión se haya registrado
     * ese pesaje anterior), ordenado por caravana.
     */
    public List<ItemSesionPesaje> obtenerDetalleSesion(LocalDate fecha, Long subGrupoId) {
        List<Pesajes> pesajesDeLaSesion = subGrupoId == null
                ? pesajesRepository.findByPesaFechaAndAnimal_SubGrupoIsNullOrderByAnimal_AniCaravanaAscPesaIdAsc(fecha)
                : pesajesRepository.findByPesaFechaAndAnimal_SubGrupo_SbIdOrderByAnimal_AniCaravanaAscPesaIdAsc(fecha,
                        subGrupoId);

        List<ItemSesionPesaje> detalle = new ArrayList<>();
        for (Pesajes pesaje : pesajesDeLaSesion) {
            detalle.add(aItemSesionPesaje(pesaje));
        }
        return detalle;
    }

    private ItemSesionPesaje aItemSesionPesaje(Pesajes pesaje) {
        Animal animal = pesaje.getAnimal();
        List<Pesajes> anteriores = pesajesRepository.buscarAnterioresA(
                animal.getAniId(), pesaje.getPesaFecha(), pesaje.getPesaId(), PageRequest.of(0, 1));

        Double pesoAnterior = null;
        Double gmd = null;
        if (!anteriores.isEmpty()) {
            Pesajes anterior = anteriores.get(0);
            pesoAnterior = anterior.getPesaPeso();
            long dias = ChronoUnit.DAYS.between(anterior.getPesaFecha(), pesaje.getPesaFecha());
            gmd = dias == 0 ? 0.0 : (pesaje.getPesaPeso() - pesoAnterior) / dias;
        }

        Persona responsable = pesaje.getResponsable();
        return new ItemSesionPesaje(
                pesaje.getPesaId(),
                animal.getAniId(),
                animal.getAniCaravana(),
                animal.getRaza().getRzDescripcion(),
                pesaje.getPesaPeso(),
                pesoAnterior,
                gmd,
                responsable != null ? nombreCompleto(responsable) : null,
                pesaje.getPesaObservaciones());
    }

    /** Actualiza solo el peso y las observaciones de un pesaje existente (no la fecha ni el animal). */
    public Pesajes actualizarPesaje(Long id, double peso, String observaciones) {
        if (peso <= 0 || peso > 2000) {
            throw new ValidacionException("El peso debe ser mayor a 0 y hasta 2000 kg");
        }
        Pesajes pesaje = buscarPesaje(id);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaObservaciones(observaciones);
        return pesajesRepository.save(pesaje);
    }

    /** Elimina un pesaje existente. */
    public void eliminarPesaje(Long id) {
        pesajesRepository.delete(buscarPesaje(id));
    }

    private Pesajes buscarPesaje(Long id) {
        return pesajesRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Pesaje no encontrado con id: " + id));
    }

    /** Junta nombre y apellido sin romper si alguno es null (mismo criterio que AnimalController.nombreCompleto). */
    private String nombreCompleto(Persona persona) {
        String nombre = persona.getPerNombre();
        String apellido = persona.getPerApellido();
        if (nombre == null) {
            return apellido;
        }
        if (apellido == null) {
            return nombre;
        }
        return nombre + " " + apellido;
    }

    /** Un ítem de la sesión a registrar: qué animal y con qué peso. */
    public record ItemPesaje(Long animalId, double peso) {
    }
}
