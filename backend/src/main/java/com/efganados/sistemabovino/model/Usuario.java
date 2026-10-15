package com.efganados.sistemabovino.model;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "usuario")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long usuId;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "per_id", unique = true)
    private Persona persona;

    @Column(unique = true)
    private String usuNombre;

    /**
     * Contraseña cifrada (BCrypt). Solo escritura en JSON: se acepta en el
     * cuerpo de una petición (POST/PUT), pero nunca se serializa de vuelta
     * en una respuesta, para no exponerla aunque esté cifrada (RNF006).
     */
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String usuPassword;
}
