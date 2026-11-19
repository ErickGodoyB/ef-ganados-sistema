package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.AlertasInicio;
import com.efganados.sistemabovino.dto.DiaCalendario;
import com.efganados.sistemabovino.dto.InicioResumen;
import com.efganados.sistemabovino.service.InicioService;

/**
 * Datos de solo lectura de la pantalla de Inicio (resumen, calendario y
 * alertas); la lógica está en {@link InicioService}. Los parámetros se
 * reciben como texto opcional a propósito: así los que faltan o no son
 * válidos (incluso uno no numérico) se responden con el 400 y el mensaje en
 * español del servicio, en vez del error genérico de Spring.
 */
@RestController
@RequestMapping("/api/inicio")
public class InicioController {

    private final InicioService inicioService;

    public InicioController(InicioService inicioService) {
        this.inicioService = inicioService;
    }

    /** Resumen general: conteos, lotes, grupos y los umbrales de las alertas. */
    @GetMapping("/resumen")
    public InicioResumen resumen() {
        return inicioService.obtenerResumen();
    }

    /** Días del mes pedido con pesajes activos; 400 si el año o el mes faltan o no son válidos. */
    @GetMapping("/calendario")
    public List<DiaCalendario> calendario(@RequestParam(required = false) String anio,
            @RequestParam(required = false) String mes) {
        return inicioService.obtenerCalendario(anio, mes);
    }

    /** Animales de una alerta (APTOS, SIN_PESAJE, GANANCIA_BAJA); 400 si el tipo o el límite no son válidos. */
    @GetMapping("/alertas")
    public AlertasInicio alertas(@RequestParam(required = false) String tipo,
            @RequestParam(required = false) String limite) {
        return inicioService.obtenerAlertas(tipo, limite);
    }
}
