package com.efganados.sistemabovino.dto;

import java.time.LocalDate;

/**
 * Detalle de un animal en el comparativo por proveedor. pesoActual es el del
 * último pesaje ACTIVO (o el peso inicial si no tiene), gananciaKg es
 * pesoActual menos aniPesoInicial y gmdAcumulado es null si no se puede
 * calcular (ver {@code AnimalService.rendimientoAcumulado}). estado es
 * "Activo" o el motivo de salida (VENTA, MUERTE, OTRO). loteDescripcion es
 * null si el animal no tiene lote.
 */
public record AnimalRendimientoProveedor(Long animalId, String caravana, String razaDescripcion,
        String loteDescripcion, LocalDate aniFechaIngreso, double aniPesoInicial, double pesoActual,
        double gananciaKg, Double gmdAcumulado, String estado) {
}
