package com.efganados.sistemabovino.dto;

/**
 * Un pesaje dentro del detalle de una sesión (ver {@link SesionPesajeResumen}):
 * datos del animal pesado, el peso de este pesaje y el del pesaje
 * inmediatamente anterior del mismo animal (por fecha, desempate por id;
 * null si no hay uno previo), para poder mostrar la GMD entre ambos. Se
 * arma en {@code PesajeService.obtenerDetalleSesion()}.
 */
public record ItemSesionPesaje(Long pesaId, Long animalId, String caravana, String razaDescripcion, double peso,
        Double pesoAnterior, Double gmd, String responsableNombre, String observaciones) {
}
