package com.efganados.sistemabovino;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.security.autoconfigure.UserDetailsServiceAutoConfiguration;

/**
 * Excluye {@link UserDetailsServiceAutoConfiguration}: sin ella, Spring Boot
 * crea un usuario en memoria con una contraseña generada al azar (y logueada
 * como advertencia) cada vez que arranca la app. La autenticación real la da
 * {@code AuthController} contra la tabla Usuario, así que ese usuario
 * autogenerado no hace falta.
 */
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class SistemaBovinoApplication {

	public static void main(String[] args) {
		SpringApplication.run(SistemaBovinoApplication.class, args);
	}

}
