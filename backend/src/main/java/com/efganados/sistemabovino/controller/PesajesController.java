package com.efganados.sistemabovino.controller;

import java.time.LocalDate;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.ItemAnuladoPesaje;
import com.efganados.sistemabovino.dto.ItemSesionPesaje;
import com.efganados.sistemabovino.dto.SesionPesajeResumen;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.UsuarioRepository;
import com.efganados.sistemabovino.service.PesajeService;
import com.efganados.sistemabovino.service.PesajeService.ItemPesaje;

/**
 * Endpoints de la entidad {@link Pesajes}: lectura simple, registro de una
 * sesión completa de pesajes (varios animales, misma fecha; ver
 * {@link PesajeService}), resumen y detalle de sesiones ya registradas,
 * edición de un pesaje puntual, anulación (individual o de una sesión
 * completa) y su listado, y cambio de fecha de una sesión. El alta de un
 * pesaje individual sigue en {@link AnimalController} (siempre está
 * asociado a un animal concreto), que también delega en
 * {@code AnimalService.registrarPesaje}.
 *
 * Los pesajes nunca se borran físicamente (por eso no hay un DELETE acá):
 * lo que antes era borrar ahora es anular, que conserva el registro como
 * historial (ver {@code Pesajes.pesaEstado}).
 */
@RestController
@RequestMapping("/api/pesajes")
public class PesajesController {

    private final PesajesRepository pesajesRepository;
    private final PesajeService pesajeService;
    private final UsuarioRepository usuarioRepository;

    public PesajesController(PesajesRepository pesajesRepository, PesajeService pesajeService,
            UsuarioRepository usuarioRepository) {
        this.pesajesRepository = pesajesRepository;
        this.pesajeService = pesajeService;
        this.usuarioRepository = usuarioRepository;
    }

    /** Devuelve todos los pesajes registrados (activos y anulados). */
    @GetMapping
    public List<Pesajes> listar() {
        return pesajesRepository.findAll();
    }

    /** Busca un pesaje por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Pesajes> buscarPorId(@PathVariable Long id) {
        return pesajesRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Registra una sesión de pesajes (misma fecha, un responsable, varios
     * animales) todo o nada: si cualquier ítem falla, no se guarda ninguno.
     * 400 si no trae ítems, si falta responsableId, o si algún ítem
     * incumple una regla de negocio del pesaje (peso, fecha, animal ya con
     * salida o con un pesaje activo ese día) o repite un animal ya presente
     * en la misma sesión; 404 si algún animal o el responsable no existen.
     */
    @PostMapping("/sesion")
    public ResponseEntity<?> registrarSesion(@RequestBody SesionPesajeRequest request) {
        if (request.items() == null || request.items().isEmpty()) {
            return ResponseEntity.badRequest().body("La sesión debe tener al menos un pesaje");
        }
        if (request.responsableId() == null) {
            return ResponseEntity.badRequest().body("Falta el campo responsableId");
        }

        List<ItemPesaje> items = request.items().stream()
                .map(item -> new ItemPesaje(item.animalId(), item.peso()))
                .toList();
        List<Pesajes> creados = pesajeService.registrarSesion(request.fecha(), request.responsableId(), items);

        List<PesajeCreado> respuesta = creados.stream()
                .map(p -> new PesajeCreado(p.getPesaId(), p.getAnimal().getAniId(), p.getPesaPeso(), p.getPesaFecha()))
                .toList();
        return ResponseEntity.status(HttpStatus.CREATED).body(respuesta);
    }

    /** Resumen agregado de cada sesión de pesaje ACTIVA (una fila por fecha + lote), ordenado por fecha descendente. */
    @GetMapping("/sesiones")
    public List<SesionPesajeResumen> sesiones() {
        return pesajeService.obtenerResumenSesiones();
    }

    /** Detalle (solo pesajes activos) de una sesión puntual (fecha + lote); subGrupoId ausente = sesión "Sin lote". */
    @GetMapping("/sesiones/detalle")
    public List<ItemSesionPesaje> detalleSesion(@RequestParam LocalDate fecha,
            @RequestParam(required = false) Long subGrupoId) {
        return pesajeService.obtenerDetalleSesion(fecha, subGrupoId);
    }

    /**
     * Mueve todos los pesajes activos de una sesión a una fecha nueva, todo
     * o nada (ver {@code PesajeService.cambiarFechaSesion} para las
     * reglas). Devuelve cuántos se movieron.
     */
    @PutMapping("/sesion/fecha")
    public ResponseEntity<CantidadResponse> cambiarFechaSesion(@RequestBody CambiarFechaSesionRequest request) {
        long cantidad = pesajeService.cambiarFechaSesion(request.fecha(), request.subGrupoId(), request.nuevaFecha());
        return ResponseEntity.ok(new CantidadResponse(cantidad));
    }

