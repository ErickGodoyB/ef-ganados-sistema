/**
 * Funciones puras para dibujar a mano los gráficos de Inicio con SVG (sin
 * librerías): agrupación en "Otros", ángulos y caminos del anillo, escalas
 * del eje, puntos de la línea y armado de las series a partir de las
 * respuestas del backend. Ninguna toca el DOM ni el reloj, así se pueden
 * probar con datos fijos.
 */

import { diasEntreFechas } from './fechas'

/** Máximo de porciones del anillo, contando la de "Otros". */
export const MAX_PORCIONES = 6

const DOS_PI = Math.PI * 2

/** Redondea a 3 decimales: coordenadas SVG cortas y estables (sin 0.30000000000000004 en los caminos). */
const redondear = (numero) => Number(numero.toFixed(3))

// ---- anillo ----

/**
 * Deja a lo sumo "maximo" porciones: ordena de mayor a menor, descarta las
 * de valor 0 y, si sobran, junta las más chicas en una porción "Otros" (que
 * cuenta dentro del máximo: con 6 como máximo quedan 5 propias más "Otros").
 * La porción agrupada lleva esOtros en true, para darle su propio color.
 *
 * @param {{etiqueta: string, valor: number}[]} items
 * @param {number} [maximo]
 */
export function agruparEnOtros(items, maximo = MAX_PORCIONES) {
  const conValor = items
    .filter((item) => item.valor > 0)
    .sort((a, b) => b.valor - a.valor || a.etiqueta.localeCompare(b.etiqueta, 'es'))
  if (conValor.length <= maximo) {
    return conValor
  }
  const principales = conValor.slice(0, maximo - 1)
  const resto = conValor.slice(maximo - 1)
  return [...principales, { etiqueta: 'Otros', valor: resto.reduce((suma, item) => suma + item.valor, 0), esOtros: true }]
}

/**
 * Porcentajes enteros que suman exactamente 100 (método del mayor resto:
 * redondear cada uno por separado podría dar 99 o 101). Con total 0, todos
 * valen 0.
 */
export function porcentajesEnteros(valores) {
  const total = valores.reduce((suma, valor) => suma + valor, 0)
  if (total <= 0) {
    return valores.map(() => 0)
  }
  const exactos = valores.map((valor) => (valor / total) * 100)
  const porcentajes = exactos.map((exacto) => Math.floor(exacto))
  let faltan = 100 - porcentajes.reduce((suma, porcentaje) => suma + porcentaje, 0)
  const porResto = exactos
    .map((exacto, indice) => ({ indice, resto: exacto - Math.floor(exacto) }))
    .sort((a, b) => b.resto - a.resto || a.indice - b.indice)
  for (const { indice } of porResto) {
    if (faltan <= 0) {
      break
    }
    if (valores[indice] > 0) {
      porcentajes[indice] += 1
      faltan -= 1
    }
  }
  return porcentajes
}

/**
 * Porciones del anillo con su porcentaje y sus ángulos (en radianes, desde
 * las 12 en punto y en sentido horario). Las de valor 0 quedan con ángulo
 * de ancho 0. "indice" es la posición original, para que cada una conserve
 * siempre el mismo color de serie.
 */
export function calcularPorciones(items) {
  const total = items.reduce((suma, item) => suma + item.valor, 0)
  const porcentajes = porcentajesEnteros(items.map((item) => item.valor))
  let acumulado = -Math.PI / 2
  return items.map((item, indice) => {
    const ancho = total > 0 ? (item.valor / total) * DOS_PI : 0
    const porcion = {
      ...item,
      indice,
      porcentaje: porcentajes[indice],
      anguloInicio: acumulado,
      anguloFin: acumulado + ancho,
    }
    acumulado += ancho
    return porcion
  })
}

/** Punto de la circunferencia de centro (cx, cy) y radio dado, en el ángulo (radianes) indicado. */
export function puntoEnCirculo(cx, cy, radio, angulo) {
  return { x: redondear(cx + radio * Math.cos(angulo)), y: redondear(cy + radio * Math.sin(angulo)) }
}

