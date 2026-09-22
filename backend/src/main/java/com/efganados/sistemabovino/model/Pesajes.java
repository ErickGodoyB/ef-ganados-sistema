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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id")
    private Persona responsable;

    private LocalDate pesaFecha;

    private double pesaPeso;

    private String pesaObservaciones;
}
