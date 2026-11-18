package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import com.efganados.sistemabovino.service.AnimalService;

/**
 * Pruebas de la GMD acumulada ({@link AnimalService#rendimientoAcumulado}) y
 * de los endpoints {@code /api/reportes/proveedores} y
 * {@code /api/reportes/proveedores/animales}. Todos los animales ingresan el
 * 01/01/2026, así que los días hasta cada pesaje se leen directo de la
 * fecha (11/01 = 10 días, 21/01 = 20 días, etc.). Cada prueba crea sus datos
 * y la transacción se revierte al terminar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReporteProveedoresControllerTest extends AutenticacionTestSupport {

    private static final LocalDate INGRESO = LocalDate.of(2026, 1, 1);

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
    private AnimalService animalService;

    private String token;
    private Persona responsable;
    private Raza raza;
    private SubGrupo lote;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
        responsable = persona("Resp", "Pesaje", "EMPLEADO");
        raza = new Raza();
        raza.setRzDescripcion("Brangus-Rep");
        raza.setRzPesoObjetivoVenta(450.0);
        raza = razaRepository.save(raza);
        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-Rep");
        grupoRepository.save(grupo);
        lote = new SubGrupo();
        lote.setGrupo(grupo);
        lote.setSbDescripcion("Lote-Rep");
        lote = subGrupoRepository.save(lote);
    }

    private Persona persona(String nombre, String apellido, String tipo) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido(apellido);
        persona.setPerTipo(tipo);
        return personaRepository.save(persona);
    }

    private Persona proveedor(String nombre, String apellido) {
        return persona(nombre, apellido, "PROVEEDOR");
    }

    private Animal animal(String caravana, double pesoInicial, Persona proveedor) {
        Animal animal = new Animal();
        animal.setDuenio(responsable);
        animal.setRaza(raza);
        animal.setSubGrupo(lote);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(INGRESO);
        animal.setAniPesoInicial(pesoInicial);
        animal.setProveedor(proveedor);
        return animalRepository.save(animal);
    }

    private void pesaje(Animal animal, LocalDate fecha, double peso) {
        pesaje(animal, fecha, peso, EstadoPesaje.ACTIVO);
    }

    private void pesaje(Animal animal, LocalDate fecha, double peso, EstadoPesaje estado) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaEstado(estado);
        pesajesRepository.save(pesaje);
    }

    private void darSalida(Animal animal, String motivo) {
        animal.setAniFechaEgreso(LocalDate.of(2026, 3, 1));
        animal.setAniMotivoSalida(motivo);
        animalRepository.save(animal);
    }

    // ---- GMD acumulada (AnimalService.rendimientoAcumulado) ----

    @Test
    @DisplayName("GMD acumulada con un pesaje: (peso − inicial) / días desde el ingreso")
    void gmdAcumuladaConUnPesaje() {
        Animal animal = animal("GA-1", 200.0, null);
        pesaje(animal, LocalDate.of(2026, 1, 11), 230.0);

        AnimalService.RendimientoAcumulado rendimiento = animalService.rendimientoAcumulado(animal);

        assertEquals(3.0, rendimiento.gmd());
        assertEquals(230.0, rendimiento.pesoActual());
        assertEquals(30.0, rendimiento.gananciaKg());
        assertEquals(3.0, animalService.calcularGmdAcumulado(animal));
    }

    @Test
    @DisplayName("GMD acumulada con varios pesajes usa el último pesaje activo contra el ingreso")
    void gmdAcumuladaConVariosPesajes() {
        Animal animal = animal("GA-2", 200.0, null);
        pesaje(animal, LocalDate.of(2026, 1, 11), 230.0);
        pesaje(animal, LocalDate.of(2026, 1, 31), 260.0);

        // 60 kg en 30 días; no es el promedio de los tramos (3.0 y 1.5).
        assertEquals(2.0, animalService.calcularGmdAcumulado(animal));
        assertEquals(260.0, animalService.rendimientoAcumulado(animal).pesoActual());
    }

    @Test
    @DisplayName("GMD acumulada sin pesajes es null y el peso actual es el inicial")
    void gmdAcumuladaSinPesajesEsNull() {
        Animal animal = animal("GA-3", 200.0, null);

        AnimalService.RendimientoAcumulado rendimiento = animalService.rendimientoAcumulado(animal);

        assertNull(rendimiento.gmd());
        assertEquals(200.0, rendimiento.pesoActual());
        assertEquals(0.0, rendimiento.gananciaKg());
    }

    @Test
    @DisplayName("GMD acumulada con un pesaje el mismo día del ingreso (0 días) es null")
    void gmdAcumuladaConDiasCeroEsNull() {
        Animal animal = animal("GA-4", 200.0, null);
        pesaje(animal, INGRESO, 210.0);

        assertNull(animalService.calcularGmdAcumulado(animal));
    }

    @Test
    @DisplayName("GMD acumulada ignora los pesajes anulados")
    void gmdAcumuladaIgnoraPesajesAnulados() {
        Animal animal = animal("GA-5", 200.0, null);
        pesaje(animal, LocalDate.of(2026, 1, 11), 230.0);
        pesaje(animal, LocalDate.of(2026, 1, 31), 500.0, EstadoPesaje.ANULADO);

        assertEquals(3.0, animalService.calcularGmdAcumulado(animal));
        assertEquals(230.0, animalService.rendimientoAcumulado(animal).pesoActual());
    }

    @Test
    @DisplayName("GMD acumulada con solo pesajes anulados es null")
    void gmdAcumuladaConSoloAnuladosEsNull() {
        Animal animal = animal("GA-6", 200.0, null);
        pesaje(animal, LocalDate.of(2026, 1, 11), 230.0, EstadoPesaje.ANULADO);

        assertNull(animalService.calcularGmdAcumulado(animal));
    }

    // ---- GET /api/reportes/proveedores ----

    /**
     * Arma el escenario del comparativo: A (2 con datos + 1 sin datos), B (uno
     * activo y uno con salida), C (solo un animal sin datos) y animales sin
     * proveedor (uno con datos y uno sin datos).
     */
    private void armarEscenario() {
        Persona a = proveedor("Ana", "Alfa");
        Persona b = proveedor("Beto", "Beta");
        Persona c = proveedor("Carla", "Cero");

        Animal a1 = animal("A1", 200.0, a);
        pesaje(a1, LocalDate.of(2026, 1, 11), 230.0); // 30 kg / 10 d = 3.0
        Animal a2 = animal("A2", 100.0, a);
        pesaje(a2, LocalDate.of(2026, 1, 21), 140.0); // 40 kg / 20 d = 2.0
        animal("A3", 150.0, a); // sin pesajes: sin datos

        Animal b1 = animal("B1", 200.0, b);
        pesaje(b1, LocalDate.of(2026, 1, 11), 220.0); // 20 kg / 10 d = 2.0
        Animal b2 = animal("B2", 200.0, b);
        pesaje(b2, LocalDate.of(2026, 1, 21), 300.0); // 100 kg / 20 d = 5.0
        darSalida(b2, "MUERTE");

        animal("C1", 180.0, c); // sin datos

        Animal s1 = animal("S1", 200.0, null);
        pesaje(s1, LocalDate.of(2026, 1, 6), 210.0); // 10 kg / 5 d = 2.0
        animal("S2", 100.0, null); // sin datos
    }

    @Test
    @DisplayName("El comparativo trae promedios, mejor animal y el orden pedido (con salidas incluidas por defecto)")
    void comparativoConPromediosMejorAnimalYOrden() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/reportes/proveedores").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                // B primero (3.5), luego A (2.5), luego C (null) y "Sin proveedor" siempre al final.
                .andExpect(jsonPath("$[0].proveedorNombre").value("Beto Beta"))
                .andExpect(jsonPath("$[0].cantidadAnimales").value(2))
                .andExpect(jsonPath("$[0].animalesConDatos").value(2))
                .andExpect(jsonPath("$[0].gmdPromedio").value(3.5))
                .andExpect(jsonPath("$[0].gananciaPromedioKg").value(60.0))
                .andExpect(jsonPath("$[0].mejorAnimalCaravana").value("B2"))
                .andExpect(jsonPath("$[0].mejorAnimalGmd").value(5.0))
                .andExpect(jsonPath("$[1].proveedorNombre").value("Ana Alfa"))
                .andExpect(jsonPath("$[1].cantidadAnimales").value(3))
                .andExpect(jsonPath("$[1].animalesConDatos").value(2))
                .andExpect(jsonPath("$[1].gmdPromedio").value(2.5))
                .andExpect(jsonPath("$[1].gananciaPromedioKg").value(35.0))
                .andExpect(jsonPath("$[1].mejorAnimalCaravana").value("A1"))
                .andExpect(jsonPath("$[1].mejorAnimalGmd").value(3.0))
                .andExpect(jsonPath("$[2].proveedorNombre").value("Carla Cero"))
                .andExpect(jsonPath("$[2].cantidadAnimales").value(1))
                .andExpect(jsonPath("$[2].animalesConDatos").value(0))
                .andExpect(jsonPath("$[2].gmdPromedio").value(nullValue()))
                .andExpect(jsonPath("$[2].gananciaPromedioKg").value(nullValue()))
                .andExpect(jsonPath("$[2].mejorAnimalCaravana").value(nullValue()))
                .andExpect(jsonPath("$[2].mejorAnimalGmd").value(nullValue()))
                .andExpect(jsonPath("$[3].proveedorId").value(nullValue()))
                .andExpect(jsonPath("$[3].proveedorNombre").value("Sin proveedor"))
                .andExpect(jsonPath("$[3].cantidadAnimales").value(2))
                .andExpect(jsonPath("$[3].animalesConDatos").value(1))
                .andExpect(jsonPath("$[3].gmdPromedio").value(2.0))
                .andExpect(jsonPath("$[3].gananciaPromedioKg").value(10.0))
                .andExpect(jsonPath("$[3].mejorAnimalCaravana").value("S1"));
    }

    @Test
    @DisplayName("Con soloActivos=true el comparativo deja afuera a los animales con salida y reordena")
    void comparativoSoloActivos() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/reportes/proveedores").param("soloActivos", "true")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(4))
                // Sin B2 (con salida), B baja a 2.0 y A (2.5) pasa primero.
                .andExpect(jsonPath("$[0].proveedorNombre").value("Ana Alfa"))
                .andExpect(jsonPath("$[1].proveedorNombre").value("Beto Beta"))
                .andExpect(jsonPath("$[1].cantidadAnimales").value(1))
                .andExpect(jsonPath("$[1].animalesConDatos").value(1))
                .andExpect(jsonPath("$[1].gmdPromedio").value(2.0))
                .andExpect(jsonPath("$[1].gananciaPromedioKg").value(20.0))
                .andExpect(jsonPath("$[1].mejorAnimalCaravana").value("B1"))
                .andExpect(jsonPath("$[2].proveedorNombre").value("Carla Cero"))
                .andExpect(jsonPath("$[3].proveedorNombre").value("Sin proveedor"));
    }

    @Test
    @DisplayName("Con soloActivos=true un proveedor cuyos animales ya salieron todos no aparece")
    void comparativoSoloActivosOmiteProveedoresSinAnimalesActivos() throws Exception {
        Persona p = proveedor("Solo", "Salidas");
        Animal animal = animal("X1", 200.0, p);
        darSalida(animal, "VENTA");

        mockMvc.perform(get("/api/reportes/proveedores").param("soloActivos", "true")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/reportes/proveedores").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    @DisplayName("Sin animales sin proveedor no hay fila 'Sin proveedor'")
    void comparativoSinFilaSinProveedorSiNoHayAnimalesSinProveedor() throws Exception {
        Persona p = proveedor("Unico", "Proveedor");
        animal("U1", 200.0, p);

        mockMvc.perform(get("/api/reportes/proveedores").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].proveedorNombre").value("Unico Proveedor"));
    }

    @Test
    @DisplayName("El comparativo exige autenticación")
    void comparativoExigeToken() throws Exception {
        mockMvc.perform(get("/api/reportes/proveedores"))
                .andExpect(status().isUnauthorized());
    }

    // ---- GET /api/reportes/proveedores/animales ----

    @Test
    @DisplayName("El detalle de un proveedor lista sus animales por GMD acumulada, con los null al final")
    void detalleDeProveedor() throws Exception {
        armarEscenario();
        Persona a = personaRepository.findAll().stream()
                .filter(p -> "Ana".equals(p.getPerNombre())).findFirst().orElseThrow();

        mockMvc.perform(get("/api/reportes/proveedores/animales").param("proveedorId", a.getPerId().toString())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].caravana").value("A1"))
                .andExpect(jsonPath("$[0].razaDescripcion").value("Brangus-Rep"))
                .andExpect(jsonPath("$[0].loteDescripcion").value("Lote-Rep"))
                .andExpect(jsonPath("$[0].aniFechaIngreso").value("2026-01-01"))
                .andExpect(jsonPath("$[0].aniPesoInicial").value(200.0))
                .andExpect(jsonPath("$[0].pesoActual").value(230.0))
                .andExpect(jsonPath("$[0].gananciaKg").value(30.0))
                .andExpect(jsonPath("$[0].gmdAcumulado").value(3.0))
                .andExpect(jsonPath("$[0].estado").value("Activo"))
                .andExpect(jsonPath("$[1].caravana").value("A2"))
                .andExpect(jsonPath("$[1].gmdAcumulado").value(2.0))
                .andExpect(jsonPath("$[2].caravana").value("A3"))
                .andExpect(jsonPath("$[2].gmdAcumulado").value(nullValue()))
                .andExpect(jsonPath("$[2].pesoActual").value(150.0))
                .andExpect(jsonPath("$[2].gananciaKg").value(0.0));
    }

    @Test
    @DisplayName("El detalle muestra el motivo de salida como estado y soloActivos lo oculta")
    void detalleConEstadoYSoloActivos() throws Exception {
        armarEscenario();
        Persona b = personaRepository.findAll().stream()
                .filter(p -> "Beto".equals(p.getPerNombre())).findFirst().orElseThrow();

        mockMvc.perform(get("/api/reportes/proveedores/animales").param("proveedorId", b.getPerId().toString())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].caravana").value("B2"))
                .andExpect(jsonPath("$[0].estado").value("MUERTE"))
                .andExpect(jsonPath("$[1].caravana").value("B1"))
                .andExpect(jsonPath("$[1].estado").value("Activo"));

        mockMvc.perform(get("/api/reportes/proveedores/animales")
                        .param("proveedorId", b.getPerId().toString()).param("soloActivos", "true")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].caravana").value("B1"));
    }

    @Test
    @DisplayName("Sin proveedorId el detalle trae los animales sin proveedor")
    void detalleSinProveedor() throws Exception {
        armarEscenario();

        mockMvc.perform(get("/api/reportes/proveedores/animales").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].caravana").value("S1"))
                .andExpect(jsonPath("$[0].gmdAcumulado").value(2.0))
                .andExpect(jsonPath("$[1].caravana").value("S2"))
                .andExpect(jsonPath("$[1].gmdAcumulado").value(nullValue()));
    }

    @Test
    @DisplayName("El detalle de un proveedorId inexistente devuelve 404")
    void detalleDeProveedorInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/reportes/proveedores/animales").param("proveedorId", "99999")
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 99999"));
    }

    @Test
    @DisplayName("Un animal sin lote sale con loteDescripcion null en el detalle")
    void detalleAnimalSinLote() throws Exception {
        Animal sinLote = animal("SL-1", 200.0, null);
        sinLote.setSubGrupo(null);
        animalRepository.save(sinLote);

        mockMvc.perform(get("/api/reportes/proveedores/animales").header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].caravana").value("SL-1"))
                .andExpect(jsonPath("$[0].loteDescripcion").value(nullValue()));
    }
}
