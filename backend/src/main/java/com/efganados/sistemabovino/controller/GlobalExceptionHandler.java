package com.efganados.sistemabovino.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Centraliza el manejo de errores de todos los controladores REST, para que
 * cada uno no tenga que repetir su propio try/catch. En particular, convierte
 * los {@link IllegalArgumentException} que lanza {@code AnimalService.buscarPorId()}
 * (cuando el animal no existe) en respuestas 404 limpias, en vez de dejar que
 * lleguen al cliente como errores 500 sin manejar.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Traduce un IllegalArgumentException en una respuesta 404 con el mensaje de la excepción. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> manejarIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }
}
