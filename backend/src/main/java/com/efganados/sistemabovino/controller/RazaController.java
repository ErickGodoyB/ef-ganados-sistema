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

import com.efganados.sistemabovino.dto.RazaResumen;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.service.RazaService;

/**
 * CRUD REST para la entidad {@link Raza}. Las validaciones de alta/edición,
 * el conteo de animales y la regla de eliminación viven en
 * {@link RazaService}: este controlador solo delega (ver su Javadoc).
 */
@RestController
@RequestMapping("/api/razas")
public class RazaController {

    private final RazaRepository razaRepository;
    private final RazaService razaService;

    public RazaController(RazaRepository razaRepository, RazaService razaService) {
        this.razaRepository = razaRepository;
        this.razaService = razaService;
    }

    /** Devuelve todas las razas registradas (sin cambios: la usan los formularios de alta rápida y de animal). */
    @GetMapping
    public List<Raza> listar() {
        return razaRepository.findAll();
    }

    /** Resumen de cada raza para el catálogo (ver {@code RazaService.obtenerResumen}): incluye cuántos animales tiene cada una. */
    @GetMapping("/resumen")
    public List<RazaResumen> resumen() {
        return razaService.obtenerResumen();
    }

    /** Busca una raza por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Raza> buscarPorId(@PathVariable Long id) {
        return razaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea una nueva raza. Devuelve 400 si falta la descripción o el peso
     * objetivo de venta, o si el peso está fuera de rango; 409 si ya existe
     * una raza con esa descripción (ver {@code RazaService.crear}).
     */
    @PostMapping
    public ResponseEntity<Raza> crear(@RequestBody RazaRequest request) {
        Raza creada = razaService.crear(request.rzDescripcion(), request.rzPesoObjetivoVenta());
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    /**
     * Actualiza una raza existente. 404 si no existe; mismas validaciones de
     * 400/409 que crear, salvo que la propia descripción de la raza no
     * cuenta como duplicada (ver {@code RazaService.actualizar}).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Raza> actualizar(@PathVariable Long id, @RequestBody RazaRequest request) {
        Raza actualizada = razaService.actualizar(id, request.rzDescripcion(), request.rzPesoObjetivoVenta());
        return ResponseEntity.ok(actualizada);
    }

    /**
     * Elimina una raza por su ID. 404 si no existe; 409 si tiene animales
     * registrados (ver {@code RazaService.eliminar}).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        razaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /** Datos de entrada para crear o actualizar una raza. */
    public record RazaRequest(String rzDescripcion, Double rzPesoObjetivoVenta) {
    }
}
