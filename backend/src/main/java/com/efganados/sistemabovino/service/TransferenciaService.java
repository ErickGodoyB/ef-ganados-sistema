package com.efganados.sistemabovino.service;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.efganados.sistemabovino.dto.DevolucionResumen;
import com.efganados.sistemabovino.dto.ItemTransferenciaAnimal;
import com.efganados.sistemabovino.dto.MovimientoAnimal;
import com.efganados.sistemabovino.dto.TransferenciaDetalle;
import com.efganados.sistemabovino.dto.TransferenciaResumen;
import com.efganados.sistemabovino.exception.ConflictoException;
import com.efganados.sistemabovino.exception.ValidacionException;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.MotivoTransferencia;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.SubGrupo;
import com.efganados.sistemabovino.model.Transferencia;
import com.efganados.sistemabovino.model.TransferenciaAnimal;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;
import com.efganados.sistemabovino.repository.SubGrupoRepository;
import com.efganados.sistemabovino.repository.TransferenciaAnimalRepository;
import com.efganados.sistemabovino.repository.TransferenciaRepository;

/**
 * Lógica de negocio de las transferencias de animales entre lotes: registrar
 * una (todo o nada), devolverla, consultarlas y armar el historial de
 * movimientos de un animal.
 *
 * El cambio de lote es solo cambiar {@code Animal.subGrupo}: el historial de
 * pesajes acompaña al animal sin tocar nada, porque las sesiones de pesaje
 * y los conteos de lotes se calculan siempre con el lote ACTUAL del animal
 * (ver {@code Pesajes}). Las transferencias nunca se editan ni se borran;
 * se deshacen con otra transferencia (DEVOLUCION).
 *
 * "Todo o nada": cada operación valida TODO (todos los animales, todas las
 * reglas) antes de modificar nada, y además corre en una transacción, así
 * que un error en cualquier animal deja la base exactamente como estaba.
 */
@Service
public class TransferenciaService {

    private static final int LARGO_MAXIMO_NOTA = 255;

    private static final String SIN_LOTE = "Sin lote";

    private final TransferenciaRepository transferenciaRepository;
    private final TransferenciaAnimalRepository transferenciaAnimalRepository;
    private final AnimalRepository animalRepository;
    private final SubGrupoRepository subGrupoRepository;
    private final PersonaRepository personaRepository;
    private final Clock clock;

    public TransferenciaService(TransferenciaRepository transferenciaRepository,
            TransferenciaAnimalRepository transferenciaAnimalRepository, AnimalRepository animalRepository,
            SubGrupoRepository subGrupoRepository, PersonaRepository personaRepository, Clock clock) {
        this.transferenciaRepository = transferenciaRepository;
        this.transferenciaAnimalRepository = transferenciaAnimalRepository;
        this.animalRepository = animalRepository;
        this.subGrupoRepository = subGrupoRepository;
        this.personaRepository = personaRepository;
        this.clock = clock;
    }

    /**
     * Registra una transferencia y pasa cada animal al lote de destino.
     * Orden de las validaciones: primero lo que se puede decidir solo con el
     * pedido (campos, fecha futura, motivo, nota, lista de animales sin
     * repetidos; 400), después la existencia de destino, responsable y
     * animales (404), y por último, animal por animal y en este orden, que
     * esté activo (409), que la fecha no sea anterior a su ingreso (400) y
     * que no esté ya en el lote de destino (400). Todos los mensajes que
     * dependen de un animal nombran su caravana.
     */
    @Transactional
    public TransferenciaResumen registrar(LocalDate fecha, String motivo, String nota, Long destinoId,
            Long responsableId, List<Long> animalIds) {
        validarFechaNoFutura(fecha);
        MotivoTransferencia motivoValidado = validarMotivoRegistrable(motivo);
        String notaValidada = validarNota(motivoValidado, nota);
        if (destinoId == null) {
            throw new ValidacionException("Falta el campo destinoId");
        }
        if (responsableId == null) {
            throw new ValidacionException("Falta el campo responsableId");
        }
        validarListaDeAnimales(animalIds);

        SubGrupo destino = subGrupoRepository.findById(destinoId)
                .orElseThrow(() -> new IllegalArgumentException("SubGrupo no encontrado con id: " + destinoId));
        Persona responsable = buscarResponsable(responsableId);
        List<Animal> animales = new ArrayList<>();
        for (Long animalId : animalIds) {
            animales.add(animalRepository.findById(animalId)
                    .orElseThrow(() -> new IllegalArgumentException("Animal no encontrado con id: " + animalId)));
        }

        for (Animal animal : animales) {
            validarAnimalActivo(animal);
            validarFechaNoAnteriorAlIngreso(fecha, animal);
            if (esElLote(animal.getSubGrupo(), destino)) {
                throw new ValidacionException(
                        "El animal " + animal.getAniCaravana() + " ya está en el lote " + destino.getSbDescripcion());
            }
        }

        Transferencia transferencia = guardarCabecera(fecha, motivoValidado, notaValidada, responsable, null);
        for (Animal animal : animales) {
            moverAnimal(transferencia, animal, destino);
        }
        return aResumen(transferencia);
    }

