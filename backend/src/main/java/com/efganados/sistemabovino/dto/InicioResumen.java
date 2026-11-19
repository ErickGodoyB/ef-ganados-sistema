package com.efganados.sistemabovino.dto;

import java.util.List;

/**
 * Resumen de la pantalla de Inicio (GET /api/inicio/resumen). Todos los
 * conteos de animales son de animales ACTIVOS (sin salida), salvo
 * pesadosEsteMes, que cuenta animales con algún pesaje ACTIVO en el mes
 * actual aunque hoy tengan salida. "lotes" y "grupos" resumen solo a los
 * animales activos, ordenados por gmdPromedio de mayor a menor con los null
 * al final; el gmdPromedio es el promedio simple de la GMD acumulada de los
 * animales que tienen ese dato, y el pesoPromedio el del peso actual de los
 * que tienen algún pesaje (los dos van en null si ningún animal califica).
 * "parametros" son los umbrales de las alertas, para mostrarlos tal cual.
 */
public record InicioResumen(long animalesActivos, long pesadosEsteMes, long sesionesEsteMes, long aptosVenta,
        long sinPesajeReciente, long gananciaBaja, List<Lote> lotes, List<Grupo> grupos, Parametros parametros) {

    /** Un lote con animales activos; loteId es null en la fila "Sin lote" (y grupoDescripcion también). */
    public record Lote(Long loteId, String loteDescripcion, String grupoDescripcion, long animalesActivos,
            Double pesoPromedio, Double gmdPromedio) {
    }

    /**
     * Un grupo con animales activos; "lotes" es la cantidad de lotes del grupo con
     * animales activos. grupoId es null en la fila "Sin lote", que agrupa a los
     * animales sin lote (y por lo tanto sin grupo), con lotes en 0.
     */
    public record Grupo(Long grupoId, String grupoDescripcion, long lotes, long animalesActivos,
            Double pesoPromedio, Double gmdPromedio) {
    }

    /** Umbrales configurados de las alertas (app.alertas.dias-sin-pesaje y app.alertas.ganancia-minima). */
    public record Parametros(int diasSinPesaje, double gananciaMinima) {
    }
}
