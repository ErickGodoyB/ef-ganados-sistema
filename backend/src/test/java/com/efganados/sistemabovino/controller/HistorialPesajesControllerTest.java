package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

/**
 * Pruebas de integración de GET /api/animales/{id}/pesajes (historial
 * completo de pesajes de un animal, ver AnimalController.historialPesajes
 * y PesajeService.obtenerHistorialAnimal). Cada prueba crea sus propios
 * datos y la transacción se revierte al finalizar. Todas las peticiones
 * llevan el token del administrador inicial (ver {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class HistorialPesajesControllerTest extends AutenticacionTestSupport {

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
        responsable = crearPersona("Responsable-Historial");
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

    /** Crea y persiste un animal de prueba, con una raza propia (peso objetivo de venta 450 kg) e ingreso/peso inicial dados. */
    private Animal crearAnimal(String caravana, LocalDate fechaIngreso, double pesoInicial) {
        Persona duenio = crearPersona("Dueño-" + caravana);

        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razaRepository.save(raza);

        Grupo grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-" + caravana);
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
        animal.setAniFechaIngreso(fechaIngreso);
        animal.setAniPesoInicial(pesoInicial);
        return animalRepository.save(animal);
    }

    /** Registra un pesaje ACTIVO de prueba, directamente por repositorio. */
    private Pesajes registrarPesaje(Animal animal, double peso, LocalDate fecha) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        return pesajesRepository.save(pesaje);
    }

    /** Registra un pesaje ya ANULADO de prueba, con sus propios datos de anulación. */
    private Pesajes registrarPesajeAnulado(Animal animal, double peso, LocalDate fecha, String motivo, Persona anuladoPor) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaEstado(EstadoPesaje.ANULADO);
        pesaje.setPesaMotivoAnulacion(motivo);
        pesaje.setPesaAnuladoEn(LocalDateTime.of(2026, 6, 1, 10, 0));
        pesaje.setAnuladoPor(anuladoPor);
        return pesajesRepository.save(pesaje);
    }

    @Test
    @DisplayName("El historial de un animal sin pesajes devuelve 200 con una lista vacía")
    void historialDeAnimalSinPesajesDevuelveListaVacia() throws Exception {
        Animal animal = crearAnimal("CAR-HIST-001", LocalDate.of(2026, 1, 1), 200.0);

        mockMvc.perform(get("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    @DisplayName("El historial de un animal inexistente devuelve 404")
    void historialDeAnimalInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/animales/{id}/pesajes", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }

    @Test
    @DisplayName("El historial con 3 pesajes activos viene en orden cronológico, el primero calculado contra el ingreso")
    void historialConTresPesajesActivosEnOrdenCronologico() throws Exception {
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-HIST-002", ingreso, 200.0);
        // Se registran fuera de orden a propósito: el endpoint tiene que ordenarlos por fecha, no por el orden de alta.
        registrarPesaje(animal, 230.0, LocalDate.of(2026, 1, 21));
        registrarPesaje(animal, 210.0, LocalDate.of(2026, 1, 11));
        registrarPesaje(animal, 235.0, LocalDate.of(2026, 1, 31));

        mockMvc.perform(get("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                // El primero: sin pesaje ACTIVO anterior, contra el ingreso (200 el 01/01, 10 días -> gmd 1.0).
                .andExpect(jsonPath("$[0].fecha").value("2026-01-11"))
                .andExpect(jsonPath("$[0].peso").value(210.0))
                .andExpect(jsonPath("$[0].pesoAnterior").value(200.0))
                .andExpect(jsonPath("$[0].pesoAnteriorEsIngreso").value(true))
                .andExpect(jsonPath("$[0].fechaPesoAnterior").value("2026-01-01"))
                .andExpect(jsonPath("$[0].gmd").value(1.0))
                .andExpect(jsonPath("$[0].estado").value("ACTIVO"))
                .andExpect(jsonPath("$[0].motivoAnulacion").value(nullValue()))
                .andExpect(jsonPath("$[0].anuladoEn").value(nullValue()))
                .andExpect(jsonPath("$[0].anuladoPorNombre").value(nullValue()))
                .andExpect(jsonPath("$[0].responsableNombre").value("Responsable-Historial Apellido"))
                // El segundo: contra el primero (210 el 11/01, 10 días -> gmd 2.0).
                .andExpect(jsonPath("$[1].fecha").value("2026-01-21"))
                .andExpect(jsonPath("$[1].peso").value(230.0))
                .andExpect(jsonPath("$[1].pesoAnterior").value(210.0))
                .andExpect(jsonPath("$[1].pesoAnteriorEsIngreso").value(false))
                .andExpect(jsonPath("$[1].fechaPesoAnterior").value("2026-01-11"))
                .andExpect(jsonPath("$[1].gmd").value(2.0))
                // El tercero: contra el segundo (230 el 21/01, 10 días -> gmd 0.5).
                .andExpect(jsonPath("$[2].fecha").value("2026-01-31"))
                .andExpect(jsonPath("$[2].peso").value(235.0))
                .andExpect(jsonPath("$[2].pesoAnterior").value(230.0))
                .andExpect(jsonPath("$[2].pesoAnteriorEsIngreso").value(false))
                .andExpect(jsonPath("$[2].fechaPesoAnterior").value("2026-01-21"))
                .andExpect(jsonPath("$[2].gmd").value(0.5));
    }

    @Test
    @DisplayName("Por defecto, un pesaje anulado no aparece y no cuenta como anterior del siguiente")
    void porDefectoElAnuladoNoApareceNiCuentaComoAnterior() throws Exception {
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-HIST-003", ingreso, 200.0);
        registrarPesaje(animal, 210.0, LocalDate.of(2026, 1, 11));
        registrarPesajeAnulado(animal, 999.0, LocalDate.of(2026, 1, 21), "Pesaje incorrecto", responsable);
        registrarPesaje(animal, 230.0, LocalDate.of(2026, 1, 31));

        mockMvc.perform(get("/api/animales/{id}/pesajes", animal.getAniId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].fecha").value("2026-01-11"))
                .andExpect(jsonPath("$[1].fecha").value("2026-01-31"))
                .andExpect(jsonPath("$[1].peso").value(230.0))
                // El anterior del tercer pesaje sigue siendo el primero (10/01 -> 31/01 = 20 días), no el anulado.
                .andExpect(jsonPath("$[1].pesoAnterior").value(210.0))
                .andExpect(jsonPath("$[1].fechaPesoAnterior").value("2026-01-11"))
                .andExpect(jsonPath("$[1].gmd").value(1.0));
    }

    @Test
    @DisplayName("Con incluirAnulados=true, el anulado aparece con sus datos propios, y sigue sin contar como anterior del siguiente")
    void conIncluirAnuladosElAnuladoApareceSinAfectarAlAnterior() throws Exception {
        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal = crearAnimal("CAR-HIST-004", ingreso, 200.0);
        Persona anuladoPor = crearPersona("Anulador-Historial");
        registrarPesaje(animal, 210.0, LocalDate.of(2026, 1, 11));
        registrarPesajeAnulado(animal, 999.0, LocalDate.of(2026, 1, 21), "Pesaje incorrecto", anuladoPor);
        registrarPesaje(animal, 230.0, LocalDate.of(2026, 1, 31));

        mockMvc.perform(get("/api/animales/{id}/pesajes", animal.getAniId())
                        .param("incluirAnulados", "true")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[1].fecha").value("2026-01-21"))
                .andExpect(jsonPath("$[1].peso").value(999.0))
                .andExpect(jsonPath("$[1].estado").value("ANULADO"))
                .andExpect(jsonPath("$[1].motivoAnulacion").value("Pesaje incorrecto"))
                .andExpect(jsonPath("$[1].anuladoEn").value("2026-06-01T10:00:00"))
                .andExpect(jsonPath("$[1].anuladoPorNombre").value("Anulador-Historial Apellido"))
                // El tercer pesaje (activo) sigue calculándose contra el primero, no contra el anulado del medio.
                .andExpect(jsonPath("$[2].fecha").value("2026-01-31"))
                .andExpect(jsonPath("$[2].pesoAnterior").value(210.0))
                .andExpect(jsonPath("$[2].fechaPesoAnterior").value("2026-01-11"))
                .andExpect(jsonPath("$[2].gmd").value(1.0));
    }
}
