package com.efganados.sistemabovino.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.regex.Pattern;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.dto.PersonaResumen;
import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;
import com.efganados.sistemabovino.repository.UsuarioRepository;

/**
 * Lógica de negocio del catálogo de personas: validaciones de alta/edición,
 * el resumen con sus conteos (animales de los que es dueña, pesajes en los
 * que figura, si tiene usuario) y la regla de eliminación. Centralizada
 * acá para que {@code PersonaController} solo delegue, igual que
 * {@code RazaService}/{@code GrupoService}/{@code SubGrupoService} con los
 * suyos.
 */
@Service
public class PersonaService {

    /**
     * Tipos de persona permitidos, en un solo lugar: agregar un tipo nuevo
     * (ej. "CLIENTE") es cambiar esta línea. perTipo sigue siendo un String
     * simple en la entidad (no un enum de Java), por decisión de diseño ya
     * tomada para este proyecto (ver CONTEXTO_PROYECTO.md); esta constante
     * es la única fuente de verdad de qué valores son válidos.
     */
    private static final List<String> TIPOS_PERMITIDOS = List.of("PROPIETARIO", "EMPLEADO");

    /** Formato básico de correo: algo@algo.algo, sin espacios ni "@" de más. */
    private static final Pattern FORMATO_CORREO = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");

    /** Teléfono: solo dígitos, espacios y los símbolos + - ( ) (admite el "+595" del código de país, guiones, paréntesis). */
    private static final Pattern FORMATO_TELEFONO = Pattern.compile("^[0-9+\\-() ]+$");
    private static final int LARGO_MAXIMO_TELEFONO = 20;
    private static final int MINIMO_DIGITOS_TELEFONO = 6;

    /** CI/RUC: letras (de cualquier idioma), números, puntos, guiones y espacios (ej. "80123456-7"). */
    private static final Pattern FORMATO_DOCUMENTO = Pattern.compile("^[\\p{L}\\p{N}.\\-\\s]+$");
    private static final int LARGO_MAXIMO_DOCUMENTO = 20;

    private final PersonaRepository personaRepository;
    private final AnimalRepository animalRepository;
    private final PesajesRepository pesajesRepository;
    private final UsuarioRepository usuarioRepository;