    /**
     * Devuelve una transferencia: crea otra (motivo DEVOLUCION, devuelveA =
     * la original) que lleva cada animal a su lote de origen ORIGINAL, pero
     * solo los que todavía están en el lote de destino y activos; el resto
     * se omite (el animal ya pasó a otro lote, o tuvo una salida). 404 si la
     * transferencia no existe; 409 si ella misma es una DEVOLUCION (no se
     * devuelve una devolución: para eso se hace una transferencia común) o
     * si ya fue devuelta; 409 si ningún animal puede devolverse. La fecha
     * sigue las reglas del alta (obligatoria, no futura y no anterior al
     * ingreso), aplicadas a los animales que efectivamente se devuelven.
     */
    @Transactional
    public DevolucionResumen devolver(Long transferenciaId, LocalDate fecha, String nota, Long responsableId) {
        Transferencia original = buscarTransferencia(transferenciaId);
        if (original.getTraMotivo() == MotivoTransferencia.DEVOLUCION) {
            throw new ConflictoException("La transferencia " + transferenciaId
                    + " ya es una devolución: no se puede devolver una devolución");
        }
        if (transferenciaRepository.existsByDevuelveA_TraId(transferenciaId)) {
            throw new ConflictoException("La transferencia " + transferenciaId + " ya fue devuelta");
        }

        validarFechaNoFutura(fecha);
        String notaValidada = validarNota(MotivoTransferencia.DEVOLUCION, nota);
        if (responsableId == null) {
            throw new ValidacionException("Falta el campo responsableId");
        }
        Persona responsable = buscarResponsable(responsableId);

        List<TransferenciaAnimal> filasOriginales = transferenciaAnimalRepository
                .findByTransferencia_TraIdOrderByAnimal_AniCaravanaAsc(transferenciaId);
        List<TransferenciaAnimal> devolvibles = filasOriginales.stream().filter(this::estaEnDestino).toList();
        if (devolvibles.isEmpty()) {
            throw new ConflictoException("No se puede devolver la transferencia " + transferenciaId
                    + ": ningún animal sigue en el lote de destino");
        }
        for (TransferenciaAnimal fila : devolvibles) {
            validarFechaNoAnteriorAlIngreso(fecha, fila.getAnimal());
        }

        Transferencia devolucion = guardarCabecera(fecha, MotivoTransferencia.DEVOLUCION, notaValidada, responsable,
                original);
        for (TransferenciaAnimal fila : devolvibles) {
            // El destino de la devolución es el ORIGEN de la fila original (puede ser null: sin lote).
            moverAnimal(devolucion, fila.getAnimal(), fila.getOrigen());
        }
        return new DevolucionResumen(aResumen(devolucion), devolvibles.size(),
                filasOriginales.size() - devolvibles.size());
    }

    /** Transferencias acotadas por fecha (desde/hasta, opcionales e inclusivas), la más reciente primero. */
    @Transactional(readOnly = true)
    public List<TransferenciaResumen> listar(LocalDate desde, LocalDate hasta) {
        Set<Long> devueltas = new HashSet<>(transferenciaRepository.idsDeTransferenciasDevueltas());
        return transferenciaRepository.buscarPorRango(desde, hasta).stream()
                .map(transferencia -> aResumen(transferencia, devueltas.contains(transferencia.getTraId())))
                .toList();
    }

    /** Resumen de una transferencia más sus animales; 404 si no existe. */
    @Transactional(readOnly = true)
    public TransferenciaDetalle obtenerDetalle(Long id) {
        Transferencia transferencia = buscarTransferencia(id);
        List<ItemTransferenciaAnimal> animales = transferenciaAnimalRepository
                .findByTransferencia_TraIdOrderByAnimal_AniCaravanaAsc(id).stream()
                .map(this::aItemTransferenciaAnimal)
                .toList();
        return new TransferenciaDetalle(aResumen(transferencia), animales);
    }

