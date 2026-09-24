package com.efganados.sistemabovino.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Pesajes;

/**
 * Repositorio de acceso a datos para la entidad {@link Pesajes}.
 */
public interface PesajesRepository extends JpaRepository<Pesajes, Long> {
}
