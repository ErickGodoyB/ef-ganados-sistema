package com.efganados.sistemabovino.dto;

/**
 * Resumen de una raza para el catálogo (ver RazaService.obtenerResumen):
 * sus datos propios más cuántos animales tiene. "cantidadAnimales" cuenta
 * TODOS los animales de la raza, incluso con salida registrada (a
 * diferencia de otros conteos del sistema, acá importa si la raza está en
 * uso en algún historial, no si ese animal sigue productivo).
 */
public record RazaResumen(Long rzId, String rzDescripcion, double rzPesoObjetivoVenta, long cantidadAnimales) {
}
