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

import com.efganados.sistemabovino.controller.RazaController.RazaRequest;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.RazaRepository;

/**
 * Pruebas de integración del catálogo de razas (RazaController/RazaService):
 * alta y edición validadas, eliminación bloqueada por animales en uso, y el
 * resumen con el conteo de animales de cada raza. Cada prueba crea sus
 * propios datos y la transacción se revierte al finalizar. Todas las
 * peticiones llevan el token del administrador inicial (ver
 * {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RazaControllerTest extends AutenticacionTestSupport {

    @Autowired
    private RazaRepository razaRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PersonaRepository personaRepository;

    private String token;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    /** Crea y persiste una raza de prueba directamente por repositorio. */
    private Raza crearRaza(String descripcion, double pesoObjetivoVenta) {
        Raza raza = new Raza();
        raza.setRzDescripcion(descripcion);
        raza.setRzPesoObjetivoVenta(pesoObjetivoVenta);
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

    /** Crea y persiste un animal de prueba de la raza dada, directamente por repositorio (sin subgrupo). */
    private Animal crearAnimal(String caravana, Raza raza, LocalDate fechaEgreso) {
        Animal animal = new Animal();
        animal.setDuenio(crearPersona("Dueño-" + caravana));
        animal.setRaza(raza);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        animal.setAniFechaEgreso(fechaEgreso);
        return animalRepository.save(animal);
    }

    // ---- POST /api/razas ----

    @Test
    @DisplayName("Crear una raza con datos válidos devuelve 201 con los datos guardados")
    void crearRazaConDatosValidosDevuelve201() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", 450.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rzDescripcion").value("Brangus"))
                .andExpect(jsonPath("$.rzPesoObjetivoVenta").value(450.0))
                .andExpect(jsonPath("$.rzId").isNotEmpty());
    }

    @Test
    @DisplayName("Crear una raza recorta espacios de los extremos de la descripción")
    void crearRazaRecortaEspacios() throws Exception {
        RazaRequest request = new RazaRequest("  Nelore  ", 420.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rzDescripcion").value("Nelore"));
    }

    @Test
    @DisplayName("Crear una raza sin descripción devuelve 400")
    void crearRazaSinDescripcionDevuelve400() throws Exception {
        RazaRequest request = new RazaRequest(null, 450.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo rzDescripcion"));
    }

    @Test
    @DisplayName("Crear una raza sin peso objetivo de venta devuelve 400")
    void crearRazaSinPesoDevuelve400() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", null);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo rzPesoObjetivoVenta"));
    }

    @Test
    @DisplayName("Crear una raza con peso objetivo de venta 0 devuelve 400")
    void crearRazaConPesoCeroDevuelve400() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", 0.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El peso objetivo de venta debe ser mayor a 0 y hasta 2000 kg"));
    }

    @Test
    @DisplayName("Crear una raza con peso objetivo de venta 2001 devuelve 400")
    void crearRazaConPeso2001Devuelve400() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", 2001.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El peso objetivo de venta debe ser mayor a 0 y hasta 2000 kg"));
    }

    @Test
    @DisplayName("Crear una raza con peso objetivo de venta exactamente 2000 devuelve 201 (límite incluido)")
    void crearRazaConPeso2000Devuelve201() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", 2000.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.rzPesoObjetivoVenta").value(2000.0));
    }

    @Test
    @DisplayName("Crear una raza con una descripción que ya existe, en otra mayúscula, devuelve 409")
    void crearRazaConDescripcionDuplicadaDevuelve409() throws Exception {
        crearRaza("Brangus", 450.0);
        RazaRequest request = new RazaRequest("BRANGUS", 450.0);

        mockMvc.perform(post("/api/razas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe una raza con la descripción BRANGUS"));
    }

    // ---- PUT /api/razas/{id} ----

    @Test
    @DisplayName("Actualizar una raza conservando su propia descripción devuelve 200")
    void actualizarRazaConservandoSuPropiaDescripcionDevuelve200() throws Exception {
        Raza raza = crearRaza("Brangus", 450.0);
        RazaRequest request = new RazaRequest("Brangus", 460.0);

        mockMvc.perform(put("/api/razas/{id}", raza.getRzId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rzDescripcion").value("Brangus"))
                .andExpect(jsonPath("$.rzPesoObjetivoVenta").value(460.0));
    }

    @Test
    @DisplayName("Actualizar una raza con la descripción de otra raza devuelve 409")
    void actualizarRazaConDescripcionDeOtraRazaDevuelve409() throws Exception {
        crearRaza("Brangus", 450.0);
        Raza otra = crearRaza("Nelore", 420.0);
        RazaRequest request = new RazaRequest("Brangus", 420.0);

        mockMvc.perform(put("/api/razas/{id}", otra.getRzId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe una raza con la descripción Brangus"));
    }

    @Test
    @DisplayName("Actualizar una raza inexistente devuelve 404")
    void actualizarRazaInexistenteDevuelve404() throws Exception {
        RazaRequest request = new RazaRequest("Brangus", 450.0);

        mockMvc.perform(put("/api/razas/{id}", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Raza no encontrada con id: 999"));
    }

    // ---- DELETE /api/razas/{id} ----

    @Test
    @DisplayName("Eliminar una raza sin animales devuelve 204")
    void eliminarRazaSinAnimalesDevuelve204() throws Exception {
        Raza raza = crearRaza("Brangus", 450.0);

        mockMvc.perform(delete("/api/razas/{id}", raza.getRzId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Eliminar una raza con animales (incluso con salida registrada) devuelve 409 con la cantidad")
    void eliminarRazaConAnimalesDevuelve409() throws Exception {
        Raza raza = crearRaza("Brangus", 450.0);
        crearAnimal("CAR-RAZA-001", raza, null);
        crearAnimal("CAR-RAZA-002", raza, LocalDate.of(2026, 6, 1));

        mockMvc.perform(delete("/api/razas/{id}", raza.getRzId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la raza: tiene 2 animales"));
    }

    @Test
    @DisplayName("Eliminar una raza inexistente devuelve 404")
    void eliminarRazaInexistenteDevuelve404() throws Exception {
        mockMvc.perform(delete("/api/razas/{id}", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Raza no encontrada con id: 999"));
    }

    // ---- GET /api/razas/resumen ----

    @Test
    @DisplayName("El resumen trae la cantidad de animales de cada raza, incluso los que tienen salida registrada")
    void resumenTraeCantidadDeAnimalesIncluidosLosConSalida() throws Exception {
        Raza conAnimales = crearRaza("Brangus", 450.0);
        crearAnimal("CAR-RES-RAZA-001", conAnimales, null);
        crearAnimal("CAR-RES-RAZA-002", conAnimales, LocalDate.of(2026, 6, 1));
        Raza sinAnimales = crearRaza("Nelore", 420.0);

        mockMvc.perform(get("/api/razas/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.rzId == %d)].cantidadAnimales", conAnimales.getRzId()).value(2))
                .andExpect(jsonPath("$[?(@.rzId == %d)].rzDescripcion", conAnimales.getRzId()).value("Brangus"))
                .andExpect(jsonPath("$[?(@.rzId == %d)].cantidadAnimales", sinAnimales.getRzId()).value(0));
    }

    @Test
    @DisplayName("GET /api/razas (sin cambios) sigue devolviendo la lista completa de razas")
    void listarRazasSigueDevolviendoLaListaCompleta() throws Exception {
        crearRaza("Brangus", 450.0);

        mockMvc.perform(get("/api/razas")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].rzDescripcion").value("Brangus"));
    }
}
