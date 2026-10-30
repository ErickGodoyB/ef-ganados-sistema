package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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

import com.efganados.sistemabovino.controller.AnimalController.NuevoPesajeRequest;
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
 * Pruebas de integración del endpoint de registro de pesajes
 * ({@code POST /api/animales/{id}/pesajes} en {@link AnimalController}).
 * Cada prueba crea sus propios datos (raza, dueño, responsable, grupo,
 * subgrupo y animal) directamente por repositorio, y la transacción se
 * revierte al finalizar. Todas las peticiones llevan el token del
 * administrador inicial (ver {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PesajeControllerTest extends AutenticacionTestSupport {

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

    /** Crea y persiste un animal de prueba completo (raza, dueño, grupo y subgrupo propios). */
    private Animal crearAnimal(String caravana) {
        Persona duenio = crearPersona("Dueño-" + caravana);
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Lote-" + caravana);
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion("SubGrupo-" + caravana);
        subGrupoRepository.save(subGrupo);

        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    @Test
    @DisplayName("Registrar un pesaje con datos válidos devuelve 201")
    void registrarPesajeConDatosValidosDevuelve201() throws Exception {
        Animal animal = crearAnimal("CAR-PESAJE-001");
        Persona responsable = crearPersona("Responsable-001");

        NuevoPesajeRequest request = new NuevoPesajeRequest(250.0, LocalDate.of(2026, 2, 1), responsable.getPerId());

        mockMvc.perform(post("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.pesaId").exists())
                .andExpect(jsonPath("$.pesaPeso").value(250.0))
                .andExpect(jsonPath("$.animal.aniId").value(animal.getAniId()))
                .andExpect(jsonPath("$.responsable.perId").value(responsable.getPerId()));
    }

    @Test
    @DisplayName("Registrar un pesaje sin responsableId devuelve 400 indicando el campo faltante")
    void registrarPesajeSinResponsableIdDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-PESAJE-002");

        NuevoPesajeRequest request = new NuevoPesajeRequest(250.0, LocalDate.of(2026, 2, 1), null);

        mockMvc.perform(post("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo responsableId"));
    }

    @Test
    @DisplayName("Registrar un pesaje con fecha anterior al ingreso del animal devuelve 400")
    void registrarPesajeConFechaAnteriorAlIngresoDevuelve400() throws Exception {
        // Reproduce el reporte: animal con ingreso 2026-07-26, pesaje con
        // fecha 2026-07-05 (anterior). El servidor debe rechazarlo.
        Persona duenio = crearPersona("Dueño-TEST-25");
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-TEST-25");
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Lote-TEST-25");
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion("SubGrupo-TEST-25");
        subGrupoRepository.save(subGrupo);

        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana("TEST-25");
        animal.setAniFechaIngreso(LocalDate.of(2026, 7, 26));
        animal.setAniPesoInicial(200.0);
        animalRepository.save(animal);

        Persona responsable = crearPersona("Responsable-TEST-25");
        NuevoPesajeRequest request = new NuevoPesajeRequest(210.0, LocalDate.of(2026, 7, 5), responsable.getPerId());

        mockMvc.perform(post("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "La fecha del pesaje no puede ser anterior al ingreso del animal (TEST-25: 2026-07-26)"));
    }

    @Test
    @DisplayName("Registrar un pesaje para un animal que ya tiene un pesaje activo ese día devuelve 409")
    void registrarPesajeConAnimalYaPesadoEseDiaDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-PESAJE-DUP-001");
        Persona responsable = crearPersona("Responsable-Dup-001");
        LocalDate fecha = LocalDate.of(2026, 2, 1);

        NuevoPesajeRequest primero = new NuevoPesajeRequest(250.0, fecha, responsable.getPerId());
        mockMvc.perform(post("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(primero)))
                .andExpect(status().isCreated());

        NuevoPesajeRequest segundo = new NuevoPesajeRequest(260.0, fecha, responsable.getPerId());
        mockMvc.perform(post("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(segundo)))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "El animal CAR-PESAJE-DUP-001 ya tiene un pesaje activo el 01/02/2026. Editá ese pesaje o anulalo."));
    }

    @Test
    @DisplayName("Registrar un pesaje para un animal inexistente devuelve 404")
    void registrarPesajeConAnimalInexistenteDevuelve404() throws Exception {
        Persona responsable = crearPersona("Responsable-003");

        NuevoPesajeRequest request = new NuevoPesajeRequest(250.0, LocalDate.of(2026, 2, 1), responsable.getPerId());

        mockMvc.perform(post("/api/animales/{id}/pesajes", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }
}
