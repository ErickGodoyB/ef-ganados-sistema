package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Grupo;

/**
 * Repositorio de acceso a datos para la entidad {@link Grupo}.
 */
public interface GrupoRepository extends JpaRepository<Grupo, Long> {
}
