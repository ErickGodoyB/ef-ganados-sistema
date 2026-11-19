/**
 * Datos de prueba compartidos por los tests de Inicio: un resumen completo,
 * los días del calendario de noviembre de 2026 y una respuesta de alertas.
 * Solo se usan desde archivos .test.
 */

export const LOTES = [
  { loteId: 2, loteDescripcion: 'Lote B', grupoDescripcion: 'Cría', animalesActivos: 5, pesoPromedio: 310, gmdPromedio: 1.2 },
  { loteId: 1, loteDescripcion: 'Lote A', grupoDescripcion: 'Cría', animalesActivos: 4, pesoPromedio: 420, gmdPromedio: 0.9 },
  { loteId: null, loteDescripcion: 'Sin lote', grupoDescripcion: null, animalesActivos: 3, pesoPromedio: null, gmdPromedio: null },
]

export const GRUPOS = [
  { grupoId: 1, grupoDescripcion: 'Cría', lotes: 2, animalesActivos: 9, pesoPromedio: 360, gmdPromedio: 1.05 },
  { grupoId: null, grupoDescripcion: 'Sin lote', lotes: 0, animalesActivos: 3, pesoPromedio: null, gmdPromedio: null },
]

export const RESUMEN = {
  animalesActivos: 12,
  pesadosEsteMes: 8,
  sesionesEsteMes: 3,
  aptosVenta: 2,
  sinPesajeReciente: 0,
  gananciaBaja: 4,
  lotes: LOTES,
  grupos: GRUPOS,
  parametros: { diasSinPesaje: 30, gananciaMinima: 0 },
}

/** Días con pesajes de noviembre de 2026 (hoy, el 18, es uno de ellos). */
export const DIAS_NOVIEMBRE = [
  { fecha: '2026-11-05', sesiones: 1, animales: 4 },
  { fecha: '2026-11-18', sesiones: 2, animales: 40 },
]

/** Una respuesta de alertas con "cantidad" animales (A-1, A-2, …) y el total indicado. */
export function alertaDe(tipo, cantidad, total = cantidad) {
  return {
    tipo,
    total,
    animales: Array.from({ length: cantidad }, (_, i) => ({
      animalId: i + 1,
      caravana: `A-${i + 1}`,
      razaDescripcion: 'Brangus',
      loteDescripcion: i === 0 ? null : 'Lote A',
      pesoActual: 460 - i,
      gmd: i === 0 ? null : 0.5,
      fechaUltimoPesaje: i === 0 ? null : '2026-10-18',
      diasSinPesaje: 60 - i,
    })),
  }
}
