package com.efganados.sistemabovino.controller;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.ItemHistorialPesaje;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;
import com.efganados.sistemabovino.service.AnimalService;
import com.efganados.sistemabovino.service.PesajeService;

/**
 * CRUD REST para la entidad {@link Animal}, más los endpoints derivados
 * (GMD, aptitud para venta, registro e historial de pesajes) que delegan
 * en {@link AnimalService} y {@link PesajeService}.
 */
@RestController
@RequestMapping("/api/animales")
public class AnimalController {

    private final AnimalRepository animalRepository;
    private final AnimalService animalService;
    private final PesajeService pesajeService;
    private final PersonaRepository personaRepository;
    private final RazaRepository razaRepository;
    private final SubGrupoRepository subGrupoRepository;
    private final PesajesRepository pesajesRepository;

    public AnimalController(AnimalRepository animalRepository, AnimalService animalService,
            PesajeService pesajeService, PersonaRepository personaRepository, RazaRepository razaRepository,
            SubGrupoRepository subGrupoRepository, PesajesRepository pesajesRepository) {
        this.animalRepository = animalRepository;
        this.animalService = animalService;
        this.pesajeService = pesajeService;
        this.personaRepository = personaRepository;
        this.razaRepository = razaRepository;
        this.subGrupoRepository = subGrupoRepository;
        this.pesajesRepository = pesajesRepository;
    }

    /** Devuelve todos los animales registrados. */
    @GetMapping
    public List<Animal> listar() {
        return animalRepository.findAll();
    }

    /**
     * Devuelve el resumen de cada animal para el listado (RF010): identifi-
     * cación, raza, lote, los indicadores derivados de los pesajes (peso
     * actual, GMD, aptitud para venta) y las fechas de ingreso/egreso. La
     * ruta "/resumen" no choca con "/{id}" porque Spring prioriza los
     * segmentos literales sobre las variables de ruta al resolver el path.
     */
    @GetMapping("/resumen")
    public List<AnimalResumen> resumen() {
        return animalRepository.findAll().stream()
                .map(this::aResumen)
                .toList();
    }

