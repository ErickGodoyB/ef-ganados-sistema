package com.efganados.sistemabovino.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;

/**
 * Resultado de devolver una transferencia: el resumen de la nueva
 * transferencia (motivo DEVOLUCION, mismo nivel del JSON) más cuántos
 * animales se devolvieron a su lote de origen y cuántos se omitieron por
 * ya no estar en el lote de destino o tener una salida registrada.
 */
public record DevolucionResumen(@JsonUnwrapped TransferenciaResumen transferencia, int cantidadDevuelta,
        int cantidadOmitida) {
}