    public PersonaService(PersonaRepository personaRepository, AnimalRepository animalRepository,
            PesajesRepository pesajesRepository, UsuarioRepository usuarioRepository) {
        this.personaRepository = personaRepository;
        this.animalRepository = animalRepository;
        this.pesajesRepository = pesajesRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /**
     * Resumen de cada persona para el catálogo, ordenado por apellido y
     * nombre sin distinguir mayúsculas (una persona sin apellido ordena
     * como si tuviera cadena vacía, es decir, primero).
     */
    public List<PersonaResumen> obtenerResumen() {
        Comparator<Persona> porApellidoYNombre = Comparator
                .comparing((Persona persona) -> normalizarParaOrden(persona.getPerApellido()),
                        String.CASE_INSENSITIVE_ORDER)
                .thenComparing(persona -> normalizarParaOrden(persona.getPerNombre()), String.CASE_INSENSITIVE_ORDER);

        return personaRepository.findAll().stream()
                .sorted(porApellidoYNombre)
                .map(this::aResumen)
                .toList();
    }

    private String normalizarParaOrden(String texto) {
        return texto == null ? "" : texto;
    }

    private PersonaResumen aResumen(Persona persona) {
        long cantidadAnimales = animalRepository.countByDuenio_PerId(persona.getPerId());
        long cantidadPesajes = pesajesRepository.countByResponsableOAnuladoPor(persona.getPerId());
        boolean tieneUsuario = usuarioRepository.existsByPersona_PerId(persona.getPerId());

        return new PersonaResumen(persona.getPerId(), persona.getPerNombre(), persona.getPerApellido(),
                persona.getPerRuc(), persona.getPerCi(), persona.getPerTipo(), persona.getPerTelefono(),
                persona.getPerCorreo(), persona.getPerDireccion(), cantidadAnimales, cantidadPesajes, tieneUsuario);
    }

    /**
     * Crea una persona nueva. Las validaciones corren en este orden: campos
     * obligatorios y formato (400) primero, y recién después la unicidad de
     * CI/RUC (409), para no devolver un conflicto cuando en realidad falta
     * o está mal un campo.
     */
    public Persona crear(Persona datos) {
        Persona persona = new Persona();
        aplicarDatosValidados(persona, datos, null);
        return personaRepository.save(persona);
    }

    /**
     * Actualiza una persona existente (404 si no existe, ver
     * {@link #buscarPorId}). La propia CI/RUC de la persona no cuentan como
     * duplicados.
     */
    public Persona actualizar(Long id, Persona datos) {
        Persona persona = buscarPorId(id);
        aplicarDatosValidados(persona, datos, id);
        return personaRepository.save(persona);
    }

    /**
     * Valida y copia los datos del request sobre la persona dada. "idPropio"
     * es el id de la persona que se está editando (para que su propia CI/RUC
     * no cuenten como duplicados), o null al crear una nueva.
     */
    private void aplicarDatosValidados(Persona persona, Persona datos, Long idPropio) {
        String nombreRecortado = validarNombrePresente(datos.getPerNombre());
        String tipoValidado = validarTipo(datos.getPerTipo());
        String correoNormalizado = aNuloSiVacio(datos.getPerCorreo());
        validarFormatoCorreo(correoNormalizado);
        String telefonoNormalizado = aNuloSiVacio(datos.getPerTelefono());
        validarFormatoTelefono(telefonoNormalizado);

        String ciNormalizada = aNuloSiVacio(datos.getPerCi());
        validarFormatoCi(ciNormalizada);
        validarCiUnica(ciNormalizada, idPropio);

        String rucNormalizado = aNuloSiVacio(datos.getPerRuc());
        validarFormatoRuc(rucNormalizado);
        validarRucUnico(rucNormalizado, idPropio);

        persona.setPerNombre(nombreRecortado);
        persona.setPerApellido(aNuloSiVacio(datos.getPerApellido()));
        persona.setPerRuc(rucNormalizado);
        persona.setPerCi(ciNormalizada);
        persona.setPerTipo(tipoValidado);
        persona.setPerTelefono(telefonoNormalizado);
        persona.setPerCorreo(correoNormalizado);
        persona.setPerDireccion(aNuloSiVacio(datos.getPerDireccion()));
    }

    /**
     * Elimina una persona. 404 si no existe; 409 si está en uso (es dueña de
     * algún animal, figura en algún pesaje, o tiene un usuario de acceso),
     * con un mensaje que detalla solo lo que corresponda.
     */
    public void eliminar(Long id) {
        Persona persona = buscarPorId(id);

        long cantidadAnimales = animalRepository.countByDuenio_PerId(id);
        long cantidadPesajes = pesajesRepository.countByResponsableOAnuladoPor(id);
        boolean tieneUsuario = usuarioRepository.existsByPersona_PerId(id);

        List<String> motivos = new ArrayList<>();
        if (cantidadAnimales > 0) {
            motivos.add("es dueña de " + cantidadAnimales + " animales");
        }
        if (cantidadPesajes > 0) {
            motivos.add("figura en " + cantidadPesajes + " pesajes");
        }
        if (tieneUsuario) {
            motivos.add("tiene un usuario de acceso");
        }

        if (!motivos.isEmpty()) {
            throw new ConflictoException("No se puede eliminar la persona: " + unirConY(motivos));
        }

        personaRepository.delete(persona);
    }

    /** Une una lista de motivos en español: "a", "a y b", "a, b y c". */
    private String unirConY(List<String> motivos) {
        if (motivos.size() == 1) {
            return motivos.get(0);
        }
        String todosMenosElUltimo = String.join(", ", motivos.subList(0, motivos.size() - 1));
        return todosMenosElUltimo + " y " + motivos.get(motivos.size() - 1);
    }

    /** Valida que el nombre no falte, y lo devuelve recortado. */
    private String validarNombrePresente(String nombre) {
        if (nombre == null || nombre.isBlank()) {
            throw new ValidacionException("Falta el campo nombre");
        }
        return nombre.trim();
    }

    /** Valida que el tipo no falte y sea uno de los permitidos (ver TIPOS_PERMITIDOS). */
    private String validarTipo(String tipo) {
        if (tipo == null || tipo.isBlank()) {
            throw new ValidacionException("Falta el campo tipo");
        }
        String tipoRecortado = tipo.trim();
        if (!TIPOS_PERMITIDOS.contains(tipoRecortado)) {
            throw new ValidacionException("El tipo debe ser " + String.join(" o ", TIPOS_PERMITIDOS));
        }
        return tipoRecortado;
    }

    /** Valida el formato del correo, si vino alguno (ya normalizado a null si estaba vacío). */
    private void validarFormatoCorreo(String correoNormalizado) {
        if (correoNormalizado != null && !FORMATO_CORREO.matcher(correoNormalizado).matches()) {
            throw new ValidacionException("El correo no tiene un formato válido");
        }
    }

    /**
     * Valida el formato del teléfono, si vino alguno (ya normalizado a null
     * si estaba vacío): solo dígitos, espacios y + - ( ) (admite "+595",
     * guiones y paréntesis); hasta 20 caracteres; al menos 6 dígitos (para
     * no aceptar algo como "---" o "()" que cumple el patrón pero no es un
     * número real).
     */
    private void validarFormatoTelefono(String telefonoNormalizado) {
        if (telefonoNormalizado == null) {
            return;
        }
        if (!FORMATO_TELEFONO.matcher(telefonoNormalizado).matches()) {
            throw new ValidacionException("El teléfono solo puede tener números, espacios y los símbolos + - ( )");
        }
        if (telefonoNormalizado.length() > LARGO_MAXIMO_TELEFONO) {
            throw new ValidacionException("El teléfono no puede tener más de " + LARGO_MAXIMO_TELEFONO
                    + " caracteres");
        }
        long cantidadDigitos = telefonoNormalizado.chars().filter(Character::isDigit).count();
        if (cantidadDigitos < MINIMO_DIGITOS_TELEFONO) {
            throw new ValidacionException("El teléfono debe tener al menos " + MINIMO_DIGITOS_TELEFONO + " números");
        }
    }

    /** Valida el formato de la CI, si vino alguna (ya normalizada a null si estaba vacía): ver FORMATO_DOCUMENTO. */
    private void validarFormatoCi(String ciNormalizada) {
        if (ciNormalizada == null) {
            return;
        }
        if (!FORMATO_DOCUMENTO.matcher(ciNormalizada).matches()) {
            throw new ValidacionException("La CI solo puede tener letras, números, puntos, guiones y espacios");
        }
        if (ciNormalizada.length() > LARGO_MAXIMO_DOCUMENTO) {
            throw new ValidacionException("La CI no puede tener más de " + LARGO_MAXIMO_DOCUMENTO + " caracteres");
        }
    }

    /** Valida el formato del RUC, si vino alguno (ya normalizado a null si estaba vacío): ver FORMATO_DOCUMENTO. */
    private void validarFormatoRuc(String rucNormalizado) {
        if (rucNormalizado == null) {
            return;
        }
        if (!FORMATO_DOCUMENTO.matcher(rucNormalizado).matches()) {
            throw new ValidacionException("El RUC solo puede tener letras, números, puntos, guiones y espacios");
        }
        if (rucNormalizado.length() > LARGO_MAXIMO_DOCUMENTO) {
            throw new ValidacionException("El RUC no puede tener más de " + LARGO_MAXIMO_DOCUMENTO + " caracteres");
        }
    }

    /** Valida que no exista ya otra persona con esa CI, si vino alguna (ya normalizada a null si estaba vacía). */
    private void validarCiUnica(String ciNormalizada, Long idPropio) {
        if (ciNormalizada == null) {
            return;
        }
        boolean yaExiste = idPropio == null
                ? personaRepository.existsByPerCi(ciNormalizada)
                : personaRepository.existsByPerCiAndPerIdNot(ciNormalizada, idPropio);
        if (yaExiste) {
            throw new ConflictoException("Ya existe una persona con la CI " + ciNormalizada);
        }
    }

    /** Valida que no exista ya otra persona con ese RUC, si vino alguno (ya normalizado a null si estaba vacío). */
    private void validarRucUnico(String rucNormalizado, Long idPropio) {
        if (rucNormalizado == null) {
            return;
        }
        boolean yaExiste = idPropio == null
                ? personaRepository.existsByPerRuc(rucNormalizado)
                : personaRepository.existsByPerRucAndPerIdNot(rucNormalizado, idPropio);
        if (yaExiste) {
            throw new ConflictoException("Ya existe una persona con el RUC " + rucNormalizado);
        }
    }

    /** Un texto vacío o de solo espacios se guarda como null; si no, se devuelve recortado. */
    private String aNuloSiVacio(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return texto.trim();
    }

    /**
     * Busca una persona por su ID. Lanza una excepción si no existe, para
     * que el controlador pueda responder con un error claro (404, vía
     * {@code GlobalExceptionHandler}).
     */
    public Persona buscarPorId(Long id) {
        return personaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Persona no encontrada con id: " + id));
    }
}
