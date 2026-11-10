package com.efganados.sistemabovino.dto;

/**
 * Resumen de un lote (SubGrupo) dentro del resumen de su grupo (ver
 * {@link GrupoResumen}): cuántos animales tiene en total y cuántos de
 * ellos están activos (sin salida registrada).
 */
public record LoteResumen(Long sbId, String sbDescripcion, long cantidadAnimales, long cantidadActivos) {
}
