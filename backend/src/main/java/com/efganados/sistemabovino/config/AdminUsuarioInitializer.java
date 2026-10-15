package com.efganados.sistemabovino.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Usuario;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.UsuarioRepository;

/**
 * Crea un usuario administrador de arranque si la tabla Usuario está vacía,
 * para que siempre haya con quién iniciar sesión la primera vez (RF009) sin
 * depender de cargar datos a mano. El usuario y la contraseña se toman de
 * {@code app.admin.usuario} / {@code app.admin.password}; la contraseña se
 * guarda cifrada (RNF006), nunca en texto plano.
 */
@Component
public class AdminUsuarioInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminUsuarioInitializer.class);

    private final UsuarioRepository usuarioRepository;
    private final PersonaRepository personaRepository;
    private final PasswordEncoder passwordEncoder;
    private final String adminUsuario;
    private final String adminPassword;

    public AdminUsuarioInitializer(UsuarioRepository usuarioRepository, PersonaRepository personaRepository,
            PasswordEncoder passwordEncoder, @Value("${app.admin.usuario}") String adminUsuario,
            @Value("${app.admin.password}") String adminPassword) {
        this.usuarioRepository = usuarioRepository;
        this.personaRepository = personaRepository;
        this.passwordEncoder = passwordEncoder;
        this.adminUsuario = adminUsuario;
        this.adminPassword = adminPassword;
    }

    /** Si no existe ningún usuario, crea la Persona y el Usuario administrador iniciales. */
    @Override
    public void run(String... args) {
        if (usuarioRepository.count() > 0) {
            return;
        }

        Persona persona = new Persona();
        persona.setPerNombre("Administrador");
        persona.setPerApellido("Sistema");
        persona.setPerTipo("EMPLEADO");
        personaRepository.save(persona);

        Usuario usuario = new Usuario();
        usuario.setPersona(persona);
        usuario.setUsuNombre(adminUsuario);
        usuario.setUsuPassword(passwordEncoder.encode(adminPassword));
        usuarioRepository.save(usuario);

        log.warn("Se creó el usuario administrador inicial '{}' con la contraseña de desarrollo definida en "
                + "app.admin.password. CAMBIAR esa contraseña antes de usar el sistema en producción.", adminUsuario);
    }
}
