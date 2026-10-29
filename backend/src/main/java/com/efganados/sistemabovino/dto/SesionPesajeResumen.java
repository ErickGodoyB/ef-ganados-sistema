package com.efganados.sistemabovino.dto;

import java.time.LocalDate;

/**
 * Resumen agregado de una "sesión de pesaje": todos los pesajes de la misma
 * fecha y el mismo lote (SubGrupo) de un animal; subGrupoId null = sesión
 * "Sin lote". No es una entidad propia, se arma directamente con una
 * consulta JPQL agregada (GROUP BY) en
 * {@code PesajesRepository.resumenDeSesiones()}, sin cargar los pesajes uno
 * por uno; por eso vive en un paquete aparte, accesible tanto desde el
 * repositorio (que la construye en la consulta) como desde el controlador
 * (que la expone en la respuesta).
 */
public record SesionPesajeResumen(LocalDate fecha, Long subGrupoId, String subGrupoDescripcion,
        String grupoDescripcion, long cantidad, double total, double promedio, double minimo, double maximo) {
}
