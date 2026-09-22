package com.efganados.sistemabovino.model;

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

    private String sbDescripcion;
}
