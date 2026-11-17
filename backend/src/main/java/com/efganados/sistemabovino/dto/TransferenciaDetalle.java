package com.efganados.sistemabovino.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * Detalle de una transferencia: los mismos campos del resumen (en el
 * mismo nivel del JSON, no anidados) más la lista de sus animales.
 */
public record TransferenciaDetalle(@JsonUnwrapped TransferenciaResumen resumen,
        List<ItemTransferenciaAnimal> animales) {
}
