package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Animal;

/**
 * Repositorio de acceso a datos para la entidad {@link Animal}.
 */
public interface AnimalRepository extends JpaRepository<Animal, Long> {
}
