package com.efganados.sistemabovino.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.UsuarioRepository;
import com.efganados.sistemabovino.service.TokenService;

/**
 * Autenticación de usuarios (RF009). Expone el único endpoint público de la
 * API ({@code POST /api/auth/login}); el resto de los endpoints exige un
 * token JWT válido, según lo configurado en {@code SecurityConfig}.
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String MENSAJE_CREDENCIALES_INVALIDAS = "Usuario o contraseña incorrectos";

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
            TokenService tokenService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
    }

    /**
     * Valida usuNombre y usuPassword contra la base (la contraseña se compara
     * cifrada con {@link PasswordEncoder#matches}, nunca en texto plano) y
     * devuelve un token JWT. Responde 400 si falta algún campo; 401 con un
     * mensaje genérico si el usuario no existe o la contraseña no coincide,
     * sin indicar cuál de los dos falló; 200 con el token, el usuNombre y el
     * per_tipo de la persona asociada si el login es correcto.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        if (request.usuNombre() == null || request.usuNombre().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo usuNombre");
        }
        if (request.usuPassword() == null || request.usuPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo usuPassword");
        }

        Usuario usuario = usuarioRepository.findByUsuNombre(request.usuNombre()).orElse(null);
        if (usuario == null || !passwordEncoder.matches(request.usuPassword(), usuario.getUsuPassword())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(MENSAJE_CREDENCIALES_INVALIDAS);
        }

        String token = tokenService.generarToken(usuario.getUsuNombre());
        String tipo = usuario.getPersona() != null ? usuario.getPersona().getPerTipo() : null;
        return ResponseEntity.ok(new LoginResponse(token, usuario.getUsuNombre(), tipo));
    }

    /** Datos de entrada para iniciar sesión. */
    public record LoginRequest(String usuNombre, String usuPassword) {
    }

    /** Datos de salida tras un login exitoso. */
    public record LoginResponse(String token, String usuNombre, String tipo) {
    }
}
