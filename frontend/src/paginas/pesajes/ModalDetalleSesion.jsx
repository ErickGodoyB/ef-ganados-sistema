/**
 * Modal de detalle de una sesión de pesaje (RF011): trae la lista de
 * animales pesados ese día en ese lote (GET /api/pesajes/sesiones/detalle)
 * y permite editar o eliminar el pesaje de cada uno, y agregar un animal
 * más a la sesión, todo sin salir del modal y guardando al toque (no hay
 * un botón "Guardar" general). El resumen de arriba (cantidad, total,
 * promedio, mínimo, máximo) se recalcula en el cliente a partir de la
 * lista local de animales, así queda actualizado en vivo tras cada cambio
 * sin depender de una nueva consulta aparte al backend.
 *
 * Solo un animal puede estar en edición o en confirmación de borrado a la
 * vez (accionActiva): mientras una fila está en alguno de esos dos modos,
 * el resto queda deshabilitado, para no perder de vista qué se está
 * guardando y evitar carreras entre dos acciones a la vez.
 */

import { RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import AgregarAnimalSesion from './AgregarAnimalSesion'
import './ModalDetalleSesion.css'
import TablaItemsSesion from './TablaItemsSesion'
import TarjetaItemSesion from './TarjetaItemSesion'

/** "dd/mm/aaaa · Lote — Grupo" (o "Sin lote"), para el título del modal. */
function tituloSesion(sesion) {
  const fecha = formatearFecha(sesion.fecha)
  if (!sesion.subGrupoDescripcion) {
    return `${fecha} · Sin lote`
  }
  const lote = sesion.grupoDescripcion
    ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}`
    : sesion.subGrupoDescripcion
  return `${fecha} · ${lote}`
}

export default function ModalDetalleSesion({ sesion, onCerrar, onCambiada, onQuedoSinAnimales, refDisparador }) {
  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // { tipo: 'editar' | 'eliminar', pesaId } | null: qué fila está siendo
  // editada o confirmada para borrar, como mucho una a la vez.
  const [accionActiva, setAccionActiva] = useState(null)
  const [guardandoAccion, setGuardandoAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [avisoLocal, setAvisoLocal] = useState('')
  const refTemporizadorAviso = useRef(null)

  // Aviso propio del modal (además de avisarle a Pesajes.jsx, que solo se
  // ve una vez cerrado el modal): como acá se puede editar/eliminar/agregar
  // varias veces sin cerrar nada, cada acción necesita su propia
  // confirmación visible (y accesible, aria-live) en el momento.
  function mostrarAvisoLocal(mensaje) {
    setAvisoLocal(mensaje)
    window.clearTimeout(refTemporizadorAviso.current)
    refTemporizadorAviso.current = window.setTimeout(() => setAvisoLocal(''), 4000)
  }

  const cargarDetalle = useCallback(async () => {
    setCargando(true)
    setError('')
    try {
      const parametros = new URLSearchParams({ fecha: sesion.fecha })
      if (sesion.subGrupoId != null) {
        parametros.set('subGrupoId', sesion.subGrupoId)
      }
      const datos = await peticionProtegida(`/api/pesajes/sesiones/detalle?${parametros.toString()}`)
      const lista = datos ?? []
      setItems(lista)
      return lista
    } catch {
      setError('No se pudo cargar el detalle de la sesión.')
      return null
    } finally {
      setCargando(false)
    }
  }, [sesion.fecha, sesion.subGrupoId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDetalle()
  }, [cargarDetalle])

  // Si la sesión no tiene (o se quedó sin) animales, no tiene sentido
  // seguir mostrando el modal: pasa tanto si ya estaba vacía al abrirlo
  // (alguien la vació en otra sesión) como si el último pesaje se borró
  // recién acá; en los dos casos se cierra y se avisa igual.
  useEffect(() => {
    if (!cargando && !error && items.length === 0) {
      onQuedoSinAnimales()
    }
  }, [cargando, error, items, onQuedoSinAnimales])

  const resumen = useMemo(() => {
    if (items.length === 0) {
      return { cantidad: 0, total: 0, promedio: 0, minimo: 0, maximo: 0 }
    }
    const pesos = items.map((item) => item.peso)
    const total = pesos.reduce((acumulado, peso) => acumulado + peso, 0)
    return {
      cantidad: items.length,
      total,
      promedio: total / items.length,
      minimo: Math.min(...pesos),
      maximo: Math.max(...pesos),
    }
  }, [items])

  const idsEnSesion = useMemo(() => new Set(items.map((item) => item.animalId)), [items])

  function iniciarEdicion(item) {
    setErrorAccion('')
    setAccionActiva({ tipo: 'editar', pesaId: item.pesaId })
  }

  function iniciarEliminacion(item) {
    setErrorAccion('')
    setAccionActiva({ tipo: 'eliminar', pesaId: item.pesaId })
  }

  function cancelarAccion() {
    setErrorAccion('')
    setAccionActiva(null)
  }

  /** Guarda el peso/observación editados de un pesaje (PUT); la fecha y el animal no se tocan. */
  async function guardarEdicion(item, peso, observaciones) {
    setGuardandoAccion(true)
    setErrorAccion('')
    try {
      await peticionProtegida(`/api/pesajes/${item.pesaId}`, {
        method: 'PUT',
        body: JSON.stringify({ peso, observaciones: observaciones.trim() || null }),
      })
      setAccionActiva(null)
      await cargarDetalle()
      mostrarAvisoLocal(`Pesaje de ${item.caravana} actualizado`)
      onCambiada(`Pesaje de ${item.caravana} actualizado`)
    } catch (err) {
      setErrorAccion(
        err instanceof ErrorHttp ? err.message || 'No se pudo actualizar el pesaje.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardandoAccion(false)
    }
  }

  /** Elimina el pesaje de un animal de la sesión; si no era el último, avisa acá (si lo era, avisa el efecto de arriba). */
  async function eliminarItem(item) {
    setGuardandoAccion(true)
    setErrorAccion('')
    try {
      await peticionProtegida(`/api/pesajes/${item.pesaId}`, { method: 'DELETE' })
      setAccionActiva(null)
      const nuevaLista = await cargarDetalle()
      if (nuevaLista && nuevaLista.length > 0) {
        mostrarAvisoLocal(`Pesaje de ${item.caravana} eliminado`)
        onCambiada(`Pesaje de ${item.caravana} eliminado`)
      }
    } catch (err) {
      setErrorAccion(
        err instanceof ErrorHttp ? err.message || 'No se pudo eliminar el pesaje.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardandoAccion(false)
    }
  }

  /** Tras agregar un animal a la sesión (ver AgregarAnimalSesion): refresca el detalle y avisa. */
  async function alAgregarAnimal(mensaje) {
    await cargarDetalle()
    mostrarAvisoLocal(mensaje)
    onCambiada(mensaje)
  }

  return (
    <Modal titulo={tituloSesion(sesion)} onCerrar={onCerrar} refDisparador={refDisparador} tamano="grande">
      <dl className="resumen-sesion">
        <div className="resumen-sesion-dato">
          <dt>Cantidad</dt>
          <dd>{resumen.cantidad}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Total</dt>
          <dd>{formatearPeso(resumen.total)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Promedio</dt>
          <dd>{formatearPeso(resumen.promedio)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Mínimo</dt>
          <dd>{formatearPeso(resumen.minimo)}</dd>
        </div>
        <div className="resumen-sesion-dato">
          <dt>Máximo</dt>
          <dd>{formatearPeso(resumen.maximo)}</dd>
        </div>
      </dl>

      {avisoLocal && (
        <p className="detalle-sesion-aviso" role="status" aria-live="polite">
          {avisoLocal}
        </p>
      )}

      {cargando && <p role="status">Cargando detalle…</p>}

      {!cargando && error && (
        <div className="estado-mensaje">
          <TriangleAlert aria-hidden="true" size={32} className="estado-mensaje-icono" />
          <p>{error}</p>
          <button type="button" className="boton-secundario" onClick={cargarDetalle}>
            <RefreshCw aria-hidden="true" size={16} />
            Reintentar
          </button>
        </div>
      )}

      {!cargando && !error && items.length > 0 && (
        <>
          <div className="detalle-sesion-tabla-solo-escritorio">
            <TablaItemsSesion
              items={items}
              fecha={formatearFecha(sesion.fecha)}
              accionActiva={accionActiva}
              guardando={guardandoAccion}
              errorAccion={errorAccion}
              onEditar={iniciarEdicion}
              onEliminar={iniciarEliminacion}
              onGuardarEdicion={guardarEdicion}
              onCancelar={cancelarAccion}
              onConfirmarEliminar={eliminarItem}
            />
          </div>

          <div className="detalle-sesion-tarjetas-solo-movil">
            {items.map((item) => (
              <TarjetaItemSesion
                key={item.pesaId}
                item={item}
                fecha={formatearFecha(sesion.fecha)}
                activa={accionActiva?.pesaId === item.pesaId}
                tipoAccion={accionActiva?.pesaId === item.pesaId ? accionActiva.tipo : null}
                deshabilitada={accionActiva != null && accionActiva.pesaId !== item.pesaId}
                guardando={guardandoAccion}
                errorAccion={accionActiva?.pesaId === item.pesaId ? errorAccion : ''}
                onEditar={() => iniciarEdicion(item)}
                onEliminar={() => iniciarEliminacion(item)}
                onGuardarEdicion={(peso, observaciones) => guardarEdicion(item, peso, observaciones)}
                onCancelar={cancelarAccion}
                onConfirmarEliminar={() => eliminarItem(item)}
              />
            ))}
          </div>
        </>
      )}

      <AgregarAnimalSesion
        sesion={sesion}
        idsEnSesion={idsEnSesion}
        deshabilitado={accionActiva != null}
        onAgregado={alAgregarAnimal}
      />
    </Modal>
  )
}
