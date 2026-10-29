package com.efganados.sistemabovino.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.ItemSesionPesaje;
import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.service.PesajeService;
import com.efganados.sistemabovino.service.PesajeService.ItemPesaje;

/**
 * Endpoints de la entidad {@link Pesajes}: lectura simple, registro de una
 * sesión completa de pesajes (varios animales, misma fecha; ver
 * {@link PesajeService}), resumen y detalle de sesiones ya registradas, y
 * edición/borrado de un pesaje puntual. El alta de un pesaje individual
 * sigue en {@link AnimalController} (siempre está asociado a un animal
 * concreto), que también delega en {@code AnimalService.registrarPesaje}.
 */
@RestController
@RequestMapping("/api/pesajes")
public class PesajesController {

    private final PesajesRepository pesajesRepository;
    private final PesajeService pesajeService;

    public PesajesController(PesajesRepository pesajesRepository, PesajeService pesajeService) {
        this.pesajesRepository = pesajesRepository;
        this.pesajeService = pesajeService;
    }

    /** Devuelve todos los pesajes registrados. */
    @GetMapping
    public List<Pesajes> listar() {
        return pesajesRepository.findAll();
    }

    /** Busca un pesaje por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Pesajes> buscarPorId(@PathVariable Long id) {
        return pesajesRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Registra una sesión de pesajes (misma fecha, un responsable, varios
     * animales) todo o nada: si cualquier ítem falla, no se guarda ninguno.
     * 400 si no trae ítems, si falta responsableId, o si algún ítem
     * incumple una regla de negocio del pesaje (peso, fecha, animal ya con
     * salida) o repite un animal ya presente en la misma sesión; 404 si
     * algún animal o el responsable no existen.
     */
    @PostMapping("/sesion")
    public ResponseEntity<?> registrarSesion(@RequestBody SesionPesajeRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            return ResponseEntity.badRequest().body("La sesión debe tener al menos un pesaje");
        }
        if (request.responsableId() == null) {
            return ResponseEntity.badRequest().body("Falta el campo responsableId");
        }

        List<ItemPesaje> items = request.items().stream()
                .map(item -> new ItemPesaje(item.animalId(), item.peso()))
                .toList();
        List<Pesajes> creados = pesajeService.registrarSesion(request.fecha(), request.responsableId(), items);

        List<PesajeCreado> respuesta = creados.stream()
                .map(p -> new PesajeCreado(p.getPesaId(), p.getAnimal().getAniId(), p.getPesaPeso(), p.getPesaFecha()))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    /** Resumen agregado de cada sesión de pesaje (una fila por fecha + lote), ordenado por fecha descendente. */
    @GetMapping("/sesiones")
    public List<SesionPesajeResumen> sesiones() {
        return pesajeService.obtenerResumenSesiones();
    }

    /** Detalle de una sesión puntual (fecha + lote); subGrupoId ausente = sesión "Sin lote". */
    @GetMapping("/sesiones/detalle")
    public List<ItemSesionPesaje> detalleSesion(@RequestParam LocalDate fecha,
            @RequestParam(required = false) Long subGrupoId) {
        return pesajeService.obtenerDetalleSesion(fecha, subGrupoId);
    }

    /**
     * Actualiza solo el peso y las observaciones de un pesaje existente (no
     * la fecha ni el animal); permitido aunque el animal ya tenga salida,
     * porque es una corrección y no un pesaje nuevo. 400 si el peso no está
     * en rango; 404 si el pesaje no existe.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Pesajes> actualizar(@PathVariable Long id, @RequestBody ActualizarPesajeRequest request) {
        return ResponseEntity.ok(pesajeService.actualizarPesaje(id, request.peso(), request.observaciones()));
    }

    /** Elimina un pesaje. 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        pesajeService.eliminarPesaje(id);
        return ResponseEntity.noContent().build();
    }

    /** Un ítem del cuerpo de una sesión: qué animal y con qué peso. */
    public record ItemSesionPesajeRequest(Long animalId, double peso) {
    }

    /** Datos de entrada para registrar una sesión de pesajes. */
    public record SesionPesajeRequest(LocalDate fecha, Long responsableId, List<ItemSesionPesajeRequest> items) {
    }

    /** Un pesaje recién creado por una sesión. */
    public record PesajeCreado(Long pesaId, Long animalId, double peso, LocalDate fecha) {
    }

    /** Datos de entrada para actualizar un pesaje existente. */
    public record ActualizarPesajeRequest(double peso, String observaciones) {
    }
}
