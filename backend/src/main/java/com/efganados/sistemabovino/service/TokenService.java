package com.efganados.sistemabovino.service;

import java.time.Duration;
import java.time.Instant;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Service;

/**
 * Genera los tokens JWT (HS256) que se entregan al iniciar sesión (RF009).
 * El token lleva como subject el {@code usuNombre} y expira a las horas
 * configuradas en {@code app.jwt.expiracion-horas}. La verificación de los
 * tokens recibidos la hace automáticamente el {@code oauth2ResourceServer}
 * de Spring Security, usando el {@code JwtDecoder} definido en
 * {@code SecurityConfig} con la misma clave secreta.
 */
@Service
public class TokenService {

    private final JwtEncoder jwtEncoder;
    private final long expiracionHoras;

    public TokenService(JwtEncoder jwtEncoder, @Value("${app.jwt.expiracion-horas}") long expiracionHoras) {
        this.jwtEncoder = jwtEncoder;
        this.expiracionHoras = expiracionHoras;
    }

    /** Genera un token JWT para el usuario dado, válido por app.jwt.expiracion-horas horas desde ahora. */
    public String generarToken(String usuNombre) {
        Instant ahora = Instant.now();
        JwsHeader jwsHeader = JwsHeader.with(MacAlgorithm.HS256).build();
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(usuNombre)
                .issuedAt(ahora)
                .expiresAt(ahora.plus(Duration.ofHours(expiracionHoras)))
                .build();
        return jwtEncoder.encode(JwtEncoderParameters.from(jwsHeader, claims)).getTokenValue();
    }
}
