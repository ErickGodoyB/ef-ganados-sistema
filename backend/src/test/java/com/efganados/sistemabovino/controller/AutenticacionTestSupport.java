package com.efganados.sistemabovino.controller;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.efganados.sistemabovino.controller.AuthController.LoginRequest;
import com.efganados.sistemabovino.controller.AuthController.LoginResponse;

import tools.jackson.databind.ObjectMapper;

/**
 * Clase base para las pruebas de controladores que ahora exigen un token JWT
 * (RF009): en vez de crear un usuario de prueba propio, reutiliza el
 * administrador que {@code AdminUsuarioInitializer} ya crea al arrancar el
 * contexto de Spring (credenciales {@code app.admin.usuario} /
 * {@code app.admin.password}, definidas en
 * {@code src/test/resources/application.properties}), inicia sesión real por
 * {@code POST /api/auth/login} vía MockMvc, y deja listo el valor para el
 * encabezado {@code Authorization} que cada subclase agrega a sus peticiones.
 * Las subclases siguen declarando sus propios {@code @SpringBootTest},
 * {@code @AutoConfigureMockMvc} y {@code @Transactional}; esta clase solo
 * aporta los campos autowireados y el método de login compartidos por todas.
 */
public abstract class AutenticacionTestSupport {

    @Autowired
    protected MockMvc mockMvc;

    @Autowired
    protected ObjectMapper objectMapper;

    /** Nombre del usuario administrador inicial (igual al que usa AdminUsuarioInitializer). */
    @Value("${app.admin.usuario}")
    protected String adminUsuario;

    /** Contraseña en texto plano del usuario administrador inicial, solo para pruebas. */
    @Value("${app.admin.password}")
    protected String adminPassword;

    /**
     * Inicia sesión con el usuario administrador inicial y devuelve el valor
     * listo para el encabezado Authorization (por ejemplo, "Bearer eyJ...").
     */
    protected String encabezadoAutorizacionAdmin() throws Exception {
        LoginRequest loginRequest = new LoginRequest(adminUsuario, adminPassword);

        MvcResult resultado = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andReturn();

        LoginResponse login = objectMapper.readValue(resultado.getResponse().getContentAsString(),
                LoginResponse.class);
        return "Bearer " + login.token();
    }
}
