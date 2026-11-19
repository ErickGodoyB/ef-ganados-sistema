package com.efganados.sistemabovino.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * Respuesta de GET /api/inicio/alertas: el tipo pedido, el total de animales
 * que cumplen la alerta (sin recortar) y los primeros "limite" en el orden
 * propio de cada tipo.
 */
public record AlertasInicio(String tipo, long total, List<Animal> animales) {

    /**
     * Un animal de una alerta. gmd es la del último intervalo (null si no tiene
     * pesajes activos); fechaUltimoPesaje es null si nunca se lo pesó, y en
     * ese caso diasSinPesaje se mide desde el ingreso. loteDescripcion es null
     * si no tiene lote.
     */
    public record Animal(Long animalId, String caravana, String razaDescripcion, String loteDescripcion,
            double pesoActual, Double gmd, LocalDate fechaUltimoPesaje, long diasSinPesaje) {
    }
}
