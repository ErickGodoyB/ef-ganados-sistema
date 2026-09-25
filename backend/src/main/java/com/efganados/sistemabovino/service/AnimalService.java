package com.efganados.sistemabovino.service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

import org.springframework.stereotype.Service;

import com.efganados.sistemabovino.model.Animal;
import com.efganados.sistemabovino.model.Persona;
import com.efganados.sistemabovino.model.Pesajes;
import com.efganados.sistemabovino.repository.AnimalRepository;
import com.efganados.sistemabovino.repository.PesajesRepository;

/**
 * Lógica de negocio del animal. El peso actual, la GMD y la aptitud para venta
 * no se guardan en {@link Animal}: se derivan siempre de los registros de
 * {@link Pesajes}, evitando datos duplicados o desincronizados.
 */
@Service
public class AnimalService {

    private final AnimalRepository animalRepository;
    private final PesajesRepository pesajesRepository;

    public AnimalService(AnimalRepository animalRepository, PesajesRepository pesajesRepository) {
        this.animalRepository = animalRepository;
        this.pesajesRepository = pesajesRepository;
    }

    /**
     * Devuelve el peso del pesaje más reciente del animal. Si todavía no tiene
     * ningún pesaje, usa el peso inicial como mejor dato disponible.
     */
    public double pesoActual(Animal animal) {
        List<Pesajes> pesajes = pesajesRepository.findTop2ByAnimal_AniIdOrderByPesaFechaDesc(animal.getAniId());
        if (!pesajes.isEmpty()) {
            return pesajes.get(0).getPesaPeso();
        }
        return animal.getAniPesoInicial();
    }

    /**
     * Calcula la Ganancia Media Diaria entre los dos pesajes más recientes,
     * sin importar el intervalo entre ellos. Devuelve null si hay menos de dos
     * pesajes. El peso inicial del animal no participa del cálculo porque es
     * solo informativo; la GMD se basa únicamente en pesajes registrados.
     */
    public Double calcularGMD(Animal animal) {
        List<Pesajes> pesajes = pesajesRepository.findTop2ByAnimal_AniIdOrderByPesaFechaDesc(animal.getAniId());
        if (pesajes.size() < 2) {
            return null;
        }
        Pesajes masReciente = pesajes.get(0);
        Pesajes anterior = pesajes.get(1);
        long dias = ChronoUnit.DAYS.between(anterior.getPesaFecha(), masReciente.getPesaFecha());
        if (dias == 0) {
            return 0.0;
        }
        return (masReciente.getPesaPeso() - anterior.getPesaPeso()) / dias;
    }

    /**
     * Indica si el peso actual alcanzó el peso objetivo de venta definido en la
     * raza del animal (umbral por raza, usado para las alertas de venta).
     */
    public boolean estaAptoParaVenta(Animal animal) {
        return pesoActual(animal) >= animal.getRaza().getRzPesoObjetivoVenta();
    }

    /**
     * Registra un nuevo pesaje para el animal. Cada pesaje es un registro
     * nuevo (nunca se sobrescribe uno anterior) y no modifica ni guarda nada
     * en {@link Animal}, porque el peso actual se deriva de los pesajes.
     */
    public Pesajes registrarPesaje(Animal animal, double peso, LocalDate fecha, Persona responsable) {
        Pesajes pesaje = new Pesajes();
        pesaje.setAnimal(animal);
        pesaje.setPesaPeso(peso);
        pesaje.setPesaFecha(fecha);
        pesaje.setResponsable(responsable);
        return pesajesRepository.save(pesaje);
    }
}
