package com.efganados.sistemabovino.model;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "persona")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Persona {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long perId;

    private String perNombre;

    private String perApellido;

    private String perRuc;

    private String perCi;

    private String perTipo;

    private String perTelefono;

    private String perCorreo;

    private String perDireccion;
}
