package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.controller.PesajesController.ActualizarPesajeRequest;
import com.efganados.sistemabovino.controller.PesajesController.AnularPesajeRequest;
import com.efganados.sistemabovino.controller.PesajesController.ItemSesionPesajeRequest;
import com.efganados.sistemabovino.controller.PesajesController.SesionPesajeRequest;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
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
 * Pruebas de integración de la "sesión de pesaje" (POST /api/pesajes/sesion,
 * GET /api/pesajes/sesiones, GET /api/pesajes/sesiones/detalle) y de la
 * edición/borrado de un pesaje puntual (PUT y DELETE /api/pesajes/{id}),
 * todos en {@link PesajesController}, con la lógica en {@code PesajeService}
 * y las reglas de negocio del pesaje centralizadas en
 * {@code AnimalService.registrarPesaje}. Cada prueba crea sus propios datos
 * directamente por repositorio, y la transacción se revierte al finalizar.
 * Todas las peticiones llevan el token del administrador inicial (ver
 * {@link AutenticacionTestSupport}). La prueba de atomicidad de la sesión
 * vive aparte, en {@link PesajeSesionAtomicidadTest} (ver el porqué ahí).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PesajeSesionControllerTest extends AutenticacionTestSupport {

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

    private String token;
    private Persona responsable;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
        responsable = crearPersona("Responsable");
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
        persona.setPerCorreo(nombre.toLowerCase().replace(" ", ".") + "@test.com");
        persona.setPerDireccion("Dirección de prueba");
        return personaRepository.save(persona);
    }

    /** Crea y persiste un subgrupo de prueba, junto con su grupo contenedor. */
    private SubGrupo crearSubGrupo(String descripcion, String descripcionGrupo) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion(descripcionGrupo);
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcion);
        return subGrupoRepository.save(subGrupo);
    }

    /** Crea y persiste un animal de prueba, con una raza propia (peso objetivo de venta 450 kg). */
    private Animal crearAnimal(String caravana, SubGrupo subGrupo, LocalDate fechaIngreso) {
        Persona duenio = crearPersona("Dueño-" + caravana);
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(fechaIngreso);
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    /** Registra un pesaje directamente por repositorio (sin pasar por las reglas de AnimalService.registrarPesaje). */
    private Pesajes registrarPesajeDirecto(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        return pesajesRepository.save(pesaje);
    }

    /** Registra un pesaje ya ANULADO directamente por repositorio, para probar que se excluye de los cálculos. */
    private Pesajes registrarPesajeAnuladoDirecto(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = registrarPesajeDirecto(animal, peso, fecha);
        pesaje.setPesaEstado(EstadoPesaje.ANULADO);
        return pesajesRepository.save(pesaje);
    }

    // ---- POST /api/pesajes/sesion ----

    @Test
    @DisplayName("Registrar una sesión con 3 animales devuelve 201 y los pesajes quedan guardados")
    void registrarSesionConTresAnimalesDevuelve201YQuedanGuardados() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-1", "Grupo-Sesion-1");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal1 = crearAnimal("CAR-SES-001", subGrupo, ingreso);
        Animal animal2 = crearAnimal("CAR-SES-002", subGrupo, ingreso);
        Animal animal3 = crearAnimal("CAR-SES-003", subGrupo, ingreso);
        LocalDate fecha = LocalDate.of(2026, 2, 1);

        SesionPesajeRequest request = new SesionPesajeRequest(fecha, responsable.getPerId(), List.of(
                new ItemSesionPesajeRequest(animal1.getAniId(), 210.0),
                new ItemSesionPesajeRequest(animal2.getAniId(), 220.0),
                new ItemSesionPesajeRequest(animal3.getAniId(), 230.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].peso").value(210.0))
                .andExpect(jsonPath("$[0].animalId").value(animal1.getAniId()))
                .andExpect(jsonPath("$[2].fecha").value("2026-02-01"));

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", fecha.toString())
                        .param("subGrupoId", subGrupo.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));
    }

    // La prueba de atomicidad ("un ítem inválido -> ninguno se guarda") está
    // en PesajeSesionAtomicidadTest, no acá: esta clase es @Transactional (su
    // transacción envuelve también la de PesajeService.registrarSesion), así
    // que una consulta posterior en la MISMA prueba vería igual los pesajes
    // ya escritos (aunque "marcados para deshacer") hasta que la transacción
    // de la prueba termine de verdad. PesajeSesionAtomicidadTest no usa
    // @Transactional a propósito, justamente para poder comprobar eso en el
    // momento (y limpia a mano lo que crea).

    @Test
    @DisplayName("Registrar una sesión sin ítems devuelve 400")
    void registrarSesionSinItemsDevuelve400() throws Exception {
        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of());

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La sesión debe tener al menos un pesaje"));
    }

    @Test
    @DisplayName("Registrar una sesión con un animal repetido devuelve 400 nombrando la caravana")
    void registrarSesionConAnimalRepetidoDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Repetido", "Grupo-Sesion-Repetido");
        Animal animal = crearAnimal("CAR-SES-REP-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of(
                        new ItemSesionPesajeRequest(animal.getAniId(), 210.0),
                        new ItemSesionPesajeRequest(animal.getAniId(), 215.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El animal CAR-SES-REP-001 está repetido en la sesión"));
    }

    @Test
    @DisplayName("Registrar una sesión con fecha futura devuelve 400")
    void registrarSesionConFechaFuturaDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Futura", "Grupo-Sesion-Futura");
        Animal animal = crearAnimal("CAR-SES-FUT-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.now().plusDays(1), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha del pesaje no puede ser futura"));
    }

    @Test
    @DisplayName("Registrar una sesión con fecha anterior al ingreso del animal devuelve 400")
    void registrarSesionConFechaAnteriorAlIngresoDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Ingreso", "Grupo-Sesion-Ingreso");
        Animal animal = crearAnimal("CAR-SES-ING-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2025, 12, 31), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "La fecha del pesaje no puede ser anterior al ingreso del animal (CAR-SES-ING-001: 2026-01-01)"));
    }

    @Test
    @DisplayName("Registrar una sesión para un animal que ya tiene salida devuelve 409")
    void registrarSesionConAnimalConSalidaDevuelve409() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Salida", "Grupo-Sesion-Salida");
        Animal animal = crearAnimal("CAR-SES-SAL-001", subGrupo, LocalDate.of(2026, 1, 1));
        animal.setAniFechaEgreso(LocalDate.of(2026, 1, 15));
        animalRepository.save(animal);

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("El animal CAR-SES-SAL-001 ya tiene registrada su salida"));
    }

    @Test
    @DisplayName("Registrar una sesión con peso 0 devuelve 400")
    void registrarSesionConPesoCeroDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-PesoCero", "Grupo-Sesion-PesoCero");
        Animal animal = crearAnimal("CAR-SES-PC-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 0.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El peso debe ser mayor a 0 y hasta 2000 kg"));
    }

    @Test
    @DisplayName("Registrar una sesión con peso mayor a 2000 devuelve 400")
    void registrarSesionConPesoMayorA2000Devuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-PesoAlto", "Grupo-Sesion-PesoAlto");
        Animal animal = crearAnimal("CAR-SES-PA-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 2000.1)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El peso debe ser mayor a 0 y hasta 2000 kg"));
    }

    @Test
    @DisplayName("Registrar una sesión con un animal inexistente devuelve 404")
    void registrarSesionConAnimalInexistenteDevuelve404() throws Exception {
        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(999L, 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }

    @Test
    @DisplayName("Registrar una sesión con un responsable inexistente devuelve 404")
    void registrarSesionConResponsableInexistenteDevuelve404() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-SinResponsable", "Grupo-Sesion-SinResponsable");
        Animal animal = crearAnimal("CAR-SES-SR-001", subGrupo, LocalDate.of(2026, 1, 1));

        SesionPesajeRequest request = new SesionPesajeRequest(LocalDate.of(2026, 2, 1), 999L,
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona responsable no encontrada con id: 999"));
    }

    @Test
    @DisplayName("Registrar una sesión para un animal que ya tiene un pesaje activo ese día devuelve 409")
    void registrarSesionConAnimalYaPesadoEseDiaDevuelve409() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Duplicado", "Grupo-Sesion-Duplicado");
        Animal animal = crearAnimal("CAR-SES-DUP-001", subGrupo, LocalDate.of(2026, 1, 1));
        LocalDate fecha = LocalDate.of(2026, 2, 1);
        registrarPesajeDirecto(animal, 200.0, fecha);

        SesionPesajeRequest request = new SesionPesajeRequest(fecha, responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "El animal CAR-SES-DUP-001 ya tiene un pesaje activo el 01/02/2026. Editá ese pesaje o anulalo."));
    }

    @Test
    @DisplayName("Registrar una sesión para un animal con un pesaje ANULADO ese mismo día no choca con la regla de duplicado")
    void registrarSesionConAnimalConPesajeAnuladoEseDiaDevuelve201() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Sesion-Anulado", "Grupo-Sesion-Anulado");
        Animal animal = crearAnimal("CAR-SES-ANU-001", subGrupo, LocalDate.of(2026, 1, 1));
        LocalDate fecha = LocalDate.of(2026, 2, 1);
        registrarPesajeAnuladoDirecto(animal, 200.0, fecha);

        SesionPesajeRequest request = new SesionPesajeRequest(fecha, responsable.getPerId(),
                List.of(new ItemSesionPesajeRequest(animal.getAniId(), 210.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }

    // ---- GET /api/pesajes/sesiones ----

    @Test
    @DisplayName("El resumen de sesiones agrupa por fecha y lote, con total/promedio/mínimo/máximo correctos")
    void resumenDeSesionesAgrupaPorFechaYLote() throws Exception {
        SubGrupo loteA = crearSubGrupo("Lote-Resumen-A", "Grupo-Resumen-A");
        SubGrupo loteB = crearSubGrupo("Lote-Resumen-B", "Grupo-Resumen-B");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 3, 1);

        Animal animalA1 = crearAnimal("CAR-RES-A1", loteA, ingreso);
        Animal animalA2 = crearAnimal("CAR-RES-A2", loteA, ingreso);
        Animal animalB1 = crearAnimal("CAR-RES-B1", loteB, ingreso);
        Animal animalSinLote = crearAnimal("CAR-RES-SL1", null, ingreso);

        registrarPesajeDirecto(animalA1, 200.0, fecha);
        registrarPesajeDirecto(animalA2, 220.0, fecha);
        registrarPesajeDirecto(animalB1, 300.0, fecha);
        registrarPesajeDirecto(animalSinLote, 150.0, fecha);

        mockMvc.perform(get("/api/pesajes/sesiones")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].subGrupoId").value(loteA.getSbId()))
                .andExpect(jsonPath("$[0].cantidad").value(2))
                .andExpect(jsonPath("$[0].total").value(420.0))
                .andExpect(jsonPath("$[0].promedio").value(210.0))
                .andExpect(jsonPath("$[0].minimo").value(200.0))
                .andExpect(jsonPath("$[0].maximo").value(220.0))
                .andExpect(jsonPath("$[1].subGrupoId").value(loteB.getSbId()))
                .andExpect(jsonPath("$[1].cantidad").value(1))
                .andExpect(jsonPath("$[1].total").value(300.0))
                .andExpect(jsonPath("$[2].subGrupoId").value(nullValue()))
                .andExpect(jsonPath("$[2].cantidad").value(1))
                .andExpect(jsonPath("$[2].total").value(150.0));
    }

    @Test
    @DisplayName("El resumen de sesiones no considera pesajes anulados")
    void resumenDeSesionesNoConsideraPesajesAnulados() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-Resumen-Anulado", "Grupo-Resumen-Anulado");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 3, 1);

        Animal animal = crearAnimal("CAR-RES-ANU-001", lote, ingreso);
        registrarPesajeDirecto(animal, 200.0, fecha);
        registrarPesajeAnuladoDirecto(animal, 999.0, fecha);

        mockMvc.perform(get("/api/pesajes/sesiones")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].cantidad").value(1))
                .andExpect(jsonPath("$[0].total").value(200.0));
    }

    // ---- GET /api/pesajes/sesiones/detalle ----

    @Test
    @DisplayName("El detalle de una sesión trae pesoAnterior y GMD correctos (primer pesaje null, mismo día 0.0)")
    void detalleDeSesionTraePesoAnteriorYGmdCorrectos() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Detalle", "Grupo-Detalle");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 4, 1);

        Animal animal1 = crearAnimal("CAR-DET-001", subGrupo, ingreso);
        Animal animal2 = crearAnimal("CAR-DET-002", subGrupo, ingreso);

        // animal1: dos pesajes el mismo día (ej. corrección): el segundo usa el
        // primero como anterior, con 0 días de diferencia -> gmd 0.0.
        registrarPesajeDirecto(animal1, 200.0, fecha);
        registrarPesajeDirecto(animal1, 210.0, fecha);
        // animal2: un único pesaje -> sin anterior.
        registrarPesajeDirecto(animal2, 300.0, fecha);

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", fecha.toString())
                        .param("subGrupoId", subGrupo.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].animalId").value(animal1.getAniId()))
                .andExpect(jsonPath("$[0].peso").value(200.0))
                .andExpect(jsonPath("$[0].pesoAnterior").value(nullValue()))
                .andExpect(jsonPath("$[0].gmd").value(nullValue()))
                .andExpect(jsonPath("$[1].animalId").value(animal1.getAniId()))
                .andExpect(jsonPath("$[1].peso").value(210.0))
                .andExpect(jsonPath("$[1].pesoAnterior").value(200.0))
                .andExpect(jsonPath("$[1].gmd").value(0.0))
                .andExpect(jsonPath("$[2].animalId").value(animal2.getAniId()))
                .andExpect(jsonPath("$[2].pesoAnterior").value(nullValue()))
                .andExpect(jsonPath("$[2].gmd").value(nullValue()));
    }

    @Test
    @DisplayName("El detalle de la sesión \"Sin lote\" (subGrupoId ausente) trae los animales sin lote")
    void detalleDeSesionSinLoteTraeAnimalesSinLote() throws Exception {
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 4, 1);
        Animal animal = crearAnimal("CAR-DET-SL-001", null, ingreso);
        registrarPesajeDirecto(animal, 180.0, fecha);

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", fecha.toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].caravana").value("CAR-DET-SL-001"));
    }

    @Test
    @DisplayName("El detalle de una sesión no incluye pesajes anulados ni los usa como pesoAnterior")
    void detalleDeSesionNoIncluyePesajesAnulados() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Detalle-Anulado", "Grupo-Detalle-Anulado");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);

        Animal animal = crearAnimal("CAR-DET-ANU-001", subGrupo, ingreso);
        // Pesaje anulado antes, que no debe contarse como "anterior".
        registrarPesajeAnuladoDirecto(animal, 150.0, LocalDate.of(2026, 3, 15));
        Pesajes activo = registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 4, 1));
        // Pesaje anulado el mismo día de la sesión consultada: no debe aparecer en el detalle.
        registrarPesajeAnuladoDirecto(animal, 999.0, LocalDate.of(2026, 4, 1));

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", LocalDate.of(2026, 4, 1).toString())
                        .param("subGrupoId", subGrupo.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].animalId").value(animal.getAniId()))
                .andExpect(jsonPath("$[0].peso").value(200.0))
                .andExpect(jsonPath("$[0].pesoAnterior").value(nullValue()))
                .andExpect(jsonPath("$[0].gmd").value(nullValue()));

        // Confirmamos además que el pesaje anulado quedó conservado, no borrado.
        Assertions.assertEquals(3, pesajesRepository.count());
        Assertions.assertNotNull(activo.getPesaId());
    }

    // ---- PUT /api/pesajes/{id} ----

    @Test
    @DisplayName("Actualizar un pesaje con datos válidos devuelve 200 y recalcula la GMD del animal")
    void actualizarPesajeConDatosValidosRecalculaGmd() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Editar", "Grupo-Editar");
        Animal animal = crearAnimal("CAR-EDIT-001", subGrupo, LocalDate.of(2026, 1, 1));
        registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));
        Pesajes segundo = registrarPesajeDirecto(animal, 210.0, LocalDate.of(2026, 1, 21));

        // GMD antes de editar: (210 - 200) / 10 días = 1.0.
        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(content().string("1.0"));

        ActualizarPesajeRequest request = new ActualizarPesajeRequest(240.0, "Corrección de balanza");

        mockMvc.perform(put("/api/pesajes/{id}", segundo.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesaPeso").value(240.0))
                .andExpect(jsonPath("$.pesaObservaciones").value("Corrección de balanza"));

        // GMD después de editar: (240 - 200) / 10 días = 4.0.
        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(content().string("4.0"));
    }

    @Test
    @DisplayName("Actualizar un pesaje con peso inválido devuelve 400")
    void actualizarPesajeConPesoInvalidoDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Editar-Invalido", "Grupo-Editar-Invalido");
        Animal animal = crearAnimal("CAR-EDIT-002", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        ActualizarPesajeRequest request = new ActualizarPesajeRequest(2500.0, null);

        mockMvc.perform(put("/api/pesajes/{id}", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El peso debe ser mayor a 0 y hasta 2000 kg"));
    }

    @Test
    @DisplayName("Actualizar un pesaje inexistente devuelve 404")
    void actualizarPesajeInexistenteDevuelve404() throws Exception {
        ActualizarPesajeRequest request = new ActualizarPesajeRequest(210.0, null);

        mockMvc.perform(put("/api/pesajes/{id}", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Pesaje no encontrado con id: 999"));
    }

    @Test
    @DisplayName("Actualizar un pesaje anulado devuelve 409")
    void actualizarPesajeAnuladoDevuelve409() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Editar-Anulado", "Grupo-Editar-Anulado");
        Animal animal = crearAnimal("CAR-EDIT-ANU-001", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeAnuladoDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        ActualizarPesajeRequest request = new ActualizarPesajeRequest(210.0, null);

        mockMvc.perform(put("/api/pesajes/{id}", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede editar un pesaje anulado"));
    }

    // ---- PUT /api/pesajes/{id}/anular ----
    // Los pesajes no se borran físicamente (ver la nota de PesajesController):
    // estos tests reemplazan a los que antes probaban el DELETE.

    @Test
    @DisplayName("Anular un pesaje existente devuelve 200 con el pesaje en estado ANULADO")
    void anularPesajeExistenteDevuelve200() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Anular", "Grupo-Anular");
        Animal animal = crearAnimal("CAR-ANU-001", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        AnularPesajeRequest request = new AnularPesajeRequest("Error de balanza");

        mockMvc.perform(put("/api/pesajes/{id}/anular", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesaEstado").value("ANULADO"))
                .andExpect(jsonPath("$.pesaMotivoAnulacion").value("Error de balanza"))
                .andExpect(jsonPath("$.pesaAnuladoEn").value(notNullValue()));

        Pesajes recargado = pesajesRepository.findById(pesaje.getPesaId()).orElseThrow();
        Assertions.assertEquals(EstadoPesaje.ANULADO, recargado.getPesaEstado());
        Assertions.assertNotNull(recargado.getAnuladoPor());
    }

    @Test
    @DisplayName("Anular un pesaje inexistente devuelve 404")
    void anularPesajeInexistenteDevuelve404() throws Exception {
        AnularPesajeRequest request = new AnularPesajeRequest("Error de balanza");

        mockMvc.perform(put("/api/pesajes/{id}/anular", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Pesaje no encontrado con id: 999"));
    }

    @Test
    @DisplayName("Anular un pesaje ya anulado devuelve 409")
    void anularPesajeYaAnuladoDevuelve409() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Anular-Doble", "Grupo-Anular-Doble");
        Animal animal = crearAnimal("CAR-ANU-002", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeAnuladoDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        AnularPesajeRequest request = new AnularPesajeRequest("Motivo cualquiera");

        mockMvc.perform(put("/api/pesajes/{id}/anular", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("El pesaje ya está anulado"));
    }

    @Test
    @DisplayName("Anular un pesaje sin motivo devuelve 400")
    void anularPesajeSinMotivoDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Anular-SinMotivo", "Grupo-Anular-SinMotivo");
        Animal animal = crearAnimal("CAR-ANU-003", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        AnularPesajeRequest request = new AnularPesajeRequest(null);

        mockMvc.perform(put("/api/pesajes/{id}/anular", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo motivo (debe tener entre 3 y 255 caracteres)"));
    }

    @Test
    @DisplayName("Anular un pesaje con motivo muy corto devuelve 400")
    void anularPesajeConMotivoMuyCortoDevuelve400() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Anular-MotivoCorto", "Grupo-Anular-MotivoCorto");
        Animal animal = crearAnimal("CAR-ANU-004", subGrupo, LocalDate.of(2026, 1, 1));
        Pesajes pesaje = registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));

        AnularPesajeRequest request = new AnularPesajeRequest("ab");

        mockMvc.perform(put("/api/pesajes/{id}/anular", pesaje.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo motivo (debe tener entre 3 y 255 caracteres)"));
    }

    @Test
    @DisplayName("Un pesaje anulado no afecta la GMD ni el peso actual del animal")
    void pesajeAnuladoNoAfectaGmdNiPesoActual() throws Exception {
        SubGrupo subGrupo = crearSubGrupo("Lote-Anular-Gmd", "Grupo-Anular-Gmd");
        Animal animal = crearAnimal("CAR-ANU-GMD-001", subGrupo, LocalDate.of(2026, 1, 1));
        registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 1, 11));
        Pesajes segundo = registrarPesajeDirecto(animal, 210.0, LocalDate.of(2026, 1, 21));

        // GMD antes de anular: (210 - 200) / 10 días = 1.0.
        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(content().string("1.0"));

        AnularPesajeRequest request = new AnularPesajeRequest("Pesaje incorrecto");
        mockMvc.perform(put("/api/pesajes/{id}/anular", segundo.getPesaId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        // Sin el segundo pesaje (anulado), queda solo uno: sin GMD (null) y peso actual 200.0.
        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(content().string(""));

        mockMvc.perform(get("/api/animales/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.aniCaravana=='CAR-ANU-GMD-001')].pesoActual").value(200.0))
                .andExpect(jsonPath("$[?(@.aniCaravana=='CAR-ANU-GMD-001')].cantidadPesajes").value(1));
    }
}
