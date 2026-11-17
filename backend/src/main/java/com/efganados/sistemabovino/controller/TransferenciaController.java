package com.efganados.sistemabovino.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.DevolucionResumen;
import com.efganados.sistemabovino.dto.TransferenciaDetalle;
import com.efganados.sistemabovino.dto.TransferenciaResumen;
import com.efganados.sistemabovino.service.TransferenciaService;

/**
 * Endpoints REST de las transferencias de animales entre lotes. Solo
 * delega en {@link TransferenciaService}, donde viven las reglas; los
 * errores (400/404/409) los traduce {@code GlobalExceptionHandler}.
 */
@RestController
@RequestMapping("/api/transferencias")
public class TransferenciaController {

    private final TransferenciaService transferenciaService;

    public TransferenciaController(TransferenciaService transferenciaService) {
        this.transferenciaService = transferenciaService;
    }

    /**
     * Registra una transferencia (todo o nada) y pasa los animales al lote
     * de destino. Devuelve 201 con su resumen; ver
     * {@code TransferenciaService.registrar} para los errores posibles.
     */
    @PostMapping
    public ResponseEntity<TransferenciaResumen> registrar(@RequestBody TransferenciaRequest request) {
        TransferenciaResumen resumen = transferenciaService.registrar(request.fecha(), request.motivo(),
                request.nota(), request.destinoId(), request.responsableId(), request.animalIds());
        return ResponseEntity.status(HttpStatus.CREATED).body(resumen);
    }

    /** Lista las transferencias, la más reciente primero, opcionalmente acotadas por fecha (desde/hasta, inclusivas). */
    @GetMapping
    public List<TransferenciaResumen> listar(@RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta) {
        return transferenciaService.listar(desde, hasta);
    }

    /** Resumen de una transferencia más la lista de sus animales; 404 si no existe. */
    @GetMapping("/{id}")
    public TransferenciaDetalle detalle(@PathVariable Long id) {
        return transferenciaService.obtenerDetalle(id);
    }

    /**
     * Devuelve una transferencia: lleva de vuelta a su lote de origen a los
     * animales que siguen en el destino. Devuelve 201 (se crea una
     * transferencia nueva) con su resumen y las cantidades devuelta y omitida.
     */
    @PostMapping("/{id}/devolver")
    public ResponseEntity<DevolucionResumen> devolver(@PathVariable Long id, @RequestBody DevolucionRequest request) {
        DevolucionResumen resumen = transferenciaService.devolver(id, request.fecha(), request.nota(),
                request.responsableId());
        return ResponseEntity.status(HttpStatus.CREATED).body(resumen);
    }

    /**
     * Datos de entrada de una transferencia. "motivo" llega como texto (no
     * como enum) para que uno inválido se responda con el 400 en español de
     * siempre en vez del error genérico de deserialización.
     */
    public record TransferenciaRequest(LocalDate fecha, String motivo, String nota, Long destinoId,
            Long responsableId, List<Long> animalIds) {
    }

    /** Datos de entrada para devolver una transferencia. */
    public record DevolucionRequest(LocalDate fecha, String nota, Long responsableId) {
    }
}