    /** Historial de cambios de lote de un animal, del más reciente al más antiguo; 404 si el animal no existe. */
    @Transactional(readOnly = true)
    public List<MovimientoAnimal> obtenerMovimientos(Long animalId) {
        if (!animalRepository.existsById(animalId)) {
            throw new IllegalArgumentException("Animal no encontrado con id: " + animalId);
        }
        return transferenciaAnimalRepository.movimientosDeAnimal(animalId).stream()
                .map(fila -> new MovimientoAnimal(
                        fila.getTransferencia().getTraId(),
                        fila.getTransferencia().getTraFecha(),
                        fila.getTransferencia().getTraMotivo().name(),
                        descripcionLote(fila.getOrigen()),
                        descripcionLote(fila.getDestino()),
                        nombreCompleto(fila.getTransferencia().getResponsable())))
                .toList();
    }

    // ---- Validaciones ----

    private void validarFechaNoFutura(LocalDate fecha) {
        if (fecha == null) {
            throw new ValidacionException("Falta el campo fecha");
        }
        if (fecha.isAfter(LocalDate.now(clock))) {
            throw new ValidacionException("La fecha de la transferencia no puede ser futura");
        }
    }

    private void validarFechaNoAnteriorAlIngreso(LocalDate fecha, Animal animal) {
        if (fecha.isBefore(animal.getAniFechaIngreso())) {
            throw new ValidacionException("La fecha de la transferencia no puede ser anterior al ingreso del animal "
                    + animal.getAniCaravana() + " (" + animal.getAniFechaIngreso() + ")");
        }
    }

    /** El motivo debe estar y ser uno de los permitidos (400); DEVOLUCION solo se genera con {@link #devolver}. */
    private MotivoTransferencia validarMotivoRegistrable(String motivo) {
        if (motivo == null || motivo.isBlank()) {
            throw new ValidacionException("Falta el campo motivo");
        }
        MotivoTransferencia motivoValidado;
        try {
            motivoValidado = MotivoTransferencia.valueOf(motivo.trim());
        } catch (IllegalArgumentException ex) {
            throw new ValidacionException("El motivo debe ser SELECCION, SANITARIO u OTRO");
        }
        if (motivoValidado == MotivoTransferencia.DEVOLUCION) {
            throw new ValidacionException("El motivo DEVOLUCION solo se genera al devolver una transferencia "
                    + "(POST /api/transferencias/{id}/devolver)");
        }
        return motivoValidado;
    }

    /**
     * La nota es obligatoria con motivo OTRO (no hay otra forma de saber el
     * porqué) y opcional en los demás; máximo 255 caracteres. Vacía o solo
     * espacios se guarda como null, como el resto de los textos opcionales.
     */
    private String validarNota(MotivoTransferencia motivo, String nota) {
        String notaRecortada = nota == null || nota.isBlank() ? null : nota.trim();
        if (motivo == MotivoTransferencia.OTRO && notaRecortada == null) {
            throw new ValidacionException("Falta el campo nota: es obligatoria cuando el motivo es OTRO");
        }
        if (notaRecortada != null && notaRecortada.length() > LARGO_MAXIMO_NOTA) {
            throw new ValidacionException("La nota no puede superar los " + LARGO_MAXIMO_NOTA + " caracteres");
        }
        return notaRecortada;
    }

    private void validarListaDeAnimales(List<Long> animalIds) {
        if (animalIds == null || animalIds.isEmpty()) {
            throw new ValidacionException("Falta el campo animalIds: debe incluir al menos un animal");
        }
        Set<Long> vistos = new HashSet<>();
        for (Long animalId : animalIds) {
            if (animalId == null) {
                throw new ValidacionException("Falta el id de un animal en animalIds");
            }
            if (!vistos.add(animalId)) {
                throw new ValidacionException("El animal con id " + animalId + " está repetido en animalIds");
            }
        }
    }

    private void validarAnimalActivo(Animal animal) {
        if (animal.getAniFechaEgreso() != null) {
            throw new ConflictoException("El animal " + animal.getAniCaravana()
                    + " tiene una salida registrada: no se puede transferir");
        }
    }

    // ---- Búsquedas ----