/**
 * Camino SVG de una porción del anillo (sector entre dos radios). Si la
 * porción ocupa la vuelta completa (un solo dato), un arco de 360° no se
 * puede dibujar con un único comando de arco, así que se arman dos
 * circunferencias (la exterior y la interior) para rellenar con "evenodd".
 */
export function caminoDeSector({ cx, cy, radioExterior, radioInterior, anguloInicio, anguloFin }) {
  const R = radioExterior
  const r = radioInterior
  if (anguloFin - anguloInicio >= DOS_PI - 1e-9) {
    return (
      `M ${redondear(cx + R)} ${cy} A ${R} ${R} 0 1 1 ${redondear(cx - R)} ${cy} A ${R} ${R} 0 1 1 ${redondear(cx + R)} ${cy} Z ` +
      `M ${redondear(cx + r)} ${cy} A ${r} ${r} 0 1 0 ${redondear(cx - r)} ${cy} A ${r} ${r} 0 1 0 ${redondear(cx + r)} ${cy} Z`
    )
  }
  const largo = anguloFin - anguloInicio > Math.PI ? 1 : 0
  const exteriorInicio = puntoEnCirculo(cx, cy, R, anguloInicio)
  const exteriorFin = puntoEnCirculo(cx, cy, R, anguloFin)
  const interiorFin = puntoEnCirculo(cx, cy, r, anguloFin)
  const interiorInicio = puntoEnCirculo(cx, cy, r, anguloInicio)
  return (
    `M ${exteriorInicio.x} ${exteriorInicio.y} A ${R} ${R} 0 ${largo} 1 ${exteriorFin.x} ${exteriorFin.y} ` +
    `L ${interiorFin.x} ${interiorFin.y} A ${r} ${r} 0 ${largo} 0 ${interiorInicio.x} ${interiorInicio.y} Z`
  )
}

// ---- escalas ----

/** Función lineal que lleva el dominio [d0, d1] al rango [r0, r1]; si el dominio es un solo valor, devuelve el medio del rango. */
export function escalaLineal(d0, d1, r0, r1) {
  return (valor) => (d0 === d1 ? (r0 + r1) / 2 : r0 + ((valor - d0) / (d1 - d0)) * (r1 - r0))
}

/**
 * Escala "linda" del eje Y: un paso de 1, 2, 2,5 o 5 por una potencia de
 * 10, con mínimo y máximo múltiplos de ese paso que contienen a todos los
 * valores, y las marcas entre ambos. Con un solo valor (o todos iguales)
 * se abre un margen para que el punto no quede pegado al borde. Sin
 * valores, devuelve 0 a 1.
 */
export function escalaDeEjeY(valores, cantidadMarcas = 4) {
  if (valores.length === 0) {
    return { minimo: 0, maximo: 1, marcas: [0, 1] }
  }
  let bajo = Math.min(...valores)
  let alto = Math.max(...valores)
  if (bajo === alto) {
    const margen = Math.max(Math.abs(bajo) * 0.05, 1)
    bajo -= margen
    alto += margen
  }
  const crudo = (alto - bajo) / Math.max(cantidadMarcas - 1, 1)
  const magnitud = 10 ** Math.floor(Math.log10(crudo))
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * magnitud).find((candidato) => candidato >= crudo)
  const minimo = redondear(Math.floor(bajo / paso) * paso)
  const maximo = redondear(Math.ceil(alto / paso) * paso)
  const marcas = []
  for (let valor = minimo; valor <= maximo + paso / 1000; valor += paso) {
    marcas.push(redondear(valor))
  }
  return { minimo, maximo, marcas }
}

/**
 * Posiciones de la línea de evolución: cada punto con su x (proporcional a
 * los días transcurridos entre fechas, no a su posición en la lista) e y
 * (según la escala del eje), más las marcas de ambos ejes. Con un solo
 * punto queda centrado. Las marcas del eje X son a lo sumo
 * "maximoMarcasX", repartidas parejas entre los puntos (siempre incluyen el
 * primero y el último).
 *
 * @param {{fecha: string, valor: number}[]} serie  fechas aaaa-mm-dd
 * @param {{ancho: number, alto: number, margen: {arriba: number, derecha: number, abajo: number, izquierda: number}}} medidas
 */