    /**
     * Anula todos los pesajes activos de una sesión en una sola transacción
     * (todo o nada). 404 si no hay una sesión con pesajes activos en esa
     * fecha y lote. Devuelve cuántos se anularon.
     */
    @PutMapping("/sesion/anular")
    public ResponseEntity<CantidadResponse> anularSesion(@RequestBody AnularSesionRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Persona anuladoPor = personaAutenticada(jwt);
        long cantidad = pesajeService.anularSesion(request.fecha(), request.subGrupoId(), request.motivo(), anuladoPor);
        return ResponseEntity.ok(new CantidadResponse(cantidad));
    }

    /**
     * Pesajes anulados, opcionalmente acotados por fecha de pesaje (desde/
     * hasta, ambos opcionales), más recientes primero.
     */
    @GetMapping("/anulados")
    public List<ItemAnuladoPesaje> anulados(@RequestParam(required = false) LocalDate desde,
            @RequestParam(required = false) LocalDate hasta) {
        return pesajeService.obtenerAnulados(desde, hasta);
    }

    /**
     * Actualiza solo el peso y las observaciones de un pesaje ACTIVO (no la
     * fecha ni el animal); permitido aunque el animal ya tenga salida,
     * porque es una corrección y no un pesaje nuevo. 400 si el peso no está
     * en rango; 404 si el pesaje no existe; 409 si está anulado.
     */
    @PutMapping("/{id}")
    public ResponseEntity<Pesajes> actualizar(@PathVariable Long id, @RequestBody ActualizarPesajeRequest request) {
        return ResponseEntity.ok(pesajeService.actualizarPesaje(id, request.peso(), request.observaciones()));
    }

    /**
     * Anula un pesaje activo (no lo borra: ver la nota de la clase). 400 si
     * falta el motivo o no mide entre 3 y 255 caracteres; 404 si el pesaje
     * no existe; 409 si ya estaba anulado.
     */
    @PutMapping("/{id}/anular")
    public ResponseEntity<Pesajes> anular(@PathVariable Long id, @RequestBody AnularPesajeRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        Persona anuladoPor = personaAutenticada(jwt);
        return ResponseEntity.ok(pesajeService.anularPesaje(id, request.motivo(), anuladoPor));
    }

    /**
     * Resuelve la Persona asociada al usuario autenticado (mismo criterio
     * que {@code AuthController.yo}), para registrar quién anuló un
     * pesaje. 400 si el usuario no tiene una persona asociada (en vez de
     * una NullPointerException más adelante).
     */
    private Persona personaAutenticada(Jwt jwt) {
        Usuario usuario = usuarioRepository.findByUsuNombre(jwt.getSubject())
                .orElseThrow(() -> new IllegalArgumentException("Usuario no encontrado: " + jwt.getSubject()));
        Persona persona = usuario.getPersona();
        if (persona == null) {
            throw new ValidacionException("El usuario autenticado no tiene una persona asociada");
        }
        return persona;
    }

    /** Un ítem del cuerpo de una sesión: qué animal y con qué peso. */
    public record ItemSesionPesajeRequest(Long animalId, double peso) {
    }

    /** Datos de entrada para registrar una sesión de pesajes. */
    public record SesionPesajeRequest(LocalDate fecha, Long responsableId, List<ItemSesionPesajeRequest> items) {
    }

    /** Un pesaje recién creado por una sesión. */
    public record PesajeCreado(Long pesaId, Long animalId, double peso, LocalDate fecha) {
    }

    /** Datos de entrada para actualizar un pesaje existente. */
    public record ActualizarPesajeRequest(double peso, String observaciones) {
    }

    /** Datos de entrada para anular un pesaje puntual. */
    public record AnularPesajeRequest(String motivo) {
    }

    /** Datos de entrada para anular todos los pesajes activos de una sesión; subGrupoId null = "Sin lote". */
    public record AnularSesionRequest(LocalDate fecha, Long subGrupoId, String motivo) {
    }

    /** Datos de entrada para mover una sesión completa a otra fecha; subGrupoId null = "Sin lote". */
    public record CambiarFechaSesionRequest(LocalDate fecha, Long subGrupoId, LocalDate nuevaFecha) {
    }

    /** Cuántos pesajes se vieron afectados por una operación sobre una sesión completa (anular o cambiar de fecha). */
    public record CantidadResponse(long cantidad) {
    }
}