    private Persona buscarResponsable(Long responsableId) {
        return personaRepository.findById(responsableId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Persona responsable no encontrada con id: " + responsableId));
    }

    private Transferencia buscarTransferencia(Long id) {
        return transferenciaRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Transferencia no encontrada con id: " + id));
    }

    // ---- Escritura ----

    private Transferencia guardarCabecera(LocalDate fecha, MotivoTransferencia motivo, String nota,
            Persona responsable, Transferencia devuelveA) {
        Transferencia transferencia = new Transferencia();
        transferencia.setTraFecha(fecha);
        transferencia.setTraMotivo(motivo);
        transferencia.setTraNota(nota);
        transferencia.setTraRegistradaEn(LocalDateTime.now(clock));
        transferencia.setResponsable(responsable);
        transferencia.setDevuelveA(devuelveA);
        return transferenciaRepository.save(transferencia);
    }

    /** Registra el movimiento del animal (origen = su lote actual) y lo pasa al lote de destino (null = sin lote). */
    private void moverAnimal(Transferencia transferencia, Animal animal, SubGrupo destino) {
        TransferenciaAnimal fila = new TransferenciaAnimal();
        fila.setTransferencia(transferencia);
        fila.setAnimal(animal);
        fila.setOrigen(animal.getSubGrupo());
        fila.setDestino(destino);
        transferenciaAnimalRepository.save(fila);

        animal.setSubGrupo(destino);
        animalRepository.save(animal);
    }

    // ---- Conversión a DTO ----

    /**
     * True si el animal de la fila sigue hoy en el lote de destino de esa
     * fila y está activo. Si el destino fue "sin lote" (devolución de un
     * animal que venía sin lote), "seguir en destino" es seguir sin lote.
     */
    private boolean estaEnDestino(TransferenciaAnimal fila) {
        Animal animal = fila.getAnimal();
        return animal.getAniFechaEgreso() == null && esElLote(animal.getSubGrupo(), fila.getDestino());
    }

    /** Compara dos lotes por id; dos nulos (sin lote) cuentan como el mismo "lote". */
    private boolean esElLote(SubGrupo uno, SubGrupo otro) {
        Long idUno = uno != null ? uno.getSbId() : null;
        Long idOtro = otro != null ? otro.getSbId() : null;
        return Objects.equals(idUno, idOtro);
    }

    private TransferenciaResumen aResumen(Transferencia transferencia) {
        return aResumen(transferencia, transferenciaRepository.existsByDevuelveA_TraId(transferencia.getTraId()));
    }

    private TransferenciaResumen aResumen(Transferencia transferencia, boolean devuelta) {
        List<TransferenciaAnimal> filas = transferenciaAnimalRepository
                .findByTransferencia_TraIdOrderByAnimal_AniCaravanaAsc(transferencia.getTraId());
        Transferencia devuelveA = transferencia.getDevuelveA();
        return new TransferenciaResumen(
                transferencia.getTraId(),
                transferencia.getTraFecha(),
                transferencia.getTraMotivo().name(),
                transferencia.getTraNota(),
                nombreCompleto(transferencia.getResponsable()),
                transferencia.getTraRegistradaEn(),
                filas.size(),
                filas.stream().map(fila -> descripcionLote(fila.getOrigen())).distinct()
                        .sorted(String.CASE_INSENSITIVE_ORDER).toList(),
                filas.stream().map(fila -> descripcionLote(fila.getDestino())).distinct()
                        .sorted(String.CASE_INSENSITIVE_ORDER).toList(),
                devuelveA != null ? devuelveA.getTraId() : null,
                devuelta);
    }

    private ItemTransferenciaAnimal aItemTransferenciaAnimal(TransferenciaAnimal fila) {
        Animal animal = fila.getAnimal();
        SubGrupo origen = fila.getOrigen();
        SubGrupo destino = fila.getDestino();
        return new ItemTransferenciaAnimal(
                animal.getAniId(),
                animal.getAniCaravana(),
                animal.getRaza().getRzDescripcion(),
                origen != null ? origen.getSbId() : null,
                descripcionLote(origen),
                destino != null ? destino.getSbId() : null,
                descripcionLote(destino),
                estaEnDestino(fila));
    }

    private String descripcionLote(SubGrupo lote) {
        return lote != null ? lote.getSbDescripcion() : SIN_LOTE;
    }

    /** Nombre y apellido separados por un espacio; si falta uno, devuelve el otro (mismo criterio que el resto de los servicios). */
    private String nombreCompleto(Persona persona) {
        String nombre = persona.getPerNombre();
        String apellido = persona.getPerApellido();
        if (nombre == null) {
            return apellido;
        }
        if (apellido == null) {
            return nombre;
        }
        return nombre + " " + apellido;
    }
}
