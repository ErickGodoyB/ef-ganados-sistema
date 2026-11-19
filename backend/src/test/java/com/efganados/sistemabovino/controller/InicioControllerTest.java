package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

import org.hamcrest.BaseMatcher;
import org.hamcrest.Description;
import org.hamcrest.Matcher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.transaction.annotation.Transactional;

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
 * Pruebas de los endpoints de Inicio (/api/inicio/resumen, /calendario y
 * /alertas). El reloj está fijo en el 01/07/2026 02:00 UTC, que en
 * America/Asuncion todavía es el 30/06/2026: "hoy" es el 30/06 y "este
 * mes" es junio. Si el servicio usara el reloj del sistema (UTC) en vez del
 * Clock con la zona configurada, vería julio y las pruebas fallarían. Los
 * umbrales son los valores por defecto (30 días y 0,0 kg/día). Cada prueba
 * crea sus datos y la transacción se revierte al terminar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
@Import(InicioControllerTest.RelojFijoConfig.class)
class InicioControllerTest extends AutenticacionTestSupport {

    /** Reloj fijo para las pruebas: hoy es el 30/06/2026 en Asunción. */
    @TestConfiguration
    static class RelojFijoConfig {
        @Bean
        @Primary
        Clock relojFijo() {
            return Clock.fixed(Instant.parse("2026-07-01T02:00:00Z"), ZoneId.of("America/Asuncion"));
        }
    }

