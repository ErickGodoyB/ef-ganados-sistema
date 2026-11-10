package com.efganados.sistemabovino.service;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Lógica de negocio del catálogo de lotes (SubGrupo): validaciones de
 * alta/edición y el conteo de animales (para bloquear la eliminación de un
 * lote en uso). Centralizada acá para que {@code SubGrupoController} solo
 * delegue, igual que {@code RazaService}/{@code GrupoService} con los suyos.
 */
@Service
public class SubGrupoService {

    private final SubGrupoRepository subGrupoRepository;
    private final GrupoRepository grupoRepository;
    private final AnimalRepository animalRepository;

    public SubGrupoService(SubGrupoRepository subGrupoRepository, GrupoRepository grupoRepository,
            AnimalRepository animalRepository) {
        this.subGrupoRepository = subGrupoRepository;
        this.grupoRepository = grupoRepository;
        this.animalRepository = animalRepository;
    }

    /**
     * Crea un lote nuevo. Las validaciones corren en este orden: la
     * descripción obligatoria primero (400), después que el grupo esté
     * presente y exista (400/404), y por último la unicidad de la
     * descripción DENTRO de ese grupo (409): el mismo nombre de lote sí se
     * permite repetido en grupos distintos.
     */
    public SubGrupo crear(String descripcion, Long grupoId) {
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        Grupo grupo = validarGrupo(grupoId);
        validarDescripcionUnicaEnGrupo(grupo, descripcionRecortada, null);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcionRecortada);
        return subGrupoRepository.save(subGrupo);
    }

    /**
     * Actualiza un lote existente (404 si no existe, ver {@link #buscarPorId}).
     * Se puede cambiar de grupo; la propia descripción del lote dentro de
     * su grupo actual no cuenta como duplicada.
     */
    public SubGrupo actualizar(Long id, String descripcion, Long grupoId) {
        SubGrupo subGrupo = buscarPorId(id);
        String descripcionRecortada = validarDescripcionPresente(descripcion);
        Grupo grupo = validarGrupo(grupoId);
        validarDescripcionUnicaEnGrupo(grupo, descripcionRecortada, id);

        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcionRecortada);
        return subGrupoRepository.save(subGrupo);
    }

    /** Elimina un lote. 404 si no existe; 409 si tiene algún animal registrado, sin importar si tiene salida. */
    public void eliminar(Long id) {
        SubGrupo subGrupo = buscarPorId(id);
        long cantidadAnimales = animalRepository.countBySubGrupo_SbId(id);
        if (cantidadAnimales > 0) {
            throw new ConflictoException("No se puede eliminar el lote: tiene " + cantidadAnimales + " animales");
        }
        subGrupoRepository.delete(subGrupo);
    }

    /** Valida que la descripción no falte, y la devuelve recortada. */
    private String validarDescripcionPresente(String descripcion) {
        if (descripcion == null || descripcion.isBlank()) {
            throw new ValidacionException("Falta el campo sbDescripcion");
        }
        return descripcion.trim();
    }

    /** Valida que el grupo no falte (400) y que exista (404). */
    private Grupo validarGrupo(Long grupoId) {
        if (grupoId == null) {
            throw new ValidacionException("Falta el campo grpId");
        }
        return grupoRepository.findById(grupoId)
                .orElseThrow(() -> new IllegalArgumentException("Grupo no encontrado con id: " + grupoId));
    }

    /**
     * Valida que no exista ya otro lote con esa descripción dentro del
     * mismo grupo (sin distinguir mayúsculas). "idPropio" es el id del
     * lote que se está editando, o null al crear uno nuevo.
     */
    private void validarDescripcionUnicaEnGrupo(Grupo grupo, String descripcionRecortada, Long idPropio) {
        boolean yaExiste = idPropio == null
                ? subGrupoRepository.existsByGrupo_GrpIdAndSbDescripcionIgnoreCase(grupo.getGrpId(), descripcionRecortada)
                : subGrupoRepository.existsByGrupo_GrpIdAndSbDescripcionIgnoreCaseAndSbIdNot(grupo.getGrpId(),
                        descripcionRecortada, idPropio);
        if (yaExiste) {
            throw new ConflictoException("Ya existe un lote con la descripción " + descripcionRecortada
                    + " en el grupo " + grupo.getGrpDescripcion());
        }
    }

    /**
     * Busca un lote por su ID. Lanza una excepción si no existe, para que
     * el controlador pueda responder con un error claro (404, vía
     * {@code GlobalExceptionHandler}).
     */
    public SubGrupo buscarPorId(Long id) {
        return subGrupoRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("SubGrupo no encontrado con id: " + id));
    }
}
