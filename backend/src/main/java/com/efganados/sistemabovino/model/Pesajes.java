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
 * Representa el pesaje de un único animal en una fecha determinada.
 * Una "sesión de pesaje" (como se ve en el listado de la interfaz, agrupada
 * por fecha + lote) no es una entidad propia: se calcula agrupando estos
 * registros por ani_id (vía su SubGrupo) y pesaFecha en tiempo de consulta.
 *
 * Los pesajes nunca se borran físicamente: un pesaje con el que ya no hay
 * que contar (error de carga, duplicado, etc.) se anula ({@link #pesaEstado}
 * pasa a ANULADO, con {@link #pesaAnuladoEn}, {@link #pesaMotivoAnulacion} y
 * {@link #anuladoPor}), y queda como historial. Todo cálculo derivado de
 * pesajes (peso actual, GMD, cantidad, sesiones) debe filtrar por
 * pesaEstado = ACTIVO explícitamente; ningún query lo asume solo.
 */
@Entity
@Table(name = "pesajes")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pesajes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long pesaId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ani_id")
    private Animal animal;

    /** Persona que realizó/registró este pesaje (no el dueño del animal). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id_responsable")
    private Persona responsable;

    @Column(nullable = false)
    private LocalDate pesaFecha;

    @Column(nullable = false)
    private double pesaPeso;

    private String pesaObservaciones;

    /**
     * ACTIVO por defecto. El valor por defecto a nivel de columna (no solo
     * el inicializador de Java) es a propósito: así, al agregar esta
     * columna a una tabla con filas ya existentes, la base las completa
     * sola con ACTIVO en el mismo ALTER TABLE, sin dejarlas en null (ver
     * CLAUDE.md/el resumen de este cambio para el detalle).
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(20) default 'ACTIVO'")
    private EstadoPesaje pesaEstado = EstadoPesaje.ACTIVO;

    /** Momento (fecha y hora) en que se anuló; null si sigue ACTIVO. */
    private LocalDateTime pesaAnuladoEn;

    @Column(length = 255)
    private String pesaMotivoAnulacion;

    /** Persona (usuario autenticado) que anuló el pesaje; null si sigue ACTIVO. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id_anulador")
    private Persona anuladoPor;
}
