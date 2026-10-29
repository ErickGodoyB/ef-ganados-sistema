package com.efganados.sistemabovino.exception;

/**
 * Señala un conflicto de negocio al registrar un pesaje (ej. el animal ya
 * tiene registrada su salida). {@link com.efganados.sistemabovino.controller.GlobalExceptionHandler}
 * la traduce en una respuesta 409 con el mensaje de la excepción.
 */
public class ConflictoException extends RuntimeException {

    public ConflictoException(String mensaje) {
        super(mensaje);
    }
}
