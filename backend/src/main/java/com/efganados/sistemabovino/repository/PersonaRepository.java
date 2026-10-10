package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Persona;

/**
 * Repositorio de acceso a datos para la entidad {@link Persona}.
 */
public interface PersonaRepository extends JpaRepository<Persona, Long> {
}
