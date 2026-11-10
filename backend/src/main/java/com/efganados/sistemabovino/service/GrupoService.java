package com.efganados.sistemabovino.service;

import java.util.Comparator;
import java.util.List;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.dto.GrupoResumen;
import com.efganados.sistemabovino.dto.LoteResumen;
import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Lógica de negocio del catálogo de grupos: validaciones de alta/edición y
 * el resumen con sus lotes y el conteo de animales (para el catálogo y
 * para bloquear la eliminación de un grupo en uso). Centralizada acá para
 * que {@code GrupoController} solo delegue, igual que {@code RazaService}
 * con el suyo.
 */
@Service
public class GrupoService {

    private final GrupoRepository grupoRepository;
    private final SubGrupoRepository subGrupoRepository;
    private final AnimalRepository animalRepository;

    public GrupoService(GrupoRepository grupoRepository, SubGrupoRepository subGrupoRepository,
            AnimalRepository animalRepository) {
        this.grupoRepository = grupoRepository;
        this.subGrupoRepository = subGrupoRepository;
        this.animalRepository = animalRepository;
    }

    /**
     * Resumen de cada grupo para el catálogo: sus lotes (ordenados por
     * descripción) y, por cada uno, cuántos animales tiene en total y
     * cuántos están activos; el total del grupo es la suma de sus lotes.
     */
    public List<GrupoResumen> obtenerResumen() {
        return grupoRepository.findAll().stream()
                .map(this::aResumen)
                .toList();
    }

    private GrupoResumen aResumen(Grupo grupo) {
        List<LoteResumen> lotes = subGrupoRepository.findByGrupo_GrpId(grupo.getGrpId()).stream()
                .sorted(Comparator.comparing(SubGrupo::getSbDescripcion, String.CASE_INSENSITIVE_ORDER))
                .map(this::aLoteResumen)
                .toList();

        long cantidadAnimales = lotes.stream().mapToLong(LoteResumen::cantidadAnimales).sum();
        long cantidadActivos = lotes.stream().mapToLong(LoteResumen::cantidadActivos).sum();

        return new GrupoResumen(grupo.getGrpId(), grupo.getGrpDescripcion(), lotes.size(), cantidadAnimales,
                cantidadActivos, lotes);
    }

    private LoteResumen aLoteResumen(SubGrupo subGrupo) {
        long cantidadAnimales = animalRepository.countBySubGrupo_SbId(subGrupo.getSbId());
        long cantidadActivos = animalRepository.countBySubGrupo_SbIdAndAniFechaEgresoIsNull(subGrupo.getSbId());
        return new LoteResumen(subGrupo.getSbId(), subGrupo.getSbDescripcion(), cantidadAnimales, cantidadActivos);
    }

    /**
     * Crea un grupo nuevo. Las validaciones corren en este orden: campo
     * obligatorio primero (400), y recién después la unicidad de la
     * descripción (409) -mismo criterio que RazaService.crear-, para no
     * devolver un conflicto cuando en realidad falta el campo.
     */
    public Grupo crear(String descripcion) {
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        validarDescripcionUnica(descripcionRecortada, null);

        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion(descripcionRecortada);
        return grupoRepository.save(grupo);
    }

    /**
     * Actualiza un grupo existente (404 si no existe, ver {@link #buscarPorId}).
     * La propia descripción del grupo no cuenta como duplicada.
     */
    public Grupo actualizar(Long id, String descripcion) {
        Grupo grupo = buscarPorId(id);
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        validarDescripcionUnica(descripcionRecortada, id);

        grupo.setGrpDescripcion(descripcionRecortada);
        return grupoRepository.save(grupo);
    }

    /**
     * Elimina un grupo. 404 si no existe; 409 si tiene algún lote (aunque
     * ese lote no tenga animales todavía: primero habría que borrar o
     * reasignar sus lotes).
     */
    public void eliminar(Long id) {
        Grupo grupo = buscarPorId(id);
        long cantidadLotes = subGrupoRepository.countByGrupo_GrpId(id);
        if (cantidadLotes > 0) {
            throw new ConflictoException("No se puede eliminar el grupo: tiene " + cantidadLotes + " lotes");
        }
        grupoRepository.delete(grupo);
    }

    /** Valida que la descripción no falte, y la devuelve recortada. */
    private String validarDescripcionPresente(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new ValidacionException("Falta el campo grpDescripcion");
        }
        return descripcion.trim();
    }

    /**
     * Valida que no exista ya otro grupo con esa descripción (sin
     * distinguir mayúsculas). "idPropio" es el id del grupo que se está
     * editando (que puede conservar su propia descripción), o null al
     * crear uno nuevo.
     */
    private void validarDescripcionUnica(String descripcionRecortada, Long idPropio) {
        boolean yaExiste = idPropio == null
                ? grupoRepository.existsByGrpDescripcionIgnoreCase(descripcionRecortada)
                : grupoRepository.existsByGrpDescripcionIgnoreCaseAndGrpIdNot(descripcionRecortada, idPropio);
        if (yaExiste) {
            throw new ConflictoException("Ya existe un grupo con la descripción " + descripcionRecortada);
        }
    }

    /**
     * Busca un grupo por su ID. Lanza una excepción si no existe, para que
     * el controlador pueda responder con un error claro (404, vía
     * {@code GlobalExceptionHandler}).
     */
    public Grupo buscarPorId(Long id) {
        return grupoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado con id: " + id));
    }
}
