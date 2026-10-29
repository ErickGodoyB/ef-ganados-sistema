package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;

import com.efganados.sistemabovino.controller.PesajesController.ItemSesionPesajeRequest;
import com.efganados.sistemabovino.controller.PesajesController.SesionPesajeRequest;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Grupo;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.GrupoRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;

/**
 * Prueba de la atomicidad de POST /api/pesajes/sesion ("un ítem inválido ->
 * ninguno se guarda"): a propósito, esta clase NO lleva {@code @Transactional}
 * como el resto de las pruebas del proyecto. {@code PesajeService.registrarSesion}
 * es transaccional en sí mismo (ver su JavaDoc); si esta prueba también
 * fuera {@code @Transactional}, esa transacción quedaría anidada dentro de
 * la de la prueba y compartiría su misma conexión: un pesaje "marcado para
 * deshacer" seguiría viéndose en cualquier lectura posterior de la MISMA
 * prueba hasta que la transacción de la prueba termine de verdad al final
 * (momento en el que JUnit ya dejó de poder comprobar nada). Sin
 * {@code @Transactional} acá, la transacción de {@code registrarSesion} es
 * la más externa de verdad, así que su rollback es inmediato y se puede
 * comprobar en el momento con una consulta aparte. Como nada se deshace
 * solo, esta prueba limpia a mano lo que crea, en {@code @AfterEach}.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PesajeSesionAtomicidadTest extends AutenticacionTestSupport {

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
    private Grupo grupo;
    private SubGrupo subGrupo;
    private final List<Animal> animales = new ArrayList<>();
    private final List<Raza> razas = new ArrayList<>();
    private final List<Persona> duenios = new ArrayList<>();

    @BeforeEach
    void autenticarse() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    /** Deshace a mano todo lo que creó la prueba, en el orden que respeta las llaves foráneas. */
    @AfterEach
    void limpiar() {
        if (!animales.isEmpty()) {
            pesajesRepository.deleteAll(pesajesRepository.findAll().stream()
                    .filter(p -> animales.stream().anyMatch(a -> a.getAniId().equals(p.getAnimal().getAniId())))
                    .toList());
            animalRepository.deleteAll(animales);
        }
        if (subGrupo != null) {
            subGrupoRepository.delete(subGrupo);
        }
        if (grupo != null) {
            grupoRepository.delete(grupo);
        }
        razaRepository.deleteAll(razas);
        personaRepository.deleteAll(duenios);
        if (responsable != null) {
            personaRepository.delete(responsable);
        }
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

    private Animal crearAnimal(String caravana, LocalDate fechaIngreso) {
        Persona duenio = crearPersona("Dueño-" + caravana);
        duenios.add(duenio);

        Raza raza = new Raza();
        raza.setRzDescripcion("Raza-" + caravana);
        raza.setRzPesoObjetivoVenta(450.0);
        razas.add(razaRepository.save(raza));

        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(raza);
        animal.setSubGrupo(subGrupo);
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(fechaIngreso);
        animal.setAniPesoInicial(200.0);
        Animal guardado = animalRepository.save(animal);
        animales.add(guardado);
        return guardado;
    }

    @Test
    @DisplayName("Si un ítem de la sesión es inválido, no se guarda ninguno de los pesajes (atomicidad)")
    void siUnItemEsInvalidoNoSeGuardaNingunPesaje() throws Exception {
        grupo = new Grupo();
        grupo.setGrpDescripcion("Grupo-Sesion-Atomico");
        grupoRepository.save(grupo);

        subGrupo = new SubGrupo();
        subGrupo.setGrupo(grupo);
        subGrupo.setSbDescripcion("Lote-Sesion-Atomico");
        subGrupo = subGrupoRepository.save(subGrupo);

        responsable = crearPersona("Responsable-Atomico");

        LocalDate ingreso = LocalDate.of(2026, 1, 1);
        Animal animal1 = crearAnimal("CAR-SES-ATO-001", ingreso);
        Animal animal2 = crearAnimal("CAR-SES-ATO-002", ingreso);
        Animal animal3 = crearAnimal("CAR-SES-ATO-003", ingreso);
        LocalDate fecha = LocalDate.of(2026, 2, 1);

        SesionPesajeRequest request = new SesionPesajeRequest(fecha, responsable.getPerId(), List.of(
                new ItemSesionPesajeRequest(animal1.getAniId(), 210.0),
                new ItemSesionPesajeRequest(animal2.getAniId(), 220.0),
                new ItemSesionPesajeRequest(animal3.getAniId(), 0.0)));

        mockMvc.perform(post("/api/pesajes/sesion")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/pesajes/sesiones/detalle")
                        .header("Authorization", token)
                        .param("fecha", fecha.toString())
                        .param("subGrupoId", subGrupo.getSbId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }
}
