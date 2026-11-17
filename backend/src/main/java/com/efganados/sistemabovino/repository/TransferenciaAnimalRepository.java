package com.efganados.sistemabovino.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.efganados.sistemabovino.model.TransferenciaAnimal;

/**
 * Repositorio de acceso a datos para {@link TransferenciaAnimal}.
 */
public interface TransferenciaAnimalRepository extends JpaRepository<TransferenciaAnimal, Long> {

    /** Animales de una transferencia, ordenados por caravana. */
    List<TransferenciaAnimal> findByTransferencia_TraIdOrderByAnimal_AniCaravanaAsc(Long traId);

    /**
     * Movimientos de lote de un animal, del más reciente al más antiguo: por
     * fecha del movimiento, y a igual fecha por momento de registro y id.
     */
    @Query("SELECT ta FROM TransferenciaAnimal ta WHERE ta.animal.aniId = :animalId "
            + "ORDER BY ta.transferencia.traFecha DESC, ta.transferencia.traRegistradaEn DESC, "
            + "ta.transferencia.traId DESC")
    List<TransferenciaAnimal> movimientosDeAnimal(@Param("animalId") Long animalId);
}
