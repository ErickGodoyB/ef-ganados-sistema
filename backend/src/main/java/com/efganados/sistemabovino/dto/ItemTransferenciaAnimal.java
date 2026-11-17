package com.efganados.sistemabovino.dto;

/**
 * Un animal dentro del detalle de una transferencia. "origen"/"destino" son
 * la descripción del lote ("Sin lote" si no había o no queda lote), y sus
 * ids van aparte (null en ese mismo caso). "enDestino" es true si hoy el
 * animal sigue en el lote de destino de esta transferencia y está activo
 * (sin salida): es lo que decide si una devolución puede llevarlo de vuelta.
 */
public record ItemTransferenciaAnimal(Long animalId, String caravana, String razaDescripcion, Long origenId,
        String origen, Long destinoId, String destino, boolean enDestino) {
}
