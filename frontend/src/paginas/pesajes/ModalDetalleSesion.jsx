/**
 * Modal de detalle de una sesión de pesaje (RF011): trae la lista de
 * animales pesados ese día en ese lote (GET /api/pesajes/sesiones/detalle)
 * y permite editar o anular el pesaje de cada uno, anular la sesión
 * completa, cambiarle la fecha, y agregar un animal más, todo sin salir
 * del modal y guardando al toque (no hay un botón "Guardar" general). El
 * resumen de arriba (cantidad, total, promedio, mínimo, máximo, GMD
 * promedio) se recalcula en el cliente a partir de la lista local de
 * animales, así queda actualizado en vivo tras cada cambio sin depender de
 * una nueva consulta aparte al backend.
 *
 * Los pesajes nunca se borran (ver CLAUDE.md): "anular" los marca como
 * tales (PUT /api/pesajes/{id}/anular) pero se conservan, visibles después
 * en la vista "Anulados" (ver VistaAnulados.jsx); por eso ya no hay un
 * DELETE acá.
 *
 * "fechaActual" (no "sesion.fecha" directo) es la fecha vigente de esta
 * sesión dentro del modal: cambia sola si "Cambiar fecha" tiene éxito, sin
 * tener que cerrar y volver a abrir el modal para ver el detalle en la
 * fecha nueva.
 *
 * Solo una cosa puede estar en curso a la vez: una fila en edición o
 * confirmación de anulación (accionActiva), o el panel de "Anular sesión"/
 * "Cambiar fecha" (panelSesion). Mientras una fila está activa, el resto
 * queda deshabilitado, para no perder de vista qué se está guardando y
 * evitar carreras entre dos acciones a la vez.
 */

