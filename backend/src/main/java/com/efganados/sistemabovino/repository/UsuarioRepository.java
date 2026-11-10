package com.efganados.sistemabovino.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.efganados.sistemabovino.model.Usuario;

/**
 * Repositorio de acceso a datos para la entidad {@link Usuario}.
 */
public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    Optional<Usuario> findByUsuNombre(String usuNombre);

    /** Indica si la persona tiene un usuario de acceso vinculado (ver PersonaService.eliminar). */
    boolean existsByPersona_PerId(Long perId);
}
