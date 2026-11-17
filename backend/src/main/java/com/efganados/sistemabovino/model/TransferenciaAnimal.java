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

/**
 * Un animal dentro de una {@link Transferencia}, con el lote del que salió
 * ({@link #origen}) y al que pasó ({@link #destino}). Se guardan los dos
 * lotes (en vez de deducir el origen de la transferencia anterior) porque
 * el lote actual del animal cambia con cada movimiento y esta fila es el
 * registro de lo que pasó en ese momento. origen es null si el animal no
 * tenía lote; destino es null si quedó sin lote (solo ocurre al devolver
 * un animal que originalmente venía sin lote).
 */
@Entity
@Table(name = "transferencia_animal")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class TransferenciaAnimal {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long taId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tra_id", nullable = false)
    private Transferencia transferencia;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ani_id", nullable = false)
    private Animal animal;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sb_id_origen")
    private SubGrupo origen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sb_id_destino")
    private SubGrupo destino;
}
