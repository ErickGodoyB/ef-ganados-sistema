package com.efganados.sistemabovino.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.dto.ItemAnuladoPesaje;
import com.efganados.sistemabovino.dto.ItemSesionPesaje;
import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Lógica de "sesión de pesaje" (conjunto de pesajes ACTIVOS con la misma
 * fecha y el mismo lote de un animal; sin lote = sesión "Sin lote", ver
 * {@link Pesajes}): registrar varios pesajes de una sola vez reutilizando
 * {@code AnimalService.registrarPesaje} para cada uno (así las reglas de
 * negocio son las mismas que al registrar un pesaje individual), y las
 * operaciones sobre pesajes ya existentes (resumen y detalle de sesiones,
 * edición y anulación de un pesaje puntual o de una sesión completa, cambio
 * de fecha de una sesión, listado de anulados) que no encajan en
 * {@code AnimalService} porque no giran alrededor de un {@link Animal} sino
 * de los pesajes en sí.
 */
@Service
public class PesajeService {

    private static final DateTimeFormatter FORMATO_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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

    /** Resumen agregado de todas las sesiones de pesaje ACTIVAS (ver {@code PesajesRepository.resumenDeSesiones}). */
    public List<SesionPesajeResumen> obtenerResumenSesiones() {
        return pesajesRepository.resumenDeSesiones(EstadoPesaje.ACTIVO);
    }

    /**
     * Detalle de una sesión (misma fecha + mismo lote; subGrupoId null =
     * sesión "Sin lote"), solo pesajes ACTIVOS: un ítem por animal pesado
     * ese día en ese lote, con el peso anterior y la GMD calculados contra
     * el pesaje ACTIVO inmediatamente previo de cada animal (sin importar
     * en qué sesión se haya registrado ese pesaje anterior), o -si el
     * animal no tiene uno- contra su peso inicial y fecha de ingreso (ver
     * AnimalService.calcularGmdEntre), ordenado por caravana.
     */
    public List<ItemSesionPesaje> obtenerDetalleSesion(LocalDate fecha, Long subGrupoId) {
        List<Pesajes> pesajesDeLaSesion = obtenerPesajesActivosDeSesion(fecha, subGrupoId);

        List<ItemSesionPesaje> detalle = new ArrayList<>();
        for (Pesajes pesaje : pesajesDeLaSesion) {
            detalle.add(aItemSesionPesaje(pesaje));
        }
        return detalle;
    }

    /** Pesajes ACTIVOS de una sesión (fecha + lote; subGrupoId null = "Sin lote"), ordenados por caravana. */
    private List<Pesajes> obtenerPesajesActivosDeSesion(LocalDate fecha, Long subGrupoId) {
        return subGrupoId == null
                ? pesajesRepository.findByPesaFechaAndAnimal_SubGrupoIsNullAndPesaEstadoOrderByAnimal_AniCaravanaAscPesaIdAsc(
                        fecha, EstadoPesaje.ACTIVO)
                : pesajesRepository.findByPesaFechaAndAnimal_SubGrupo_SbIdAndPesaEstadoOrderByAnimal_AniCaravanaAscPesaIdAsc(
                        fecha, subGrupoId, EstadoPesaje.ACTIVO);
    }

    private ItemSesionPesaje aItemSesionPesaje(Pesajes pesaje) {
        Animal animal = pesaje.getAnimal();
        List<Pesajes> anteriores = pesajesRepository.buscarAnterioresA(
                animal.getAniId(), pesaje.getPesaFecha(), pesaje.getPesaId(), EstadoPesaje.ACTIVO, PageRequest.of(0, 1));

        double pesoAnterior;
        LocalDate fechaPesoAnterior;
        boolean pesoAnteriorEsIngreso;
        if (!anteriores.isEmpty()) {
            Pesajes anterior = anteriores.get(0);
            pesoAnterior = anterior.getPesaPeso();
            fechaPesoAnterior = anterior.getPesaFecha();
            pesoAnteriorEsIngreso = false;
        } else {
            pesoAnterior = animal.getAniPesoInicial();
            fechaPesoAnterior = animal.getAniFechaIngreso();
            pesoAnteriorEsIngreso = true;
        }
        Double gmd = AnimalService.calcularGmdEntre(
                pesaje.getPesaPeso(), pesaje.getPesaFecha(), pesoAnterior, fechaPesoAnterior, pesoAnteriorEsIngreso);

        Persona responsable = pesaje.getResponsable();
        return new ItemSesionPesaje(
                pesaje.getPesaId(),
                animal.getAniId(),
                animal.getAniCaravana(),
                animal.getRaza().getRzDescripcion(),
                pesaje.getPesaPeso(),
                pesoAnterior,
                gmd,
                pesoAnteriorEsIngreso,
                fechaPesoAnterior,
                responsable != null ? nombreCompleto(responsable) : null,
                pesaje.getPesaObservaciones());
    }

    /** Actualiza solo el peso y las observaciones de un pesaje ACTIVO (no la fecha ni el animal). 409 si está anulado. */
    public Pesajes actualizarPesaje(Long id, double peso, String observaciones) {
        if (peso <= 0 || peso > 2000) {
            throw new ValidacionException("El peso debe ser mayor a 0 y hasta 2000 kg");
        }
        Pesajes pesaje = buscarPesaje(id);
        if (pesaje.getPesaEstado() == EstadoPesaje.ANULADO) {
            throw new ConflictoException("No se puede editar un pesaje anulado");
        }
        pesaje.setPesaPeso(peso);
        pesaje.setPesaObservaciones(observaciones);
        return pesajesRepository.save(pesaje);
    }

