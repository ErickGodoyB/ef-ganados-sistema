package com.efganados.sistemabovino.model;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

@Entity
@Table(name = "animal")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Animal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long aniId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id")
    private Persona duenio;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rz_id")
    private Raza raza;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sb_id")
    private SubGrupo subGrupo;

    /**
     * Quien compró el animal (solo tiene sentido si {@link #aniMotivoSalida}
     * es VENTA); null en cualquier otro caso, incluido mientras el animal no
     * tiene salida registrada. Se completa únicamente a través de
     * {@code AnimalService.registrarSalida}, nunca por el alta/edición
     * común del animal (ver CLAUDE.md/el resumen de este cambio).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id_comprador")
    private Persona comprador;

    /** Identificador físico del animal (caravana); debe ser único entre todos los animales. */
    @Column(nullable = false, unique = true)
    private String aniCaravana;

    private LocalDate aniFechaIngreso;

    private double aniPesoInicial;

    private LocalDate aniFechaEgreso;

    private String aniObservacion;

    /** Motivo de la salida (VENTA, MUERTE u OTRO); null mientras el animal no tiene salida registrada. */
    private String aniMotivoSalida;

    @Column(length = 255)
    private String aniNotaSalida;

    /**
     * Momento (fecha y hora, en la zona horaria configurada en
     * app.zona-horaria) en que se creó el animal en el sistema. Lo completa
     * el servidor al crear el animal (ver AnimalController.crear); los
     * animales que ya existían antes de este campo quedan en null a
     * propósito, no se rellenan retroactivamente.
     */
    private LocalDateTime aniFechaRegistro;
}
