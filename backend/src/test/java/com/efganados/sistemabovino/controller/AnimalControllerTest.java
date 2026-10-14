package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
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

import tools.jackson.databind.ObjectMapper;

/**
 * Pruebas de integración de {@link AnimalController}: creación, actualización
 * y borrado de animales vía MockMvc contra la base H2 en memoria. Cada prueba
 * crea sus propios datos (raza, persona dueño, grupo y subgrupo) y la
 * transacción se revierte al finalizar, dejando la base limpia para la
 * siguiente prueba.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnimalControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

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

    @Test
    @DisplayName("Crear un animal con IDs válidos devuelve 201 con las relaciones completas")
    void crearAnimalConIdsValidosDevuelve201ConRelacionesCompletas() throws Exception {
        Persona duenio = crearPersona("Dueño1");
        Raza raza = crearRaza("Raza-Crear-OK", 450.0);
        SubGrupo subGrupo = crearSubGrupo("SubGrupo-Crear-OK");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "CAR-001", LocalDate.of(2026, 1, 1), 200.0, null, "Observación inicial");

        mockMvc.perform(post("/api/animales")
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

        mockMvc.perform(delete("/api/animales/{id}", animal.getAniId()))
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

        mockMvc.perform(delete("/api/animales/{id}", animal.getAniId()))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el animal: tiene pesajes registrados"));
    }

    @Test
    @DisplayName("Listar animales devuelve 200")
    void listarAnimalesDevuelve200() throws Exception {
        mockMvc.perform(get("/api/animales"))
                .andExpect(status().isOk());
    }
}
