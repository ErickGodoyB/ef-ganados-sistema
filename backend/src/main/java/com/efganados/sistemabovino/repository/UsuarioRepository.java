package com.efganados.sistemabovino.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Usuario;

/**
 * Repositorio de acceso a datos para la entidad {@link Usuario}.
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuNombre(String usuNombre);
}
