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

import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.repository.GrupoRepository;

/**
 * CRUD REST para la entidad {@link Grupo}.
 */
@RestController
@RequestMapping("/api/grupos")
public class GrupoController {

    private final GrupoRepository grupoRepository;

    public GrupoController(GrupoRepository grupoRepository) {
        this.grupoRepository = grupoRepository;
    }

    /** Devuelve todos los grupos (lotes) registrados. */
    @GetMapping
    public List<Grupo> listar() {
        return grupoRepository.findAll();
    }

    /** Busca un grupo por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Grupo> buscarPorId(@PathVariable Long id) {
        return grupoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea un nuevo grupo. */
    @PostMapping
    public ResponseEntity<Grupo> crear(@RequestBody Grupo grupo) {
        Grupo guardado = grupoRepository.save(grupo);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de un grupo existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<Grupo> actualizar(@PathVariable Long id, @RequestBody Grupo datos) {
        return grupoRepository.findById(id)
                .map(existente -> {
                    existente.setGrpDescripcion(datos.getGrpDescripcion());
                    return ResponseEntity.ok(grupoRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina un grupo por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!grupoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        grupoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