    private static final LocalDate INGRESO = LocalDate.of(2026, 5, 1);

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
    private Persona duenio;
    private Raza raza;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
        duenio = new Persona();
        duenio.setPerNombre("Dueño");
        duenio.setPerApellido("Inicio");
        duenio.setPerTipo("PROPIETARIO");
        duenio = personaRepository.save(duenio);
        raza = new Raza();
        raza.setRzDescripcion("Brangus-Inicio");
        raza.setRzPesoObjetivoVenta(450.0);
        raza = razaRepository.save(raza);
    }

    /**
     * Número cercano al esperado. JsonPath devuelve BigDecimal cuando el decimal
     * tiene más dígitos que un double, y closeTo de Hamcrest solo acepta Double.
     */
    private static Matcher<Object> cercaDe(double esperado, double tolerancia) {
        return new BaseMatcher<>() {
            @Override
            public boolean matches(Object actual) {
                return actual instanceof Number numero && Math.abs(numero.doubleValue() - esperado) <= tolerancia;
            }

            @Override
            public void describeTo(Description descripcion) {
                descripcion.appendText("un número cercano a " + esperado);
            }
        };
    }

    private Grupo grupo(String descripcion) {
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion(descripcion);
        return grupoRepository.save(grupo);
    }

    private SubGrupo lote(Grupo grupo, String descripcion) {
        SubGrupo lote = new SubGrupo();
        lote.setGrupo(grupo);
        lote.setSbDescripcion(descripcion);
        return subGrupoRepository.save(lote);
    }

    private Animal animal(String caravana, SubGrupo lote, LocalDate ingreso, double pesoInicial) {
        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(lote);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(ingreso);
        animal.setAniPesoInicial(pesoInicial);
        return animalRepository.save(animal);
    }

    private void pesaje(Animal animal, LocalDate fecha, double peso) {
        pesaje(animal, fecha, peso, EstadoPesaje.ACTIVO);
    }

    private void pesaje(Animal animal, LocalDate fecha, double peso, EstadoPesaje estado) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(duenio);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaEstado(estado);
        pesajesRepository.save(pesaje);
    }

    /**
     * Escenario completo (hoy = 30/06/2026, ingreso de todos = 01/05):
     * LoteA (Cría): a1 (2 pesajes, GMD último 1,5), a2 (1 pesaje) y a8 con salida.
     * LoteB (Cría): a3 (apto, 460 kg) y a4 (sin pesajes activos, con uno anulado).
     * LoteC (Engorde): a5 (último pesaje hace exactamente 30 días, GMD negativa) y
     * a6 (último pesaje hace 31 días). Sin lote: a7 (pesado hoy).
     */
    private void armarEscenario() {
        Grupo cria = grupo("Cría");
        Grupo engorde = grupo("Engorde");
        SubGrupo loteA = lote(cria, "LoteA");
        SubGrupo loteB = lote(cria, "LoteB");
        SubGrupo loteC = lote(engorde, "LoteC");

        Animal a1 = animal("A1", loteA, INGRESO, 200.0);
        pesaje(a1, LocalDate.of(2026, 5, 21), 220.0);
        pesaje(a1, LocalDate.of(2026, 6, 10), 250.0); // acumulada 50/40 = 1,25; último intervalo 30/20 = 1,5
        Animal a2 = animal("A2", loteA, INGRESO, 100.0);
        pesaje(a2, LocalDate.of(2026, 6, 10), 140.0); // 40/40 = 1,0
        Animal a8 = animal("A8", loteA, INGRESO, 200.0);
        pesaje(a8, LocalDate.of(2026, 6, 12), 500.0);
        a8.setAniFechaEgreso(LocalDate.of(2026, 6, 15));
        a8.setAniMotivoSalida("VENTA");
        animalRepository.save(a8);

        Animal a3 = animal("A3", loteB, INGRESO, 300.0);
        pesaje(a3, LocalDate.of(2026, 6, 20), 460.0); // 160/50 = 3,2; apto
        Animal a4 = animal("A4", loteB, INGRESO, 150.0);
        pesaje(a4, LocalDate.of(2026, 6, 25), 500.0, EstadoPesaje.ANULADO);

        Animal a5 = animal("A5", loteC, INGRESO, 200.0);
        pesaje(a5, LocalDate.of(2026, 5, 31), 190.0); // 30 días: no cuenta; -10/30
        Animal a6 = animal("A6", loteC, INGRESO, 200.0);
        pesaje(a6, LocalDate.of(2026, 5, 30), 229.0); // 31 días: cuenta; 29/29 = 1,0

        Animal a7 = animal("A7", null, INGRESO, 220.0);
        pesaje(a7, LocalDate.of(2026, 6, 30), 232.0); // 12/60 = 0,2
    }

    // ---- resumen ----

    @Test
    @DisplayName("El resumen cuenta activos, pesados y sesiones del mes, aptos y alertas, con el reloj fijo y la zona configurada")
    void resumenConConteos() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                // A1 a A7 (A8 tiene salida).
                .andExpect(jsonPath("$.animalesActivos").value(7))
                // A1, A2, A3, A7 y A8 (con salida igual, tuvo un pesaje activo en junio); A4 solo tiene uno anulado.
                .andExpect(jsonPath("$.pesadosEsteMes").value(5))
                // (10/06, LoteA), (12/06, LoteA), (20/06, LoteB) y (30/06, sin lote).
                .andExpect(jsonPath("$.sesionesEsteMes").value(4))
                .andExpect(jsonPath("$.aptosVenta").value(1))
                // A4 (60 días desde el ingreso) y A6 (31 días); A5 con exactamente 30 no cuenta.
                .andExpect(jsonPath("$.sinPesajeReciente").value(2))
                // Solo A5 (GMD negativa); A4 no tiene GMD y no cuenta.
                .andExpect(jsonPath("$.gananciaBaja").value(1))
                .andExpect(jsonPath("$.parametros.diasSinPesaje").value(30))
                .andExpect(jsonPath("$.parametros.gananciaMinima").value(0.0));
    }

    @Test
    @DisplayName("El resumen por lote promedia solo animales activos, ordena por GMD y trae 'Sin lote'")
    void resumenPorLote() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes.length()").value(4))
                // LoteB: A3 (3,2) y A4 (sin dato de peso ni GMD).
                .andExpect(jsonPath("$.lotes[0].loteDescripcion").value("LoteB"))
                .andExpect(jsonPath("$.lotes[0].grupoDescripcion").value("Cría"))
                .andExpect(jsonPath("$.lotes[0].animalesActivos").value(2))
                .andExpect(jsonPath("$.lotes[0].pesoPromedio").value(cercaDe(460.0, 0.0001)))
                .andExpect(jsonPath("$.lotes[0].gmdPromedio").value(cercaDe(3.2, 0.0001)))
                // LoteA: A1 y A2 (A8 tiene salida y no entra).
                .andExpect(jsonPath("$.lotes[1].loteDescripcion").value("LoteA"))
                .andExpect(jsonPath("$.lotes[1].animalesActivos").value(2))
                .andExpect(jsonPath("$.lotes[1].pesoPromedio").value(cercaDe(195.0, 0.0001)))
                .andExpect(jsonPath("$.lotes[1].gmdPromedio").value(cercaDe(1.125, 0.0001)))
                // LoteC: A5 (-1/3) y A6 (1,0).
                .andExpect(jsonPath("$.lotes[2].loteDescripcion").value("LoteC"))
                .andExpect(jsonPath("$.lotes[2].pesoPromedio").value(cercaDe(209.5, 0.0001)))
                .andExpect(jsonPath("$.lotes[2].gmdPromedio").value(cercaDe(1.0 / 3.0, 0.0001)))
                // Sin lote.
                .andExpect(jsonPath("$.lotes[3].loteId").value(nullValue()))
                .andExpect(jsonPath("$.lotes[3].loteDescripcion").value("Sin lote"))
                .andExpect(jsonPath("$.lotes[3].grupoDescripcion").value(nullValue()))
                .andExpect(jsonPath("$.lotes[3].animalesActivos").value(1))
                .andExpect(jsonPath("$.lotes[3].pesoPromedio").value(cercaDe(232.0, 0.0001)))
                .andExpect(jsonPath("$.lotes[3].gmdPromedio").value(cercaDe(0.2, 0.0001)));
    }

    @Test
    @DisplayName("El resumen por grupo agrupa los lotes, promedia por animal y ordena por GMD")
    void resumenPorGrupo() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.grupos.length()").value(3))
                // Cría: LoteA + LoteB; promedios sobre los animales (no sobre los promedios de lote).
                .andExpect(jsonPath("$.grupos[0].grupoDescripcion").value("Cría"))
                .andExpect(jsonPath("$.grupos[0].lotes").value(2))
                .andExpect(jsonPath("$.grupos[0].animalesActivos").value(4))
                .andExpect(jsonPath("$.grupos[0].pesoPromedio").value(cercaDe((250.0 + 140.0 + 460.0) / 3, 0.0001)))
                .andExpect(jsonPath("$.grupos[0].gmdPromedio").value(cercaDe((1.25 + 1.0 + 3.2) / 3, 0.0001)))
                .andExpect(jsonPath("$.grupos[1].grupoDescripcion").value("Engorde"))
                .andExpect(jsonPath("$.grupos[1].lotes").value(1))
                .andExpect(jsonPath("$.grupos[1].animalesActivos").value(2))
                .andExpect(jsonPath("$.grupos[1].gmdPromedio").value(cercaDe(1.0 / 3.0, 0.0001)))
                // Los animales sin lote forman una fila aparte, con 0 lotes.
                .andExpect(jsonPath("$.grupos[2].grupoId").value(nullValue()))
                .andExpect(jsonPath("$.grupos[2].grupoDescripcion").value("Sin lote"))
                .andExpect(jsonPath("$.grupos[2].lotes").value(0))
                .andExpect(jsonPath("$.grupos[2].animalesActivos").value(1));
    }

    @Test
    @DisplayName("Un lote cuyos animales no tienen datos queda con pesoPromedio y gmdPromedio null, al final")
    void resumenLoteSinDatosVaAlFinal() throws Exception {
        Grupo grupo = grupo("Solo");
        animal("S1", lote(grupo, "Sin-Pesajes"), INGRESO, 200.0);
        Animal conDatos = animal("S2", lote(grupo, "Con-Datos"), INGRESO, 200.0);
        pesaje(conDatos, LocalDate.of(2026, 5, 21), 220.0);

        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.lotes[0].loteDescripcion").value("Con-Datos"))
                .andExpect(jsonPath("$.lotes[1].loteDescripcion").value("Sin-Pesajes"))
                .andExpect(jsonPath("$.lotes[1].pesoPromedio").value(nullValue()))
                .andExpect(jsonPath("$.lotes[1].gmdPromedio").value(nullValue()));
    }

    @Test
    @DisplayName("Sin animales el resumen viene en cero y con listas vacías")
    void resumenSinAnimales() throws Exception {
        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.animalesActivos").value(0))
                .andExpect(jsonPath("$.pesadosEsteMes").value(0))
                .andExpect(jsonPath("$.sesionesEsteMes").value(0))
                .andExpect(jsonPath("$.lotes.length()").value(0))
                .andExpect(jsonPath("$.grupos.length()").value(0));
    }

    @Test
    @DisplayName("Un pesaje del mes anterior no cuenta como 'este mes'")
    void resumenIgnoraPesajesDeOtrosMeses() throws Exception {
        Animal animal = animal("M1", null, INGRESO, 200.0);
        pesaje(animal, LocalDate.of(2026, 5, 31), 210.0);
        pesaje(animal, LocalDate.of(2026, 7, 1), 220.0);

        mockMvc.perform(get("/api/inicio/resumen").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesadosEsteMes").value(0))
                .andExpect(jsonPath("$.sesionesEsteMes").value(0));
    }

    // ---- calendario ----

    @Test
    @DisplayName("El calendario trae los días con pesajes activos, ordenados, con 2 sesiones el mismo día")
    void calendarioConDosSesionesElMismoDia() throws Exception {
        Grupo grupo = grupo("Cal");
        SubGrupo loteX = lote(grupo, "LoteX");
        SubGrupo loteY = lote(grupo, "LoteY");
        Animal x1 = animal("X1", loteX, LocalDate.of(2026, 1, 1), 200.0);
        Animal x2 = animal("X2", loteX, LocalDate.of(2026, 1, 1), 200.0);
        Animal y1 = animal("Y1", loteY, LocalDate.of(2026, 1, 1), 200.0);
        Animal sinLote = animal("Z1", null, LocalDate.of(2026, 1, 1), 200.0);
        // 20/03: tres lotes (X, Y y sin lote) = 3 sesiones, 4 animales.
        pesaje(x1, LocalDate.of(2026, 3, 20), 210.0);
        pesaje(x2, LocalDate.of(2026, 3, 20), 211.0);
        pesaje(y1, LocalDate.of(2026, 3, 20), 212.0);
        pesaje(sinLote, LocalDate.of(2026, 3, 20), 213.0);
        // 05/03: una sola sesión, un animal; un pesaje anulado el 10/03 no hace aparecer ese día.
        pesaje(x1, LocalDate.of(2026, 3, 5), 205.0);
        pesaje(x2, LocalDate.of(2026, 3, 10), 205.0, EstadoPesaje.ANULADO);
        // Fuera del mes.
        pesaje(x1, LocalDate.of(2026, 4, 1), 220.0);
        pesaje(x1, LocalDate.of(2026, 2, 28), 200.0);

        mockMvc.perform(get("/api/inicio/calendario").param("anio", "2026").param("mes", "3")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].fecha").value("2026-03-05"))
                .andExpect(jsonPath("$[0].sesiones").value(1))
                .andExpect(jsonPath("$[0].animales").value(1))
                .andExpect(jsonPath("$[1].fecha").value("2026-03-20"))
                .andExpect(jsonPath("$[1].sesiones").value(3))
                .andExpect(jsonPath("$[1].animales").value(4));
    }

    @Test
    @DisplayName("Un mes sin pesajes devuelve una lista vacía")
    void calendarioMesSinPesajes() throws Exception {
        mockMvc.perform(get("/api/inicio/calendario").param("anio", "2026").param("mes", "2")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("Mes 0 o 13 devuelve 400 con el mensaje en español")
    void calendarioMesInvalido() throws Exception {
        for (String mes : new String[] { "0", "13", "-1" }) {
            mockMvc.perform(get("/api/inicio/calendario").param("anio", "2026").param("mes", mes)
                            .header("Authorization", token))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().string("El mes debe estar entre 1 y 12"));
        }
    }

    @Test
    @DisplayName("Sin año, sin mes, o con un año imposible devuelve 400")
    void calendarioParametrosFaltantesOInvalidos() throws Exception {
        mockMvc.perform(get("/api/inicio/calendario").param("mes", "3").header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo anio"));
        mockMvc.perform(get("/api/inicio/calendario").param("anio", "2026").header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo mes"));
        mockMvc.perform(get("/api/inicio/calendario").param("anio", "1000000000").param("mes", "3")
                        .header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El año no es válido"));
        mockMvc.perform(get("/api/inicio/calendario").param("anio", "abc").param("mes", "3")
                        .header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    // ---- alertas ----

    @Test
    @DisplayName("Alerta APTOS: solo activos aptos, con sus datos")
    void alertaAptos() throws Exception {
        armarEscenario();

        // A8 pesa 500 kg pero tiene salida: no aparece.
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("APTOS"))
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.animales.length()").value(1))
                .andExpect(jsonPath("$.animales[0].caravana").value("A3"))
                .andExpect(jsonPath("$.animales[0].razaDescripcion").value("Brangus-Inicio"))
                .andExpect(jsonPath("$.animales[0].loteDescripcion").value("LoteB"))
                .andExpect(jsonPath("$.animales[0].pesoActual").value(460.0))
                .andExpect(jsonPath("$.animales[0].gmd").value(cercaDe(3.2, 0.0001)))
                .andExpect(jsonPath("$.animales[0].fechaUltimoPesaje").value("2026-06-20"))
                .andExpect(jsonPath("$.animales[0].diasSinPesaje").value(10));
    }

    @Test
    @DisplayName("Alerta APTOS: orden por peso de mayor a menor y el peso igual al objetivo cuenta")
    void alertaAptosOrdenYLimite() throws Exception {
        for (double peso : new double[] { 460.0, 500.0, 450.0, 449.0 }) {
            Animal animal = animal("P" + (int) peso, null, INGRESO, 200.0);
            pesaje(animal, LocalDate.of(2026, 6, 20), peso);
        }

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.animales[0].caravana").value("P500"))
                .andExpect(jsonPath("$.animales[1].caravana").value("P460"))
                .andExpect(jsonPath("$.animales[2].caravana").value("P450"));

        // El límite recorta la lista pero no el total.
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").param("limite", "2")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(3))
                .andExpect(jsonPath("$.animales.length()").value(2))
                .andExpect(jsonPath("$.animales[1].caravana").value("P460"));
    }

    @Test
    @DisplayName("Alerta SIN_PESAJE: límite de 30 días, ingreso como referencia si nunca se pesó, orden por días")
    void alertaSinPesaje() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "SIN_PESAJE").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("SIN_PESAJE"))
                .andExpect(jsonPath("$.total").value(2))
                // A4: nunca se lo pesó (su único pesaje está anulado): 60 días desde el ingreso, sin fecha de pesaje.
                .andExpect(jsonPath("$.animales[0].caravana").value("A4"))
                .andExpect(jsonPath("$.animales[0].diasSinPesaje").value(60))
                .andExpect(jsonPath("$.animales[0].fechaUltimoPesaje").value(nullValue()))
                .andExpect(jsonPath("$.animales[0].gmd").value(nullValue()))
                .andExpect(jsonPath("$.animales[0].pesoActual").value(150.0))
                // A6: último pesaje hace 31 días.
                .andExpect(jsonPath("$.animales[1].caravana").value("A6"))
                .andExpect(jsonPath("$.animales[1].diasSinPesaje").value(31))
                .andExpect(jsonPath("$.animales[1].fechaUltimoPesaje").value("2026-05-30"));
    }

    @Test
    @DisplayName("Alerta SIN_PESAJE: 30 días justos no cuenta, 31 sí, y ordena por días de mayor a menor")
    void alertaSinPesajeLimites() throws Exception {
        animal("D31", null, LocalDate.of(2026, 5, 30), 200.0);
        animal("D30", null, LocalDate.of(2026, 5, 31), 200.0);
        animal("D121", null, LocalDate.of(2026, 3, 1), 200.0);

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "SIN_PESAJE").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.animales[0].caravana").value("D121"))
                .andExpect(jsonPath("$.animales[0].diasSinPesaje").value(121))
                .andExpect(jsonPath("$.animales[1].caravana").value("D31"))
                .andExpect(jsonPath("$.animales[1].diasSinPesaje").value(31));
    }

    @Test
    @DisplayName("Alerta GANANCIA_BAJA: solo con GMD menor al mínimo, sin GMD no cuenta, orden de menor a mayor")
    void alertaGananciaBaja() throws Exception {
        // Mismo punto de partida y 10 días: GMD -1,0, -0,5 y 0,0 (justo el mínimo: no cuenta).
        double[] pesos = { 195.0, 190.0, 200.0 };
        String[] caravanas = { "G-0,5", "G-1", "G0" };
        for (int i = 0; i < pesos.length; i++) {
            Animal animal = animal(caravanas[i], null, INGRESO, 200.0);
            pesaje(animal, LocalDate.of(2026, 5, 11), pesos[i]);
        }
        animal("SIN-GMD", null, INGRESO, 200.0);

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "GANANCIA_BAJA").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipo").value("GANANCIA_BAJA"))
                .andExpect(jsonPath("$.total").value(2))
                .andExpect(jsonPath("$.animales[0].caravana").value("G-1"))
                .andExpect(jsonPath("$.animales[0].gmd").value(cercaDe(-1.0, 0.0001)))
                .andExpect(jsonPath("$.animales[1].caravana").value("G-0,5"))
                .andExpect(jsonPath("$.animales[1].gmd").value(cercaDe(-0.5, 0.0001)));
    }

    @Test
    @DisplayName("Alerta GANANCIA_BAJA ignora los pesajes anulados y a los animales con salida")
    void alertaGananciaBajaIgnoraAnuladosYSalidas() throws Exception {
        armarEscenario();
        // A2 pierde peso en un pesaje anulado: el último pesaje activo sigue siendo el de 06/10.
        pesaje(animalRepository.findAll().stream().filter(a -> "A2".equals(a.getAniCaravana())).findFirst()
                .orElseThrow(), LocalDate.of(2026, 6, 28), 90.0, EstadoPesaje.ANULADO);
        // A8 (con salida) tendría GMD baja, pero no es un animal activo.
        Animal a8 = animalRepository.findAll().stream().filter(a -> "A8".equals(a.getAniCaravana())).findFirst()
                .orElseThrow();
        pesaje(a8, LocalDate.of(2026, 6, 13), 100.0);

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "GANANCIA_BAJA").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.animales[0].caravana").value("A5"))
                .andExpect(jsonPath("$.animales[0].gmd").value(cercaDe(-1.0 / 3.0, 0.0001)));
    }

    @Test
    @DisplayName("Sin límite devuelve 10 animales, y el total cuenta todos")
    void alertaLimitePorDefecto() throws Exception {
        for (int i = 0; i < 12; i++) {
            Animal animal = animal(String.format("L%02d", i), null, INGRESO, 200.0);
            pesaje(animal, LocalDate.of(2026, 6, 20), 450.0 + i);
        }

        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(12))
                .andExpect(jsonPath("$.animales.length()").value(10));
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").param("limite", "100")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.animales.length()").value(12));
    }

    @Test
    @DisplayName("Tipo faltante o inválido devuelve 400")
    void alertaTipoInvalido() throws Exception {
        mockMvc.perform(get("/api/inicio/alertas").header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo tipo"));
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "OTRO").header("Authorization", token))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El tipo debe ser APTOS, SIN_PESAJE o GANANCIA_BAJA"));
    }

    @Test
    @DisplayName("Un límite fuera de 1 a 100 devuelve 400")
    void alertaLimiteInvalido() throws Exception {
        for (String limite : new String[] { "0", "101", "-5" }) {
            mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").param("limite", limite)
                            .header("Authorization", token))
                    .andExpect(status().isBadRequest())
                    .andExpect(content().string("El límite debe estar entre 1 y 100"));
        }
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS").param("limite", "abc")
                        .header("Authorization", token))
                .andExpect(status().isBadRequest());
    }

    // ---- autenticación ----

    @Test
    @DisplayName("Los tres endpoints exigen token")
    void exigenToken() throws Exception {
        mockMvc.perform(get("/api/inicio/resumen")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/inicio/calendario").param("anio", "2026").param("mes", "6"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/inicio/alertas").param("tipo", "APTOS")).andExpect(status().isUnauthorized());
    }
}
