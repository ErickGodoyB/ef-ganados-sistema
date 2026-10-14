package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

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
 * Pruebas de integración de los endpoints derivados de {@link AnimalController}
 * que calculan indicadores a partir de los pesajes: Ganancia Media Diaria
 * ({@code GET /api/animales/{id}/gmd}) y aptitud para venta
 * ({@code GET /api/animales/{id}/apto-venta}). Cada prueba crea sus propios
 * datos (raza con un peso objetivo de venta de 450 kg, dueño, grupo y
 * subgrupo) y la transacción se revierte al finalizar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class IndicadoresControllerTest {

    @Autowired
    private MockMvc mockMvc;

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

    /** Crea y persiste un animal de prueba, con una raza propia cuyo peso objetivo de venta es 450 kg. */
    private Animal crearAnimal(String caravana, double pesoInicial) {
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
        animal.setAniPesoInicial(pesoInicial);
        return animalRepository.save(animal);
    }

    /** Registra un pesaje de prueba para el animal, con un responsable propio. */
    private void registrarPesaje(Animal animal, double peso, LocalDate fecha) {
        Persona responsable = crearPersona("Responsable-" + animal.getAniCaravana() + "-" + fecha);
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(fecha);
        pesaje.setPesaPeso(peso);
        pesajesRepository.save(pesaje);
    }

    @Test
    @DisplayName("GMD sin pesajes devuelve 200 con cuerpo vacío")
    void gmdSinPesajesDevuelve200ConCuerpoVacio() throws Exception {
        Animal animal = crearAnimal("CAR-GMD-001", 200.0);

        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    @DisplayName("GMD con un solo pesaje devuelve 200 con cuerpo vacío")
    void gmdConUnPesajeDevuelve200ConCuerpoVacio() throws Exception {
        Animal animal = crearAnimal("CAR-GMD-002", 200.0);
        registrarPesaje(animal, 210.0, LocalDate.of(2026, 2, 1));

        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string(""));
    }

    @Test
    @DisplayName("GMD con dos pesajes calcula la ganancia media diaria entre ambos")
    void gmdConDosPesajesCalculaGananciaMediaDiaria() throws Exception {
        Animal animal = crearAnimal("CAR-GMD-003", 200.0);
        registrarPesaje(animal, 215.0, LocalDate.of(2026, 8, 15));
        registrarPesaje(animal, 245.0, LocalDate.of(2026, 9, 14));

        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("1.0"));
    }

    @Test
    @DisplayName("GMD con dos pesajes en la misma fecha devuelve 0.0")
    void gmdConDosPesajesEnLaMismaFechaDevuelveCero() throws Exception {
        Animal animal = crearAnimal("CAR-GMD-004", 200.0);
        LocalDate fecha = LocalDate.of(2026, 5, 1);
        registrarPesaje(animal, 210.0, fecha);
        registrarPesaje(animal, 220.0, fecha);

        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("0.0"));
    }

    @Test
    @DisplayName("GMD con tres pesajes usa solo los dos más recientes")
    void gmdConTresPesajesUsaSoloLosDosMasRecientes() throws Exception {
        Animal animal = crearAnimal("CAR-GMD-005", 200.0);
        registrarPesaje(animal, 200.0, LocalDate.of(2026, 8, 1));
        registrarPesaje(animal, 230.0, LocalDate.of(2026, 9, 1));
        registrarPesaje(animal, 290.0, LocalDate.of(2026, 10, 1));

        mockMvc.perform(get("/api/animales/{id}/gmd", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("2.0"));
    }

    @Test
    @DisplayName("GMD de un animal inexistente devuelve 404")
    void gmdDeAnimalInexistenteDevuelve404() throws Exception {
        mockMvc.perform(get("/api/animales/{id}/gmd", 999L))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Animal no encontrado con id: 999"));
    }

    @Test
    @DisplayName("Apto para venta con peso inicial menor al objetivo de la raza devuelve false")
    void aptoVentaConPesoInicialMenorAlObjetivoDevuelveFalse() throws Exception {
        Animal animal = crearAnimal("CAR-APTO-001", 400.0);

        mockMvc.perform(get("/api/animales/{id}/apto-venta", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("false"));
    }

    @Test
    @DisplayName("Apto para venta con un pesaje que alcanza el objetivo devuelve true")
    void aptoVentaConPesajeQueAlcanzaElObjetivoDevuelveTrue() throws Exception {
        Animal animal = crearAnimal("CAR-APTO-002", 400.0);
        registrarPesaje(animal, 460.0, LocalDate.of(2026, 3, 1));

        mockMvc.perform(get("/api/animales/{id}/apto-venta", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }

    /**
     * Caso límite: estaAptoParaVenta usa {@code >=}, así que un peso exactamente
     * igual al objetivo de la raza (no solo mayor) también debe contar como apto.
     */
    @Test
    @DisplayName("apto-venta es true cuando el peso es exactamente igual al peso objetivo de la raza")
    void aptoVentaConPesoExactamenteIgualAlObjetivoDevuelveTrue() throws Exception {
        Animal animal = crearAnimal("CAR-APTO-003", 400.0);
        registrarPesaje(animal, 450.0, LocalDate.of(2026, 3, 1));

        mockMvc.perform(get("/api/animales/{id}/apto-venta", animal.getAniId()))
                .andExpect(status().isOk())
                .andExpect(content().string("true"));
    }
}
