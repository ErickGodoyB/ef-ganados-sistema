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

import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * CRUD REST para la entidad {@link SubGrupo}.
 */
@RestController
@RequestMapping("/api/subgrupos")
public class SubGrupoController {

    private final SubGrupoRepository subGrupoRepository;

    public SubGrupoController(SubGrupoRepository subGrupoRepository) {
        this.subGrupoRepository = subGrupoRepository;
    }

    /** Devuelve todos los subgrupos registrados. */
    @GetMapping
    public List<SubGrupo> listar() {
        return subGrupoRepository.findAll();
    }

    /** Busca un subgrupo por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<SubGrupo> buscarPorId(@PathVariable Long id) {
        return subGrupoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea un nuevo subgrupo. */
    @PostMapping
    public ResponseEntity<SubGrupo> crear(@RequestBody SubGrupo subGrupo) {
        SubGrupo guardado = subGrupoRepository.save(subGrupo);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de un subgrupo existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<SubGrupo> actualizar(@PathVariable Long id, @RequestBody SubGrupo datos) {
        return subGrupoRepository.findById(id)
                .map(existente -> {
                    existente.setGrupo(datos.getGrupo());
                    existente.setSbDescripcion(datos.getSbDescripcion());
                    return ResponseEntity.ok(subGrupoRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina un subgrupo por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!subGrupoRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        subGrupoRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
