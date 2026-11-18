package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Pruebas del proveedor opcional del animal: alta y edición (con proveedor,
 * sin proveedor, proveedor inexistente, persona de otro tipo) y su aparición
 * en el resumen. Cada prueba crea sus datos y la transacción se revierte.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnimalProveedorControllerTest extends AutenticacionTestSupport {

    private static final String MENSAJE_TIPO = "La persona indicada como proveedor debe ser de tipo PROVEEDOR";

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

    private String token;
    private Persona duenio;
    private Raza raza;
    private SubGrupo lote;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
        duenio = persona("Dueño", "Prueba", "PROPIETARIO");
        raza = new Raza();
        raza.setRzDescripcion("Raza-Prov");
        raza.setRzPesoObjetivoVenta(450.0);
        raza = razaRepository.save(raza);
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-Prov");
        grupoRepository.save(grupo);
        lote = new SubGrupo();
        lote.setGrupo(grupo);
        lote.setSbDescripcion("Lote-Prov");
        lote = subGrupoRepository.save(lote);
    }

    private Persona persona(String nombre, String apellido, String tipo) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido(apellido);
        persona.setPerTipo(tipo);
        return personaRepository.save(persona);
    }

    private AnimalRequest request(String caravana, Long proveedorId) {
        return new AnimalRequest(duenio.getPerId(), raza.getRzId(), lote.getSbId(), caravana,
                LocalDate.of(2026, 1, 1), 200.0, null, null, proveedorId);
    }

    private Animal animalExistente(String caravana, Persona proveedor) {
        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(lote);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        animal.setProveedor(proveedor);
        return animalRepository.save(animal);
    }

    private org.springframework.test.web.servlet.ResultActions crear(AnimalRequest request) throws Exception {
        return mockMvc.perform(post("/api/animales")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private org.springframework.test.web.servlet.ResultActions editar(Long id, AnimalRequest request) throws Exception {
        return mockMvc.perform(put("/api/animales/{id}", id)
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    // ---- alta ----

    @Test
    @DisplayName("Crear un animal con un proveedor válido devuelve 201 y lo guarda")
    void crearConProveedor() throws Exception {
        Persona proveedor = persona("Pedro", "Vera", "PROVEEDOR");

        crear(request("PROV-001", proveedor.getPerId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.proveedor.perId").value(proveedor.getPerId()));

        Animal guardado = animalRepository.findAll().stream()
                .filter(a -> "PROV-001".equals(a.getAniCaravana())).findFirst().orElseThrow();
        assertEquals(proveedor.getPerId(), guardado.getProveedor().getPerId());
    }

    @Test
    @DisplayName("Crear un animal sin proveedorId lo deja sin proveedor")
    void crearSinProveedor() throws Exception {
        crear(request("PROV-002", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.proveedor").value(nullValue()));

        Animal guardado = animalRepository.findAll().stream()
                .filter(a -> "PROV-002".equals(a.getAniCaravana())).findFirst().orElseThrow();
        assertNull(guardado.getProveedor());
    }

    @Test
    @DisplayName("Crear un animal con un proveedorId inexistente devuelve 404")
    void crearConProveedorInexistenteDevuelve404() throws Exception {
        crear(request("PROV-003", 99999L))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 99999"));
    }

    @Test
    @DisplayName("Crear un animal con una persona que no es PROVEEDOR como proveedor devuelve 400")
    void crearConProveedorDeTipoEquivocadoDevuelve400() throws Exception {
        Persona propietario = persona("Pilar", "Gómez", "PROPIETARIO");

        crear(request("PROV-004", propietario.getPerId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(MENSAJE_TIPO));
        assertEquals(0, animalRepository.findAll().stream()
                .filter(a -> "PROV-004".equals(a.getAniCaravana())).count());
    }

    // ---- edición ----

    @Test
    @DisplayName("Editar un animal para asignarle proveedor devuelve 200")
    void editarAsignandoProveedor() throws Exception {
        Animal animal = animalExistente("PROV-010", null);
        Persona proveedor = persona("Pedro", "Vera", "PROVEEDOR");

        editar(animal.getAniId(), request("PROV-010", proveedor.getPerId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proveedor.perId").value(proveedor.getPerId()));
    }

    @Test
    @DisplayName("Editar con proveedorId null le quita el proveedor")
    void editarQuitandoProveedor() throws Exception {
        Persona proveedor = persona("Pedro", "Vera", "PROVEEDOR");
        Animal animal = animalExistente("PROV-011", proveedor);

        editar(animal.getAniId(), request("PROV-011", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.proveedor").value(nullValue()));
        assertNull(animalRepository.findById(animal.getAniId()).orElseThrow().getProveedor());
    }

    @Test
    @DisplayName("Editar con un proveedorId inexistente devuelve 404")
    void editarConProveedorInexistenteDevuelve404() throws Exception {
        Animal animal = animalExistente("PROV-012", null);

        editar(animal.getAniId(), request("PROV-012", 99999L))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 99999"));
    }

    @Test
    @DisplayName("Editar con una persona que no es PROVEEDOR devuelve 400 y no cambia el animal")
    void editarConProveedorDeTipoEquivocadoDevuelve400() throws Exception {
        Persona proveedor = persona("Pedro", "Vera", "PROVEEDOR");
        Animal animal = animalExistente("PROV-013", proveedor);
        Persona empleado = persona("Eva", "Ríos", "EMPLEADO");

        editar(animal.getAniId(), request("PROV-013", empleado.getPerId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(MENSAJE_TIPO));
        assertEquals(proveedor.getPerId(),
                animalRepository.findById(animal.getAniId()).orElseThrow().getProveedor().getPerId());
    }

    @Test
    @DisplayName("Un request sin proveedorId (formato anterior) se acepta como sin proveedor")
    void requestSinCampoProveedorId() throws Exception {
        String cuerpo = "{\"duenioId\":" + duenio.getPerId() + ",\"razaId\":" + raza.getRzId()
                + ",\"subGrupoId\":" + lote.getSbId() + ",\"aniCaravana\":\"PROV-014\","
                + "\"aniFechaIngreso\":\"2026-01-01\",\"aniPesoInicial\":200.0}";

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(cuerpo))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.proveedor").value(nullValue()));
    }

    // ---- resumen ----

    @Test
    @DisplayName("El resumen de animales trae proveedorId y proveedorNombre, o null si no tiene")
    void resumenConYSinProveedor() throws Exception {
        Persona proveedor = persona("Pedro", "Vera", "PROVEEDOR");
        Animal conProveedor = animalExistente("PROV-020", proveedor);
        Animal sinProveedor = animalExistente("PROV-021", null);

        mockMvc.perform(get("/api/animales/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.aniId == %d)].proveedorId", conProveedor.getAniId())
                        .value(proveedor.getPerId().intValue()))
                .andExpect(jsonPath("$[?(@.aniId == %d)].proveedorNombre", conProveedor.getAniId())
                        .value("Pedro Vera"))
                .andExpect(jsonPath("$[?(@.aniId == %d)].proveedorId", sinProveedor.getAniId()).value(contains(nullValue())))
                .andExpect(jsonPath("$[?(@.aniId == %d)].proveedorNombre", sinProveedor.getAniId())
                        .value(contains(nullValue())));
    }
}
