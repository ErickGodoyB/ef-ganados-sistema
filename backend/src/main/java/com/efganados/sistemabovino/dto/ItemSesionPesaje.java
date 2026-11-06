package com.efganados.sistemabovino.dto;

import java.time.LocalDate;

/**
 * Un pesaje dentro del detalle de una sesión (ver {@link SesionPesajeResumen}):
 * datos del animal pesado, el peso de este pesaje y el "anterior" contra el
 * que se calcula la GMD: el pesaje ACTIVO inmediatamente previo del mismo
 * animal (por fecha, desempate por id) si tiene uno, o si no (es su primer
 * pesaje) el peso inicial y la fecha de ingreso del animal -
 * "pesoAnteriorEsIngreso"/"fechaPesoAnterior" existen para que la interfaz
 * pueda aclarar ese segundo caso en vez de mostrarlo como si fuera un pesaje
 * más. Se arma en {@code PesajeService.obtenerDetalleSesion()}.
 */
public record ItemSesionPesaje(Long pesaId, Long animalId, String caravana, String razaDescripcion, double peso,
        Double pesoAnterior, Double gmd, boolean pesoAnteriorEsIngreso, LocalDate fechaPesoAnterior,
        String responsableNombre, String observaciones) {
}
