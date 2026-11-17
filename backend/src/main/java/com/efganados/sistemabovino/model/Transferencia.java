package com.efganados.sistemabovino.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Cambio de lote de uno o más animales hecho en una misma fecha, por un
 * mismo responsable y por un mismo motivo. Los animales concretos, con su
 * lote de origen y de destino, están en {@link TransferenciaAnimal}.
 * Una transferencia nunca se modifica ni se borra: deshacerla se hace
 * registrando otra con motivo DEVOLUCION ({@link #devuelveA}), para que el
 * historial de movimientos de cada animal quede completo.
 */
@Entity
@Table(name = "transferencia")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transferencia {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long traId;

    @Column(nullable = false)
    private LocalDate traFecha;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private MotivoTransferencia traMotivo;

    @Column(length = 255)
    private String traNota;

    /** Momento (hora local del servidor según el Clock configurado) en que se registró; distinto de traFecha, que es cuándo ocurrió el movimiento. */
    @Column(nullable = false)
    private LocalDateTime traRegistradaEn;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id_responsable", nullable = false)
    private Persona responsable;

    /** Transferencia original que esta devuelve; solo tiene valor cuando traMotivo es DEVOLUCION. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tra_id_devuelve_a")
    private Transferencia devuelveA;
}
