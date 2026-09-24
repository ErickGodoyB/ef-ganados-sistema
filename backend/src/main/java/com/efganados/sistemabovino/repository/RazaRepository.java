package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Raza;

/**
 * Repositorio de acceso a datos para la entidad {@link Raza}.
 */
public interface RazaRepository extends JpaRepository<Raza, Long> {
}
