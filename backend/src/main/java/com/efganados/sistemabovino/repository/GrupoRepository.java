package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Grupo;

/**
 * Repositorio de acceso a datos para la entidad {@link Grupo}.
 */
public interface GrupoRepository extends JpaRepository<Grupo, Long> {

    /** Indica si ya existe un grupo con esa descripción, sin distinguir mayúsculas (para validar unicidad al crear). */
    boolean existsByGrpDescripcionIgnoreCase(String grpDescripcion);

    /**
     * Indica si existe otro grupo (distinto de grpId) con esa descripción,
     * sin distinguir mayúsculas, para validar unicidad al actualizar sin
     * rechazar la propia descripción del grupo.
     */
    boolean existsByGrpDescripcionIgnoreCaseAndGrpIdNot(String grpDescripcion, Long grpId);
}