import { Ban, CalendarCog, RefreshCw, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import ValorGmd from '../../componentes/ValorGmd'
import { calcularCodigoSesion } from '../../utilidades/codigoSesion'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import { calcularGmdPromedioSesion, calcularResumenPesos } from '../../utilidades/resumenSesion'
import AgregarAnimalSesion from './AgregarAnimalSesion'
import './ModalDetalleSesion.css'
import PanelAnularSesion from './PanelAnularSesion'
import PanelCambiarFechaSesion from './PanelCambiarFechaSesion'
import TablaItemsSesion from './TablaItemsSesion'
import TarjetaItemSesion from './TarjetaItemSesion'

/** "dd/mm/aaaa · Lote — Grupo · S-AAMMDD-N" (o "Sin lote"), para el título del modal. */
function tituloSesion(sesion, fecha) {
  const fechaFormateada = formatearFecha(fecha)
  const codigo = calcularCodigoSesion(fecha, sesion.subGrupoId)
  if (!sesion.subGrupoDescripcion) {
    return `${fechaFormateada} · Sin lote · ${codigo}`
  }
  const lote = sesion.grupoDescripcion
    ? `${sesion.subGrupoDescripcion} — ${sesion.grupoDescripcion}`
    : sesion.subGrupoDescripcion
  return `${fechaFormateada} · ${lote} · ${codigo}`
}

export default function ModalDetalleSesion({ sesion, onCerrar, onCambiada, onQuedoSinAnimales, refDisparador }) {
  // La fecha vigente de la sesión dentro del modal: cambia si "Cambiar
  // fecha" tiene éxito (ver cambiarFechaSesion), sin depender de que el
  // padre vuelva a pasar un "sesion" distinto.
  const [fechaActual, setFechaActual] = useState(sesion.fecha)

  // Columna/dato opcional (ver TablaItemsSesion/TarjetaItemSesion): no se
  // persiste entre aperturas, a diferencia de las columnas opcionales del
  // listado de sesiones (ver usePreferenciasListadoPesajes), porque acá es
  // un detalle chico del modal, no una preferencia de toda la pantalla.
  const [mostrarResponsable, setMostrarResponsable] = useState(true)

  const [items, setItems] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')
  // { tipo: 'editar' | 'anular', pesaId } | null: qué fila está siendo
  // editada o confirmada para anular, como mucho una a la vez.
  const [accionActiva, setAccionActiva] = useState(null)
  const [guardandoAccion, setGuardandoAccion] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')
  const [avisoLocal, setAvisoLocal] = useState('')
  const refTemporizadorAviso = useRef(null)

  // Panel del encabezado abierto (ninguno, "Anular sesión" o "Cambiar
  // fecha"): igual que accionActiva, como mucho uno a la vez.
  const [panelSesion, setPanelSesion] = useState(null)
  const [guardandoPanel, setGuardandoPanel] = useState(false)
  const [errorPanel, setErrorPanel] = useState('')

  // Aviso propio del modal (además de avisarle a Pesajes.jsx, que solo se
  // ve una vez cerrado el modal): como acá se puede editar/anular/agregar
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
      const parametros = new URLSearchParams({ fecha: fechaActual })
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
  }, [fechaActual, sesion.subGrupoId])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarDetalle()
  }, [cargarDetalle])

  // Si la sesión no tiene (o se quedó sin) animales con un pesaje ACTIVO,
  // no tiene sentido seguir mostrando el modal: pasa tanto si ya estaba
  // vacía al abrirlo (se anuló en otro lado) como si el último pesaje
  // activo se anuló recién acá; en los dos casos se cierra y se avisa
  // igual. La anulación de la SESIÓN COMPLETA (ver anularSesionCompleta)
  // no pasa por acá: cierra y avisa directo, con su propio mensaje.
  useEffect(() => {
    if (!cargando && !error && items.length === 0) {
      onQuedoSinAnimales()
    }
  }, [cargando, error, items, onQuedoSinAnimales])

  const resumen = useMemo(() => {
    const resumenPesos = calcularResumenPesos(items.map((item) => item.peso))
    const { gmdPromedio, conGmd } = calcularGmdPromedioSesion(items.map((item) => item.gmd))
    return { ...resumenPesos, gmdPromedio, conGmd }
  }, [items])

  const idsEnSesion = useMemo(() => new Set(items.map((item) => item.animalId)), [items])

  function iniciarEdicion(item) {
    setErrorAccion('')
    setAccionActiva({ tipo: 'editar', pesaId: item.pesaId })
  }

  function iniciarAnulacion(item) {
    setErrorAccion('')
    setAccionActiva({ tipo: 'anular', pesaId: item.pesaId })
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

  /** Anula el pesaje de un animal de la sesión; si no era el último activo, avisa acá (si lo era, avisa el efecto de arriba). */
  async function anularItem(item, motivo) {
    setGuardandoAccion(true)
    setErrorAccion('')
    try {
      await peticionProtegida(`/api/pesajes/${item.pesaId}/anular`, {
        method: 'PUT',
        body: JSON.stringify({ motivo }),
      })
      setAccionActiva(null)
      const nuevaLista = await cargarDetalle()
      if (nuevaLista && nuevaLista.length > 0) {
        mostrarAvisoLocal(`Pesaje de ${item.caravana} anulado`)
        onCambiada(`Pesaje de ${item.caravana} anulado`)
      }
    } catch (err) {
      setErrorAccion(
        err instanceof ErrorHttp ? err.message || 'No se pudo anular el pesaje.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardandoAccion(false)
    }
  }

  function abrirPanelSesion(panel) {
    setErrorPanel('')
    setPanelSesion(panel)
  }

  function cerrarPanelSesion() {
    setErrorPanel('')
    setPanelSesion(null)
  }

  /** Anula TODOS los pesajes activos de la sesión en un solo paso. Al terminar, cierra el detalle (ya no queda nada que ver) y avisa cuántos. */
  async function anularSesionCompleta(motivo) {
    setGuardandoPanel(true)
    setErrorPanel('')
    try {
      const respuesta = await peticionProtegida('/api/pesajes/sesion/anular', {
        method: 'PUT',
        body: JSON.stringify({ fecha: fechaActual, subGrupoId: sesion.subGrupoId, motivo }),
      })
      onCerrar()
      onCambiada(`Sesión anulada: ${respuesta.cantidad} pesajes`)
    } catch (err) {
      setErrorPanel(
        err instanceof ErrorHttp ? err.message || 'No se pudo anular la sesión.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardandoPanel(false)
    }
  }

  /** Mueve todos los pesajes activos de la sesión a una fecha nueva. Al terminar, el detalle se recarga solo con la fecha nueva (ver cargarDetalle). */
  async function cambiarFechaSesion(nuevaFecha) {
    setGuardandoPanel(true)
    setErrorPanel('')
    try {
      const respuesta = await peticionProtegida('/api/pesajes/sesion/fecha', {
        method: 'PUT',
        body: JSON.stringify({ fecha: fechaActual, subGrupoId: sesion.subGrupoId, nuevaFecha }),
      })
      setFechaActual(nuevaFecha)
      cerrarPanelSesion()
      const mensaje = `Fecha cambiada: ${respuesta.cantidad} pesajes movidos al ${formatearFecha(nuevaFecha)}`
      mostrarAvisoLocal(mensaje)
      onCambiada(mensaje)
    } catch (err) {
      setErrorPanel(
        err instanceof ErrorHttp ? err.message || 'No se pudo cambiar la fecha de la sesión.' : 'No se pudo conectar con el servidor.',
      )
    } finally {
      setGuardandoPanel(false)
    }
  }

  /** Tras agregar un animal a la sesión (ver AgregarAnimalSesion): refresca el detalle y avisa. */
  async function alAgregarAnimal(mensaje) {
    await cargarDetalle()
    mostrarAvisoLocal(mensaje)
    onCambiada(mensaje)
  }

  const hayAccionODialogoActivo = accionActiva != null || panelSesion != null

  return (
    <Modal titulo={tituloSesion(sesion, fechaActual)} onCerrar={onCerrar} refDisparador={refDisparador} tamano="grande">
      <div className="detalle-sesion-acciones-encabezado">
        <button
          type="button"
          className="boton-secundario"
          onClick={() => abrirPanelSesion(panelSesion === 'cambiarFecha' ? null : 'cambiarFecha')}
          disabled={hayAccionODialogoActivo && panelSesion !== 'cambiarFecha'}
        >
          <CalendarCog aria-hidden="true" size={16} />
          Cambiar fecha
        </button>
        <button
          type="button"
          className="boton-peligro"
          onClick={() => abrirPanelSesion(panelSesion === 'anular' ? null : 'anular')}
          disabled={hayAccionODialogoActivo && panelSesion !== 'anular'}
        >
          <Ban aria-hidden="true" size={16} />
          Anular sesión
        </button>
      </div>

      {panelSesion === 'anular' && (
        <PanelAnularSesion
          cantidad={items.length}
          guardando={guardandoPanel}
          error={errorPanel}
          onCancelar={cerrarPanelSesion}
          onConfirmar={anularSesionCompleta}
        />
      )}

      {panelSesion === 'cambiarFecha' && (
        <PanelCambiarFechaSesion
          fechaActual={fechaActual}
          cantidad={items.length}
          guardando={guardandoPanel}
          error={errorPanel}
          onCancelar={cerrarPanelSesion}
          onConfirmar={cambiarFechaSesion}
        />
      )}

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
        <div className="resumen-sesion-dato">
          <dt>GMD promedio</dt>
          <dd>
            <ValorGmd gmd={resumen.gmdPromedio} />
            <span className="resumen-sesion-auxiliar">
              {resumen.conGmd} de {resumen.cantidad} animales con peso previo (incluye el peso de ingreso)
            </span>
          </dd>
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
          <label className="detalle-sesion-toggle-responsable">
            <input
              type="checkbox"
              checked={mostrarResponsable}
              onChange={(evento) => setMostrarResponsable(evento.target.checked)}
            />
            Mostrar responsable
          </label>

          <div className="detalle-sesion-tabla-solo-escritorio">
            <TablaItemsSesion
              items={items}
              fecha={formatearFecha(fechaActual)}
              mostrarResponsable={mostrarResponsable}
              accionActiva={accionActiva}
              guardando={guardandoAccion}
              errorAccion={errorAccion}
              onEditar={iniciarEdicion}
              onAnular={iniciarAnulacion}
              onGuardarEdicion={guardarEdicion}
              onCancelar={cancelarAccion}
              onConfirmarAnular={anularItem}
            />
          </div>

          <div className="detalle-sesion-tarjetas-solo-movil">
            {items.map((item) => (
              <TarjetaItemSesion
                key={item.pesaId}
                item={item}
                fecha={formatearFecha(fechaActual)}
                mostrarResponsable={mostrarResponsable}
                activa={accionActiva?.pesaId === item.pesaId}
                tipoAccion={accionActiva?.pesaId === item.pesaId ? accionActiva.tipo : null}
                deshabilitada={accionActiva != null && accionActiva.pesaId !== item.pesaId}
                guardando={guardandoAccion}
                errorAccion={accionActiva?.pesaId === item.pesaId ? errorAccion : ''}
                onEditar={() => iniciarEdicion(item)}
                onAnular={() => iniciarAnulacion(item)}
                onGuardarEdicion={(peso, observaciones) => guardarEdicion(item, peso, observaciones)}
                onCancelar={cancelarAccion}
                onConfirmarAnular={(motivo) => anularItem(item, motivo)}
              />
            ))}
          </div>
        </>
      )}

      <AgregarAnimalSesion
        sesion={{ ...sesion, fecha: fechaActual }}
        idsEnSesion={idsEnSesion}
        deshabilitado={hayAccionODialogoActivo}
        onAgregado={alAgregarAnimal}
      />
    </Modal>
  )
}
