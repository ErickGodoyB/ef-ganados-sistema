package com.efganados.sistemabovino.dto;

import java.util.List;

/**
 * Resumen de un grupo para el catálogo: sus datos propios, cuántos lotes
 * tiene y, sumados entre todos sus lotes, cuántos animales (en total y
 * activos). La lista de lotes va ordenada por descripción (ver
 * {@code GrupoService.obtenerResumen}).
 */
public record GrupoResumen(Long grpId, String grpDescripcion, long cantidadLotes, long cantidadAnimales,
        long cantidadActivos, List<LoteResumen> lotes) {
}
