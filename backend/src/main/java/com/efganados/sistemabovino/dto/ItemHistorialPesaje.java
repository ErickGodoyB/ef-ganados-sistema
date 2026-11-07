package com.efganados.sistemabovino.dto;

import java.time.LocalDate;
import java.time.LocalDateTime;

import com.efganados.sistemabovino.model.EstadoPesaje;

/**
 * Un pesaje del historial completo de un animal (ver GET
 * /api/animales/{id}/pesajes en AnimalController). El peso anterior y la
 * GMD se calculan igual que en el detalle de sesión (ver
 * PesajeService.calcularAnterior), para que los valores siempre coincidan
 * entre las dos vistas. "motivoAnulacion", "anuladoEn" y
 * "anuladoPorNombre" solo tienen un valor real cuando "estado" es
 * ANULADO (el pesaje aparece en la lista porque se pidió
 * incluirAnulados=true); en un pesaje ACTIVO van en null.
 */
public record ItemHistorialPesaje(Long pesaId, LocalDate fecha, double peso, double pesoAnterior,
        boolean pesoAnteriorEsIngreso, LocalDate fechaPesoAnterior, Double gmd, String responsableNombre,
        String observaciones, EstadoPesaje estado, String motivoAnulacion, LocalDateTime anuladoEn,
        String anuladoPorNombre) {
}
