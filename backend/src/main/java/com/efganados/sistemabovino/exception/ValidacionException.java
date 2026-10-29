package com.efganados.sistemabovino.exception;

/**
 * Señala que una regla de negocio (no solo "falta un campo") no se cumplió
 * al registrar o actualizar un pesaje (ej. peso fuera de rango, fecha
 * futura o anterior al ingreso del animal). {@link com.efganados.sistemabovino.controller.GlobalExceptionHandler}
 * la traduce en una respuesta 400 con el mensaje de la excepción.
 */
public class ValidacionException extends RuntimeException {

    public ValidacionException(String mensaje) {
        super(mensaje);
    }
}
