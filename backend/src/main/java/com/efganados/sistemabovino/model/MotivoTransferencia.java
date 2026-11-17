package com.efganados.sistemabovino.model;

/**
 * Motivo de una {@link Transferencia} de animales entre lotes. SELECCION,
 * SANITARIO y OTRO los elige quien registra la transferencia; DEVOLUCION
 * solo la genera el sistema al devolver una transferencia anterior (ver
 * {@code TransferenciaService.devolver}), por eso el alta común la rechaza.
 * Vive en un enum (y no en una lista de String como los motivos de salida)
 * para que no haya forma de guardar un valor fuera del conjunto.
 */
public enum MotivoTransferencia {
    SELECCION,
    SANITARIO,
    OTRO,
    DEVOLUCION
}