    /** Anula un pesaje ACTIVO (no lo borra). 409 si ya estaba anulado. */
    public Pesajes anularPesaje(Long id, String motivo, Persona anuladoPor) {
        validarMotivo(motivo);
        Pesajes pesaje = buscarPesaje(id);
        if (pesaje.getPesaEstado() == EstadoPesaje.ANULADO) {
            throw new ConflictoException("El pesaje ya está anulado");
        }
        aplicarAnulacion(pesaje, motivo, anuladoPor, LocalDateTime.now());
        return pesajesRepository.save(pesaje);
    }

    /** Anula todos los pesajes ACTIVOS de una sesión (fecha + lote), todo o nada. 404 si no hay ninguno. Devuelve cuántos. */
    @Transactional
    public long anularSesion(LocalDate fecha, Long subGrupoId, String motivo, Persona anuladoPor) {
        validarMotivo(motivo);
        List<Pesajes> activos = obtenerPesajesActivosDeSesion(fecha, subGrupoId);
        if (activos.isEmpty()) {
            throw new IllegalArgumentException("No se encontró una sesión con pesajes activos en esa fecha y lote");
        }
        LocalDateTime ahora = LocalDateTime.now();
        for (Pesajes pesaje : activos) {
            aplicarAnulacion(pesaje, motivo, anuladoPor, ahora);
        }
        pesajesRepository.saveAll(activos);
        return activos.size();
    }

    private void aplicarAnulacion(Pesajes pesaje, String motivo, Persona anuladoPor, LocalDateTime momento) {
        pesaje.setPesaEstado(EstadoPesaje.ANULADO);
        pesaje.setPesaAnuladoEn(momento);
        pesaje.setPesaMotivoAnulacion(motivo.trim());
        pesaje.setAnuladoPor(anuladoPor);
    }

    private void validarMotivo(String motivo) {
        if (motivo == null || motivo.trim().length() < 3 || motivo.trim().length() > 255) {
            throw new ValidacionException("Falta el campo motivo (debe tener entre 3 y 255 caracteres)");
        }
    }

    /**
     * Mueve todos los pesajes ACTIVOS de una sesión a una fecha nueva, todo
     * o nada. Si en la fecha nueva ya hay una sesión del mismo lote, se
     * fusionan (es el comportamiento esperado: "sesión" es solo una
     * agrupación por fecha+lote en el momento de consultar, no una entidad
     * propia). Devuelve cuántos pesajes se movieron.
     */
    @Transactional
    public long cambiarFechaSesion(LocalDate fecha, Long subGrupoId, LocalDate nuevaFecha) {
        if (nuevaFecha == null) {
            throw new ValidacionException("Falta el campo nuevaFecha");
        }
        if (nuevaFecha.isAfter(LocalDate.now())) {
            throw new ValidacionException("La nueva fecha no puede ser futura");
        }
        if (nuevaFecha.equals(fecha)) {
            throw new ValidacionException("La nueva fecha debe ser distinta de la actual");
        }

        List<Pesajes> activos = obtenerPesajesActivosDeSesion(fecha, subGrupoId);
        if (activos.isEmpty()) {
            throw new IllegalArgumentException("No se encontró una sesión con pesajes activos en esa fecha y lote");
        }

        // Primero se valida todo (que ningún animal tenga una fecha anterior a su ingreso
        // ni un pesaje activo en la fecha nueva) y recién después se mueve; así, si algo
        // falla, ningún pesaje queda movido a medias.
        for (Pesajes pesaje : activos) {
            Animal animal = pesaje.getAnimal();
            if (nuevaFecha.isBefore(animal.getAniFechaIngreso())) {
                throw new ValidacionException("La nueva fecha no puede ser anterior al ingreso del animal ("
                        + animal.getAniCaravana() + ": " + animal.getAniFechaIngreso() + ")");
            }
        }
        for (Pesajes pesaje : activos) {
            Animal animal = pesaje.getAnimal();
            if (pesajesRepository.findFirstByAnimal_AniIdAndPesaFechaAndPesaEstado(
                    animal.getAniId(), nuevaFecha, EstadoPesaje.ACTIVO).isPresent()) {
                throw new ConflictoException("El animal " + animal.getAniCaravana() + " ya tiene un pesaje activo el "
                        + nuevaFecha.format(FORMATO_FECHA) + ". Editá ese pesaje o anulalo.");
            }
        }

        for (Pesajes pesaje : activos) {
            pesaje.setPesaFecha(nuevaFecha);
        }
        pesajesRepository.saveAll(activos);
        return activos.size();
    }

    /** Pesajes anulados, opcionalmente acotados por fecha de pesaje (desde/hasta), más recientes primero. */
    public List<ItemAnuladoPesaje> obtenerAnulados(LocalDate desde, LocalDate hasta) {
        return pesajesRepository.buscarAnulados(desde, hasta).stream()
                .map(this::aItemAnuladoPesaje)
                .toList();
    }

    private ItemAnuladoPesaje aItemAnuladoPesaje(Pesajes pesaje) {
        Animal animal = pesaje.getAnimal();
        SubGrupo subGrupo = animal.getSubGrupo();
        Persona anulador = pesaje.getAnuladoPor();
        return new ItemAnuladoPesaje(
                pesaje.getPesaId(),
                pesaje.getPesaFecha(),
                animal.getAniId(),
                animal.getAniCaravana(),
                subGrupo != null ? subGrupo.getSbDescripcion() : null,
                pesaje.getPesaPeso(),
                pesaje.getPesaMotivoAnulacion(),
                pesaje.getPesaAnuladoEn(),
                anulador != null ? nombreCompleto(anulador) : null);
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
