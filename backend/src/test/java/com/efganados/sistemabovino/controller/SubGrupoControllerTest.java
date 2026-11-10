package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

import com.efganados.sistemabovino.controller.SubGrupoController.SubGrupoRequest;
import com.efganados.sistemabovino.controller.SubGrupoController.SubGrupoRequest.ReferenciaGrupo;
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
 * Pruebas de integración del catálogo de lotes (SubGrupoController/
 * SubGrupoService): alta y edición validadas (incluida la unicidad de la
 * descripción solo dentro de un mismo grupo) y eliminación bloqueada por
 * animales en uso. Cada prueba crea sus propios datos y la transacción se
 * revierte al finalizar. Todas las peticiones llevan el token del
 * administrador inicial (ver {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SubGrupoControllerTest extends AutenticacionTestSupport {

    @Autowired
    private SubGrupoRepository subGrupoRepository;

    @Autowired
    private GrupoRepository grupoRepository;

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
    private Animal crearAnimal(String caravana, SubGrupo subGrupo) {
        Animal animal = new Animal();
        animal.setDuenio(crearPersona("Dueño-" + caravana));
        animal.setRaza(crearRaza("Raza-" + caravana));
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    // ---- POST /api/subgrupos ----

    @Test
    @DisplayName("Crear un lote con datos válidos devuelve 201 con los datos guardados")
    void crearLoteConDatosValidosDevuelve201() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sbDescripcion").value("Lote 1"))
                .andExpect(jsonPath("$.grupo.grpId").value(grupo.getGrpId()))
                .andExpect(jsonPath("$.sbId").isNotEmpty());
    }

    @Test
    @DisplayName("Crear un lote recorta espacios de los extremos de la descripción")
    void crearLoteRecortaEspacios() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupoRequest request = new SubGrupoRequest("  Lote 1  ", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sbDescripcion").value("Lote 1"));
    }

    @Test
    @DisplayName("Crear un lote sin descripción devuelve 400")
    void crearLoteSinDescripcionDevuelve400() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupoRequest request = new SubGrupoRequest(null, new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo sbDescripcion"));
    }

    @Test
    @DisplayName("Crear un lote sin grupo devuelve 400")
    void crearLoteSinGrupoDevuelve400() throws Exception {
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", null);

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo grpId"));
    }

    @Test
    @DisplayName("Crear un lote con un grupo inexistente devuelve 404")
    void crearLoteConGrupoInexistenteDevuelve404() throws Exception {
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(999L));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Grupo no encontrado con id: 999"));
    }

    @Test
    @DisplayName("Crear un lote con una descripción que ya existe en el mismo grupo, en otra mayúscula, devuelve 409")
    void crearLoteConDescripcionDuplicadaEnElMismoGrupoDevuelve409() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        crearLote("Lote 1", grupo);
        SubGrupoRequest request = new SubGrupoRequest("LOTE 1", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("Ya existe un lote con la descripción LOTE 1")))
                .andExpect(content().string(containsString("en el grupo Invernada")));
    }

    @Test
    @DisplayName("Crear un lote con el mismo nombre que uno de otro grupo está permitido")
    void crearLoteConElMismoNombreEnOtroGrupoEstaPermitido() throws Exception {
        Grupo invernada = crearGrupo("Invernada");
        Grupo engorde = crearGrupo("Engorde");
        crearLote("Lote 1", invernada);
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(engorde.getGrpId()));

        mockMvc.perform(post("/api/subgrupos")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sbDescripcion").value("Lote 1"))
                .andExpect(jsonPath("$.grupo.grpId").value(engorde.getGrpId()));
    }

    // ---- PUT /api/subgrupos/{id} ----

    @Test
    @DisplayName("Actualizar un lote cambiándolo de grupo devuelve 200 con el nuevo grupo")
    void actualizarLoteCambiandoDeGrupoDevuelve200() throws Exception {
        Grupo invernada = crearGrupo("Invernada");
        Grupo engorde = crearGrupo("Engorde");
        SubGrupo lote = crearLote("Lote 1", invernada);
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(engorde.getGrpId()));

        mockMvc.perform(put("/api/subgrupos/{id}", lote.getSbId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grupo.grpId").value(engorde.getGrpId()));
    }

    @Test
    @DisplayName("Actualizar un lote conservando su propia descripción en su mismo grupo devuelve 200")
    void actualizarLoteConservandoSuPropiaDescripcionDevuelve200() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupo lote = crearLote("Lote 1", grupo);
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(put("/api/subgrupos/{id}", lote.getSbId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sbDescripcion").value("Lote 1"));
    }

    @Test
    @DisplayName("Actualizar un lote con la descripción de otro lote del mismo grupo devuelve 409")
    void actualizarLoteConDescripcionDeOtroLoteDelMismoGrupoDevuelve409() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        crearLote("Lote 1", grupo);
        SubGrupo otro = crearLote("Lote 2", grupo);
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(put("/api/subgrupos/{id}", otro.getSbId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("Ya existe un lote con la descripción Lote 1")));
    }

    @Test
    @DisplayName("Actualizar un lote inexistente devuelve 404")
    void actualizarLoteInexistenteDevuelve404() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupoRequest request = new SubGrupoRequest("Lote 1", new ReferenciaGrupo(grupo.getGrpId()));

        mockMvc.perform(put("/api/subgrupos/{id}", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("SubGrupo no encontrado con id: 999"));
    }

    // ---- DELETE /api/subgrupos/{id} ----

    @Test
    @DisplayName("Eliminar un lote sin animales devuelve 204")
    void eliminarLoteSinAnimalesDevuelve204() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupo lote = crearLote("Lote 1", grupo);

        mockMvc.perform(delete("/api/subgrupos/{id}", lote.getSbId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Eliminar un lote con animales devuelve 409 con la cantidad")
    void eliminarLoteConAnimalesDevuelve409() throws Exception {
        Grupo grupo = crearGrupo("Invernada");
        SubGrupo lote = crearLote("Lote 1", grupo);
        crearAnimal("CAR-SUB-001", lote);
        crearAnimal("CAR-SUB-002", lote);

        mockMvc.perform(delete("/api/subgrupos/{id}", lote.getSbId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el lote: tiene 2 animales"));
    }

    @Test
    @DisplayName("Eliminar un lote inexistente devuelve 404")
    void eliminarLoteInexistenteDevuelve404() throws Exception {
        mockMvc.perform(delete("/api/subgrupos/{id}", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("SubGrupo no encontrado con id: 999"));
    }
}
