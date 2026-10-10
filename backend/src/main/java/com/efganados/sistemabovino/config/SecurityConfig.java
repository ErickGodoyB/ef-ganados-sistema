package com.efganados.sistemabovino.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Configuración TEMPORAL de desarrollo: deshabilita CSRF y permite todas las
 * peticiones para poder probar los endpoints REST sin login. No es una
 * configuración de seguridad real. Se va a reemplazar por la autenticación
 * real (RF009: inicio de sesión de usuarios registrados) más adelante.
 */
@Configuration
public class SecurityConfig {

    /** Cadena de filtros que desactiva CSRF y permite el acceso libre a todos los endpoints. */
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }
}
