package com.efganados.sistemabovino.controller;

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
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.GrupoResumen;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.service.GrupoService;

/**
 * CRUD REST para la entidad {@link Grupo}. Las validaciones de alta/
 * edición, el resumen con sus lotes y la regla de eliminación viven en
 * {@link GrupoService}: este controlador solo delega (ver su Javadoc).
 */
@RestController
@RequestMapping("/api/grupos")
public class GrupoController {

    private final GrupoRepository grupoRepository;
    private final GrupoService grupoService;

    public GrupoController(GrupoRepository grupoRepository, GrupoService grupoService) {
        this.grupoRepository = grupoRepository;
        this.grupoService = grupoService;
    }

    /** Devuelve todos los grupos registrados, sin cambios: lo usan los formularios de alta rápida y de animal. */
    @GetMapping
    public List<Grupo> listar() {
        return grupoRepository.findAll();
    }

    /** Resumen de cada grupo para el catálogo (ver {@code GrupoService.obtenerResumen}): sus lotes y cuántos animales tiene cada uno. */
    @GetMapping("/resumen")
    public List<GrupoResumen> resumen() {
        return grupoService.obtenerResumen();
    }

    /** Busca un grupo por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Grupo> buscarPorId(@PathVariable Long id) {
        return grupoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuevo grupo. Devuelve 400 si falta la descripción; 409 si ya
     * existe un grupo con esa descripción (ver {@code GrupoService.crear}).
     */
    @PostMapping
    public ResponseEntity<Grupo> crear(@RequestBody GrupoRequest request) {
        Grupo creado = grupoService.crear(request.grpDescripcion());
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    /**
     * Actualiza un grupo existente. 404 si no existe; misma validación de
     * 400/409 que crear, salvo que la propia descripción del grupo no
     * cuenta como duplicada (ver {@code GrupoService.actualizar}).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Grupo> actualizar(@PathVariable Long id, @RequestBody GrupoRequest request) {
        Grupo actualizado = grupoService.actualizar(id, request.grpDescripcion());
        return ResponseEntity.ok(actualizado);
    }

    /**
     * Elimina un grupo por su ID. 404 si no existe; 409 si tiene lotes
     * registrados (ver {@code GrupoService.eliminar}).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        grupoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /** Datos de entrada para crear o actualizar un grupo. */
    public record GrupoRequest(String grpDescripcion) {
    }
}
