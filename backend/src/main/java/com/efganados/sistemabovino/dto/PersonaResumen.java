package com.efganados.sistemabovino.dto;

/**
 * Resumen de una persona para el catálogo: sus datos propios más cuántos
 * animales tiene como dueña, cuántos como compradora (motivo de salida
 * VENTA), cuántos como proveedora (con o sin salida), en cuántos pesajes
 * figura (como responsable o como quien anuló uno), de cuántas
 * transferencias de lote es responsable y si tiene un usuario de acceso
 * vinculado. Nunca incluye nada del usuario propiamente dicho (ni su nombre
 * de usuario ni, mucho menos, su contraseña): solo el booleano "tieneUsuario".
 */
public record PersonaResumen(Long perId, String perNombre, String perApellido, String perRuc, String perCi,
        String perTipo, String perTelefono, String perCorreo, String perDireccion, long cantidadAnimales,
        long cantidadComoComprador, long cantidadComoProveedor, long cantidadPesajes, long cantidadTransferencias,
        boolean tieneUsuario) {
}
