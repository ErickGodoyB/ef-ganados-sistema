package com.efganados.sistemabovino.model;

import java.time.LocalDate;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
}