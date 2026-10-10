package com.efganados.sistemabovino.model;

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
 * Representa un subgrupo (subdivisión de un Grupo/lote), usado para
 * organizar animales con más granularidad dentro de un mismo lote.
 */
@Entity
@Table(name = "sub_grupo")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubGrupo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sbId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "grp_id")
    private Grupo grupo;

    @Column(nullable = false)
    private String sbDescripcion;
}
