package com.efganados.sistemabovino.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Pesajes;

/**
 * Repositorio de acceso a datos para la entidad {@link Pesajes}.
 */
public interface PesajesRepository extends JpaRepository<Pesajes, Long> {

    /** Devuelve los dos pesajes más recientes del animal, del más nuevo al más viejo. */
    List<Pesajes> findTop2ByAnimal_AniIdOrderByPesaFechaDesc(Long aniId);

    /** Indica si el animal tiene al menos un pesaje registrado. */
    boolean existsByAnimal_AniId(Long aniId);

    /** Cuenta los pesajes registrados del animal. */
    long countByAnimal_AniId(Long aniId);
}
