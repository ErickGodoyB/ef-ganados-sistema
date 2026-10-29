package com.efganados.sistemabovino.controller;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;

/**
 * Centraliza el manejo de errores de todos los controladores REST, para que
 * cada uno no tenga que repetir su propio try/catch. En particular, convierte
 * los {@link IllegalArgumentException} que lanza {@code AnimalService.buscarPorId()}
 * (cuando el animal no existe) en respuestas 404 limpias, y las excepciones
 * de reglas de negocio de pesajes ({@link ValidacionException}/
 * {@link ConflictoException}, lanzadas desde {@code AnimalService.registrarPesaje()}
 * y {@code PesajeService}) en 400/409, en vez de dejar que lleguen al
 * cliente como errores 500 sin manejar.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Traduce un IllegalArgumentException en una respuesta 404 con el mensaje de la excepción. */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> manejarIllegalArgumentException(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ex.getMessage());
    }

    /** Traduce un ValidacionException en una respuesta 400 con el mensaje de la excepción. */
    @ExceptionHandler(ValidacionException.class)
    public ResponseEntity<String> manejarValidacionException(ValidacionException ex) {
        return ResponseEntity.badRequest().body(ex.getMessage());
    }

    /** Traduce un ConflictoException en una respuesta 409 con el mensaje de la excepción. */
    @ExceptionHandler(ConflictoException.class)
    public ResponseEntity<String> manejarConflictoException(ConflictoException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getMessage());
    }
}
