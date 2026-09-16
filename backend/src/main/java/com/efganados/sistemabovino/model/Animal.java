package com.efganados.sistemabovino.model;

import java.time.LocalDate;

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

    private String aniCaravana;

    private LocalDate aniFechaIngreso;

    private double aniPesoInicial;

    private LocalDate aniFechaEgreso;

    private String aniObservacion;
}
