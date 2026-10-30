package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.controller.AuthController.CambiarClaveRequest;
import com.efganados.sistemabovino.controller.AuthController.LoginRequest;
import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.UsuarioRepository;

/**
 * Pruebas de integración de {@link AuthController} (login, RF009) y de la
 * seguridad JWT que lo rodea: que el login funcione con credenciales
 * correctas e incorrectas, que falte un campo, que los endpoints protegidos
 * exijan token, y que la contraseña nunca aparezca en las respuestas
 * (RNF006). Reutiliza el administrador inicial creado por
 * {@code AdminUsuarioInitializer} en vez de crear un usuario de prueba propio
 * (ver {@link AutenticacionTestSupport}).
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthControllerTest extends AutenticacionTestSupport {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Login con credenciales correctas devuelve 200 con un token")
    void loginConCredencialesCorrectasDevuelve200ConToken() throws Exception {
        LoginRequest request = new LoginRequest(adminUsuario, adminPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.usuNombre").value(adminUsuario));
    }

    @Test
    @DisplayName("Login con contraseña incorrecta devuelve 401 con mensaje genérico")
    void loginConContrasenaIncorrectaDevuelve401() throws Exception {
        LoginRequest request = new LoginRequest(adminUsuario, "contraseña-equivocada");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(content().string("Usuario o contraseña incorrectos"));
    }

    @Test
    @DisplayName("Login sin usuNombre devuelve 400 indicando el campo faltante")
    void loginSinUsuNombreDevuelve400() throws Exception {
        LoginRequest request = new LoginRequest(null, adminPassword);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo usuNombre"));
    }

    @Test
    @DisplayName("Login sin usuPassword devuelve 400 indicando el campo faltante")
    void loginSinUsuPasswordDevuelve400() throws Exception {
        LoginRequest request = new LoginRequest(adminUsuario, null);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo usuPassword"));
    }

    @Test
    @DisplayName("Un endpoint protegido sin token devuelve 401")
    void endpointProtegidoSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/animales"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("Un endpoint protegido con un token válido devuelve 200")
    void endpointProtegidoConTokenValidoDevuelve200() throws Exception {
        String token = encabezadoAutorizacionAdmin();

        mockMvc.perform(get("/api/animales")
                        .header("Authorization", token))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("GET /api/auth/yo sin token devuelve 401")
    void yoSinTokenDevuelve401() throws Exception {
        mockMvc.perform(get("/api/auth/yo"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("GET /api/auth/yo con token devuelve los datos del usuario autenticado")
    void yoConTokenDevuelveDatosDelUsuarioAutenticado() throws Exception {
        String token = encabezadoAutorizacionAdmin();

        mockMvc.perform(get("/api/auth/yo")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuNombre").value(adminUsuario))
                .andExpect(jsonPath("$.tipo").value("EMPLEADO"))
                .andExpect(jsonPath("$.personaId").isNotEmpty())
                .andExpect(jsonPath("$.personaNombre").value("Administrador Sistema"));
    }

    @Test
    @DisplayName("GET /api/usuarios no incluye el campo usuPassword en la respuesta")
    void listarUsuariosNoIncluyeUsuPassword() throws Exception {
        Usuario usuario = new Usuario();
        usuario.setUsuNombre("usuario.sin.password.expuesto");
        usuario.setUsuPassword(passwordEncoder.encode("clave-cualquiera"));
        Usuario guardado = usuarioRepository.save(usuario);

        String token = encabezadoAutorizacionAdmin();

        mockMvc.perform(get("/api/usuarios/{id}", guardado.getUsuId())
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuPassword").doesNotExist());
    }

    // ---- PUT /api/auth/clave ----

    @Test
    @DisplayName("Cambiar la clave con datos válidos devuelve 204; la vieja deja de funcionar y la nueva sí")
    void cambiarClaveConDatosValidosDevuelve204() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, "clave-nueva-123");

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(adminUsuario, adminPassword))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(adminUsuario, "clave-nueva-123"))))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("El token obtenido antes de cambiar la clave sigue siendo válido después del cambio")
    void tokenAnteriorAlCambioDeClaveSigueSiendoValido() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, "clave-nueva-123");

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/auth/yo")
                        .header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuNombre").value(adminUsuario));
    }

    @Test
    @DisplayName("Cambiar la clave con la clave actual incorrecta devuelve 400 (no 401)")
    void cambiarClaveConClaveActualIncorrectaDevuelve400() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest("clave-equivocada", "clave-nueva-123");

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La clave actual no es correcta"));
    }

    @Test
    @DisplayName("Cambiar la clave sin claveActual devuelve 400")
    void cambiarClaveSinClaveActualDevuelve400() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(null, "clave-nueva-123");

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo claveActual"));
    }

    @Test
    @DisplayName("Cambiar la clave sin claveNueva devuelve 400")
    void cambiarClaveSinClaveNuevaDevuelve400() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, null);

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("Falta el campo claveNueva"));
    }

    @Test
    @DisplayName("Cambiar la clave con la nueva igual a la actual devuelve 400")
    void cambiarClaveConNuevaIgualALaActualDevuelve400() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, adminPassword);

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La clave nueva debe ser distinta de la actual"));
    }

    @Test
    @DisplayName("Cambiar la clave con la nueva más corta que el mínimo configurado devuelve 400")
    void cambiarClaveConNuevaMasCortaQueElMinimoDevuelve400() throws Exception {
        String token = encabezadoAutorizacionAdmin();
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, "abcd");

        mockMvc.perform(put("/api/auth/clave")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(content().string("La clave nueva debe tener al menos 5 caracteres"));
    }

    @Test
    @DisplayName("Cambiar la clave sin token devuelve 401")
    void cambiarClaveSinTokenDevuelve401() throws Exception {
        CambiarClaveRequest request = new CambiarClaveRequest(adminPassword, "clave-nueva-123");

        mockMvc.perform(put("/api/auth/clave")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }
}
