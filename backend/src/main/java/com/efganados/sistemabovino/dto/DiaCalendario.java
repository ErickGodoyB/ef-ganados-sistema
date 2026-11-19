package com.efganados.sistemabovino.dto;

import java.time.LocalDate;

/**
 * Un día del calendario de Inicio con pesajes ACTIVOS: cuántas sesiones
 * (combinaciones distintas de fecha y lote, con "sin lote" como un lote más)
 * y cuántos animales distintos se pesaron ese día.
 */
public record DiaCalendario(LocalDate fecha, long sesiones, long animales) {
}
