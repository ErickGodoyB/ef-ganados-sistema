package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Animal;

/**
 * Repositorio de acceso a datos para la entidad {@link Animal}.
 */
public interface AnimalRepository extends JpaRepository<Animal, Long> {

    /** Indica si ya existe un animal con esa caravana (para validar unicidad al crear). */
    boolean existsByAniCaravana(String aniCaravana);

    /**
     * Indica si existe otro animal (distinto de aniId) con esa caravana, para
     * validar unicidad al actualizar sin rechazar la propia caravana del animal.
     */
    boolean existsByAniCaravanaAndAniIdNot(String aniCaravana, Long aniId);
}
