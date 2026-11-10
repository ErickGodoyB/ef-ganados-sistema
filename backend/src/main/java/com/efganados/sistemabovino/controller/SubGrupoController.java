package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.SubGrupoRepository;
import com.efganados.sistemabovino.service.SubGrupoService;

/**
 * CRUD REST para la entidad {@link SubGrupo} (lote). Las validaciones de
 * alta/edición y la regla de eliminación viven en {@link SubGrupoService}:
 * este controlador solo delega (ver su Javadoc).
 */
@RestController
@RequestMapping("/api/subgrupos")
public class SubGrupoController {

    private final SubGrupoRepository subGrupoRepository;
    private final SubGrupoService subGrupoService;

    public SubGrupoController(SubGrupoRepository subGrupoRepository, SubGrupoService subGrupoService) {
        this.subGrupoRepository = subGrupoRepository;
        this.subGrupoService = subGrupoService;
    }

    /** Devuelve todos los subgrupos (lotes) registrados, sin cambios: lo usan los formularios de alta rápida y de animal. */
    @GetMapping
    public List<SubGrupo> listar() {
        return subGrupoRepository.findAll();
    }

    /** Busca un subgrupo por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<SubGrupo> buscarPorId(@PathVariable Long id) {
        return subGrupoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuevo lote. Devuelve 400 si falta la descripción o el grupo;
     * 404 si el grupo indicado no existe; 409 si ya existe un lote con esa
     * descripción en ese grupo (ver {@code SubGrupoService.crear}).
     */
    @PostMapping
    public ResponseEntity<SubGrupo> crear(@RequestBody SubGrupoRequest request) {
        SubGrupo creado = subGrupoService.crear(request.sbDescripcion(), idDeGrupo(request));
        return ResponseEntity.status(HttpStatus.CREATED).body(creado);
    }

    /**
     * Actualiza un lote existente (se puede cambiar de grupo). 404 si el
     * lote o el grupo indicado no existen; mismas validaciones de 400/409
     * que crear (ver {@code SubGrupoService.actualizar}).
     */
    @PutMapping("/{id}")
    public ResponseEntity<SubGrupo> actualizar(@PathVariable Long id, @RequestBody SubGrupoRequest request) {
        SubGrupo actualizado = subGrupoService.actualizar(id, request.sbDescripcion(), idDeGrupo(request));
        return ResponseEntity.ok(actualizado);
    }

    /**
     * Elimina un lote por su ID. 404 si no existe; 409 si tiene animales
     * registrados (ver {@code SubGrupoService.eliminar}).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        subGrupoService.eliminar(id);
        return ResponseEntity.noContent().build();
    }

    /** El grupo llega anidado ({"grupo": {"grpId": N}}), no como un grpId suelto: así lo manda el alta rápida del frontend (ver AltaRapidaLote.jsx). */
    private Long idDeGrupo(SubGrupoRequest request) {
        return request.grupo() != null ? request.grupo().grpId() : null;
    }

    /** Datos de entrada para crear o actualizar un lote. */
    public record SubGrupoRequest(String sbDescripcion, ReferenciaGrupo grupo) {

        /** Referencia a un grupo solo por su ID, tal como la manda el alta rápida del frontend. */
        public record ReferenciaGrupo(Long grpId) {
        }
    }
}
