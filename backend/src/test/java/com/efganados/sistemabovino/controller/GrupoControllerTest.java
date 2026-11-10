package com.efganados.sistemabovino.controller;

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

import com.efganados.sistemabovino.controller.GrupoController.GrupoRequest;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Pruebas de integración del catálogo de grupos (GrupoController/
 * GrupoService): alta y edición validadas, eliminación bloqueada por lotes
 * en uso, y el resumen con sus lotes y el conteo de animales de cada uno.
 * Cada prueba crea sus propios datos y la transacción se revierte al
 * finalizar. Todas las peticiones llevan el token del administrador
 * inicial (ver {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class GrupoControllerTest extends AutenticacionTestSupport {

    @Autowired
    private GrupoRepository grupoRepository;

    @Autowired
    private SubGrupoRepository subGrupoRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private RazaRepository razaRepository;

    @Autowired
    private PersonaRepository personaRepository;

    private String token;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    /** Crea y persiste un grupo de prueba directamente por repositorio. */
    private Grupo crearGrupo(String descripcion) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion(descripcion);
        return grupoRepository.save(grupo);
    }

    /** Crea y persiste un lote de prueba dentro del grupo dado, directamente por repositorio. */
    private SubGrupo crearLote(String descripcion, Grupo grupo) {
        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcion);
        return subGrupoRepository.save(subGrupo);
    }

    /** Crea y persiste una raza de prueba (para poder dar de alta animales). */
    private Raza crearRaza(String descripcion) {
        Raza raza = new Raza();
        raza.setRzDescripcion(descripcion);
        raza.setRzPesoObjetivoVenta(450.0);
        return razaRepository.save(raza);
    }

    /** Crea y persiste una persona de prueba (dueño). */
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

    /** Crea y persiste un animal de prueba en el lote dado, directamente por repositorio. */
    private Animal crearAnimal(String caravana, SubGrupo subGrupo, LocalDate fechaEgreso) {
        Animal animal = new Animal();
        animal.setDuenio(crearPersona("Dueño-" + caravana));
        animal.setRaza(crearRaza("Raza-" + caravana));
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        animal.setAniFechaEgreso(fechaEgreso);
        return animalRepository.save(animal);
    }

    // ---- POST /api/grupos ----

    @Test
    @DisplayName("Crear un grupo con datos válidos devuelve 201 con los datos guardados")
    void crearGrupoConDatosValidosDevuelve201() throws Exception {
        GrupoRequest request = new GrupoRequest("Ingreso agosto 2026");

        mockMvc.perform(post("/api/grupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.grpDescripcion").value("Ingreso agosto 2026"))
                .andExpect(jsonPath("$.grpId").isNotEmpty());
    }

    @Test
    @DisplayName("Crear un grupo recorta espacios de los extremos de la descripción")
    void crearGrupoRecortaEspacios() throws Exception {
        GrupoRequest request = new GrupoRequest("  Invernada  ");

        mockMvc.perform(post("/api/grupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.grpDescripcion").value("Invernada"));
    }

    @Test
    @DisplayName("Crear un grupo sin descripción devuelve 400")
    void crearGrupoSinDescripcionDevuelve400() throws Exception {
        GrupoRequest request = new GrupoRequest(null);

        mockMvc.perform(post("/api/grupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo grpDescripcion"));
    }

    @Test
    @DisplayName("Crear un grupo con una descripción que ya existe, en otra mayúscula, devuelve 409")
    void crearGrupoConDescripcionDuplicadaDevuelve409() throws Exception {
        crearGrupo("Invernada");
        GrupoRequest request = new GrupoRequest("INVERNADA");

        mockMvc.perform(post("/api/grupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe un grupo con la descripción INVERNADA"));
    }

    // ---- PUT /api/grupos/{id} ----

    @Test
    @DisplayName("Actualizar un grupo conservando su propia descripción devuelve 200")
    void actualizarGrupoConservandoSuPropiaDescripcionDevuelve200() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        GrupoRequest request = new GrupoRequest("Invernada");

        mockMvc.perform(put("/api/grupos/{id}", grupo.getGrpId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grpDescripcion").value("Invernada"));
    }

    @Test
    @DisplayName("Actualizar un grupo con la descripción de otro grupo devuelve 409")
    void actualizarGrupoConDescripcionDeOtroGrupoDevuelve409() throws Exception {
        crearGrupo("Invernada");
        Grupo otro = crearGrupo("Engorde");
        GrupoRequest request = new GrupoRequest("Invernada");

        mockMvc.perform(put("/api/grupos/{id}", otro.getGrpId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe un grupo con la descripción Invernada"));
    }

    @Test
    @DisplayName("Actualizar un grupo inexistente devuelve 404")
    void actualizarGrupoInexistenteDevuelve404() throws Exception {
        GrupoRequest request = new GrupoRequest("Invernada");

        mockMvc.perform(put("/api/grupos/{id}", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Grupo no encontrado con id: 999"));
    }

    // ---- DELETE /api/grupos/{id} ----

    @Test
    @DisplayName("Eliminar un grupo sin lotes devuelve 204")
    void eliminarGrupoSinLotesDevuelve204() throws Exception {
        Grupo grupo = crearGrupo("Invernada");

        mockMvc.perform(delete("/api/grupos/{id}", grupo.getGrpId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Eliminar un grupo con lotes devuelve 409 con la cantidad")
    void eliminarGrupoConLotesDevuelve409() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        crearLote("Lote 1", grupo);
        crearLote("Lote 2", grupo);

        mockMvc.perform(delete("/api/grupos/{id}", grupo.getGrpId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el grupo: tiene 2 lotes"));
    }

    @Test
    @DisplayName("Eliminar un grupo inexistente devuelve 404")
    void eliminarGrupoInexistenteDevuelve404() throws Exception {
        mockMvc.perform(delete("/api/grupos/{id}", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Grupo no encontrado con id: 999"));
    }

    // ---- GET /api/grupos/resumen ----

    @Test
    @DisplayName("El resumen trae los lotes de cada grupo, ordenados por descripción, y sus conteos de animales")
    void resumenTraeLotesOrdenadosYConteos() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupo loteB = crearLote("Lote B", grupo);
        SubGrupo loteA = crearLote("Lote A", grupo);
        crearAnimal("CAR-RES-GRP-001", loteA, null);
        crearAnimal("CAR-RES-GRP-002", loteA, LocalDate.of(2026, 6, 1));
        crearAnimal("CAR-RES-GRP-003", loteB, null);

        mockMvc.perform(get("/api/grupos/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.grpId == %d)].cantidadLotes", grupo.getGrpId()).value(2))
                .andExpect(jsonPath("$[?(@.grpId == %d)].cantidadAnimales", grupo.getGrpId()).value(3))
                .andExpect(jsonPath("$[?(@.grpId == %d)].cantidadActivos", grupo.getGrpId()).value(2))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[0].sbId", grupo.getGrpId()).value(loteA.getSbId().intValue()))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[0].cantidadAnimales", grupo.getGrpId()).value(2))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[0].cantidadActivos", grupo.getGrpId()).value(1))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[1].sbId", grupo.getGrpId()).value(loteB.getSbId().intValue()))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[1].cantidadAnimales", grupo.getGrpId()).value(1))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[1].cantidadActivos", grupo.getGrpId()).value(1));
    }

    @Test
    @DisplayName("GET /api/grupos (sin cambios) sigue devolviendo la lista completa de grupos")
    void listarGruposSigueDevolviendoLaListaCompleta() throws Exception {
        crearGrupo("Invernada");

        mockMvc.perform(get("/api/grupos")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].grpDescripcion").value("Invernada"));
    }
}
