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
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.service.AnimalService;

/**
 * CRUD REST para la entidad {@link Animal}, más los endpoints derivados
 * (GMD, aptitud para venta y registro de pesajes) que delegan en
 * {@link AnimalService}.
 */
@RestController
@RequestMapping("/api/animales")
public class AnimalController {

    private final AnimalRepository animalRepository;
    private final AnimalService animalService;
    private final PersonaRepository personaRepository;

    public AnimalController(AnimalRepository animalRepository, AnimalService animalService,
            PersonaRepository personaRepository) {
        this.animalRepository = animalRepository;
        this.animalService = animalService;
        this.personaRepository = personaRepository;
    }

    /** Devuelve todos los animales registrados. */
    @GetMapping
    public List<Animal> listar() {
        return animalRepository.findAll();
    }

    /** Busca un animal por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Animal> buscarPorId(@PathVariable Long id) {
        return animalRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea un nuevo animal. */
    @PostMapping
    public ResponseEntity<Animal> crear(@RequestBody Animal animal) {
        Animal guardado = animalRepository.save(animal);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de un animal existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<Animal> actualizar(@PathVariable Long id, @RequestBody Animal datos) {
        return animalRepository.findById(id)
                .map(existente -> {
                    existente.setDuenio(datos.getDuenio());
                    existente.setRaza(datos.getRaza());
                    existente.setSubGrupo(datos.getSubGrupo());
                    existente.setAniCaravana(datos.getAniCaravana());
                    existente.setAniFechaIngreso(datos.getAniFechaIngreso());
                    existente.setAniPesoInicial(datos.getAniPesoInicial());
                    existente.setAniFechaEgreso(datos.getAniFechaEgreso());
                    existente.setAniObservacion(datos.getAniObservacion());
                    return ResponseEntity.ok(animalRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina un animal por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!animalRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        animalRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Calcula la Ganancia Media Diaria del animal (null si no hay suficientes pesajes). */
    @GetMapping("/{id}/gmd")
    public ResponseEntity<Double> gmd(@PathVariable Long id) {
        Animal animal = animalService.buscarPorId(id);
        return ResponseEntity.ok(animalService.calcularGMD(animal));
    }

    /** Indica si el animal alcanzó el peso objetivo de venta de su raza. */
    @GetMapping("/{id}/apto-venta")
    public ResponseEntity<Boolean> aptoVenta(@PathVariable Long id) {
        Animal animal = animalService.buscarPorId(id);
        return ResponseEntity.ok(animalService.estaAptoParaVenta(animal));
    }

    /** Registra un nuevo pesaje para el animal. */
    @PostMapping("/{id}/pesajes")
    public ResponseEntity<Pesajes> registrarPesaje(@PathVariable Long id, @RequestBody NuevoPesajeRequest request) {
        Animal animal = animalService.buscarPorId(id);
        Persona responsable = personaRepository.findById(request.responsableId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Persona responsable no encontrada con id: " + request.responsableId()));
        Pesajes pesajeCreado = animalService.registrarPesaje(animal, request.peso(), request.fecha(), responsable);
        return ResponseEntity.status(HttpStatus.CREATED).body(pesajeCreado);
    }

    /** Datos de entrada para registrar un pesaje de un animal. */
    public record NuevoPesajeRequest(double peso, LocalDate fecha, Long responsableId) {
    }
}
