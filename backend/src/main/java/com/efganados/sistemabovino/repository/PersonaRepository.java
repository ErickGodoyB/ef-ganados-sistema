package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Persona;

/**
 * Repositorio de acceso a datos para la entidad {@link Persona}.
 */
public interface PersonaRepository extends JpaRepository<Persona, Long> {

    /** Indica si ya existe una persona con esa CI (para validar unicidad al crear). */
    boolean existsByPerCi(String perCi);

    /**
     * Indica si existe otra persona (distinta de perId) con esa CI, para
     * validar unicidad al actualizar sin rechazar la propia CI de la persona.
     */
    boolean existsByPerCiAndPerIdNot(String perCi, Long perId);

    /** Indica si ya existe una persona con ese RUC (para validar unicidad al crear). */
    boolean existsByPerRuc(String perRuc);

    /**
     * Indica si existe otra persona (distinta de perId) con ese RUC, para
     * validar unicidad al actualizar sin rechazar el propio RUC de la persona.
     */
    boolean existsByPerRucAndPerIdNot(String perRuc, Long perId);
}
