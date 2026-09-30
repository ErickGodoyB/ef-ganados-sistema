package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.UsuarioRepository;

/**
 * CRUD REST para la entidad {@link Usuario}.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;

    public UsuarioController(UsuarioRepository usuarioRepository) {
        this.usuarioRepository = usuarioRepository;
    }

    /** Devuelve todos los usuarios registrados. */
    @GetMapping
    public List<Usuario> listar() {
        return usuarioRepository.findAll();
    }

    /** Busca un usuario por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Usuario> buscarPorId(@PathVariable Long id) {
        return usuarioRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /** Crea un nuevo usuario. */
    @PostMapping
    public ResponseEntity<Usuario> crear(@RequestBody Usuario usuario) {
        Usuario guardado = usuarioRepository.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /** Actualiza los datos de un usuario existente; 404 si no existe. */
    @PutMapping("/{id}")
    public ResponseEntity<Usuario> actualizar(@PathVariable Long id, @RequestBody Usuario datos) {
        return usuarioRepository.findById(id)
                .map(existente -> {
                    existente.setPersona(datos.getPersona());
                    existente.setUsuNombre(datos.getUsuNombre());
                    existente.setUsuPassword(datos.getUsuPassword());
                    return ResponseEntity.ok(usuarioRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /** Elimina un usuario por su ID; 404 si no existe. */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        if (!usuarioRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        usuarioRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
