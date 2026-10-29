package com.efganados.sistemabovino.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.model.Pesajes;

/**
 * Repositorio de acceso a datos para la entidad {@link Pesajes}.
 */
public interface PesajesRepository extends JpaRepository<Pesajes, Long> {

    /** Devuelve los dos pesajes más recientes del animal, del más nuevo al más viejo. */
    List<Pesajes> findTop2ByAnimal_AniIdOrderByPesaFechaDesc(Long aniId);

    /** Indica si el animal tiene al menos un pesaje registrado. */
    boolean existsByAnimal_AniId(Long aniId);

    /** Cuenta los pesajes registrados del animal. */
    long countByAnimal_AniId(Long aniId);

    /**
     * Pesajes de una sesión con lote (misma fecha + mismo subgrupo),
     * ordenados por caravana y, a igual caravana (un mismo animal pesado
     * más de una vez el mismo día), por pesaId: así el orden siempre es
     * determinístico, nunca depende del orden físico en la base.
     */
    List<Pesajes> findByPesaFechaAndAnimal_SubGrupo_SbIdOrderByAnimal_AniCaravanaAscPesaIdAsc(LocalDate fecha,
            Long subGrupoId);

    /** Pesajes de una sesión "sin lote" (misma fecha, animal sin subgrupo); mismo criterio de orden que la de arriba. */
    List<Pesajes> findByPesaFechaAndAnimal_SubGrupoIsNullOrderByAnimal_AniCaravanaAscPesaIdAsc(LocalDate fecha);

    /**
     * El pesaje inmediatamente anterior al dado (mismo animal, fecha
     * estrictamente anterior, o misma fecha con un id menor como desempate),
     * del más nuevo al más viejo: el primero de la lista (con Pageable de
     * tamaño 1) es el que se busca.
     */
    @Query("SELECT p FROM Pesajes p WHERE p.animal.aniId = :animalId "
            + "AND (p.pesaFecha < :fecha OR (p.pesaFecha = :fecha AND p.pesaId < :pesaId)) "
            + "ORDER BY p.pesaFecha DESC, p.pesaId DESC")
    List<Pesajes> buscarAnterioresA(@Param("animalId") Long animalId, @Param("fecha") LocalDate fecha,
            @Param("pesaId") Long pesaId, Pageable pageable);

    /**
     * Resumen agregado de cada "sesión de pesaje" (misma fecha + mismo
     * lote), calculado en una sola consulta con GROUP BY (sin cargar los
     * pesajes uno por uno), ordenado por fecha descendente y luego por lote
     * ("Sin lote" al final de cada fecha).
     */
    @Query("SELECT new com.efganados.sistemabovino.dto.SesionPesajeResumen("
            + "p.pesaFecha, sg.sbId, sg.sbDescripcion, g.grpDescripcion, "
            + "COUNT(p), SUM(p.pesaPeso), AVG(p.pesaPeso), MIN(p.pesaPeso), MAX(p.pesaPeso)) "
            + "FROM Pesajes p "
            + "JOIN p.animal a "
            + "LEFT JOIN a.subGrupo sg "
            + "LEFT JOIN sg.grupo g "
            + "GROUP BY p.pesaFecha, sg.sbId, sg.sbDescripcion, g.grpDescripcion "
            + "ORDER BY p.pesaFecha DESC, sg.sbDescripcion ASC NULLS LAST")
    List<SesionPesajeResumen> resumenDeSesiones();
}
