/**
 * Búsqueda sobre la lista de transferencias ya cargada (GET
 * /api/transferencias): la pantalla filtra por fecha en el servidor (con el
 * Intervalo) y por texto acá, en el cliente, igual que Pesajes con su
 * buscador. Separada de Transferencias.jsx para poder probarla sin React.
 */

import { etiquetaMotivoTransferencia } from './motivos'

/** Minúsculas y sin tildes, para que "seleccion" encuentre "Selección" y "recria" encuentre "Recría". */
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}

/**
 * Filtra las transferencias por un texto que se busca (sin distinguir
 * mayúsculas ni tildes, ignorando espacios en los extremos) en los lotes
 * de origen y de destino, el responsable y el motivo (tanto su etiqueta,
 * "Selección", como su valor, "SELECCION"). Sin texto devuelve todas.
 * Conserva el orden recibido (el backend ya las manda de la más reciente a
 * la más antigua) y no modifica el arreglo original.
 */
export function filtrarTransferencias(transferencias, busqueda) {
  const termino = normalizar(busqueda).trim()
  if (!termino) {
    return transferencias
  }
  return transferencias.filter((transferencia) => {
    const campos = [
      ...(transferencia.origenes ?? []),
      ...(transferencia.destinos ?? []),
      transferencia.responsableNombre,
      etiquetaMotivoTransferencia(transferencia.motivo),
      transferencia.motivo,
    ]
    return campos.some((campo) => normalizar(campo).includes(termino))
  })
}
