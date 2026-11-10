package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Raza;

/**
 * Repositorio de acceso a datos para la entidad {@link Raza}.
 */
public interface RazaRepository extends JpaRepository<Raza, Long> {

    /** Indica si ya existe una raza con esa descripción, sin distinguir mayúsculas (para validar unicidad al crear). */
    boolean existsByRzDescripcionIgnoreCase(String rzDescripcion);

    /**
     * Indica si existe otra raza (distinta de rzId) con esa descripción, sin
     * distinguir mayúsculas, para validar unicidad al actualizar sin rechazar
     * la propia descripción de la raza.
     */
    boolean existsByRzDescripcionIgnoreCaseAndRzIdNot(String rzDescripcion, Long rzId);
}
