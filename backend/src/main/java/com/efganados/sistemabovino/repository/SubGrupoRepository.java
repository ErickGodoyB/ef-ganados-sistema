package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.SubGrupo;

/**
 * Repositorio de acceso a datos para la entidad {@link SubGrupo}.
 */
public interface SubGrupoRepository extends JpaRepository<SubGrupo, Long> {
}
