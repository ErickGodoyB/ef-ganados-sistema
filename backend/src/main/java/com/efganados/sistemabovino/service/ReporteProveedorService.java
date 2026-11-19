package com.efganados.sistemabovino.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.dto.AnimalRendimientoProveedor;
import com.efganados.sistemabovino.dto.ProveedorComparativo;
import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PersonaRepository;

/**
 * Comparativo de rendimiento por proveedor. No reimplementa ningún cálculo:
 * la GMD acumulada, el peso actual y la ganancia salen de
 * {@link AnimalService#rendimientoAcumulado}, así que la regla vive en un
 * solo lugar y el comparativo y el detalle siempre coinciden.
 */
@Service
public class ReporteProveedorService {

    static final String SIN_PROVEEDOR = "Sin proveedor";

    private final AnimalRepository animalRepository;
    private final PersonaRepository personaRepository;
    private final AnimalService animalService;

    public ReporteProveedorService(AnimalRepository animalRepository, PersonaRepository personaRepository,
            AnimalService animalService) {
        this.animalRepository = animalRepository;
        this.personaRepository = personaRepository;
        this.animalService = animalService;
    }

    /** Un animal ya medido, para no recalcular su rendimiento al armar cada agregado. */
    private record Medido(Animal animal, AnimalService.RendimientoAcumulado rendimiento) {
    }

    /**
     * Una fila por proveedor que tenga animales (entre los considerados), más
     * una fila "Sin proveedor" si hay animales sin proveedor. Orden: gmdPromedio
     * de mayor a menor con los null al final (a igual valor, por nombre), y la
     * fila "Sin proveedor" siempre última. Con soloActivos=true se consideran
     * únicamente los animales sin salida registrada; si no, también los que
     * ya salieron.
     */
    public List<ProveedorComparativo> obtenerComparativo(boolean soloActivos) {
        Map<Long, List<Medido>> porProveedor = new LinkedHashMap<>();
        List<Medido> sinProveedor = new ArrayList<>();
        Map<Long, Persona> proveedores = new LinkedHashMap<>();

        for (Animal animal : animalRepository.findAll()) {
            if (soloActivos && animal.getAniFechaEgreso() != null) {
                continue;
            }
            Medido medido = new Medido(animal, animalService.rendimientoAcumulado(animal));
            Persona proveedor = animal.getProveedor();
            if (proveedor == null) {
                sinProveedor.add(medido);
            } else {
                proveedores.put(proveedor.getPerId(), proveedor);
                porProveedor.computeIfAbsent(proveedor.getPerId(), id -> new ArrayList<>()).add(medido);
            }
        }

        List<ProveedorComparativo> filas = new ArrayList<>();
        porProveedor.forEach((id, medidos) -> filas.add(
                aFila(id, PersonaService.nombreCompleto(proveedores.get(id)), medidos)));
        // Mayor GMD primero y los null al final; el nombre solo desempata para que el orden sea estable.
        filas.sort(Comparator
                .comparing((ProveedorComparativo fila) -> fila.gmdPromedio(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(fila -> fila.proveedorNombre() == null ? "" : fila.proveedorNombre(),
                        String.CASE_INSENSITIVE_ORDER));

        if (!sinProveedor.isEmpty()) {
            filas.add(aFila(null, SIN_PROVEEDOR, sinProveedor));
        }
        return filas;
    }

    /** Agrega los animales de un proveedor: solo los que tienen GMD acumulado entran en promedios y mejor animal. */
    private ProveedorComparativo aFila(Long proveedorId, String nombre, List<Medido> medidos) {
        List<Medido> conDatos = medidos.stream().filter(m -> m.rendimiento().gmd() != null).toList();
        if (conDatos.isEmpty()) {
            return new ProveedorComparativo(proveedorId, nombre, medidos.size(), 0, null, null, null, null);
        }
        double gmdPromedio = conDatos.stream().mapToDouble(m -> m.rendimiento().gmd()).average().orElseThrow();
        double gananciaPromedio = conDatos.stream().mapToDouble(m -> m.rendimiento().gananciaKg()).average()
                .orElseThrow();
        Medido mejor = conDatos.stream()
                .max(Comparator.comparingDouble((Medido m) -> m.rendimiento().gmd())
                        // Con GMD igual, la caravana más baja: así el "mejor" no depende del orden de la base.
                        .thenComparing(m -> m.animal().getAniCaravana(), Comparator.reverseOrder()))
                .orElseThrow();
        return new ProveedorComparativo(proveedorId, nombre, medidos.size(), conDatos.size(), gmdPromedio,
                gananciaPromedio, mejor.animal().getAniCaravana(), mejor.rendimiento().gmd());
    }

    /**
     * Animales de un proveedor (o los sin proveedor si proveedorId es null),
     * del mayor al menor GMD acumulado con los null al final. 404 si se
     * indica un proveedorId que no existe. Con soloActivos=true se omiten los
     * animales con salida registrada.
     */
    public List<AnimalRendimientoProveedor> obtenerAnimales(Long proveedorId, boolean soloActivos) {
        if (proveedorId != null && !personaRepository.existsById(proveedorId)) {
            throw new IllegalArgumentException("Persona no encontrada con id: " + proveedorId);
        }
        return animalRepository.findAll().stream()
                .filter(animal -> !soloActivos || animal.getAniFechaEgreso() == null)
                .filter(animal -> proveedorId == null
                        ? animal.getProveedor() == null
                        : animal.getProveedor() != null && proveedorId.equals(animal.getProveedor().getPerId()))
                .map(this::aDetalle)
                .sorted(Comparator
                        .comparing((AnimalRendimientoProveedor animal) -> animal.gmdAcumulado(),
                                Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(animal -> animal.caravana()))
                .toList();
    }

    private AnimalRendimientoProveedor aDetalle(Animal animal) {
        AnimalService.RendimientoAcumulado rendimiento = animalService.rendimientoAcumulado(animal);
        String estado = animal.getAniFechaEgreso() == null
                ? "Activo"
                : (animal.getAniMotivoSalida() != null ? animal.getAniMotivoSalida() : "Con salida");
        return new AnimalRendimientoProveedor(animal.getAniId(), animal.getAniCaravana(),
                animal.getRaza().getRzDescripcion(),
                animal.getSubGrupo() != null ? animal.getSubGrupo().getSbDescripcion() : null,
                animal.getAniFechaIngreso(), animal.getAniPesoInicial(), rendimiento.pesoActual(),
                rendimiento.gananciaKg(), rendimiento.gmd(), estado);
    }
}
