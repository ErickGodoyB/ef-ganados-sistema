package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.notNullValue;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.controller.TransferenciaController.DevolucionRequest;
import com.efganados.sistemabovino.controller.TransferenciaController.TransferenciaRequest;
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
import com.efganados.sistemabovino.repository.TransferenciaRepository;

/**
 * Pruebas de integración de las transferencias de animales entre lotes
 * (POST/GET /api/transferencias, POST /api/transferencias/{id}/devolver) y
 * del historial de movimientos de un animal
 * (GET /api/animales/{id}/movimientos). Cada prueba crea sus propios datos y
 * la transacción se revierte al finalizar. La garantía "todo o nada" se
 * prueba comprobando que un animal inválido deja a los demás sin mover:
 * el servicio valida todo antes de escribir, así que no depende de que la
 * transacción de la prueba se revierta.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TransferenciaControllerTest extends AutenticacionTestSupport {

    private static final LocalDate INGRESO = LocalDate.of(2026, 1, 1);
    private static final LocalDate FECHA = LocalDate.of(2026, 3, 1);

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

    @Autowired
    private TransferenciaRepository transferenciaRepository;

    private String token;
    private Persona responsable;
    private Grupo grupo;
    private SubGrupo loteA;
    private SubGrupo loteB;
    private SubGrupo loteC;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
        responsable = crearPersona("Responsable");
        grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-Transf");
        grupoRepository.save(grupo);
        loteA = crearLote("Lote A");
        loteB = crearLote("Lote B");
        loteC = crearLote("Lote C");
    }

    // ---- Datos de prueba ----

    private Persona crearPersona(String nombre) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido("Apellido");
        persona.setPerTipo("EMPLEADO");
        return personaRepository.save(persona);
    }

    private SubGrupo crearLote(String descripcion) {
        SubGrupo lote = new SubGrupo();
        lote.setGrupo(grupo);
        lote.setSbDescripcion(descripcion);
        return subGrupoRepository.save(lote);
    }

    private Animal crearAnimal(String caravana, SubGrupo lote) {
        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Animal animal = new Animal();
        animal.setDuenio(crearPersona("Dueño-" + caravana));
        animal.setRaza(raza);
        animal.setSubGrupo(lote);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(INGRESO);
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    private Pesajes pesar(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        return pesajesRepository.save(pesaje);
    }

    private void darDeBaja(Animal animal) {
        animal.setAniFechaEgreso(LocalDate.of(2026, 2, 1));
        animal.setAniMotivoSalida("MUERTE");
        animalRepository.save(animal);
    }

    private Long loteActual(Animal animal) {
        SubGrupo lote = animalRepository.findById(animal.getAniId()).orElseThrow().getSubGrupo();
        return lote != null ? lote.getSbId() : null;
    }

    // ---- Llamadas HTTP ----

    private TransferenciaRequest pedido(LocalDate fecha, String motivo, String nota, Long destinoId,
            Long responsableId, Long... animalIds) {
        return new TransferenciaRequest(fecha, motivo, nota, destinoId, responsableId, List.of(animalIds));
    }

    /** Pedido válido base: SELECCION, al lote B, con el responsable de la prueba. */
    private TransferenciaRequest pedidoAlLoteB(Animal... animales) {
        Long[] ids = java.util.Arrays.stream(animales).map(animal -> animal.getAniId()).toArray(Long[]::new);
        return pedido(FECHA, "SELECCION", null, loteB.getSbId(), responsable.getPerId(), ids);
    }

    private ResultActions transferir(TransferenciaRequest request) throws Exception {
        return mockMvc.perform(post("/api/transferencias")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    /** Registra la transferencia esperando un 201 y devuelve su id. */
    private long transferirOk(TransferenciaRequest request) throws Exception {
        String cuerpo = transferir(request).andExpect(status().isCreated()).andReturn().getResponse()
                .getContentAsString();
        return objectMapper.readTree(cuerpo).get("traId").asLong();
    }

    private ResultActions devolver(long traId, DevolucionRequest request) throws Exception {
        return mockMvc.perform(post("/api/transferencias/" + traId + "/devolver")
                .header("Authorization", token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)));
    }

    private DevolucionRequest devolucion(LocalDate fecha) {
        return new DevolucionRequest(fecha, null, responsable.getPerId());
    }

    // ---- POST /api/transferencias: caso feliz ----

    @Test
    @DisplayName("Transferir varios animales devuelve 201 con el resumen y pasa a todos al lote de destino")
    void transferirVariosAnimalesDevuelve201YLosMueve() throws Exception {
        Animal a1 = crearAnimal("CAR-TRA-001", loteA);
        Animal a2 = crearAnimal("CAR-TRA-002", loteA);
        Animal a3 = crearAnimal("CAR-TRA-003", loteC);

        transferir(pedido(FECHA, "SANITARIO", "  Aislamiento  ", loteB.getSbId(), responsable.getPerId(),
                a1.getAniId(), a2.getAniId(), a3.getAniId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.traId").value(notNullValue()))
                .andExpect(jsonPath("$.fecha").value("2026-03-01"))
                .andExpect(jsonPath("$.motivo").value("SANITARIO"))
                .andExpect(jsonPath("$.nota").value("Aislamiento"))
                .andExpect(jsonPath("$.responsableNombre").value("Responsable Apellido"))
                .andExpect(jsonPath("$.registradaEn").value(notNullValue()))
                .andExpect(jsonPath("$.cantidadAnimales").value(3))
                .andExpect(jsonPath("$.origenes.length()").value(2))
                .andExpect(jsonPath("$.origenes[0]").value("Lote A"))
                .andExpect(jsonPath("$.origenes[1]").value("Lote C"))
                .andExpect(jsonPath("$.destinos.length()").value(1))
                .andExpect(jsonPath("$.destinos[0]").value("Lote B"))
                .andExpect(jsonPath("$.devuelveA").value(nullValue()))
                .andExpect(jsonPath("$.devuelta").value(false));

        assertEquals(loteB.getSbId(), loteActual(a1));
        assertEquals(loteB.getSbId(), loteActual(a2));
        assertEquals(loteB.getSbId(), loteActual(a3));
    }

    @Test
    @DisplayName("Un animal sin lote se puede transferir: su origen figura como \"Sin lote\"")
    void transferirAnimalSinLote() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-SL1", null);

        transferir(pedidoAlLoteB(animal))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.origenes[0]").value("Sin lote"))
                .andExpect(jsonPath("$.destinos[0]").value("Lote B"));

        assertEquals(loteB.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("Con motivo OTRO y nota se acepta; la fecha del mismo día del ingreso también")
    void transferirConOtroYNotaYFechaDelIngreso() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-OT1", loteA);

        transferir(pedido(INGRESO, "OTRO", "Mejor pastura", loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.motivo").value("OTRO"));
    }

    // ---- POST /api/transferencias: errores 400 ----

    @Test
    @DisplayName("Sin fecha devuelve 400")
    void sinFechaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-F01", loteA);

        transferir(pedido(null, "SELECCION", null, loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo fecha"));
    }

    @Test
    @DisplayName("Con fecha futura devuelve 400 y no mueve al animal")
    void fechaFuturaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-F02", loteA);

        transferir(pedido(LocalDate.now().plusDays(1), "SELECCION", null, loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha de la transferencia no puede ser futura"));

        assertEquals(loteA.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("Con fecha anterior al ingreso de un animal devuelve 400 nombrando su caravana, y no mueve a ninguno")
    void fechaAnteriorAlIngresoDevuelve400NombrandoCaravana() throws Exception {
        Animal bueno = crearAnimal("CAR-TRA-F03", loteA);
        Animal tardio = crearAnimal("CAR-TRA-F04", loteA);
        tardio.setAniFechaIngreso(LocalDate.of(2026, 5, 1));
        animalRepository.save(tardio);

        transferir(pedidoAlLoteB(bueno, tardio))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("CAR-TRA-F04")));

        assertEquals(loteA.getSbId(), loteActual(bueno));
        assertEquals(loteA.getSbId(), loteActual(tardio));
    }

    @Test
    @DisplayName("Sin motivo o con un motivo inválido devuelve 400")
    void motivoFaltanteOInvalidoDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-M01", loteA);

        transferir(pedido(FECHA, null, null, loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo motivo"));
        transferir(pedido(FECHA, "VENTA", null, loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El motivo debe ser SELECCION, SANITARIO u OTRO"));
    }

    @Test
    @DisplayName("El motivo DEVOLUCION se rechaza con 400 en el alta común")
    void motivoDevolucionSeRechazaEnElAlta() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-M02", loteA);

        transferir(pedido(FECHA, "DEVOLUCION", null, loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("DEVOLUCION")));

        assertEquals(loteA.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("Con motivo OTRO la nota es obligatoria (400 si falta o es solo espacios)")
    void otroSinNotaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-N01", loteA);

        transferir(pedido(FECHA, "OTRO", null, loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("nota")));
        transferir(pedido(FECHA, "OTRO", "   ", loteB.getSbId(), responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Una nota de más de 255 caracteres devuelve 400; de exactamente 255 se acepta")
    void notaLargaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-N02", loteA);

        transferir(pedido(FECHA, "SELECCION", "x".repeat(256), loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("255")));
        transferir(pedido(FECHA, "SELECCION", "x".repeat(255), loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Sin destino devuelve 400; con un destino inexistente devuelve 404")
    void destinoFaltanteOInexistente() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-D01", loteA);

        transferir(pedido(FECHA, "SELECCION", null, null, responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo destinoId"));
        transferir(pedido(FECHA, "SELECCION", null, 999999L, responsable.getPerId(), animal.getAniId()))
                .andExpect(status().isNotFound())
                .andExpect(content().string("SubGrupo no encontrado con id: 999999"));
    }

    @Test
    @DisplayName("Una lista de animales vacía, ausente o con repetidos devuelve 400")
    void listaDeAnimalesInvalidaDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-L01", loteA);

        transferir(new TransferenciaRequest(FECHA, "SELECCION", null, loteB.getSbId(), responsable.getPerId(),
                List.of()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("animalIds")));
        transferir(new TransferenciaRequest(FECHA, "SELECCION", null, loteB.getSbId(), responsable.getPerId(), null))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("animalIds")));
        transferir(pedidoAlLoteB(animal, animal))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("repetido")));

        assertEquals(loteA.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("Un animal que ya está en el lote de destino devuelve 400 nombrando su caravana, y no mueve a ninguno")
    void animalYaEnElDestinoDevuelve400() throws Exception {
        Animal enOtro = crearAnimal("CAR-TRA-E01", loteA);
        Animal yaEnB = crearAnimal("CAR-TRA-E02", loteB);

        transferir(pedidoAlLoteB(enOtro, yaEnB))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("CAR-TRA-E02")));

        assertEquals(loteA.getSbId(), loteActual(enOtro));
        assertEquals(0, transferenciaRepository.count());
    }

    @Test
    @DisplayName("Sin responsable devuelve 400; con un responsable inexistente devuelve 404")
    void responsableFaltanteOInexistente() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-R01", loteA);

        transferir(pedido(FECHA, "SELECCION", null, loteB.getSbId(), null, animal.getAniId()))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo responsableId"));
        transferir(pedido(FECHA, "SELECCION", null, loteB.getSbId(), 999999L, animal.getAniId()))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona responsable no encontrada con id: 999999"));
    }

    // ---- POST /api/transferencias: 404 y 409 por animal ----

    @Test
    @DisplayName("Un animal inexistente devuelve 404 y no mueve a los demás")
    void animalInexistenteDevuelve404() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-A01", loteA);

        transferir(pedido(FECHA, "SELECCION", null, loteB.getSbId(), responsable.getPerId(), animal.getAniId(),
                999999L))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999999"));

        assertEquals(loteA.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("Un animal con salida registrada devuelve 409 nombrando su caravana, y no mueve a ninguno (todo o nada)")
    void animalConSalidaDevuelve409() throws Exception {
        Animal activo = crearAnimal("CAR-TRA-S01", loteA);
        Animal conSalida = crearAnimal("CAR-TRA-S02", loteA);
        darDeBaja(conSalida);

        transferir(pedidoAlLoteB(activo, conSalida))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("CAR-TRA-S02")));

        assertEquals(loteA.getSbId(), loteActual(activo));
        assertEquals(loteA.getSbId(), loteActual(conSalida));
        assertEquals(0, transferenciaRepository.count());
    }

    @Test
    @DisplayName("Sin token devuelve 401")
    void sinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/transferencias")).andExpect(status().isUnauthorized());
    }

    // ---- Historial de pesajes y conteos que acompañan al animal ----

    @Test
    @DisplayName("El historial de pesajes acompaña al animal: la sesión pasa al lote nuevo (detalle y resumen de sesiones)")
    void elHistorialDePesajesAcompanaAlAnimal() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-P01", loteA);
        Animal otro = crearAnimal("CAR-TRA-P02", loteA);
        LocalDate fechaPesaje = LocalDate.of(2026, 2, 1);
        pesar(animal, 230.0, fechaPesaje);
        pesar(otro, 240.0, fechaPesaje);

        // Antes: la sesión del lote A tiene a los dos.
        mockMvc.perform(get("/api/pesajes/sesiones/detalle").header("Authorization", token)
                        .param("fecha", fechaPesaje.toString())
                        .param("subGrupoId", loteA.getSbId().toString()))
                .andExpect(jsonPath("$.length()").value(2));

        transferirOk(pedidoAlLoteB(animal));

        // Detalle: el pesaje del animal ya está en la sesión del lote B (con su peso anterior y GMD intactos)...
        mockMvc.perform(get("/api/pesajes/sesiones/detalle").header("Authorization", token)
                        .param("fecha", fechaPesaje.toString())
                        .param("subGrupoId", loteB.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].caravana").value("CAR-TRA-P01"))
                .andExpect(jsonPath("$[0].peso").value(230.0))
                .andExpect(jsonPath("$[0].pesoAnterior").value(200.0))
                .andExpect(jsonPath("$[0].pesoAnteriorEsIngreso").value(true));
        // ... y la del lote A quedó solo con el otro animal.
        mockMvc.perform(get("/api/pesajes/sesiones/detalle").header("Authorization", token)
                        .param("fecha", fechaPesaje.toString())
                        .param("subGrupoId", loteA.getSbId().toString()))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].caravana").value("CAR-TRA-P02"));

        // Resumen de sesiones: una fila por lote, cada una con su animal.
        mockMvc.perform(get("/api/pesajes/sesiones").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.subGrupoId == %d)].cantidad", loteB.getSbId()).value(1))
                .andExpect(jsonPath("$[?(@.subGrupoId == %d)].total", loteB.getSbId()).value(230.0))
                .andExpect(jsonPath("$[?(@.subGrupoId == %d)].cantidad", loteA.getSbId()).value(1))
                .andExpect(jsonPath("$[?(@.subGrupoId == %d)].total", loteA.getSbId()).value(240.0));

        // El historial de pesajes del animal no se tocó.
        mockMvc.perform(get("/api/animales/" + animal.getAniId() + "/pesajes").header("Authorization", token))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].peso").value(230.0));
    }

    @Test
    @DisplayName("El resumen de grupos refleja el lote nuevo de los animales transferidos")
    void elResumenDeGruposReflejaElLoteNuevo() throws Exception {
        Animal a1 = crearAnimal("CAR-TRA-G01", loteA);
        Animal a2 = crearAnimal("CAR-TRA-G02", loteA);
        crearAnimal("CAR-TRA-G03", loteA);

        transferirOk(pedidoAlLoteB(a1, a2));

        mockMvc.perform(get("/api/grupos/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[?(@.sbId == %d)].cantidadAnimales",
                        grupo.getGrpId(), loteA.getSbId()).value(hasItem(1)))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[?(@.sbId == %d)].cantidadAnimales",
                        grupo.getGrpId(), loteB.getSbId()).value(hasItem(2)))
                .andExpect(jsonPath("$[?(@.grpId == %d)].lotes[?(@.sbId == %d)].cantidadActivos",
                        grupo.getGrpId(), loteB.getSbId()).value(hasItem(2)));
    }

    // ---- GET /api/transferencias ----

    @Test
    @DisplayName("El listado va de la más reciente a la más antigua y filtra por desde/hasta (inclusivos)")
    void listadoOrdenadoYFiltradoPorFecha() throws Exception {
        Animal a1 = crearAnimal("CAR-TRA-LI1", loteA);
        Animal a2 = crearAnimal("CAR-TRA-LI2", loteA);
        Animal a3 = crearAnimal("CAR-TRA-LI3", loteA);
        long vieja = transferirOk(pedido(LocalDate.of(2026, 2, 1), "SELECCION", null, loteB.getSbId(),
                responsable.getPerId(), a1.getAniId()));
        long media = transferirOk(pedido(LocalDate.of(2026, 3, 1), "SANITARIO", null, loteB.getSbId(),
                responsable.getPerId(), a2.getAniId()));
        long nueva = transferirOk(pedido(LocalDate.of(2026, 4, 1), "SELECCION", null, loteB.getSbId(),
                responsable.getPerId(), a3.getAniId()));

        mockMvc.perform(get("/api/transferencias").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].traId").value(nueva))
                .andExpect(jsonPath("$[1].traId").value(media))
                .andExpect(jsonPath("$[2].traId").value(vieja))
                .andExpect(jsonPath("$[0].cantidadAnimales").value(1))
                .andExpect(jsonPath("$[0].origenes[0]").value("Lote A"))
                .andExpect(jsonPath("$[0].destinos[0]").value("Lote B"));

        mockMvc.perform(get("/api/transferencias").header("Authorization", token)
                        .param("desde", "2026-03-01").param("hasta", "2026-03-31"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].traId").value(media));
        mockMvc.perform(get("/api/transferencias").header("Authorization", token).param("desde", "2026-03-01"))
                .andExpect(jsonPath("$.length()").value(2));
        mockMvc.perform(get("/api/transferencias").header("Authorization", token).param("hasta", "2026-02-01"))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].traId").value(vieja));
    }

    // ---- GET /api/transferencias/{id} ----

    @Test
    @DisplayName("El detalle trae el resumen y los animales con enDestino; una transferencia inexistente devuelve 404")
    void detalleConAnimalesYEnDestino() throws Exception {
        Animal a1 = crearAnimal("CAR-TRA-DT1", loteA);
        Animal a2 = crearAnimal("CAR-TRA-DT2", null);
        long traId = transferirOk(pedidoAlLoteB(a1, a2));

        mockMvc.perform(get("/api/transferencias/" + traId).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.traId").value(traId))
                .andExpect(jsonPath("$.motivo").value("SELECCION"))
                .andExpect(jsonPath("$.animales.length()").value(2))
                .andExpect(jsonPath("$.animales[0].animalId").value(a1.getAniId()))
                .andExpect(jsonPath("$.animales[0].caravana").value("CAR-TRA-DT1"))
                .andExpect(jsonPath("$.animales[0].razaDescripcion").value("Raza-CAR-TRA-DT1"))
                .andExpect(jsonPath("$.animales[0].origen").value("Lote A"))
                .andExpect(jsonPath("$.animales[0].destino").value("Lote B"))
                .andExpect(jsonPath("$.animales[0].enDestino").value(true))
                .andExpect(jsonPath("$.animales[1].origen").value("Sin lote"))
                .andExpect(jsonPath("$.animales[1].origenId").value(nullValue()))
                .andExpect(jsonPath("$.animales[1].enDestino").value(true));

        mockMvc.perform(get("/api/transferencias/999999").header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Transferencia no encontrada con id: 999999"));
    }

    @Test
    @DisplayName("enDestino es false si el animal se movió a otro lote o tuvo una salida")
    void enDestinoEsFalseSiElAnimalSeMovioOSalio() throws Exception {
        Animal seMovio = crearAnimal("CAR-TRA-ED1", loteA);
        Animal salio = crearAnimal("CAR-TRA-ED2", loteA);
        Animal sigue = crearAnimal("CAR-TRA-ED3", loteA);
        long traId = transferirOk(pedidoAlLoteB(seMovio, salio, sigue));

        seMovio.setSubGrupo(loteC);
        animalRepository.save(seMovio);
        darDeBaja(salio);

        mockMvc.perform(get("/api/transferencias/" + traId).header("Authorization", token))
                .andExpect(jsonPath("$.animales[0].caravana").value("CAR-TRA-ED1"))
                .andExpect(jsonPath("$.animales[0].enDestino").value(false))
                .andExpect(jsonPath("$.animales[1].caravana").value("CAR-TRA-ED2"))
                .andExpect(jsonPath("$.animales[1].enDestino").value(false))
                .andExpect(jsonPath("$.animales[2].caravana").value("CAR-TRA-ED3"))
                .andExpect(jsonPath("$.animales[2].enDestino").value(true));
    }

    // ---- POST /api/transferencias/{id}/devolver ----

    @Test
    @DisplayName("Devolución completa: todos vuelven a su lote de origen original (cada uno al suyo, incluso sin lote)")
    void devolucionCompleta() throws Exception {
        Animal deA = crearAnimal("CAR-TRA-DV1", loteA);
        Animal deC = crearAnimal("CAR-TRA-DV2", loteC);
        Animal sinLote = crearAnimal("CAR-TRA-DV3", null);
        long traId = transferirOk(pedidoAlLoteB(deA, deC, sinLote));

        devolver(traId, new DevolucionRequest(LocalDate.of(2026, 3, 10), "Volvieron", responsable.getPerId()))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.traId").value(notNullValue()))
                .andExpect(jsonPath("$.motivo").value("DEVOLUCION"))
                .andExpect(jsonPath("$.nota").value("Volvieron"))
                .andExpect(jsonPath("$.devuelveA").value(traId))
                .andExpect(jsonPath("$.devuelta").value(false))
                .andExpect(jsonPath("$.cantidadAnimales").value(3))
                .andExpect(jsonPath("$.cantidadDevuelta").value(3))
                .andExpect(jsonPath("$.cantidadOmitida").value(0))
                .andExpect(jsonPath("$.origenes[0]").value("Lote B"))
                .andExpect(jsonPath("$.destinos.length()").value(3));

        assertEquals(loteA.getSbId(), loteActual(deA));
        assertEquals(loteC.getSbId(), loteActual(deC));
        assertNull(loteActual(sinLote));

        // La original queda marcada como devuelta en el listado y en su detalle.
        mockMvc.perform(get("/api/transferencias").header("Authorization", token))
                .andExpect(jsonPath("$[?(@.traId == %d)].devuelta", traId).value(hasItem(true)));
        mockMvc.perform(get("/api/transferencias/" + traId).header("Authorization", token))
                .andExpect(jsonPath("$.devuelta").value(true));
    }

    @Test
    @DisplayName("Devolución parcial: se omiten los animales que ya no están en el destino o tienen salida")
    void devolucionParcial() throws Exception {
        Animal vuelve = crearAnimal("CAR-TRA-DP1", loteA);
        Animal seMovio = crearAnimal("CAR-TRA-DP2", loteA);
        Animal salio = crearAnimal("CAR-TRA-DP3", loteA);
        long traId = transferirOk(pedidoAlLoteB(vuelve, seMovio, salio));

        seMovio.setSubGrupo(loteC);
        animalRepository.save(seMovio);
        darDeBaja(salio);

        devolver(traId, devolucion(LocalDate.of(2026, 3, 10)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cantidadAnimales").value(1))
                .andExpect(jsonPath("$.cantidadDevuelta").value(1))
                .andExpect(jsonPath("$.cantidadOmitida").value(2));

        assertEquals(loteA.getSbId(), loteActual(vuelve));
        assertEquals(loteC.getSbId(), loteActual(seMovio));
        assertEquals(loteB.getSbId(), loteActual(salio));
    }

    @Test
    @DisplayName("Devolver dos veces la misma transferencia devuelve 409")
    void dobleDevolucionDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DD1", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));
        devolver(traId, devolucion(LocalDate.of(2026, 3, 10))).andExpect(status().isCreated());

        devolver(traId, devolucion(LocalDate.of(2026, 3, 11)))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("ya fue devuelta")));
    }

    @Test
    @DisplayName("Devolver una DEVOLUCION devuelve 409")
    void devolverUnaDevolucionDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DD2", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));
        String cuerpo = devolver(traId, devolucion(LocalDate.of(2026, 3, 10))).andReturn().getResponse()
                .getContentAsString();
        long idDevolucion = objectMapper.readTree(cuerpo).get("traId").asLong();

        devolver(idDevolucion, devolucion(LocalDate.of(2026, 3, 11)))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("ya es una devolución")));
    }

    @Test
    @DisplayName("Si ningún animal puede devolverse devuelve 409 y no crea nada")
    void devolverSinAnimalesDevolviblesDevuelve409() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DN1", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));
        animal.setSubGrupo(loteC);
        animalRepository.save(animal);

        devolver(traId, devolucion(LocalDate.of(2026, 3, 10)))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("ningún animal")));

        assertEquals(1, transferenciaRepository.count());
    }

    @Test
    @DisplayName("Devolver una transferencia inexistente devuelve 404")
    void devolverInexistenteDevuelve404() throws Exception {
        devolver(999999L, devolucion(LocalDate.of(2026, 3, 10)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Transferencia no encontrada con id: 999999"));
    }

    @Test
    @DisplayName("La fecha de la devolución sigue las reglas: obligatoria, no futura y no anterior al ingreso")
    void fechaDeLaDevolucion() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DF1", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));

        devolver(traId, devolucion(null))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo fecha"));
        devolver(traId, devolucion(LocalDate.now().plusDays(1)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La fecha de la transferencia no puede ser futura"));
        // Anterior al ingreso del animal (2026-01-01) implica anterior a la transferencia original (2026-03-01).
        devolver(traId, devolucion(LocalDate.of(2025, 12, 31)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(containsString("01/03/2026")));

        // Ninguna de esas devoluciones se guardó: el animal sigue en el destino y la original sin devolver.
        assertEquals(loteB.getSbId(), loteActual(animal));
        assertEquals(1, transferenciaRepository.count());
    }

    @Test
    @DisplayName("Devolver sin responsable devuelve 400; con un responsable inexistente, 404")
    void responsableDeLaDevolucion() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DR1", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));

        devolver(traId, new DevolucionRequest(LocalDate.of(2026, 3, 10), null, null))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo responsableId"));
        devolver(traId, new DevolucionRequest(LocalDate.of(2026, 3, 10), null, 999999L))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("Después de una devolución, el animal puede volver a transferirse al mismo destino")
    void sePuedeTransferirDeNuevoTrasLaDevolucion() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DR2", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));
        devolver(traId, devolucion(LocalDate.of(2026, 3, 10))).andExpect(status().isCreated());

        transferir(pedido(LocalDate.of(2026, 3, 20), "SELECCION", null, loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()))
                .andExpect(status().isCreated());

        assertEquals(loteB.getSbId(), loteActual(animal));
    }

    @Test
    @DisplayName("La fecha de la devolución no puede ser anterior a la de la transferencia original (400 con esa fecha); el mismo día sí se acepta")
    void devolucionAnteriorALaTransferenciaOriginalDevuelve400() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-DO1", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal)); // FECHA = 2026-03-01

        devolver(traId, devolucion(LocalDate.of(2026, 2, 28)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string(
                        "La fecha de la devolución no puede ser anterior a la fecha de la transferencia original (01/03/2026)"));

        assertEquals(loteB.getSbId(), loteActual(animal));
        assertEquals(1, transferenciaRepository.count());

        devolver(traId, devolucion(FECHA)).andExpect(status().isCreated());
        assertEquals(loteA.getSbId(), loteActual(animal));
    }

    // ---- Bloqueo de borrados: lotes, personas y animales con transferencias ----

    @Test
    @DisplayName("Un lote que fue origen de una transferencia no se puede eliminar (409)")
    void loteOrigenDeUnaTransferenciaNoSePuedeEliminar() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-B01", loteA);
        transferirOk(pedidoAlLoteB(animal)); // el lote A queda vacío, pero figura como origen

        mockMvc.perform(delete("/api/subgrupos/{id}", loteA.getSbId()).header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el lote: figura en 1 movimientos de animales entre lotes"));
    }

    @Test
    @DisplayName("Un lote que fue destino de una transferencia no se puede eliminar (409), aunque el origen haya sido \"sin lote\"")
    void loteDestinoDeUnaTransferenciaNoSePuedeEliminar() throws Exception {
        Animal sinLote = crearAnimal("CAR-TRA-B02", null);
        transferirOk(pedidoAlLoteB(sinLote)); // origen null: prueba el LEFT JOIN de la consulta
        // El animal se va del lote B, para que el bloqueo no sea por tener animales sino por el historial.
        sinLote.setSubGrupo(loteC);
        animalRepository.save(sinLote);

        mockMvc.perform(delete("/api/subgrupos/{id}", loteB.getSbId()).header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("figura en 1 movimientos")));
    }

    @Test
    @DisplayName("Un lote que no figura en ninguna transferencia (ni tiene animales) se sigue pudiendo eliminar")
    void loteSinTransferenciasSePuedeEliminar() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-B03", loteA);
        transferirOk(pedidoAlLoteB(animal));

        mockMvc.perform(delete("/api/subgrupos/{id}", loteC.getSbId()).header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Una persona responsable de una transferencia no se puede eliminar (409) y el resumen cuenta sus transferencias")
    void personaResponsableDeUnaTransferenciaNoSePuedeEliminar() throws Exception {
        Persona otraPersona = crearPersona("Otra");
        Animal a1 = crearAnimal("CAR-TRA-PE1", loteA);
        Animal a2 = crearAnimal("CAR-TRA-PE2", loteA);
        transferirOk(pedidoAlLoteB(a1));
        long segunda = transferirOk(pedido(LocalDate.of(2026, 3, 5), "SELECCION", null, loteC.getSbId(),
                responsable.getPerId(), a2.getAniId()));
        devolver(segunda, devolucion(LocalDate.of(2026, 3, 6))).andExpect(status().isCreated());

        mockMvc.perform(delete("/api/personas/{id}", responsable.getPerId()).header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: figura como responsable de 3 transferencias"));

        mockMvc.perform(get("/api/personas/resumen").header("Authorization", token))
                .andExpect(jsonPath("$[?(@.perId == %d)].cantidadTransferencias", responsable.getPerId())
                        .value(hasItem(3)))
                .andExpect(jsonPath("$[?(@.perId == %d)].cantidadTransferencias", otraPersona.getPerId())
                        .value(hasItem(0)));

        mockMvc.perform(delete("/api/personas/{id}", otraPersona.getPerId()).header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("El motivo de transferencias se suma a los demás motivos en el mensaje de eliminar una persona")
    void personaConVariosMotivosIncluyeLasTransferencias() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-PE3", loteA);
        transferirOk(pedidoAlLoteB(animal));
        pesar(animal, 210.0, LocalDate.of(2026, 3, 2)); // el responsable también figura en un pesaje

        mockMvc.perform(delete("/api/personas/{id}", responsable.getPerId()).header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string(
                        "No se puede eliminar la persona: figura en 1 pesajes y figura como responsable de 1 transferencias"));
    }

    @Test
    @DisplayName("Un animal que figura en una transferencia no se puede eliminar (409); uno sin transferencias sí")
    void animalConTransferenciasNoSePuedeEliminar() throws Exception {
        Animal transferido = crearAnimal("CAR-TRA-AN1", loteA);
        Animal libre = crearAnimal("CAR-TRA-AN2", loteA);
        transferirOk(pedidoAlLoteB(transferido));

        mockMvc.perform(delete("/api/animales/{id}", transferido.getAniId()).header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar el animal: figura en transferencias entre lotes"));
        mockMvc.perform(delete("/api/animales/{id}", libre.getAniId()).header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    // ---- GET /api/animales/{id}/movimientos ----

    @Test
    @DisplayName("Los movimientos del animal van del más reciente al más antiguo, con origen, destino y responsable")
    void movimientosDelAnimal() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-MV1", null);
        long primera = transferirOk(pedido(LocalDate.of(2026, 2, 1), "SELECCION", null, loteA.getSbId(),
                responsable.getPerId(), animal.getAniId()));
        transferirOk(pedido(LocalDate.of(2026, 3, 1), "SANITARIO", null, loteB.getSbId(), responsable.getPerId(),
                animal.getAniId()));
        // El animal ya no está en A, así que devolver la primera no puede hacer nada (409) y no suma movimientos.
        devolver(primera, devolucion(LocalDate.of(2026, 3, 5))).andExpect(status().isConflict());

        mockMvc.perform(get("/api/animales/" + animal.getAniId() + "/movimientos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].fecha").value("2026-03-01"))
                .andExpect(jsonPath("$[0].motivo").value("SANITARIO"))
                .andExpect(jsonPath("$[0].origen").value("Lote A"))
                .andExpect(jsonPath("$[0].destino").value("Lote B"))
                .andExpect(jsonPath("$[0].responsableNombre").value("Responsable Apellido"))
                .andExpect(jsonPath("$[1].fecha").value("2026-02-01"))
                .andExpect(jsonPath("$[1].origen").value("Sin lote"))
                .andExpect(jsonPath("$[1].destino").value("Lote A"));
    }

    @Test
    @DisplayName("La devolución aparece en los movimientos con motivo DEVOLUCION")
    void laDevolucionApareceEnLosMovimientos() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-MV2", loteA);
        long traId = transferirOk(pedidoAlLoteB(animal));
        devolver(traId, devolucion(LocalDate.of(2026, 3, 10))).andExpect(status().isCreated());

        mockMvc.perform(get("/api/animales/" + animal.getAniId() + "/movimientos").header("Authorization", token))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].motivo").value("DEVOLUCION"))
                .andExpect(jsonPath("$[0].origen").value("Lote B"))
                .andExpect(jsonPath("$[0].destino").value("Lote A"))
                .andExpect(jsonPath("$[1].motivo").value("SELECCION"));
    }

    @Test
    @DisplayName("Un animal sin movimientos devuelve una lista vacía; uno inexistente devuelve 404")
    void movimientosSinHistorialOInexistente() throws Exception {
        Animal animal = crearAnimal("CAR-TRA-MV3", loteA);

        mockMvc.perform(get("/api/animales/" + animal.getAniId() + "/movimientos").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/animales/999999/movimientos").header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999999"));
    }
}
