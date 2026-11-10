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

    /**
     * Cuenta todos los animales de una raza, sin importar si tienen salida
     * registrada (ver RazaService: una raza con historial no se puede
     * eliminar, aunque esos animales ya no sean productivos).
     */
    long countByRaza_RzId(Long razaId);

    /**
     * Cuenta todos los animales de un lote, sin importar si tienen salida
     * registrada (ver GrupoService.obtenerResumen y SubGrupoService.eliminar:
     * un lote con historial no se puede eliminar, aunque esos animales ya no
     * sean productivos).
     */
    long countBySubGrupo_SbId(Long subGrupoId);

    /** Cuenta los animales ACTIVOS (sin salida registrada) de un lote, para el resumen de su grupo. */
    long countBySubGrupo_SbIdAndAniFechaEgresoIsNull(Long subGrupoId);

    /**
     * Cuenta todos los animales de los que la persona es dueña, sin importar
     * si tienen salida registrada (ver PersonaService: una persona que es
     * dueña de algún animal no se puede eliminar).
     */
    long countByDuenio_PerId(Long perId);
}
