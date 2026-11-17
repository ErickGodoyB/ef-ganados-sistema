package com.efganados.sistemabovino.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Resumen de una transferencia de animales entre lotes (ver
 * {@code TransferenciaService}). "origenes" y "destinos" son las
 * descripciones de los lotes involucrados, sin repetir y ordenadas
 * alfabéticamente; un animal sin lote figura como "Sin lote". Una
 * transferencia común tiene un solo destino, pero una DEVOLUCION puede
 * tener varios (cada animal vuelve a su propio origen). "devuelveA" es el
 * id de la transferencia original si esta es una DEVOLUCION (null si no);
 * "devuelta" es true si ya existe una devolución de esta transferencia.
 */
public record TransferenciaResumen(Long traId, LocalDate fecha, String motivo, String nota,
        String responsableNombre, LocalDateTime registradaEn, long cantidadAnimales, List<String> origenes,
        List<String> destinos, Long devuelveA, boolean devuelta) {
}