    /** Busca un animal por su ID; 404 si no existe. */
    @GetMapping("/{id}")
    public ResponseEntity<Animal> buscarPorId(@PathVariable Long id) {
        return animalRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Crea un nuevo animal a partir de un {@link AnimalRequest}. Devuelve 400
     * si falta algún campo obligatorio, o 404 (vía {@code GlobalExceptionHandler})
     * si el dueño, la raza o el subgrupo indicados no existen.
     */
    @PostMapping
    public ResponseEntity<?> crear(@RequestBody AnimalRequest request) {
        String error = validar(request);
        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }
        if (animalRepository.existsByAniCaravana(request.aniCaravana())) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Ya existe un animal con la caravana: " + request.aniCaravana());
        }
        // Un animal nuevo todavía no puede tener pesajes: no-op, ver
        // AnimalService.validarFechaIngreso. Se llama igual, por las
        // mismas dudas, para que la regla quede en un solo lugar.
        animalService.validarFechaIngreso(null, request.aniFechaIngreso());
        Animal animal = new Animal();
        aplicarDatos(animal, request);
        // Solo al crear: los animales existentes antes de este campo quedan
        // en null a propósito (ver el Javadoc de Animal.aniFechaRegistro).
        animal.setAniFechaRegistro(animalService.momentoActual());
        Animal guardado = animalRepository.save(animal);
        return ResponseEntity.status(HttpStatus.CREATED).body(guardado);
    }

    /**
     * Actualiza un animal existente a partir de un {@link AnimalRequest}. 404
     * si el animal no existe; 400 si falta algún campo obligatorio del request.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> actualizar(@PathVariable Long id, @RequestBody AnimalRequest request) {
        String error = validar(request);
        if (error != null) {
            return ResponseEntity.badRequest().body(error);
        }
        if (animalRepository.existsByAniCaravanaAndAniIdNot(request.aniCaravana(), id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("Ya existe un animal con la caravana: " + request.aniCaravana());
        }
        animalService.validarFechaIngreso(id, request.aniFechaIngreso());
        return animalRepository.findById(id)
                .map(existente -> {
                    aplicarDatos(existente, request);
                    return ResponseEntity.ok(animalRepository.save(existente));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Valida que el request traiga todos los campos obligatorios para crear o
     * actualizar un animal. Devuelve un mensaje indicando el campo faltante,
     * o null si el request es válido.
     */
    private String validar(AnimalRequest request) {
        if (request.duenioId() == null) {
            return "Falta el campo duenioId";
        }
        if (request.razaId() == null) {
            return "Falta el campo razaId";
        }
        if (request.subGrupoId() == null) {
            return "Falta el campo subGrupoId";
        }
        if (request.aniCaravana() == null || request.aniCaravana().isBlank()) {
            return "Falta el campo aniCaravana";
        }
        if (request.aniFechaIngreso() == null) {
            return "Falta el campo aniFechaIngreso";
        }
        if (request.aniPesoInicial() == null) {
            return "Falta el campo aniPesoInicial";
        }
        return null;
    }

    /**
     * Resuelve los IDs del request contra sus repositorios (lanzando
     * IllegalArgumentException, convertida en 404, si alguno no existe) y
     * copia los datos del request sobre el animal dado. La salida
     * (aniFechaEgreso, motivo, nota, comprador) nunca se toca acá: se
     * maneja solo con PUT /{id}/salida y PUT /{id}/reactivar (ver
     * AnimalService), así que request.aniFechaEgreso() se ignora a
     * propósito (sigue aceptándose en el cuerpo por compatibilidad con el
     * frontend actual, que todavía lo reenvía) y, al actualizar, la salida
     * que ya tuviera el animal queda intacta porque nunca se la pisa.
     */
    private void aplicarDatos(Animal animal, AnimalRequest request) {
        Persona duenio = personaRepository.findById(request.duenioId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Persona no encontrada con id: " + request.duenioId()));
        Raza raza = razaRepository.findById(request.razaId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Raza no encontrada con id: " + request.razaId()));
        SubGrupo subGrupo = subGrupoRepository.findById(request.subGrupoId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "SubGrupo no encontrado con id: " + request.subGrupoId()));

        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(request.aniCaravana());
        animal.setAniFechaIngreso(request.aniFechaIngreso());
        animal.setAniPesoInicial(request.aniPesoInicial());
        animal.setAniObservacion(request.aniObservacion());
    }

    /**
     * Arma el resumen de un animal usando los métodos ya existentes de
     * {@code AnimalService} (calcularGMD, ultimoPesajeActivo): no
     * reimplementa ninguna regla de negocio, solo junta sus resultados con
     * los datos del animal, su dueño, su raza y su lote (si tiene
     * subgrupo). pesoActual y aptoVenta se calculan acá mismo a partir de
     * ultimoPesajeActivo (en vez de llamar a AnimalService.pesoActual()/
     * estaAptoParaVenta(), que harían la misma consulta por su cuenta) para
     * poder compartirla con fechaUltimoPesaje sin repetirla.
     */
    private AnimalResumen aResumen(Animal animal) {
        SubGrupo subGrupo = animal.getSubGrupo();
        Grupo grupo = subGrupo != null ? subGrupo.getGrupo() : null;
        Persona duenio = animal.getDuenio();
        Raza raza = animal.getRaza();

        Optional<Pesajes> ultimoPesaje = animalService.ultimoPesajeActivo(animal);
        double pesoActual = ultimoPesaje.map(pesaje -> pesaje.getPesaPeso()).orElse(animal.getAniPesoInicial());
        Persona comprador = animal.getComprador();

        return new AnimalResumen(
                animal.getAniId(),
                animal.getAniCaravana(),
                duenio.getPerId(),
                nombreCompleto(duenio),
                raza.getRzId(),
                raza.getRzDescripcion(),
                subGrupo != null ? subGrupo.getSbId() : null,
                subGrupo != null ? subGrupo.getSbDescripcion() : null,
                grupo != null ? grupo.getGrpDescripcion() : null,
                animal.getAniPesoInicial(),
                animal.getAniObservacion(),
                pesajesRepository.countByAnimal_AniIdAndPesaEstado(animal.getAniId(), EstadoPesaje.ACTIVO),
                pesoActual,
                animalService.calcularGMD(animal),
                pesoActual >= raza.getRzPesoObjetivoVenta(),
                animal.getAniFechaIngreso(),
                animal.getAniFechaEgreso(),
                ultimoPesaje.map(pesaje -> pesaje.getPesaFecha()).orElse(null),
                animal.getAniMotivoSalida(),
                animal.getAniNotaSalida(),
                comprador != null ? comprador.getPerId() : null,
                comprador != null ? nombreCompleto(comprador) : null,
                animal.getAniFechaRegistro());
    }

    /**
     * Junta nombre y apellido de la persona separados por un espacio. Si
     * alguno de los dos es null, devuelve el otro solo (o null si ambos lo
     * son), para no mostrar "null" pegado al nombre.
     */
    private String nombreCompleto(Persona persona) {
        String nombre = persona.getPerNombre();
        String apellido = persona.getPerApellido();
        if (nombre == null) {
            return apellido;
        }
        if (apellido == null) {
            return nombre;
        }
        return nombre + " " + apellido;
    }

    /**
     * Elimina un animal por su ID. 404 si no existe; 409 si tiene pesajes
     * registrados (no se puede eliminar un animal con historial de pesajes).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> eliminar(@PathVariable Long id) {
        if (!animalRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        if (pesajesRepository.existsByAnimal_AniId(id)) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body("No se puede eliminar el animal: tiene pesajes registrados");
        }
        animalRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    /** Calcula la Ganancia Media Diaria del animal (null si no hay suficientes pesajes). */
    @GetMapping("/{id}/gmd")
    public ResponseEntity<Double> gmd(@PathVariable Long id) {
        Animal animal = animalService.buscarPorId(id);
        return ResponseEntity.ok(animalService.calcularGMD(animal));
    }

    /** Indica si el animal alcanzó el peso objetivo de venta de su raza. */
    @GetMapping("/{id}/apto-venta")
    public ResponseEntity<Boolean> aptoVenta(@PathVariable Long id) {
        Animal animal = animalService.buscarPorId(id);
        return ResponseEntity.ok(animalService.estaAptoParaVenta(animal));
    }

    /**
     * Historial de pesajes del animal, en orden cronológico. Por defecto
     * solo trae los ACTIVOS; con incluirAnulados=true también trae los
     * anulados (con sus propios datos de anulación), sin que eso cambie
     * cuál es el "anterior" de ningún pesaje (ver
     * {@code PesajeService.obtenerHistorialAnimal}). 404 si el animal no
     * existe.
     */
    @GetMapping("/{id}/pesajes")
    public List<ItemHistorialPesaje> historialPesajes(@PathVariable Long id,
            @RequestParam(defaultValue = "false") boolean incluirAnulados) {
        return pesajeService.obtenerHistorialAnimal(id, incluirAnulados);
    }

    /**
     * Registra un nuevo pesaje para el animal. Devuelve 400 si falta
     * responsableId, o 404 (vía {@code GlobalExceptionHandler}) si no existe
     * la persona responsable.
     */
    @PostMapping("/{id}/pesajes")
    public ResponseEntity<?> registrarPesaje(@PathVariable Long id, @RequestBody NuevoPesajeRequest request) {
        if (request.responsableId() == null) {
            return ResponseEntity.badRequest().body("Falta el campo responsableId");
        }
        Animal animal = animalService.buscarPorId(id);
        Persona responsable = personaRepository.findById(request.responsableId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Persona responsable no encontrada con id: " + request.responsableId()));
        Pesajes pesajeCreado = animalService.registrarPesaje(animal, request.peso(), request.fecha(), responsable);
        return ResponseEntity.status(HttpStatus.CREATED).body(pesajeCreado);
    }

    /** Datos de entrada para registrar un pesaje de un animal. */
    public record NuevoPesajeRequest(double peso, LocalDate fecha, Long responsableId) {
    }

    /**
     * Datos de entrada para crear o actualizar un animal: referencia a sus
     * relaciones (dueño, raza, subgrupo) solo por ID, en vez de objetos
     * anidados completos. aniFechaEgreso se sigue aceptando por
     * compatibilidad con el frontend actual (que todavía lo reenvía al
     * editar), pero {@code aplicarDatos} lo ignora a propósito: la salida
     * de un animal solo se maneja con PUT /{id}/salida y /{id}/reactivar.
     */
    public record AnimalRequest(Long duenioId, Long razaId, Long subGrupoId, String aniCaravana,
            LocalDate aniFechaIngreso, Double aniPesoInicial, LocalDate aniFechaEgreso, String aniObservacion) {
    }

    /**
     * Resumen de un animal para el listado (RF010). Si el animal no tiene
     * subgrupo asignado, subGrupoId, subGrupoDescripcion y grupoDescripcion
     * van en null. fechaUltimoPesaje es la fecha del pesaje ACTIVO más
     * reciente (uno anulado no cuenta); null si el animal no tiene ningún
     * pesaje activo. aniMotivoSalida/aniNotaSalida/compradorId/
     * compradorNombre van en null mientras el animal no tenga salida
     * registrada (o, para el comprador, mientras el motivo no sea VENTA).
     * aniFechaRegistro es null para los animales que ya existían antes de
     * ese campo (no se completa retroactivamente, ver su Javadoc en Animal).
     */
    public record AnimalResumen(Long aniId, String aniCaravana, Long duenioId, String duenioNombre, Long razaId,
            String razaDescripcion, Long subGrupoId, String subGrupoDescripcion, String grupoDescripcion,
            double aniPesoInicial, String aniObservacion, long cantidadPesajes, double pesoActual, Double gmd,
            boolean aptoVenta, LocalDate aniFechaIngreso, LocalDate aniFechaEgreso, LocalDate fechaUltimoPesaje,
            String aniMotivoSalida, String aniNotaSalida, Long compradorId, String compradorNombre,
            LocalDateTime aniFechaRegistro) {
    }

    /**
     * Registra la salida del animal (venta, muerte u otro motivo). 400 si
     * falta o no es válida la fecha o el motivo, si falta la nota con
     * motivo OTRO, o si viene un comprador con un motivo distinto de
     * VENTA; 404 si el animal o el comprador no existen; 409 si el animal
     * ya tenía una salida registrada (ver {@code AnimalService.registrarSalida}).
     * Devuelve el animal con el mismo formato que el resumen (RF010).
     */
    @PutMapping("/{id}/salida")
    public ResponseEntity<AnimalResumen> registrarSalida(@PathVariable Long id, @RequestBody SalidaRequest request) {
        Animal animal = animalService.registrarSalida(id, request.fecha(), request.motivo(), request.nota(),
                request.compradorId());
        return ResponseEntity.ok(aResumen(animal));
    }

    /**
     * Reactiva un animal con salida registrada: borra la fecha de salida,
     * el motivo, la nota y el comprador. 404 si el animal no existe; 409
     * si no tenía una salida registrada, o si tiene algún pesaje activo
     * posterior a esa salida (ver {@code AnimalService.reactivar}).
     * Devuelve el animal con el mismo formato que el resumen.
     */
    @PutMapping("/{id}/reactivar")
    public ResponseEntity<AnimalResumen> reactivar(@PathVariable Long id) {
        Animal animal = animalService.reactivar(id);
        return ResponseEntity.ok(aResumen(animal));
    }

    /** Datos de entrada para registrar la salida de un animal; compradorId solo tiene sentido si motivo es VENTA. */
    public record SalidaRequest(LocalDate fecha, String motivo, String nota, Long compradorId) {
    }
}
