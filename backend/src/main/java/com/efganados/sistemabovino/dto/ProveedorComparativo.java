package com.efganados.sistemabovino.dto;

/**
 * Fila del comparativo de rendimiento por proveedor. proveedorId es null en
 * la fila "Sin proveedor" (animales sin proveedor asignado).
 * cantidadAnimales cuenta todos los animales considerados; animalesConDatos
 * solo los que tienen GMD acumulado, y sobre esos se calculan gmdPromedio
 * (promedio simple), gananciaPromedioKg y el mejor animal. Estos últimos van
 * en null si ningún animal tiene datos.
 */
public record ProveedorComparativo(Long proveedorId, String proveedorNombre, long cantidadAnimales,
        long animalesConDatos, Double gmdPromedio, Double gananciaPromedioKg, String mejorAnimalCaravana,
        Double mejorAnimalGmd) {
}
