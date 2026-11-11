/**
 * Modal de detalle de un animal (RF010 ampliado): muestra sus datos
 * completos, su historial de pesajes (ver HistorialPesajesAnimal.jsx) y,
 * desde el mismo <Modal> (sin apilar varios), permite pasar a "Editar"
 * (reutiliza FormularioAnimal en modo "editar"), "Eliminar" (confirmación
 * chica dentro del mismo panel), "Registrar salida" (reutiliza
 * FormularioSalidaAnimal, solo si el animal sigue activo) o "Reactivar"
 * (otra confirmación chica, solo si el animal ya salió). Un solo Modal
 * montado para las cinco vistas evita que, si hubiera varios <Modal>
 * apilados, todos reaccionen al mismo Escape (cada uno agrega su propio
 * listener de teclado al document) o compitan por la trampa de foco. La
 * vista "detalle" usa tamano="grande" (tiene la tabla del historial, que
 * necesita más lugar); el resto sigue con el tamaño normal.
 *
 * A diferencia de "Editar"/"Eliminar" (que cierran el modal al terminar,
 * ver onActualizado/onEliminado), "Registrar salida" y "Reactivar" vuelven
 * a la vista "detalle" sin cerrar el modal: Animales.jsx reemplaza el
 * animal por los datos nuevos (ver onSalidaRegistrada/onReactivado) para
 * que el detalle ya abierto los muestre de una.
 */

import { LogOut, Pencil, RotateCcw, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearFecha, formatearFechaHora, formatearPeso } from '../../utilidades/formato'
import EstadoBadge from './EstadoBadge'
import FormularioAnimal from './FormularioAnimal'
import FormularioSalidaAnimal from './FormularioSalidaAnimal'
import HistorialPesajesAnimal from './HistorialPesajesAnimal'
import { etiquetaMotivoSalida } from './tiposSalida'
import './ModalDetalleAnimal.css'

const TITULOS = {
  detalle: 'Detalle del animal',
  editar: 'Editar animal',
  eliminar: 'Eliminar animal',
  salida: 'Registrar salida',
  reactivar: 'Reactivar animal',
}

/** Texto del lote: "Lote — Grupo" para distinguir lotes del mismo nombre en grupos distintos, o "Sin lote". */
function textoLote(animal) {
  if (!animal.subGrupoDescripcion) {
    return 'Sin lote'
  }
  return animal.grupoDescripcion ? `${animal.subGrupoDescripcion} — ${animal.grupoDescripcion}` : animal.subGrupoDescripcion
}

