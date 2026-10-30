package com.efganados.sistemabovino.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.Persona;
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
    private final int claveMinima;

    public AuthController(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder,
            TokenService tokenService, @Value("${app.seguridad.clave-minima}") int claveMinima) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.claveMinima = claveMinima;
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

    /**
     * Datos del usuario autenticado (el subject del JWT es su usuNombre; ver
     * {@code TokenService.generarToken}). Requiere token: sin uno, la
     * petición ni siquiera llega acá, porque {@code SecurityConfig} exige
     * JWT en toda ruta salvo {@code POST /api/auth/login} y responde 401
     * automáticamente.
     */
    @GetMapping("/yo")
    public ResponseEntity<YoResponse> yo(@AuthenticationPrincipal Jwt jwt) {
        Usuario usuario = usuarioRepository.findByUsuNombre(jwt.getSubject())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + jwt.getSubject()));
        Persona persona = usuario.getPersona();
        return ResponseEntity.ok(new YoResponse(
                usuario.getUsuNombre(),
                persona != null ? persona.getPerTipo() : null,
                persona != null ? persona.getPerId() : null,
                persona != null ? nombreCompleto(persona) : null));
    }

    /**
     * Cambia la contraseña del usuario autenticado. 400 si falta algún
     * campo, si la clave actual no coincide (nunca 401: el frontend
     * interpreta un 401 como sesión vencida y no es el caso acá), si la
     * nueva es igual a la actual, o si no llega a {@code app.seguridad.clave-minima}
     * caracteres. El token vigente sigue siendo válido: este esquema de JWT
     * es sin estado (ver {@code TokenService}), no hay nada del lado del
     * servidor que invalidar.
     */
    @PutMapping("/clave")
    public ResponseEntity<?> cambiarClave(@RequestBody CambiarClaveRequest request, @AuthenticationPrincipal Jwt jwt) {
        if (request.claveActual() == null || request.claveActual().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo claveActual");
        }
        if (request.claveNueva() == null || request.claveNueva().isBlank()) {
            return ResponseEntity.badRequest().body("Falta el campo claveNueva");
        }

        Usuario usuario = usuarioRepository.findByUsuNombre(jwt.getSubject())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + jwt.getSubject()));

        if (!passwordEncoder.matches(request.claveActual(), usuario.getUsuPassword())) {
            return ResponseEntity.badRequest().body("La clave actual no es correcta");
        }
        if (request.claveNueva().equals(request.claveActual())) {
            return ResponseEntity.badRequest().body("La clave nueva debe ser distinta de la actual");
        }
        if (request.claveNueva().length() < claveMinima) {
            return ResponseEntity.badRequest().body("La clave nueva debe tener al menos " + claveMinima + " caracteres");
        }

        usuario.setUsuPassword(passwordEncoder.encode(request.claveNueva()));
        usuarioRepository.save(usuario);
        return ResponseEntity.noContent().build();
    }

    /** Junta nombre y apellido de la persona sin romper si alguno es null. */
    private String nombreCompleto(Persona persona) {
        String nombre = persona.getPerNombre();
        String apellido = persona.getPerApellido();
        if (nombre == null) {
            return apellido;
        }
        if (apellido == null) {
            return nombre;
        }
        return nombre + " " + apellido;
    }

    /** Datos de entrada para iniciar sesión. */
    public record LoginRequest(String usuNombre, String usuPassword) {
    }

    /** Datos de salida tras un login exitoso. */
    public record LoginResponse(String token, String usuNombre, String tipo) {
    }

    /** Datos del usuario autenticado, devueltos por GET /api/auth/yo. */
    public record YoResponse(String usuNombre, String tipo, Long personaId, String personaNombre) {
    }

    /** Datos de entrada para cambiar la contraseña del usuario autenticado. */
    public record CambiarClaveRequest(String claveActual, String claveNueva) {
    }
}
