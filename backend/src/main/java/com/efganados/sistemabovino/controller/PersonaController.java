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

import com.efganados.sistemabovino.dto.PersonaResumen;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.service.PersonaService;

/**
 * CRUD REST para la entidad {@link Persona}. Las validaciones de alta/
 * edición, el resumen con sus conteos y la regla de eliminación viven en
 * {@link PersonaService}: este controlador solo delega (ver su Javadoc).
 * listar()/buscarPorId() no cambian: los usan los formularios (dueño,
 * responsable) y no necesitan los conteos del resumen.
 */
@RestController
@RequestMapping("/api/personas")
public class PersonaController {

    private final PersonaRepository personaRepository;
    private final PersonaService personaService;

    public PersonaController(PersonaRepository personaRepository, PersonaService personaService) {
        this.personaRepository = personaRepository;
        this.personaService = personaService;
    }

    /** Devuelve todas las personas registradas, sin cambios: lo usan los formularios y el selector de responsable. */
    @GetMapping
    public List<Persona> listar() {
        return personaRepository.findAll();
    }

    /** Resumen de cada persona para el catálogo (ver {@code PersonaService.obtenerResumen}): sus conteos de uso, ordenado por apellido y nombre. */
    @GetMapping("/resumen")
    public List<PersonaResumen> resumen() {
        return personaService.obtenerResumen();
    }

    /** Busca una persona por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Persona> buscarPorId(@PathVariable Long id) {
        return personaRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea una nueva persona. Devuelve 400 si falta el nombre o el tipo (o
     * el tipo no es válido, o el correo tiene un formato inválido); 409 si
     * ya existe una persona con esa CI o ese RUC (ver
     * {@code PersonaService.crear}).
     */
    @PostMapping
    public ResponseEntity<Persona> crear(@RequestBody Persona datos) {
        Persona creada = personaService.crear(datos);
        return ResponseEntity.status(HttpStatus.CREATED).body(creada);
    }

    /**
     * Actualiza una persona existente. 404 si no existe; mismas
     * validaciones de 400/409 que crear, salvo que la propia CI/RUC de la
     * persona no cuentan como duplicados (ver {@code PersonaService.actualizar}).
     */
    @PutMapping("/{id}")
    public ResponseEntity<Persona> actualizar(@PathVariable Long id, @RequestBody Persona datos) {
        Persona actualizada = personaService.actualizar(id, datos);
        return ResponseEntity.ok(actualizada);
    }

    /**
     * Elimina una persona por su ID. 404 si no existe; 409 si está en uso
     * (ver {@code PersonaService.eliminar}).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        personaService.eliminar(id);
        return ResponseEntity.noContent().build();
    }
}
