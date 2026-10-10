package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Endpoints de solo lectura para la entidad {@link Pesajes}. La creación de
 * pesajes no ocurre aquí: se hace exclusivamente a través de
 * {@link AnimalController}, ya que un pesaje siempre está asociado a un
 * animal y a la lógica de {@code AnimalService}.
 */
@RestController
@RequestMapping("/api/pesajes")
public class PesajesController {

    private final PesajesRepository pesajesRepository;

    public PesajesController(PesajesRepository pesajesRepository) {
        this.pesajesRepository = pesajesRepository;
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
}
