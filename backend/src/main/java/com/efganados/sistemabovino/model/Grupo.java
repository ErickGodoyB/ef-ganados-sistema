package com.efganados.sistemabovino.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Representa un grupo (lote) de animales, generalmente agrupados por
 * fecha de ingreso u origen. Un Grupo puede tener uno o varios SubGrupo.
 */
@Entity
@Table(name = "grupo")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Grupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long grpId;

    /** Nombre o descripción del lote (ej. "Ingreso Agosto 2026"). No es único: puede repetirse en distintos períodos. */
    @Column(nullable = false)
    private String grpDescripcion;
}