package com.efganados.sistemabovino.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.efganados.sistemabovino.dto.AnimalRendimientoProveedor;
import com.efganados.sistemabovino.dto.ProveedorComparativo;
import com.efganados.sistemabovino.service.ReporteProveedorService;

/**
 * Reportes de solo lectura. Por ahora, el comparativo de rendimiento por
 * proveedor y su detalle por animal; la lógica está en
 * {@link ReporteProveedorService}.
 */
@RestController
@RequestMapping("/api/reportes")
public class ReportesController {

    private final ReporteProveedorService reporteProveedorService;

    public ReportesController(ReporteProveedorService reporteProveedorService) {
        this.reporteProveedorService = reporteProveedorService;
    }

    /**
     * Comparativo por proveedor (una fila por proveedor con animales, más
     * "Sin proveedor" si corresponde). Por defecto incluye también los
     * animales con salida; con soloActivos=true, solo los activos.
     */
    @GetMapping("/proveedores")
    public List<ProveedorComparativo> comparativoProveedores(
            @RequestParam(defaultValue = "false") boolean soloActivos) {
        return reporteProveedorService.obtenerComparativo(soloActivos);
    }

    /**
     * Animales de un proveedor con su rendimiento acumulado. Sin proveedorId
     * devuelve los animales sin proveedor; 404 si el proveedorId no existe.
     */
    @GetMapping("/proveedores/animales")
    public List<AnimalRendimientoProveedor> animalesDeProveedor(@RequestParam(required = false) Long proveedorId,
            @RequestParam(defaultValue = "false") boolean soloActivos) {
        return reporteProveedorService.obtenerAnimales(proveedorId, soloActivos);
    }
}
