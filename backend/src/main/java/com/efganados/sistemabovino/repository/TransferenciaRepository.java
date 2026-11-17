package com.efganados.sistemabovino.repository;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.efganados.sistemabovino.model.Transferencia;

/**
 * Repositorio de acceso a datos para la entidad {@link Transferencia}.
 */
public interface TransferenciaRepository extends JpaRepository<Transferencia, Long> {

    /**
     * Transferencias acotadas por la fecha del movimiento (desde/hasta,
     * ambos opcionales e inclusivos), la más reciente primero. A igual
     * fecha desempata el momento de registro y luego el id, para que el
     * orden sea estable.
     */
    @Query("SELECT t FROM Transferencia t WHERE (:desde IS NULL OR t.traFecha >= :desde) "
            + "AND (:hasta IS NULL OR t.traFecha <= :hasta) "
            + "ORDER BY t.traFecha DESC, t.traRegistradaEn DESC, t.traId DESC")
    List<Transferencia> buscarPorRango(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    /** Cuenta las transferencias de las que la persona es responsable (ver PersonaService: una persona que figura en alguna no se puede eliminar). */
    long countByResponsable_PerId(Long perId);

    /** Indica si ya existe una devolución de la transferencia dada (una transferencia solo puede devolverse una vez). */
    boolean existsByDevuelveA_TraId(Long traId);

    /** Ids de todas las transferencias que ya tienen una devolución, para marcar "devuelta" en el listado sin una consulta por fila. */
    @Query("SELECT t.devuelveA.traId FROM Transferencia t WHERE t.devuelveA IS NOT NULL")
    List<Long> idsDeTransferenciasDevueltas();
}
