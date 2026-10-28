package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.controller.AnimalController.AnimalRequest;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Pruebas de integración de {@link AnimalController}: creación, actualización
 * y borrado de animales vía MockMvc contra la base H2 en memoria. Cada prueba
 * crea sus propios datos (raza, persona dueño, grupo y subgrupo) y la
 * transacción se revierte al finalizar, dejando la base limpia para la
 * siguiente prueba. Todas las peticiones llevan el token del administrador
 * inicial (ver {@link AutenticacionTestSupport}), ya que la API ahora exige
 * autenticación (RF009) salvo en el login.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnimalControllerTest extends AutenticacionTestSupport {

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private RazaRepository razaRepository;

    @Autowired
    private GrupoRepository grupoRepository;

    @Autowired
    private SubGrupoRepository subGrupoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PesajesRepository pesajesRepository;

    /** Token del administrador inicial, obtenido una vez por prueba vía login real. */
    private String token;

    @BeforeEach
    void autenticarse() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    /** Crea y persiste una persona de prueba (dueño o responsable). */
    private Persona crearPersona(String nombre) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido("Apellido");
        persona.setPerRuc("80000000-1");
        persona.setPerCi("1234567");
        persona.setPerTipo("PROPIETARIO");
        persona.setPerTelefono("0981000000");
        persona.setPerCorreo(nombre.toLowerCase() + "@test.com");
        persona.setPerDireccion("Dirección de prueba");
        return personaRepository.save(persona);
    }

    /** Crea y persiste una raza de prueba con el peso objetivo de venta indicado. */
    private Raza crearRaza(String descripcion, double pesoObjetivoVenta) {
        Raza raza = new Raza();
        raza.setRzDescripcion(descripcion);
        raza.setRzPesoObjetivoVenta(pesoObjetivoVenta);
        return razaRepository.save(raza);
    }

    /** Crea y persiste un subgrupo de prueba, junto con su grupo contenedor. */
    private SubGrupo crearSubGrupo(String descripcion) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Lote de prueba " + descripcion);
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcion);
        return subGrupoRepository.save(subGrupo);
    }

    /** Crea y persiste un animal de prueba directamente por repositorio (sin pasar por el controlador). */
    private Animal crearAnimal(Persona duenio, Raza raza, SubGrupo subGrupo, String caravana, double pesoInicial) {
        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(pesoInicial);
        return animalRepository.save(animal);
    }

    /** Registra un pesaje de prueba para el animal, directamente por repositorio. */
    private void registrarPesaje(Animal animal, Persona responsable, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        pesajesRepository.save(pesaje);
    }

    @Test
    @DisplayName("Crear un animal con IDs válidos devuelve 201 con las relaciones completas")
    void crearAnimalConIdsValidosDevuelve201ConRelacionesCompletas() throws Exception {
        Persona duenio = crearPersona("Dueño1");
        Raza raza = crearRaza("Raza-Crear-OK", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Crear-OK");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "CAR-001", LocalDate.of(2026, 1, 1), 200.0, null, "Observación inicial");

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.aniId").exists())
                .andExpect(jsonPath("$.aniCaravana").value("CAR-001"))
                .andExpect(jsonPath("$.duenio.perId").value(duenio.getPerId()))
                .andExpect(jsonPath("$.raza.rzId").value(raza.getRzId()))
                .andExpect(jsonPath("$.subGrupo.sbId").value(subGrupo.getSbId()));
    }

    @Test
    @DisplayName("Crear un animal sin razaId devuelve 400 indicando el campo faltante")
    void crearAnimalSinRazaIdDevuelve400() throws Exception {
        Persona duenio = crearPersona("Dueño2");
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-SinRaza");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), null, subGrupo.getSbId(),
                "CAR-002", LocalDate.of(2026, 1, 1), 200.0, null, null);

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo razaId"));
    }

    @Test
    @DisplayName("Crear un animal con caravana vacía devuelve 400 indicando el campo faltante")
    void crearAnimalConCaravanaVaciaDevuelve400() throws Exception {
        Persona duenio = crearPersona("Dueño3");
        Raza raza = crearRaza("Raza-CaravanaVacia", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-CaravanaVacia");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "", LocalDate.of(2026, 1, 1), 200.0, null, null);

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo aniCaravana"));
    }

    @Test
    @DisplayName("Crear un animal con razaId inexistente devuelve 404")
    void crearAnimalConRazaIdInexistenteDevuelve404() throws Exception {
        Persona duenio = crearPersona("Dueño4");
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-RazaInexistente");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), 999L, subGrupo.getSbId(),
                "CAR-004", LocalDate.of(2026, 1, 1), 200.0, null, null);

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Raza no encontrada con id: 999"));
    }

    @Test
    @DisplayName("Crear un animal con caravana repetida devuelve 409")
    void crearAnimalConCaravanaRepetidaDevuelve409() throws Exception {
        Persona duenio = crearPersona("Dueño5");
        Raza raza = crearRaza("Raza-CaravanaRepetida", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-CaravanaRepetida");
        crearAnimal(duenio, raza, subGrupo, "DUP-001", 200.0);

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "DUP-001", LocalDate.of(2026, 1, 1), 200.0, null, null);

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe un animal con la caravana: DUP-001"));
    }

    @Test
    @DisplayName("Actualizar un animal con IDs válidos devuelve 200 con la observación nueva")
    void actualizarAnimalConIdsValidosDevuelve200ConObservacionNueva() throws Exception {
        Persona duenio = crearPersona("Dueño6");
        Raza raza = crearRaza("Raza-Actualizar", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Actualizar");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-006", 200.0);

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "CAR-006", LocalDate.of(2026, 1, 1), 200.0, null, "Observación actualizada");

        mockMvc.perform(put("/api/animales/{id}", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniObservacion").value("Observación actualizada"));
    }

    @Test
    @DisplayName("Borrar un animal sin pesajes devuelve 204")
    void borrarAnimalSinPesajesDevuelve204() throws Exception {
        Persona duenio = crearPersona("Dueño7");
        Raza raza = crearRaza("Raza-BorrarSinPesajes", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-BorrarSinPesajes");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-007", 200.0);

        mockMvc.perform(delete("/api/animales/{id}", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Borrar un animal con pesajes registrados devuelve 409")
    void borrarAnimalConPesajesDevuelve409() throws Exception {
        Persona duenio = crearPersona("Dueño8");
        Persona responsable = crearPersona("Responsable8");
        Raza raza = crearRaza("Raza-BorrarConPesajes", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-BorrarConPesajes");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-008", 200.0);

        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(LocalDate.of(2026, 2, 1));
        pesaje.setPesaPeso(210.0);
        pesajesRepository.save(pesaje);

        mockMvc.perform(delete("/api/animales/{id}", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el animal: tiene pesajes registrados"));
    }

    @Test
    @DisplayName("Listar animales devuelve 200")
    void listarAnimalesDevuelve200() throws Exception {
        mockMvc.perform(get("/api/animales")
                        .header("Authorization", token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("El resumen de animales sin token devuelve 401")
    void resumenSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/animales/resumen"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("El resumen de un animal sin pesajes usa el peso inicial, con GMD nula, no apto para venta y cantidadPesajes 0")
    void resumenDeAnimalSinPesajesUsaPesoInicialYGmdNula() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen1");
        Raza raza = crearRaza("Raza-Resumen-SinPesajes", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-SinPesajes");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-001", 200.0);

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].aniId").value(animal.getAniId()))
                .andExpect(jsonPath("$[0].aniCaravana").value("CAR-RES-001"))
                .andExpect(jsonPath("$[0].razaDescripcion").value("Raza-Resumen-SinPesajes"))
                .andExpect(jsonPath("$[0].subGrupoDescripcion").value("SubGrupo-Resumen-SinPesajes"))
                .andExpect(jsonPath("$[0].pesoActual").value(200.0))
                .andExpect(jsonPath("$[0].gmd").value(nullValue()))
                .andExpect(jsonPath("$[0].aptoVenta").value(false))
                .andExpect(jsonPath("$[0].cantidadPesajes").value(0));
    }

    @Test
    @DisplayName("El resumen de un animal con dos pesajes trae cantidadPesajes 2")
    void resumenDeAnimalConDosPesajesTraeCantidadPesajesDos() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen6");
        Persona responsable = crearPersona("Responsable-Resumen6");
        Raza raza = crearRaza("Raza-Resumen-CantidadPesajes", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-CantidadPesajes");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-006", 200.0);
        registrarPesaje(animal, responsable, 215.0, LocalDate.of(2026, 8, 15));
        registrarPesaje(animal, responsable, 245.0, LocalDate.of(2026, 9, 14));

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].cantidadPesajes").value(2));
    }

    @Test
    @DisplayName("El resumen de un animal trae los datos de dueño, raza, lote, peso inicial y observación")
    void resumenDeAnimalTraeDatosDeDuenioRazaLotePesoInicialYObservacion() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen7");
        Raza raza = crearRaza("Raza-Resumen-DatosCompletos", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-DatosCompletos");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-007", 180.5);
        animal.setAniObservacion("Observación de prueba");
        animalRepository.save(animal);

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].duenioId").value(duenio.getPerId()))
                .andExpect(jsonPath("$[0].duenioNombre").value(duenio.getPerNombre() + " " + duenio.getPerApellido()))
                .andExpect(jsonPath("$[0].razaId").value(raza.getRzId()))
                .andExpect(jsonPath("$[0].subGrupoId").value(subGrupo.getSbId()))
                .andExpect(jsonPath("$[0].aniPesoInicial").value(180.5))
                .andExpect(jsonPath("$[0].aniObservacion").value("Observación de prueba"));
    }

    @Test
    @DisplayName("El resumen de un animal sin subgrupo deja subGrupoId en null sin romper")
    void resumenDeAnimalSinSubGrupoDejaSubGrupoIdEnNull() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen8");
        Raza raza = crearRaza("Raza-Resumen-SinSubGrupoId", 450.0);
        crearAnimal(duenio, raza, null, "CAR-RES-008", 200.0);

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subGrupoId").value(nullValue()));
    }

    @Test
    @DisplayName("El resumen de un animal con dos pesajes usa el más reciente como peso actual y calcula la GMD")
    void resumenDeAnimalConDosPesajesUsaElMasRecienteYCalculaGmd() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen2");
        Persona responsable = crearPersona("Responsable-Resumen2");
        Raza raza = crearRaza("Raza-Resumen-DosPesajes", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-DosPesajes");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-002", 200.0);
        registrarPesaje(animal, responsable, 215.0, LocalDate.of(2026, 8, 15));
        registrarPesaje(animal, responsable, 245.0, LocalDate.of(2026, 9, 14));

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].pesoActual").value(245.0))
                .andExpect(jsonPath("$[0].gmd").value(1.0));
    }

    @Test
    @DisplayName("El resumen marca apto para venta cuando el peso es exactamente igual al objetivo de la raza")
    void resumenConPesoExactamenteIgualAlObjetivoEsAptoVenta() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen3");
        Persona responsable = crearPersona("Responsable-Resumen3");
        Raza raza = crearRaza("Raza-Resumen-PesoIgual", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-PesoIgual");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-003", 400.0);
        registrarPesaje(animal, responsable, 450.0, LocalDate.of(2026, 3, 1));

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].pesoActual").value(450.0))
                .andExpect(jsonPath("$[0].aptoVenta").value(true));
    }

    @Test
    @DisplayName("El resumen marca apto para venta cuando el pesaje está por encima del objetivo de la raza")
    void resumenConPesajePorEncimaDelObjetivoEsAptoVenta() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen4");
        Persona responsable = crearPersona("Responsable-Resumen4");
        Raza raza = crearRaza("Raza-Resumen-PorEncima", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Resumen-PorEncima");
        Animal animal = crearAnimal(duenio, raza, subGrupo, "CAR-RES-004", 400.0);
        registrarPesaje(animal, responsable, 460.0, LocalDate.of(2026, 3, 1));

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].pesoActual").value(460.0))
                .andExpect(jsonPath("$[0].aptoVenta").value(true));
    }

    @Test
    @DisplayName("El resumen de un animal sin subgrupo no rompe y deja subGrupoDescripcion y grupoDescripcion en null")
    void resumenDeAnimalSinSubGrupoDejaDescripcionesEnNull() throws Exception {
        Persona duenio = crearPersona("Dueño-Resumen5");
        Raza raza = crearRaza("Raza-Resumen-SinSubGrupo", 450.0);
        Animal animal = crearAnimal(duenio, raza, null, "CAR-RES-005", 200.0);

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].aniId").value(animal.getAniId()))
                .andExpect(jsonPath("$[0].subGrupoDescripcion").value(nullValue()))
                .andExpect(jsonPath("$[0].grupoDescripcion").value(nullValue()))
                .andExpect(jsonPath("$[0].pesoActual").value(200.0));
    }
}
