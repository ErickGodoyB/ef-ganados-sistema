package com.efganados.sistemabovino.config;

import java.nio.charset.StandardCharsets;
import java.util.List;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Configuración de seguridad real de la API (RF009, RNF006), basada en JWT.
 * Reemplaza la versión temporal que permitía todas las peticiones. Sesiones
 * sin estado (cada petición se autentica solo con su token, no hay sesión en
 * el servidor) y CSRF deshabilitado (no aplica a una API sin sesión/cookies).
 * El único endpoint público es {@code POST /api/auth/login}; todo lo demás
 * requiere un token JWT válido en el encabezado {@code Authorization: Bearer
 * <token>}, o Spring Security responde 401 automáticamente.
 */
@Configuration
public class SecurityConfig {

    /** Clave secreta HMAC usada para firmar y verificar los JWT (app.jwt.secret, mínimo 32 caracteres). */
    @Value("${app.jwt.secret}")
    private String jwtSecret;

    /**
     * Orígenes del frontend permitidos por CORS, configurable con
     * app.cors.origenes-permitidos (lista separada por comas). Los patrones
     * de IP de LAN (192.168.*.*, 10.*.*.*) son para poder probar la app
     * desde un celular en la misma red wifi durante el desarrollo; en
     * producción esta lista debe acotarse al dominio real del frontend,
     * nunca dejar patrones de IP de LAN ni localhost.
     */
    @Value("${app.cors.origenes-permitidos:http://localhost:5173,http://127.0.0.1:5173,"
            + "http://192.168.*.*:5173,http://10.*.*.*:5173}")
    private List<String> origenesPermitidos;

    /** Codificador de contraseñas (BCrypt): nunca se guardan ni se comparan en texto plano (RNF006). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** Clave simétrica HMAC-SHA256 derivada de app.jwt.secret, compartida por el encoder y el decoder de JWT. */
    @Bean
    public SecretKey jwtSecretKey() {
        return new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    /** Emisor de tokens JWT firmados con HS256, usado por {@code TokenService} al iniciar sesión. */
    @Bean
    public JwtEncoder jwtEncoder(SecretKey jwtSecretKey) {
        return NimbusJwtEncoder.withSecretKey(jwtSecretKey).algorithm(MacAlgorithm.HS256).build();
    }

    /** Verificador de tokens JWT, usado automáticamente por el oauth2ResourceServer en cada petición protegida. */
    @Bean
    public JwtDecoder jwtDecoder(SecretKey jwtSecretKey) {
        return NimbusJwtDecoder.withSecretKey(jwtSecretKey).macAlgorithm(MacAlgorithm.HS256).build();
    }

    /**
     * Política CORS: solo los orígenes de {@link #origenesPermitidos} pueden
     * llamar a la API desde el navegador. Se usan patrones
     * ({@code allowedOriginPatterns}, no {@code allowedOrigins}) para poder
     * admitir los comodines de IP de LAN.
     */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOriginPatterns(origenesPermitidos);
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("Authorization", "Content-Type"));

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/**", configuracion);
        return fuente;
    }

    /**
     * Cadena de filtros: CORS habilitado, CSRF deshabilitado, sesiones
     * stateless, login público y el resto de los endpoints autenticados por
     * JWT. Sin token o con uno inválido, el oauth2ResourceServer responde 401.
     */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.POST, "/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
        return http.build();
    }
}
