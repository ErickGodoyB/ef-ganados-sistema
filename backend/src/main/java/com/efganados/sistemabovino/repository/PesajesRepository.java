package com.efganados.sistemabovino.repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Pesajes;

/**
 * Repositorio de acceso a datos para la entidad {@link Pesajes}. Todo
 * cálculo o listado "en vivo" (peso actual, GMD, sesiones, etc.) filtra acá
 * mismo por pesaEstado = ACTIVO: así ningún método que la use puede
 * olvidarse de excluir los pesajes anulados.
 */
public interface PesajesRepository extends JpaRepository<Pesajes, Long> {

    /** Devuelve los dos pesajes ACTIVOS más recientes del animal, del más nuevo al más viejo. */
    List<Pesajes> findTop2ByAnimal_AniIdAndPesaEstadoOrderByPesaFechaDesc(Long aniId, EstadoPesaje estado);

    /**
     * Indica si el animal tiene al menos un pesaje registrado, sin importar
     * su estado: se usa para bloquear el borrado de animales con historial
     * (ver AnimalController.eliminar), y un pesaje anulado sigue siendo
     * historial real, no algo que nunca pasó.
     */
    boolean existsByAnimal_AniId(Long aniId);

    /** Cuenta los pesajes ACTIVOS del animal (ver AnimalResumen.cantidadPesajes). */
    long countByAnimal_AniIdAndPesaEstado(Long aniId, EstadoPesaje estado);

    /** El pesaje del animal en esa fecha con ese estado, si hay uno (ver la regla "un pesaje activo por animal por día"). */
    Optional<Pesajes> findFirstByAnimal_AniIdAndPesaFechaAndPesaEstado(Long aniId, LocalDate fecha, EstadoPesaje estado);

    /**
     * El pesaje más antiguo del animal en el estado dado (ver
     * AnimalService.validarFechaIngreso: el ingreso de un animal no puede
     * quedar después de su propio primer pesaje ACTIVO).
     */
    Optional<Pesajes> findFirstByAnimal_AniIdAndPesaEstadoOrderByPesaFechaAsc(Long aniId, EstadoPesaje estado);

    /**
     * Historial de pesajes ACTIVOS del animal, en orden cronológico
     * (desempate por id, igual criterio que buscarAnterioresA); ver
     * PesajeService.obtenerHistorialAnimal con incluirAnulados=false (el
     * valor por defecto).
     */
    List<Pesajes> findByAnimal_AniIdAndPesaEstadoOrderByPesaFechaAscPesaIdAsc(Long aniId, EstadoPesaje estado);

    /**
     * Historial completo de pesajes del animal (ACTIVOS y ANULADOS), mismo
     * orden que el de arriba; ver PesajeService.obtenerHistorialAnimal con
     * incluirAnulados=true.
     */
    List<Pesajes> findByAnimal_AniIdOrderByPesaFechaAscPesaIdAsc(Long aniId);

    /**
     * Pesajes de una sesión con lote (misma fecha + mismo subgrupo) en el
     * estado dado, ordenados por caravana y, a igual caravana (un mismo
     * animal pesado más de una vez el mismo día), por pesaId: así el orden
     * siempre es determinístico, nunca depende del orden físico en la base.
     */
    List<Pesajes> findByPesaFechaAndAnimal_SubGrupo_SbIdAndPesaEstadoOrderByAnimal_AniCaravanaAscPesaIdAsc(
            LocalDate fecha, Long subGrupoId, EstadoPesaje estado);

    /** Pesajes de una sesión "sin lote" en el estado dado; mismo criterio de orden que la de arriba. */
    List<Pesajes> findByPesaFechaAndAnimal_SubGrupoIsNullAndPesaEstadoOrderByAnimal_AniCaravanaAscPesaIdAsc(
            LocalDate fecha, EstadoPesaje estado);

    /**
     * El pesaje ACTIVO inmediatamente anterior al dado (mismo animal, fecha
     * estrictamente anterior, o misma fecha con un id menor como desempate),
     * del más nuevo al más viejo: el primero de la lista (con Pageable de
     * tamaño 1) es el que se busca. Un pesaje anulado no cuenta como
     * "anterior" para la GMD ni el peso anterior.
     */
    @Query("SELECT p FROM Pesajes p WHERE p.animal.aniId = :animalId AND p.pesaEstado = :estado "
            + "AND (p.pesaFecha < :fecha OR (p.pesaFecha = :fecha AND p.pesaId < :pesaId)) "
            + "ORDER BY p.pesaFecha DESC, p.pesaId DESC")
    List<Pesajes> buscarAnterioresA(@Param("animalId") Long animalId, @Param("fecha") LocalDate fecha,
            @Param("pesaId") Long pesaId, @Param("estado") EstadoPesaje estado, Pageable pageable);

    /**
     * Resumen agregado de cada "sesión de pesaje" (misma fecha + mismo
     * lote), solo con pesajes en el estado dado, calculado en una sola
     * consulta con GROUP BY (sin cargar los pesajes uno por uno), ordenado
     * por fecha descendente y luego por lote ("Sin lote" al final de cada
     * fecha). Una sesión sin ningún pesaje en ese estado (ej. todos
     * anulados) no aparece: el filtro va antes del GROUP BY.
     */
    @Query("SELECT new com.efganados.sistemabovino.dto.SesionPesajeResumen("
            + "p.pesaFecha, sg.sbId, sg.sbDescripcion, g.grpDescripcion, "
            + "COUNT(p), SUM(p.pesaPeso), AVG(p.pesaPeso), MIN(p.pesaPeso), MAX(p.pesaPeso)) "
            + "FROM Pesajes p "
            + "JOIN p.animal a "
            + "LEFT JOIN a.subGrupo sg "
            + "LEFT JOIN sg.grupo g "
            + "WHERE p.pesaEstado = :estado "
            + "GROUP BY p.pesaFecha, sg.sbId, sg.sbDescripcion, g.grpDescripcion "
            + "ORDER BY p.pesaFecha DESC, sg.sbDescripcion ASC NULLS LAST")
    List<SesionPesajeResumen> resumenDeSesiones(@Param("estado") EstadoPesaje estado);

    /**
     * Pesajes anulados, opcionalmente acotados por fecha de pesaje (desde/
     * hasta, ambos opcionales), ordenados por cuándo se anularon (más
     * reciente primero).
     */
    @Query("SELECT p FROM Pesajes p WHERE p.pesaEstado = com.efganados.sistemabovino.model.EstadoPesaje.ANULADO "
            + "AND (:desde IS NULL OR p.pesaFecha >= :desde) "
            + "AND (:hasta IS NULL OR p.pesaFecha <= :hasta) "
            + "ORDER BY p.pesaAnuladoEn DESC")
    List<Pesajes> buscarAnulados(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    /**
     * Cuenta los pesajes en los que la persona figura, como responsable o
     * como quien anuló el pesaje, en cualquier estado (ver PersonaService:
     * una persona que figura en algún pesaje no se puede eliminar). Un
     * pesaje donde la misma persona es ambas cosas a la vez cuenta una sola
     * vez (el OR va sobre la misma fila, no sobre dos consultas separadas).
     */
    @Query("SELECT COUNT(p) FROM Pesajes p WHERE p.responsable.perId = :personaId OR p.anuladoPor.perId = :personaId")
    long countByResponsableOAnuladoPor(@Param("personaId") Long personaId);
}
