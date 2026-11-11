package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.controller.PesajesController.AnularSesionRequest;
import com.efganados.sistemabovino.controller.PesajesController.CambiarFechaSesionRequest;
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
 * Pruebas de integración de las operaciones sobre una sesión de pesaje
 * completa: anulación en bloque (PUT /api/pesajes/sesion/anular), cambio de
 * fecha (PUT /api/pesajes/sesion/fecha) y listado de pesajes anulados (GET
 * /api/pesajes/anulados). La lógica vive en {@code PesajeService}; las
 * pruebas de la sesión en sí (alta, resumen, detalle) y de la
 * anulación/edición de un pesaje puntual están en
 * {@link PesajeSesionControllerTest}.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PesajeAnulacionYFechaSesionControllerTest extends AutenticacionTestSupport {

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

    private SubGrupo crearSubGrupo(String descripcion, String descripcionGrupo) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion(descripcionGrupo);
        grupoRepository.save(grupo);

        SubGrupo subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion(descripcion);
        return subGrupoRepository.save(subGrupo);
    }

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

    private Pesajes registrarPesajeDirecto(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        return pesajesRepository.save(pesaje);
    }

    // ---- PUT /api/pesajes/sesion/anular ----

    @Test
    @DisplayName("Anular una sesión con varios pesajes activos anula todos y devuelve la cantidad")
    void anularSesionConVariosPesajesActivosDevuelveCantidad() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-AnularSesion", "Grupo-AnularSesion");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 3, 1);
        Animal animal1 = crearAnimal("CAR-ANS-001", lote, ingreso);
        Animal animal2 = crearAnimal("CAR-ANS-002", lote, ingreso);
        Pesajes pesaje1 = registrarPesajeDirecto(animal1, 200.0, fecha);
        Pesajes pesaje2 = registrarPesajeDirecto(animal2, 220.0, fecha);

        AnularSesionRequest request = new AnularSesionRequest(fecha, lote.getSbId(), "Balanza descalibrada");

        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(2));

        Assertions.assertEquals(EstadoPesaje.ANULADO,
                pesajesRepository.findById(pesaje1.getPesaId()).orElseThrow().getPesaEstado());
        Assertions.assertEquals(EstadoPesaje.ANULADO,
                pesajesRepository.findById(pesaje2.getPesaId()).orElseThrow().getPesaEstado());
    }

    @Test
    @DisplayName("Anular una sesión sin lote (subGrupoId ausente) anula solo los pesajes sin lote de esa fecha")
    void anularSesionSinLoteAnulaSoloLosSinLote() throws Exception {
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        LocalDate fecha = LocalDate.of(2026, 3, 1);
        Animal animalSinLote = crearAnimal("CAR-ANS-SL-001", null, ingreso);
        SubGrupo lote = crearSubGrupo("Lote-AnularSesionSL", "Grupo-AnularSesionSL");
        Animal animalConLote = crearAnimal("CAR-ANS-CL-001", lote, ingreso);
        registrarPesajeDirecto(animalSinLote, 180.0, fecha);
        Pesajes pesajeConLote = registrarPesajeDirecto(animalConLote, 220.0, fecha);

        AnularSesionRequest request = new AnularSesionRequest(fecha, null, "Corrección de carga");

        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(1));

        Assertions.assertEquals(EstadoPesaje.ACTIVO,
                pesajesRepository.findById(pesajeConLote.getPesaId()).orElseThrow().getPesaEstado());
    }

    @Test
    @DisplayName("Anular una sesión sin pesajes activos en esa fecha y lote devuelve 404")
    void anularSesionSinPesajesActivosDevuelve404() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-AnularSesionVacia", "Grupo-AnularSesionVacia");
        AnularSesionRequest request = new AnularSesionRequest(LocalDate.of(2026, 3, 1), lote.getSbId(), "Motivo");

        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("No se encontró una sesión con pesajes activos en esa fecha y lote"));
    }

    @Test
    @DisplayName("Anular una sesión sin motivo devuelve 400")
    void anularSesionSinMotivoDevuelve400() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-AnularSesionSinMotivo", "Grupo-AnularSesionSinMotivo");
        Animal animal = crearAnimal("CAR-ANS-SM-001", lote, LocalDate.of(2026, 1, 1));
        registrarPesajeDirecto(animal, 200.0, LocalDate.of(2026, 3, 1));

        AnularSesionRequest request = new AnularSesionRequest(LocalDate.of(2026, 3, 1), lote.getSbId(), null);

        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo motivo (debe tener entre 3 y 255 caracteres)"));
    }

    // ---- GET /api/pesajes/anulados ----

    @Test
    @DisplayName("El listado de anulados trae solo los pesajes anulados, más recientes primero")
    void listadoDeAnuladosTraeSoloAnuladosOrdenadosPorAnuladoEnDesc() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-Anulados", "Grupo-Anulados");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal1 = crearAnimal("CAR-ANUL-001", lote, ingreso);
        Animal animal2 = crearAnimal("CAR-ANUL-002", lote, ingreso);
        registrarPesajeDirecto(animal1, 200.0, LocalDate.of(2026, 3, 1));

        AnularSesionRequest primero = new AnularSesionRequest(LocalDate.of(2026, 3, 1), lote.getSbId(), "Primero anulado");
        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(primero)))
                .andExpect(status().isOk());

        registrarPesajeDirecto(animal2, 220.0, LocalDate.of(2026, 3, 2));
        AnularSesionRequest segundo = new AnularSesionRequest(LocalDate.of(2026, 3, 2), lote.getSbId(), "Segundo anulado");
        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(segundo)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pesajes/anulados")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].caravana").value("CAR-ANUL-002"))
                .andExpect(jsonPath("$[0].motivo").value("Segundo anulado"))
                .andExpect(jsonPath("$[0].subGrupoDescripcion").value("Lote-Anulados"))
                .andExpect(jsonPath("$[1].caravana").value("CAR-ANUL-001"))
                .andExpect(jsonPath("$[1].motivo").value("Primero anulado"));
    }

    @Test
    @DisplayName("El listado de anulados filtra por desde/hasta sobre la fecha del pesaje")
    void listadoDeAnuladosFiltraPorDesdeYHasta() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-AnuladosFiltro", "Grupo-AnuladosFiltro");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animalEnero = crearAnimal("CAR-ANULF-ENE", lote, ingreso);
        Animal animalMarzo = crearAnimal("CAR-ANULF-MAR", lote, ingreso);

        registrarPesajeDirecto(animalEnero, 200.0, LocalDate.of(2026, 1, 15));
        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AnularSesionRequest(LocalDate.of(2026, 1, 15), lote.getSbId(), "Fuera de rango"))))
                .andExpect(status().isOk());

        registrarPesajeDirecto(animalMarzo, 220.0, LocalDate.of(2026, 3, 15));
        mockMvc.perform(put("/api/pesajes/sesion/anular")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AnularSesionRequest(LocalDate.of(2026, 3, 15), lote.getSbId(), "Dentro de rango"))))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/pesajes/anulados")
                        .header("Authorization", token)
                        .param("desde", "2026-03-01")
                        .param("hasta", "2026-03-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].caravana").value("CAR-ANULF-MAR"));
    }

    // ---- PUT /api/pesajes/sesion/fecha ----

    @Test
    @DisplayName("Cambiar la fecha de una sesión mueve todos los pesajes activos y devuelve la cantidad")
    void cambiarFechaDeSesionMueveTodosLosActivos() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFecha", "Grupo-CambioFecha");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal1 = crearAnimal("CAR-CF-001", lote, ingreso);
        Animal animal2 = crearAnimal("CAR-CF-002", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        LocalDate fechaNueva = LocalDate.of(2026, 3, 5);
        Pesajes pesaje1 = registrarPesajeDirecto(animal1, 200.0, fechaOriginal);
        Pesajes pesaje2 = registrarPesajeDirecto(animal2, 220.0, fechaOriginal);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(), fechaNueva);

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(2));

        Assertions.assertEquals(fechaNueva, pesajesRepository.findById(pesaje1.getPesaId()).orElseThrow().getPesaFecha());
        Assertions.assertEquals(fechaNueva, pesajesRepository.findById(pesaje2.getPesaId()).orElseThrow().getPesaFecha());
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una fecha con una sesión existente del mismo lote las fusiona")
    void cambiarFechaDeSesionFusionaConSesionExistente() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaFusion", "Grupo-CambioFechaFusion");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animalAMover = crearAnimal("CAR-CFF-001", lote, ingreso);
        Animal animalYaEnDestino = crearAnimal("CAR-CFF-002", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        LocalDate fechaDestino = LocalDate.of(2026, 3, 10);
        registrarPesajeDirecto(animalAMover, 200.0, fechaOriginal);
        registrarPesajeDirecto(animalYaEnDestino, 220.0, fechaDestino);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(), fechaDestino);

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(1));

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", fechaDestino.toString())
                        .param("subGrupoId", lote.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una fecha futura devuelve 400")
    void cambiarFechaDeSesionAFechaFuturaDevuelve400() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaFutura", "Grupo-CambioFechaFutura");
        Animal animal = crearAnimal("CAR-CFF-FUT-001", lote, LocalDate.of(2026, 1, 1));
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(),
                LocalDate.now().plusDays(1));

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La nueva fecha no puede ser futura"));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a la misma fecha actual devuelve 400")
    void cambiarFechaDeSesionALaMismaFechaDevuelve400() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaIgual", "Grupo-CambioFechaIgual");
        Animal animal = crearAnimal("CAR-CFF-IGUAL-001", lote, LocalDate.of(2026, 1, 1));
        LocalDate fecha = LocalDate.of(2026, 3, 1);
        registrarPesajeDirecto(animal, 200.0, fecha);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fecha, lote.getSbId(), fecha);

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La nueva fecha debe ser distinta de la actual"));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una anterior al ingreso de un animal devuelve 400 nombrando la caravana")
    void cambiarFechaDeSesionAnteriorAlIngresoDevuelve400() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaIngreso", "Grupo-CambioFechaIngreso");
        LocalDate ingreso = LocalDate.of(2026, 3, 1);
        Animal animal = crearAnimal("CAR-CFF-ING-001", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 15);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(),
                LocalDate.of(2026, 2, 28));

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "La nueva fecha no puede ser anterior al ingreso del animal (CAR-CFF-ING-001: 2026-03-01)"));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una posterior a la salida de un animal devuelve 400 nombrando la caravana")
    void cambiarFechaDeSesionPosteriorALaSalidaDevuelve400() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaSalida", "Grupo-CambioFechaSalida");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-CFF-SAL-001", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);
        animal.setAniFechaEgreso(LocalDate.of(2026, 3, 20));
        animal.setAniMotivoSalida("MUERTE");
        animalRepository.save(animal);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(),
                LocalDate.of(2026, 3, 21));

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "La nueva fecha no puede ser posterior a la salida del animal (CAR-CFF-SAL-001: 2026-03-20)"));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una anterior o igual a la salida de un animal devuelve 200")
    void cambiarFechaDeSesionAnteriorOIgualALaSalidaDevuelve200() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaSalidaOk", "Grupo-CambioFechaSalidaOk");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-CFF-SAL-002", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);
        animal.setAniFechaEgreso(LocalDate.of(2026, 3, 20));
        animal.setAniMotivoSalida("MUERTE");
        animalRepository.save(animal);

        // Igual a la fecha de salida: límite inclusive.
        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(),
                LocalDate.of(2026, 3, 20));

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(1));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión a una fecha donde un animal ya tiene un pesaje activo devuelve 409")
    void cambiarFechaDeSesionConAnimalYaPesadoEnDestinoDevuelve409() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaChoque", "Grupo-CambioFechaChoque");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-CFF-CHO-001", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        LocalDate fechaDestino = LocalDate.of(2026, 3, 10);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);
        registrarPesajeDirecto(animal, 210.0, fechaDestino);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(), fechaDestino);

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "El animal CAR-CFF-CHO-001 ya tiene un pesaje activo el 10/03/2026. Editá ese pesaje o anulalo."));
    }

    @Test
    @DisplayName("Cambiar la fecha de una sesión sin pesajes activos en esa fecha y lote devuelve 404")
    void cambiarFechaDeSesionSinPesajesActivosDevuelve404() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaInexistente", "Grupo-CambioFechaInexistente");

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(
                LocalDate.of(2026, 3, 1), lote.getSbId(), LocalDate.of(2026, 3, 5));

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("No se encontró una sesión con pesajes activos en esa fecha y lote"));
    }

    @Test
    @DisplayName("Un pesaje anulado no bloquea el cambio de fecha de la sesión por la regla de duplicado")
    void cambiarFechaDeSesionConPesajeAnuladoEnDestinoNoChoca() throws Exception {
        SubGrupo lote = crearSubGrupo("Lote-CambioFechaAnulado", "Grupo-CambioFechaAnulado");
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-CFF-ANU-001", lote, ingreso);
        LocalDate fechaOriginal = LocalDate.of(2026, 3, 1);
        LocalDate fechaDestino = LocalDate.of(2026, 3, 10);
        registrarPesajeDirecto(animal, 200.0, fechaOriginal);
        Pesajes enDestino = registrarPesajeDirecto(animal, 999.0, fechaDestino);
        enDestino.setPesaEstado(EstadoPesaje.ANULADO);
        pesajesRepository.save(enDestino);

        CambiarFechaSesionRequest request = new CambiarFechaSesionRequest(fechaOriginal, lote.getSbId(), fechaDestino);

        mockMvc.perform(put("/api/pesajes/sesion/fecha")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cantidad").value(1));
    }
}
