package com.efganados.sistemabovino.controller;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.LocalDate;
import java.time.LocalDateTime;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.EstadoPesaje;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.model.Raza;
import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.RazaRepository;
import com.efganados.sistemabovino.repository.UsuarioRepository;

import tools.jackson.databind.JsonNode;

/**
 * Pruebas de integración del catálogo de personas (PersonaController/
 * PersonaService): alta y edición validadas (nombre, tipo, formato de
 * correo, unicidad de CI/RUC solo cuando vienen), eliminación bloqueada
 * por uso (dueña de animales, responsable/anuladora de pesajes, o con
 * usuario de acceso), y el resumen con sus conteos. Cada prueba crea sus
 * propios datos y la transacción se revierte al finalizar. Todas las
 * peticiones llevan el token del administrador inicial (ver
 * {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PersonaControllerTest extends AutenticacionTestSupport {

    @Autowired
    private PersonaRepository personaRepository;

    @Autowired
    private AnimalRepository animalRepository;

    @Autowired
    private RazaRepository razaRepository;

    @Autowired
    private PesajesRepository pesajesRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    private String token;

    @BeforeEach
    void preparar() throws Exception {
        token = encabezadoAutorizacionAdmin();
    }

    /** Crea y persiste una persona de prueba directamente por repositorio, sin pasar por las validaciones del service. */
    private Persona crearPersona(String nombre, String apellido, String ci, String ruc, String tipo) {
        Persona persona = new Persona();
        persona.setPerNombre(nombre);
        persona.setPerApellido(apellido);
        persona.setPerCi(ci);
        persona.setPerRuc(ruc);
        persona.setPerTipo(tipo);
        return personaRepository.save(persona);
    }

    /** Crea y persiste una raza de prueba (para poder dar de alta animales). */
    private Raza crearRaza(String descripcion) {
        Raza raza = new Raza();
        raza.setRzDescripcion(descripcion);
        raza.setRzPesoObjetivoVenta(450.0);
        return razaRepository.save(raza);
    }

    /** Crea y persiste un animal de prueba cuya dueña es la persona dada. */
    private Animal crearAnimalConDuenio(String caravana, Persona duenio) {
        Animal animal = new Animal();
        animal.setDuenio(duenio);
        animal.setRaza(crearRaza("Raza-" + caravana));
        animal.setAniCaravana(caravana);
        animal.setAniFechaIngreso(LocalDate.of(2026, 1, 1));
        animal.setAniPesoInicial(200.0);
        return animalRepository.save(animal);
    }

    /** Crea y persiste un animal de prueba ya vendido, con la persona dada como compradora. */
    private Animal crearAnimalConComprador(String caravana, Persona comprador) {
        Animal animal = crearAnimalConDuenio(caravana, crearPersona("Dueño-" + caravana, "Apellido", null, null, "PROPIETARIO"));
        animal.setComprador(comprador);
        animal.setAniMotivoSalida("VENTA");
        animal.setAniFechaEgreso(LocalDate.of(2026, 6, 1));
        return animalRepository.save(animal);
    }

    /** Crea y persiste un pesaje ACTIVO de ese animal, con la persona dada como responsable. */
    private Pesajes crearPesajeConResponsable(Animal animal, Persona responsable) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setPesaFecha(LocalDate.of(2026, 2, 1));
        pesaje.setPesaPeso(220.0);
        return pesajesRepository.save(pesaje);
    }

    /** Crea y persiste un pesaje ANULADO de ese animal, anulado por la persona dada (responsable es otra persona). */
    private Pesajes crearPesajeAnuladoPor(Animal animal, Persona responsable, Persona anulador) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setResponsable(responsable);
        pesaje.setAnuladoPor(anulador);
        pesaje.setPesaEstado(EstadoPesaje.ANULADO);
        pesaje.setPesaFecha(LocalDate.of(2026, 2, 1));
        pesaje.setPesaPeso(220.0);
        pesaje.setPesaAnuladoEn(LocalDateTime.of(2026, 2, 2, 10, 0));
        return pesajesRepository.save(pesaje);
    }

    /** Crea y persiste un usuario de acceso vinculado a la persona dada. */
    private Usuario crearUsuarioParaPersona(Persona persona, String usuNombre) {
        Usuario usuario = new Usuario();
        usuario.setPersona(persona);
        usuario.setUsuNombre(usuNombre);
        usuario.setUsuPassword("hash-de-prueba");
        return usuarioRepository.save(usuario);
    }

    private Persona personaValida() {
        Persona persona = new Persona();
        persona.setPerNombre("Juan");
        persona.setPerApellido("Pérez");
        persona.setPerTipo("PROPIETARIO");
        persona.setPerCi("1234567");
        persona.setPerRuc("80000000-1");
        persona.setPerTelefono("0981000000");
        persona.setPerCorreo("juan@test.com");
        persona.setPerDireccion("Calle 123");
        return persona;
    }

    // ---- POST /api/personas ----

    @Test
    @DisplayName("Crear una persona con datos válidos devuelve 201 con los datos guardados")
    void crearPersonaConDatosValidosDevuelve201() throws Exception {
        Persona request = personaValida();

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perNombre").value("Juan"))
                .andExpect(jsonPath("$.perApellido").value("Pérez"))
                .andExpect(jsonPath("$.perTipo").value("PROPIETARIO"))
                .andExpect(jsonPath("$.perCi").value("1234567"))
                .andExpect(jsonPath("$.perId").isNotEmpty());
    }

    @Test
    @DisplayName("Crear una persona sin nombre devuelve 400")
    void crearPersonaSinNombreDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerNombre(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo nombre"));
    }

    @Test
    @DisplayName("Crear una persona con nombre de solo espacios devuelve 400")
    void crearPersonaConNombreDeSoloEspaciosDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerNombre("   ");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo nombre"));
    }

    @Test
    @DisplayName("Crear una persona sin tipo devuelve 400")
    void crearPersonaSinTipoDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerTipo(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo tipo"));
    }

    @Test
    @DisplayName("Crear una persona con un tipo inválido devuelve 400")
    void crearPersonaConTipoInvalidoDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerTipo("PROVEEDOR");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El tipo debe ser PROPIETARIO, EMPLEADO o CLIENTE"));
    }

    @Test
    @DisplayName("Crear una persona con tipo CLIENTE devuelve 201")
    void crearPersonaConTipoClienteDevuelve201() throws Exception {
        Persona request = personaValida();
        request.setPerTipo("CLIENTE");
        request.setPerCi(null);
        request.setPerRuc(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perTipo").value("CLIENTE"));
    }

    @Test
    @DisplayName("Crear una persona con un correo sin formato válido devuelve 400")
    void crearPersonaConCorreoInvalidoDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerCorreo("no-es-un-correo");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El correo no tiene un formato válido"));
    }

    @Test
    @DisplayName("Crear una persona con una CI que ya existe devuelve 409")
    void crearPersonaConCiDuplicadaDevuelve409() throws Exception {
        crearPersona("Ana", "Gómez", "1234567", null, "EMPLEADO");
        Persona request = personaValida();
        request.setPerRuc(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe una persona con la CI 1234567"));
    }

    @Test
    @DisplayName("Crear una persona con un RUC que ya existe devuelve 409")
    void crearPersonaConRucDuplicadoDevuelve409() throws Exception {
        crearPersona("Ana", "Gómez", null, "80000000-1", "EMPLEADO");
        Persona request = personaValida();
        request.setPerCi(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe una persona con el RUC 80000000-1"));
    }

    @Test
    @DisplayName("Dos personas sin CI ni RUC (vacíos) no chocan entre sí")
    void dosPersonasConCiYRucVaciosNoChocanEntreSi() throws Exception {
        Persona primera = personaValida();
        primera.setPerCi("");
        primera.setPerRuc("   ");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(primera)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perCi").doesNotExist());

        Persona segunda = personaValida();
        segunda.setPerNombre("Otra");
        segunda.setPerCi("");
        segunda.setPerRuc("   ");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(segunda)))
                .andExpect(status().isCreated());
    }

    @Test
    @DisplayName("Crear una persona guarda como null los campos opcionales vacíos o de solo espacios")
    void crearPersonaGuardaComoNuloLosCamposOpcionalesVacios() throws Exception {
        Persona request = personaValida();
        request.setPerApellido("   ");
        request.setPerTelefono("");
        request.setPerDireccion("  ");
        request.setPerCi(null);
        request.setPerRuc(null);
        request.setPerCorreo(null);

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perApellido").doesNotExist())
                .andExpect(jsonPath("$.perTelefono").doesNotExist())
                .andExpect(jsonPath("$.perDireccion").doesNotExist());
    }

    @Test
    @DisplayName("Crear una persona con un teléfono válido (con +595, espacios y guiones) devuelve 201")
    void crearPersonaConTelefonoValidoDevuelve201() throws Exception {
        Persona request = personaValida();
        request.setPerTelefono("+595 981-123456");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perTelefono").value("+595 981-123456"));
    }

    @Test
    @DisplayName("Crear una persona con un teléfono con letras devuelve 400")
    void crearPersonaConTelefonoConLetrasDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerTelefono("098abc1234");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El teléfono solo puede tener números, espacios y los símbolos + - ( )"));
    }

    @Test
    @DisplayName("Crear una persona con un teléfono con menos de 6 números devuelve 400")
    void crearPersonaConTelefonoMuyCortoDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerTelefono("12345");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El teléfono debe tener al menos 6 números"));
    }

    @Test
    @DisplayName("Crear una persona con un teléfono de más de 20 caracteres devuelve 400")
    void crearPersonaConTelefonoMuyLargoDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerTelefono("0".repeat(21));

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El teléfono no puede tener más de 20 caracteres"));
    }

    @Test
    @DisplayName("Crear una persona con una CI con caracteres inválidos devuelve 400")
    void crearPersonaConCiConCaracteresInvalidosDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerCi("123@456");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La CI solo puede tener letras, números, puntos, guiones y espacios"));
    }

    @Test
    @DisplayName("Crear una persona con una CI válida con puntos y guiones devuelve 201")
    void crearPersonaConCiValidaConPuntosYGuionesDevuelve201() throws Exception {
        Persona request = personaValida();
        request.setPerCi("1.234.567-8");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perCi").value("1.234.567-8"));
    }

    @Test
    @DisplayName("Crear una persona con un RUC con caracteres inválidos devuelve 400")
    void crearPersonaConRucConCaracteresInvalidosDevuelve400() throws Exception {
        Persona request = personaValida();
        request.setPerRuc("80#000000-1");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("El RUC solo puede tener letras, números, puntos, guiones y espacios"));
    }

    @Test
    @DisplayName("Crear una persona con un RUC válido con puntos y guiones devuelve 201")
    void crearPersonaConRucValidoConPuntosYGuionesDevuelve201() throws Exception {
        Persona request = personaValida();
        request.setPerRuc("80.000.000-1");

        mockMvc.perform(post("/api/personas")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.perRuc").value("80.000.000-1"));
    }

    // ---- PUT /api/personas/{id} ----

    @Test
    @DisplayName("Actualizar una persona conservando su propia CI y RUC devuelve 200")
    void actualizarPersonaConservandoSuPropiaCiYRucDevuelve200() throws Exception {
        Persona persona = crearPersona("Juan", "Pérez", "1234567", "80000000-1", "PROPIETARIO");
        Persona request = personaValida();
        request.setPerApellido("Pérez Benítez");

        mockMvc.perform(put("/api/personas/{id}", persona.getPerId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.perApellido").value("Pérez Benítez"))
                .andExpect(jsonPath("$.perCi").value("1234567"));
    }

    @Test
    @DisplayName("Actualizar una persona con la CI de otra persona devuelve 409")
    void actualizarPersonaConCiDeOtraPersonaDevuelve409() throws Exception {
        crearPersona("Ana", "Gómez", "7654321", null, "EMPLEADO");
        Persona otra = crearPersona("Juan", "Pérez", "1234567", null, "PROPIETARIO");
        Persona request = personaValida();
        request.setPerCi("7654321");
        request.setPerRuc(null);

        mockMvc.perform(put("/api/personas/{id}", otra.getPerId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(content().string("Ya existe una persona con la CI 7654321"));
    }

    @Test
    @DisplayName("Actualizar una persona inexistente devuelve 404")
    void actualizarPersonaInexistenteDevuelve404() throws Exception {
        Persona request = personaValida();

        mockMvc.perform(put("/api/personas/{id}", 999L)
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 999"));
    }

    // ---- DELETE /api/personas/{id} ----

    @Test
    @DisplayName("Eliminar una persona libre (sin animales, pesajes ni usuario) devuelve 204")
    void eliminarPersonaLibreDevuelve204() throws Exception {
        Persona persona = crearPersona("Juan", "Pérez", null, null, "PROPIETARIO");

        mockMvc.perform(delete("/api/personas/{id}", persona.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("Eliminar una persona dueña de animales devuelve 409 con la cantidad")
    void eliminarPersonaDuenaDeAnimalesDevuelve409() throws Exception {
        Persona duenio = crearPersona("Juan", "Pérez", null, null, "PROPIETARIO");
        crearAnimalConDuenio("CAR-PER-001", duenio);
        crearAnimalConDuenio("CAR-PER-002", duenio);

        mockMvc.perform(delete("/api/personas/{id}", duenio.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: es dueña de 2 animales"));
    }

    @Test
    @DisplayName("Eliminar una persona responsable de pesajes devuelve 409 con la cantidad")
    void eliminarPersonaResponsableDePesajesDevuelve409() throws Exception {
        Persona duenio = crearPersona("Ana", "Gómez", null, null, "PROPIETARIO");
        Persona responsable = crearPersona("Carlos", "Díaz", null, null, "EMPLEADO");
        Animal animal = crearAnimalConDuenio("CAR-PER-003", duenio);
        crearPesajeConResponsable(animal, responsable);

        mockMvc.perform(delete("/api/personas/{id}", responsable.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: figura en 1 pesajes"));
    }

    @Test
    @DisplayName("Eliminar una persona que anuló un pesaje (sin ser la responsable) devuelve 409")
    void eliminarPersonaQueAnuloUnPesajeDevuelve409() throws Exception {
        Persona duenio = crearPersona("Ana", "Gómez", null, null, "PROPIETARIO");
        Persona responsable = crearPersona("Carlos", "Díaz", null, null, "EMPLEADO");
        Persona anulador = crearPersona("Lucía", "Flores", null, null, "EMPLEADO");
        Animal animal = crearAnimalConDuenio("CAR-PER-004", duenio);
        crearPesajeAnuladoPor(animal, responsable, anulador);

        mockMvc.perform(delete("/api/personas/{id}", anulador.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: figura en 1 pesajes"));
    }

    @Test
    @DisplayName("Eliminar una persona con usuario de acceso devuelve 409")
    void eliminarPersonaConUsuarioDevuelve409() throws Exception {
        Persona persona = crearPersona("Admin", "Dos", null, null, "EMPLEADO");
        crearUsuarioParaPersona(persona, "admin2");

        mockMvc.perform(delete("/api/personas/{id}", persona.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: tiene un usuario de acceso"));
    }

    @Test
    @DisplayName("Eliminar una persona dueña de animales y con usuario combina ambos motivos en el mensaje")
    void eliminarPersonaConVariosMotivosCombinaElMensaje() throws Exception {
        Persona persona = crearPersona("Juan", "Pérez", null, null, "PROPIETARIO");
        crearAnimalConDuenio("CAR-PER-005", persona);
        crearUsuarioParaPersona(persona, "jperez2");

        mockMvc.perform(delete("/api/personas/{id}", persona.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string(containsString("es dueña de 1 animales")))
                .andExpect(content().string(containsString("tiene un usuario de acceso")))
                .andExpect(content().string(containsString(" y ")));
    }

    @Test
    @DisplayName("Eliminar una persona compradora de un animal devuelve 409 con la cantidad")
    void eliminarPersonaCompradoraDeAnimalesDevuelve409() throws Exception {
        Persona comprador = crearPersona("Carlos", "Díaz", null, null, "CLIENTE");
        crearAnimalConComprador("CAR-PER-COMP-001", comprador);

        mockMvc.perform(delete("/api/personas/{id}", comprador.getPerId())
                        .header("Authorization", token))
                .andExpect(status().isConflict())
                .andExpect(content().string("No se puede eliminar la persona: figura como comprador de 1 animales"));
    }

    @Test
    @DisplayName("Eliminar una persona inexistente devuelve 404")
    void eliminarPersonaInexistenteDevuelve404() throws Exception {
        mockMvc.perform(delete("/api/personas/{id}", 999L)
                        .header("Authorization", token))
                .andExpect(status().isNotFound())
                .andExpect(content().string("Persona no encontrada con id: 999"));
    }

    // ---- GET /api/personas/resumen ----

    @Test
    @DisplayName("El resumen trae los conteos de cada persona y no expone datos del usuario")
    void resumenTraeConteosYNoExponeDatosDeUsuario() throws Exception {
        Persona duenio = crearPersona("Juan", "Pérez", null, null, "PROPIETARIO");
        crearAnimalConDuenio("CAR-RES-PER-001", duenio);
        crearUsuarioParaPersona(duenio, "jperez3");

        Persona sinUso = crearPersona("Ana", "Gómez", null, null, "EMPLEADO");

        mockMvc.perform(get("/api/personas/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.perId == %d)].cantidadAnimales", duenio.getPerId()).value(1))
                .andExpect(jsonPath("$[?(@.perId == %d)].tieneUsuario", duenio.getPerId()).value(true))
                .andExpect(jsonPath("$[?(@.perId == %d)].cantidadAnimales", sinUso.getPerId()).value(0))
                .andExpect(jsonPath("$[?(@.perId == %d)].tieneUsuario", sinUso.getPerId()).value(false))
                .andExpect(jsonPath("$[0].usuNombre").doesNotExist())
                .andExpect(jsonPath("$[0].usuPassword").doesNotExist())
                .andExpect(jsonPath("$[0].usuario").doesNotExist());
    }

    @Test
    @DisplayName("El resumen trae cantidadComoComprador para una persona compradora de un animal")
    void resumenTraeCantidadComoComprador() throws Exception {
        Persona comprador = crearPersona("Lucía", "Flores", null, null, "CLIENTE");
        crearAnimalConComprador("CAR-RES-COMP-001", comprador);

        mockMvc.perform(get("/api/personas/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.perId == %d)].cantidadComoComprador", comprador.getPerId()).value(1));
    }

    @Test
    @DisplayName("El resumen ordena por apellido y nombre, sin distinguir mayúsculas")
    void resumenOrdenaPorApellidoYNombreSinDistinguirMayusculas() throws Exception {
        // El contexto ya tiene de antes a "Administrador Sistema" (ver
        // AdminUsuarioInitializer), así que la aserción busca la posición de
        // cada perId en el arreglo devuelto en vez de asumir índices fijos o
        // el total de filas: alcanza con comprobar el orden relativo entre
        // estas tres, sin importar dónde caiga esa fila de más.
        Persona ana = crearPersona("Ana", "alvarez", null, null, "EMPLEADO");
        Persona beto = crearPersona("Beto", "ALVAREZ", null, null, "EMPLEADO");
        Persona carlos = crearPersona("Carlos", "Zarate", null, null, "EMPLEADO");

        MvcResult resultado = mockMvc.perform(get("/api/personas/resumen")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode resumen = objectMapper.readTree(resultado.getResponse().getContentAsString());
        int indiceAna = indiceDePersonaEn(resumen, ana.getPerId());
        int indiceBeto = indiceDePersonaEn(resumen, beto.getPerId());
        int indiceCarlos = indiceDePersonaEn(resumen, carlos.getPerId());

        Assertions.assertTrue(indiceAna < indiceBeto, "Ana (alvarez) debería ir antes que Beto (ALVAREZ)");
        Assertions.assertTrue(indiceBeto < indiceCarlos, "Beto (ALVAREZ) debería ir antes que Carlos (Zarate)");
    }

    /** Busca la posición de la persona con ese perId dentro del arreglo del resumen. */
    private int indiceDePersonaEn(JsonNode resumen, Long perId) {
        for (int indice = 0; indice < resumen.size(); indice++) {
            if (resumen.get(indice).get("perId").asLong() == perId) {
                return indice;
            }
        }
        throw new AssertionError("No se encontró a la persona " + perId + " en el resumen");
    }

    @Test
    @DisplayName("GET /api/personas (sin cambios) sigue devolviendo la persona recién creada")
    void listarPersonasSigueDevolviendoLaPersonaCreada() throws Exception {
        Persona creada = crearPersona("Juan", "Pérez", null, null, "PROPIETARIO");

        mockMvc.perform(get("/api/personas")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.perId == %d)].perNombre", creada.getPerId()).value("Juan"));
    }
}
