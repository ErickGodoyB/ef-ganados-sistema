package com.efganados.sistemabovino.controller;

import java.time.LocalDate;
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

import com.efganados.sistemabovino.model.Animal;
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

/**
 * CRUD REST para la entidad {@link Animal}, más los endpoints derivados
 * (GMD, aptitud para venta y registro de pesajes) que delegan en
 * {@link AnimalService}.
 */
@RestController
@RequestMapping("/api/animales")
public class AnimalController {

    private final AnimalRepository animalRepository;
    private final AnimalService animalService;
    private final PersonaRepository personaRepository;
    private final RazaRepository razaRepository;
    private final SubGrupoRepository subGrupoRepository;
    private final PesajesRepository pesajesRepository;

    public AnimalController(AnimalRepository animalRepository, AnimalService animalService,
            PersonaRepository personaRepository, RazaRepository razaRepository,
            SubGrupoRepository subGrupoRepository, PesajesRepository pesajesRepository) {
        this.animalRepository = animalRepository;
        this.animalService = animalService;
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
        Animal animal = new Animal();
        aplicarDatos(animal, request);
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
     * copia todos los datos del request sobre el animal dado.
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
        animal.setAniFechaEgreso(request.aniFechaEgreso());
        animal.setAniObservacion(request.aniObservacion());
    }

    /**
     * Arma el resumen de un animal usando los métodos ya existentes de
     * {@code AnimalService} (pesoActual, calcularGMD, estaAptoParaVenta):
     * no reimplementa ninguna regla de negocio, solo junta sus resultados
     * con los datos del animal, su dueño, su raza y su lote (si tiene
     * subgrupo).
     */
    private AnimalResumen aResumen(Animal animal) {
        SubGrupo subGrupo = animal.getSubGrupo();
        Grupo grupo = subGrupo != null ? subGrupo.getGrupo() : null;
        Persona duenio = animal.getDuenio();
        Raza raza = animal.getRaza();

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
                pesajesRepository.countByAnimal_AniId(animal.getAniId()),
                animalService.pesoActual(animal),
                animalService.calcularGMD(animal),
                animalService.estaAptoParaVenta(animal),
                animal.getAniFechaIngreso(),
                animal.getAniFechaEgreso());
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
     * anidados completos.
     */
    public record AnimalRequest(Long duenioId, Long razaId, Long subGrupoId, String aniCaravana,
            LocalDate aniFechaIngreso, Double aniPesoInicial, LocalDate aniFechaEgreso, String aniObservacion) {
    }

    /**
     * Resumen de un animal para el listado (RF010). Si el animal no tiene
     * subgrupo asignado, subGrupoId, subGrupoDescripcion y grupoDescripcion
     * van en null.
     */
    public record AnimalResumen(Long aniId, String aniCaravana, Long duenioId, String duenioNombre, Long razaId,
            String razaDescripcion, Long subGrupoId, String subGrupoDescripcion, String grupoDescripcion,
            double aniPesoInicial, String aniObservacion, long cantidadPesajes, double pesoActual, Double gmd,
            boolean aptoVenta, LocalDate aniFechaIngreso, LocalDate aniFechaEgreso) {
    }
}
