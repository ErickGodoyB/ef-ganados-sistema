package com.efganados.sistemabovino.model;

/**
 * Estado de un {@link Pesajes}: ACTIVO cuenta para todo cálculo o listado
 * (peso actual, GMD, cantidad de pesajes, sesiones, etc.); ANULADO queda
 * conservado como historial (los pesajes nunca se borran) pero se excluye
 * de todos esos cálculos, como si no existiera para ese propósito.
 */
public enum EstadoPesaje {
    ACTIVO,
    ANULADO,
}
