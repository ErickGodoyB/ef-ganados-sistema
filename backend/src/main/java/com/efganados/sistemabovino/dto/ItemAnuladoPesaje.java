package com.efganados.sistemabovino.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Un pesaje anulado, para GET /api/pesajes/anulados: sus datos (fecha,
 * animal, lote, peso) más el motivo y cuándo y quién lo anuló. Se arma en
 * {@code PesajeService.obtenerAnulados()}.
 */
public record ItemAnuladoPesaje(Long pesaId, LocalDate fecha, Long animalId, String caravana,
        String subGrupoDescripcion, double peso, String motivo, LocalDateTime anuladoEn, String anuladoPorNombre) {
}
