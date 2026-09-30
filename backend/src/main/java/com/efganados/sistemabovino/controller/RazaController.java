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

import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.repository.RazaRepository;

/**
 * CRUD REST para la entidad {@link Raza}.
 */
@RestController
@RequestMapping("/api/razas")
public class RazaController {

    private final RazaRepository razaRepository;

    public RazaController(RazaRepository razaRepository) {
        this.razaRepository = razaRepository;
    }

    /** Devuelve todas las razas registradas. */
    @GetMapping
    public List<Raza> listar() {
        return razaRepository.findAll();
    }

    /** Busca una raza por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Raza> buscarPorId(@PathVariable Long id) {
        return razaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea una nueva raza. */
    @PostMapping
    public ResponseEntity<Raza> crear(@RequestBody Raza raza) {
        Raza guardado = razaRepository.save(raza);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de una raza existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<Raza> actualizar(@PathVariable Long id, @RequestBody Raza datos) {
        return razaRepository.findById(id)
                .map(existente -> {
                    existente.setRzDescripcion(datos.getRzDescripcion());
                    existente.setRzPesoObjetivoVenta(datos.getRzPesoObjetivoVenta());
                    return ResponseEntity.ok(razaRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina una raza por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!razaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        razaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
