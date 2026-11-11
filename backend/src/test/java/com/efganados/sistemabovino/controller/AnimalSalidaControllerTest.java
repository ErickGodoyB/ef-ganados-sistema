package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertNull;
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
import com.efganados.sistemabovino.controller.AnimalController.SalidaRequest;
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
 * Pruebas de integración de la salida de un animal (PUT /api/animales/{id}/salida),
 * su reactivación (PUT /api/animales/{id}/reactivar) y la garantía de que el
 * alta/edición común (POST y PUT /api/animales) nunca la toca. La lógica
 * vive en {@code AnimalService}; las pruebas de creación/edición/borrado
 * "comunes" del animal están en {@link AnimalControllerTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AnimalSalidaControllerTest extends AutenticacionTestSupport {

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private RazaRepository razaRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private PesajesRepository pesajesRepository;

    @Autowired
    private GrupoRepository grupoRepository;

    @Autowired
    private SubGrupoRepository subGrupoRepository;

    private String token;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    private Persona crearPersona(String nombre, String tipo) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido("Apellido");
        persona.setPerTipo(tipo);
        return personaRepository.save(persona);
    }

    /** Crea un subgrupo de prueba (AnimalRequest exige subGrupoId para el alta/edición común). */
    private SubGrupo crearSubGrupo(String descripcion) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-" + descripcion);
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcion);
        return subGrupoRepository.save(subGrupo);
    }

    private Animal crearAnimal(String caravana, LocalDate fechaIngreso) {
        Persona duenio = crearPersona("Dueño-" + caravana, "PROPIETARIO");
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(fechaIngreso);
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    private Pesajes registrarPesajeDirecto(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(animal.getDuenio());
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        return pesajesRepository.save(pesaje);
    }

    // ---- PUT /api/animales/{id}/salida ----

    @Test
    @DisplayName("Registrar la salida por MUERTE, sin comprador, devuelve 200 con el formato del resumen")
    void registrarSalidaPorMuerteSinCompradorDevuelve200() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-001", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniId").value(animal.getAniId()))
                .andExpect(jsonPath("$.aniFechaEgreso").value("2026-06-01"))
                .andExpect(jsonPath("$.aniMotivoSalida").value("MUERTE"))
                .andExpect(jsonPath("$.aniNotaSalida").value(nullValue()))
                .andExpect(jsonPath("$.compradorId").value(nullValue()))
                .andExpect(jsonPath("$.compradorNombre").value(nullValue()));
    }

    @Test
    @DisplayName("Registrar la salida por VENTA con comprador devuelve 200 con los datos del comprador")
    void registrarSalidaPorVentaConCompradorDevuelve200() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-002", LocalDate.of(2026, 1, 1));
        Persona comprador = crearPersona("Comprador Dos", "CLIENTE");
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "VENTA", "Venta de prueba",
                comprador.getPerId());

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniMotivoSalida").value("VENTA"))
                .andExpect(jsonPath("$.aniNotaSalida").value("Venta de prueba"))
                .andExpect(jsonPath("$.compradorId").value(comprador.getPerId()))
                .andExpect(jsonPath("$.compradorNombre").value("Comprador Dos Apellido"));
    }

    @Test
    @DisplayName("Registrar la salida sin fecha devuelve 400")
    void registrarSalidaSinFechaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-003", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(null, "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo fecha"));
    }

    @Test
    @DisplayName("Registrar la salida con una fecha futura devuelve 400")
    void registrarSalidaConFechaFuturaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-004", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.now().plusDays(1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha de salida no puede ser futura"));
    }

    @Test
    @DisplayName("Registrar la salida con una fecha anterior al ingreso devuelve 400 nombrando la caravana")
    void registrarSalidaConFechaAnteriorAlIngresoDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-005", LocalDate.of(2026, 3, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 2, 1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha de salida no puede ser anterior al ingreso del animal (CAR-SAL-005: 2026-03-01)"));
    }

    @Test
    @DisplayName("Registrar la salida con una fecha anterior al último pesaje activo devuelve 400 nombrando la caravana")
    void registrarSalidaConFechaAnteriorAlUltimoPesajeDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-006", LocalDate.of(2026, 1, 1));
        registrarPesajeDirecto(animal, 220.0, LocalDate.of(2026, 5, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 4, 1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha de salida no puede ser anterior al último pesaje del animal (CAR-SAL-006: 01/05/2026)"));
    }

    @Test
    @DisplayName("Registrar la salida sin motivo devuelve 400")
    void registrarSalidaSinMotivoDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-007", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), null, null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo motivo"));
    }

    @Test
    @DisplayName("Registrar la salida con un motivo inválido devuelve 400")
    void registrarSalidaConMotivoInvalidoDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-008", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "ROBO", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El motivo debe ser VENTA, MUERTE, OTRO"));
    }

    @Test
    @DisplayName("Registrar la salida con motivo OTRO sin nota devuelve 400")
    void registrarSalidaConMotivoOtroSinNotaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-009", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "OTRO", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo nota"));
    }

    @Test
    @DisplayName("Registrar la salida con motivo OTRO y nota devuelve 200")
    void registrarSalidaConMotivoOtroYNotaDevuelve200() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-010", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "OTRO", "Se perdió en el monte", null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniNotaSalida").value("Se perdió en el monte"));
    }

    @Test
    @DisplayName("Registrar la salida con comprador y un motivo distinto de VENTA devuelve 400")
    void registrarSalidaConCompradorYMotivoDistintoDeVentaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-011", LocalDate.of(2026, 1, 1));
        Persona comprador = crearPersona("Comprador Once", "CLIENTE");
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "MUERTE", null, comprador.getPerId());

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El comprador solo se puede indicar cuando el motivo es VENTA"));
    }

    @Test
    @DisplayName("Registrar la salida con un comprador inexistente devuelve 404")
    void registrarSalidaConCompradorInexistenteDevuelve404() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-012", LocalDate.of(2026, 1, 1));
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "VENTA", null, 999L);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 999"));
    }

    @Test
    @DisplayName("Registrar la salida de un animal que ya tiene una salida registrada devuelve 409")
    void registrarSalidaDeAnimalYaConSalidaDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-SAL-013", LocalDate.of(2026, 1, 1));
        animal.setAniFechaEgreso(LocalDate.of(2026, 5, 1));
        animal.setAniMotivoSalida("MUERTE");
        animalRepository.save(animal);

        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("El animal CAR-SAL-013 ya tiene una salida registrada"));
    }

    @Test
    @DisplayName("Registrar la salida de un animal inexistente devuelve 404")
    void registrarSalidaDeAnimalInexistenteDevuelve404() throws Exception {
        SalidaRequest request = new SalidaRequest(LocalDate.of(2026, 6, 1), "MUERTE", null, null);

        mockMvc.perform(put("/api/animales/{id}/salida", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }

    // ---- PUT /api/animales/{id}/reactivar ----

    @Test
    @DisplayName("Reactivar un animal con salida registrada borra la salida y devuelve 200")
    void reactivarAnimalConSalidaDevuelve200() throws Exception {
        Animal animal = crearAnimal("CAR-REA-001", LocalDate.of(2026, 1, 1));
        Persona comprador = crearPersona("Comprador Reactivar", "CLIENTE");
        animal.setAniFechaEgreso(LocalDate.of(2026, 5, 1));
        animal.setAniMotivoSalida("VENTA");
        animal.setAniNotaSalida("Nota de venta");
        animal.setComprador(comprador);
        animalRepository.save(animal);

        mockMvc.perform(put("/api/animales/{id}/reactivar", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniFechaEgreso").value(nullValue()))
                .andExpect(jsonPath("$.aniMotivoSalida").value(nullValue()))
                .andExpect(jsonPath("$.aniNotaSalida").value(nullValue()))
                .andExpect(jsonPath("$.compradorId").value(nullValue()));

        Animal recargado = animalRepository.findById(animal.getAniId()).orElseThrow();
        assertNull(recargado.getAniFechaEgreso());
        assertNull(recargado.getComprador());
    }

    @Test
    @DisplayName("Reactivar un animal sin salida registrada devuelve 409")
    void reactivarAnimalSinSalidaDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-REA-002", LocalDate.of(2026, 1, 1));

        mockMvc.perform(put("/api/animales/{id}/reactivar", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("El animal CAR-REA-002 no tiene una salida registrada"));
    }

    @Test
    @DisplayName("Reactivar un animal con un pesaje activo posterior a la salida devuelve 409")
    void reactivarAnimalConPesajeActivoPosteriorALaSalidaDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-REA-003", LocalDate.of(2026, 1, 1));
        animal.setAniFechaEgreso(LocalDate.of(2026, 5, 1));
        animal.setAniMotivoSalida("MUERTE");
        animalRepository.save(animal);
        // Pesaje posterior a la salida, cargado directo por repositorio (algo que
        // en la práctica llegaría por un cambio de fecha de sesión; ver el 400
        // agregado en PesajeService.cambiarFechaSesion para bloquearlo en ese
        // punto, pero reactivar() igual lo rechaza si de algún modo ocurriera).
        registrarPesajeDirecto(animal, 230.0, LocalDate.of(2026, 5, 15));

        mockMvc.perform(put("/api/animales/{id}/reactivar", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede reactivar el animal CAR-REA-003: tiene un pesaje activo posterior a su salida"));
    }

    @Test
    @DisplayName("Reactivar un animal inexistente devuelve 404")
    void reactivarAnimalInexistenteDevuelve404() throws Exception {
        mockMvc.perform(put("/api/animales/{id}/reactivar", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }

    // ---- PUT /api/animales/{id} (edición común) no debe tocar la salida ----

    @Test
    @DisplayName("Editar un animal con salida registrada conserva la salida e ignora el egreso que llegue en el cuerpo")
    void editarAnimalConSalidaConservaLaSalida() throws Exception {
        Animal animal = crearAnimal("CAR-PUT-SAL-001", LocalDate.of(2026, 1, 1));
        Persona comprador = crearPersona("Comprador Put", "CLIENTE");
        animal.setAniFechaEgreso(LocalDate.of(2026, 5, 1));
        animal.setAniMotivoSalida("VENTA");
        animal.setAniNotaSalida("Nota original");
        animal.setComprador(comprador);
        animalRepository.save(animal);

        SubGrupo subGrupo = crearSubGrupo("Lote-PutSalida");

        // El cuerpo manda un egreso distinto (y motivo implícito ninguno, porque
        // AnimalRequest no tiene esos campos): debe ignorarse por completo.
        AnimalRequest request = new AnimalRequest(animal.getDuenio().getPerId(), animal.getRaza().getRzId(),
                subGrupo.getSbId(), "CAR-PUT-SAL-001", LocalDate.of(2026, 1, 1), 200.0, LocalDate.of(2026, 1, 15),
                "Observación nueva");

        mockMvc.perform(put("/api/animales/{id}", animal.getAniId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.aniObservacion").value("Observación nueva"))
                .andExpect(jsonPath("$.aniFechaEgreso").value("2026-05-01"))
                .andExpect(jsonPath("$.aniMotivoSalida").value("VENTA"))
                .andExpect(jsonPath("$.aniNotaSalida").value("Nota original"))
                .andExpect(jsonPath("$.comprador.perId").value(comprador.getPerId()));
    }

    @Test
    @DisplayName("Crear un animal no completa su salida, y sí completa aniFechaRegistro")
    void crearAnimalNoCompletaSalidaYCompletaFechaRegistro() throws Exception {
        Persona duenio = crearPersona("Dueño-Crear-Registro", "PROPIETARIO");
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-Crear-Registro");
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);
        SubGrupo subGrupo = crearSubGrupo("Lote-CrearRegistro");

        AnimalRequest request = new AnimalRequest(duenio.getPerId(), raza.getRzId(), subGrupo.getSbId(),
                "CAR-CREAR-REG-001", LocalDate.of(2026, 1, 1), 200.0, LocalDate.of(2026, 1, 2), null);

        mockMvc.perform(post("/api/animales")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.aniFechaEgreso").value(nullValue()))
                .andExpect(jsonPath("$.aniFechaRegistro").exists());
    }
}
