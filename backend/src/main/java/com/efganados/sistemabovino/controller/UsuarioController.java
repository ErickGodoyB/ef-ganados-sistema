package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
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
 * CRUD REST para la entidad {@link Usuario}. Las contraseñas nunca se
 * guardan ni se devuelven en texto plano (RNF006): se cifran con
 * {@link PasswordEncoder} antes de persistirlas, y {@code usuPassword} está
 * marcado como solo escritura en JSON (ver {@link Usuario#getUsuPassword()}),
 * así que tampoco aparecen en las respuestas.
 */
@RestController
@RequestMapping("/api/usuarios")
public class UsuarioController {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    public UsuarioController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
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

    /**
     * Crea un nuevo usuario. Devuelve 400 si falta usuNombre o usuPassword;
     * la contraseña recibida se cifra antes de guardarse.
     */
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody Usuario usuario) {
        if (usuario.getUsuNombre() == null || usuario.getUsuNombre().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo usuNombre");
        }
        if (usuario.getUsuPassword() == null || usuario.getUsuPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo usuPassword");
        }
        usuario.setUsuPassword(passwordEncoder.encode(usuario.getUsuPassword()));
        Usuario guardado = usuarioRepository.save(usuario);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /**
     * Actualiza los datos de un usuario existente; 404 si no existe, 400 si
     * falta usuNombre. La contraseña solo se cifra y reemplaza si vino una
     * nueva en el body; si no, se conserva la que ya tenía el usuario.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody Usuario datos) {
        if (datos.getUsuNombre() == null || datos.getUsuNombre().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo usuNombre");
        }
        return usuarioRepository.findById(id)
                .map(existente -> {
                    existente.setPersona(datos.getPersona());
                    existente.setUsuNombre(datos.getUsuNombre());
                    if (datos.getUsuPassword() != null && !datos.getUsuPassword().isBlank()) {
                        existente.setUsuPassword(passwordEncoder.encode(datos.getUsuPassword()));
                    }
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
