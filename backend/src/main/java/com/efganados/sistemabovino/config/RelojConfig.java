package com.efganados.sistemabovino.config;

import java.time.Clock;
import java.time.ZoneId;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Provee el {@link Clock} que usa el servicio de animales para registrar el
 * momento de alta (ver {@code AnimalService}/{@code Animal.aniFechaRegistro}):
 * fijado a la zona horaria de {@code app.zona-horaria} (por defecto
 * America/Asuncion), para que la hora guardada no dependa de en qué zona
 * horaria esté configurado el servidor donde corre la aplicación.
 */
@Configuration
public class RelojConfig {

    @Bean
    public Clock reloj(@Value("${app.zona-horaria:America/Asuncion}") String zonaHoraria) {
        return Clock.system(ZoneId.of(zonaHoraria));
    }
}
