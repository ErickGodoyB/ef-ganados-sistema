package com.efganados.sistemabovino.dto;

import java.time.LocalDate;

/**
 * Un cambio de lote en el historial de un animal (GET
 * /api/animales/{id}/movimientos). "origen"/"destino" son la descripción
 * del lote, o "Sin lote".
 */
public record MovimientoAnimal(Long transferenciaId, LocalDate fecha, String motivo, String origen, String destino,
        String responsableNombre) {
}
