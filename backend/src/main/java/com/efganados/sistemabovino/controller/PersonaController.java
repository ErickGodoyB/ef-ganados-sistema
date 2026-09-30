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

import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.repository.PersonaRepository;

/**
 * CRUD REST para la entidad {@link Persona}.
 */
@RestController
@RequestMapping("/api/personas")
public class PersonaController {

    private final PersonaRepository personaRepository;

    public PersonaController(PersonaRepository personaRepository) {
        this.personaRepository = personaRepository;
    }

    /** Devuelve todas las personas registradas. */
    @GetMapping
    public List<Persona> listar() {
        return personaRepository.findAll();
    }

    /** Busca una persona por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Persona> buscarPorId(@PathVariable Long id) {
        return personaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea una nueva persona. */
    @PostMapping
    public ResponseEntity<Persona> crear(@RequestBody Persona persona) {
        Persona guardado = personaRepository.save(persona);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de una persona existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<Persona> actualizar(@PathVariable Long id, @RequestBody Persona datos) {
        return personaRepository.findById(id)
                .map(existente -> {
                    existente.setPerNombre(datos.getPerNombre());
                    existente.setPerApellido(datos.getPerApellido());
                    existente.setPerRuc(datos.getPerRuc());
                    existente.setPerCi(datos.getPerCi());
                    existente.setPerTipo(datos.getPerTipo());
                    existente.setPerTelefono(datos.getPerTelefono());
                    existente.setPerCorreo(datos.getPerCorreo());
                    existente.setPerDireccion(datos.getPerDireccion());
                    return ResponseEntity.ok(personaRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina una persona por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!personaRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        personaRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