export default function ModalDetalleAnimal({
  animal,
  onCerrar,
  onActualizado,
  onEliminado,
  onYaNoExiste,
  onSalidaRegistrada,
  onReactivado,
  refDisparador,
}) {
  const [vista, setVista] = useState('detalle')
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')
  const [reactivando, setReactivando] = useState(false)
  const [errorReactivar, setErrorReactivar] = useState('')

  const refFormulario = useRef(null)
  // Compartido entre "eliminar" y "reactivar": las dos son una confirmación
  // chica con "Cancelar"/"Eliminar" o "Cancelar"/"Reactivar", pero nunca se
  // muestran juntas, así que alcanza una sola ref.
  const refBotonCancelarConfirmacion = useRef(null)

  // Al entrar a "eliminar" o "reactivar", el foco pasa a "Cancelar" (la
  // opción segura por defecto antes de confirmar), no al botón de acción.
  useEffect(() => {
    if (vista === 'eliminar' || vista === 'reactivar') {
      refBotonCancelarConfirmacion.current?.focus()
    }
  }, [vista])

  function volverADetalle() {
    setVista('detalle')
    setErrorEliminar('')
    setErrorReactivar('')
  }

  // Escape o clic en el fondo: en "editar" se delega en FormularioAnimal
  // (respeta la misma confirmación que su botón Cancelar si hay datos sin
  // guardar); en "eliminar"/"reactivar"/"salida" vuelve al detalle en vez
  // de cerrar todo; en "detalle" cierra el modal.
  function manejarCierre() {
    if (vista === 'editar') {
      refFormulario.current?.solicitarCierre()
      return
    }
    if (vista === 'eliminar' || vista === 'reactivar' || vista === 'salida') {
      volverADetalle()
      return
    }
    onCerrar()
  }

  async function confirmarEliminar() {
    setEliminando(true)
    setErrorEliminar('')
    try {
      await peticionProtegida(`/api/animales/${animal.aniId}`, { method: 'DELETE' })
      onEliminado(animal.aniCaravana)
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 409) {
        setErrorEliminar(err.message || 'No se puede eliminar el animal.')
      } else if (err instanceof ErrorHttp && err.estado === 404) {
        onYaNoExiste()
      } else {
        setErrorEliminar('No se pudo conectar con el servidor.')
      }
    } finally {
      setEliminando(false)
    }
  }

  /** Vuelve a "detalle" y avisa al padre con los datos ya actualizados (ver el Javadoc de arriba). */
  function alGuardarSalida(animalActualizado) {
    setVista('detalle')
    onSalidaRegistrada(animalActualizado)
  }

  async function confirmarReactivar() {
    setReactivando(true)
    setErrorReactivar('')
    try {
      const actualizado = await peticionProtegida(`/api/animales/${animal.aniId}/reactivar`, { method: 'PUT' })
      setVista('detalle')
      onReactivado(actualizado)
    } catch (err) {
      if (err instanceof ErrorHttp && err.estado === 404) {
        onYaNoExiste()
      } else if (err instanceof ErrorHttp) {
        setErrorReactivar(err.message || 'No se puede reactivar el animal.')
      } else {
        setErrorReactivar('No se pudo conectar con el servidor.')
      }
    } finally {
      setReactivando(false)
    }
  }

  const sinPesajes = animal.cantidadPesajes === 0
  const avisoNoEliminable = `Tiene ${animal.cantidadPesajes} pesajes registrados: no se puede eliminar`
  const tieneSalida = Boolean(animal.aniFechaEgreso)

  return (
    <Modal titulo={TITULOS[vista]} onCerrar={manejarCierre} refDisparador={refDisparador} tamano={vista === 'detalle' ? 'grande' : 'normal'}>
      {vista === 'detalle' && (
        <>
          <dl className="detalle-animal-datos">
            <div className="detalle-animal-dato">
              <dt>Caravana</dt>
              <dd>{animal.aniCaravana}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Raza</dt>
              <dd>{animal.razaDescripcion}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Lote</dt>
              <dd>{textoLote(animal)}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Dueño</dt>
              <dd>{animal.duenioNombre || 'Sin datos'}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Fecha de ingreso</dt>
              <dd>{formatearFecha(animal.aniFechaIngreso)}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Peso inicial</dt>
              <dd>{formatearPeso(animal.aniPesoInicial)}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Peso actual</dt>
              <dd>{formatearPeso(animal.pesoActual)}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>GMD</dt>
              <dd>
                <ValorGmd gmd={animal.gmd} />
              </dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Estado</dt>
              <dd>
                <EstadoBadge animal={animal} />
              </dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Pesajes registrados</dt>
              <dd>{animal.cantidadPesajes}</dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Registrado el</dt>
              <dd>{animal.aniFechaRegistro ? formatearFechaHora(animal.aniFechaRegistro) : '—'}</dd>
            </div>
            <div className="detalle-animal-dato detalle-animal-dato--ancho">
              <dt>Observación</dt>
              <dd>{animal.aniObservacion || 'Sin observaciones'}</dd>
            </div>
            {tieneSalida && (
              <div className="detalle-animal-dato detalle-animal-dato--ancho">
                <dt>Salida</dt>
                <dd>
                  {etiquetaMotivoSalida(animal.aniMotivoSalida)} el {formatearFecha(animal.aniFechaEgreso)}
                  {animal.aniNotaSalida && <> — {animal.aniNotaSalida}</>}
                  {animal.compradorNombre && <> · Comprador: {animal.compradorNombre}</>}
                </dd>
              </div>
            )}
          </dl>

          <div className="detalle-animal-acciones">
            <button type="button" className="boton-secundario" onClick={() => setVista('editar')}>
              <Pencil aria-hidden="true" size={16} />
              Editar
            </button>
            {!tieneSalida && (
              <button type="button" className="boton-secundario" onClick={() => setVista('salida')}>
                <LogOut aria-hidden="true" size={16} />
                Registrar salida
              </button>
            )}
            {tieneSalida && (
              <button type="button" className="boton-secundario" onClick={() => setVista('reactivar')}>
                <RotateCcw aria-hidden="true" size={16} />
                Reactivar
              </button>
            )}
            <button
              type="button"
              className="boton-peligro"
              onClick={() => setVista('eliminar')}
              disabled={!sinPesajes}
              title={sinPesajes ? undefined : avisoNoEliminable}
            >
              <Trash2 aria-hidden="true" size={16} />
              Eliminar
            </button>
          </div>
          {!sinPesajes && <p className="detalle-animal-aviso-pesajes">{avisoNoEliminable}</p>}

          <HistorialPesajesAnimal animal={animal} />
        </>
      )}

      {vista === 'editar' && (
        <FormularioAnimal
          ref={refFormulario}
          modo="editar"
          animalId={animal.aniId}
          valoresIniciales={animal}
          alGuardar={onActualizado}
          alCancelar={volverADetalle}
        />
      )}

      {vista === 'eliminar' && (
        <div className="detalle-animal-confirmar">
          <p>¿Eliminar el animal {animal.aniCaravana}? Esta acción no se puede deshacer.</p>
          {errorEliminar && (
            <p className="campo-error" role="alert">
              {errorEliminar}
            </p>
          )}
          <div className="detalle-animal-acciones">
            <button
              type="button"
              ref={refBotonCancelarConfirmacion}
              className="boton-secundario"
              onClick={volverADetalle}
              disabled={eliminando}
            >
              Cancelar
            </button>
            <button type="button" className="boton-peligro" onClick={confirmarEliminar} disabled={eliminando}>
              <Trash2 aria-hidden="true" size={16} />
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      )}

      {vista === 'salida' && (
        <FormularioSalidaAnimal animal={animal} alGuardar={alGuardarSalida} alCancelar={volverADetalle} />
      )}

      {vista === 'reactivar' && (
        <div className="detalle-animal-confirmar">
          <p>
            ¿Reactivar el animal {animal.aniCaravana}? Se va a borrar la fecha de salida, el motivo, la nota y el
            comprador.
          </p>
          {errorReactivar && (
            <p className="campo-error" role="alert">
              {errorReactivar}
            </p>
          )}
          <div className="detalle-animal-acciones">
            <button
              type="button"
              ref={refBotonCancelarConfirmacion}
              className="boton-secundario"
              onClick={volverADetalle}
              disabled={reactivando}
            >
              Cancelar
            </button>
            <button type="button" className="boton-primario" onClick={confirmarReactivar} disabled={reactivando}>
              <RotateCcw aria-hidden="true" size={16} />
              {reactivando ? 'Reactivando...' : 'Reactivar'}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