export function puntosDeLinea(serie, { ancho, alto, margen }, maximoMarcasX = 4) {
  const ordenada = [...serie].sort((a, b) => a.fecha.localeCompare(b.fecha))
  const x0 = margen.izquierda
  const x1 = ancho - margen.derecha
  const y0 = margen.arriba
  const y1 = alto - margen.abajo
  const eje = escalaDeEjeY(ordenada.map((punto) => punto.valor))
  const escalaY = escalaLineal(eje.minimo, eje.maximo, y1, y0)

  const dias = ordenada.map((punto) => diasEntreFechas(ordenada[0].fecha, punto.fecha))
  const escalaX = escalaLineal(0, dias[dias.length - 1] ?? 0, x0, x1)
  const puntos = ordenada.map((punto, indice) => ({
    fecha: punto.fecha,
    valor: punto.valor,
    x: redondear(escalaX(dias[indice])),
    y: redondear(escalaY(punto.valor)),
  }))

  const cantidadX = Math.min(puntos.length, maximoMarcasX)
  const indicesX = new Set()
  for (let i = 0; i < cantidadX; i += 1) {
    indicesX.add(cantidadX === 1 ? 0 : Math.round((i * (puntos.length - 1)) / (cantidadX - 1)))
  }
  return {
    puntos,
    marcasX: [...indicesX].map((indice) => ({ fecha: puntos[indice].fecha, x: puntos[indice].x })),
    marcasY: eje.marcas.map((valor) => ({ valor, y: redondear(escalaY(valor)) })),
    area: { x0, x1, y0, y1 },
  }
}

// ---- series a partir de los datos del backend ----

/** Valor de selector de un lote: su id como texto, o 'sin-lote'. */
function claveDeLote(subGrupoId) {
  return subGrupoId == null ? 'sin-lote' : String(subGrupoId)
}

/**
 * Lotes que tienen sesiones de pesaje, para el selector de la línea: la
 * etiqueta es "Lote — Grupo" (puede haber lotes con el mismo nombre en
 * grupos distintos), ordenados por nombre y con "Sin lote" al final.
 *
 * @param {{subGrupoId: number|null, subGrupoDescripcion: string|null, grupoDescripcion: string|null}[]} sesiones
 */
export function lotesDeSesiones(sesiones) {
  const vistos = new Map()
  for (const sesion of sesiones) {
    const clave = claveDeLote(sesion.subGrupoId)
    if (vistos.has(clave)) {
      continue
    }
    const etiqueta =
      sesion.subGrupoId == null
        ? 'Sin lote'
        : sesion.grupoDescripcion
          ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}`
          : sesion.subGrupoDescripcion
    vistos.set(clave, { valor: clave, etiqueta })
  }
  return [...vistos.values()].sort((a, b) => {
    if (a.valor === 'sin-lote' || b.valor === 'sin-lote') {
      return a.valor === 'sin-lote' ? 1 : -1
    }
    return a.etiqueta.localeCompare(b.etiqueta, 'es', { sensitivity: 'base' })
  })
}

/** Valor del lote de la sesión más reciente (el que conviene mostrar de entrada), o '' si no hay sesiones. */
export function loteDeLaSesionMasReciente(sesiones) {
  if (sesiones.length === 0) {
    return ''
  }
  const reciente = sesiones.reduce((a, b) => (b.fecha > a.fecha ? b : a))
  return claveDeLote(reciente.subGrupoId)
}

/** Puntos (fecha y peso promedio) de las sesiones de un lote, por fecha ascendente. */
export function serieDePesoPorLote(sesiones, lote) {
  return sesiones
    .filter((sesion) => claveDeLote(sesion.subGrupoId) === lote)
    .map((sesion) => ({ fecha: sesion.fecha, valor: sesion.promedio }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

/** Cantidad de animales ACTIVOS (sin salida) por raza, a partir del resumen de animales. */
export function agregarPorRaza(animales) {
  const porRaza = new Map()
  for (const animal of animales) {
    if (animal.aniFechaEgreso != null) {
      continue
    }
    const etiqueta = animal.razaDescripcion ?? 'Sin raza'
    porRaza.set(etiqueta, (porRaza.get(etiqueta) ?? 0) + 1)
  }
  return [...porRaza.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor }))
}
