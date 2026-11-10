package com.efganados.sistemabovino.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.SubGrupo;

/**
 * Repositorio de acceso a datos para la entidad {@link SubGrupo} (lote).
 */
public interface SubGrupoRepository extends JpaRepository<SubGrupo, Long> {

    /** Lotes de un grupo (para su resumen, ver GrupoService.obtenerResumen; el orden final por descripción se aplica en el servicio). */
    List<SubGrupo> findByGrupo_GrpId(Long grpId);

    /** Cuenta cuántos lotes tiene un grupo, para bloquear su eliminación si tiene alguno. */
    long countByGrupo_GrpId(Long grpId);

    /**
     * Indica si ya existe un lote con esa descripción dentro del mismo
     * grupo, sin distinguir mayúsculas (el mismo nombre de lote sí se
     * permite repetido en grupos distintos).
     */
    boolean existsByGrupo_GrpIdAndSbDescripcionIgnoreCase(Long grpId, String sbDescripcion);

    /**
     * Indica si existe otro lote (distinto de sbId) con esa descripción
     * dentro del mismo grupo, sin distinguir mayúsculas, para validar
     * unicidad al actualizar sin rechazar la propia descripción del lote.
     */
    boolean existsByGrupo_GrpIdAndSbDescripcionIgnoreCaseAndSbIdNot(Long grpId, String sbDescripcion, Long sbId);
}
