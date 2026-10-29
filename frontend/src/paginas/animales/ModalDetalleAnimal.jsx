/**
 * Modal de detalle de un animal (RF010 ampliado): muestra sus datos
 * completos y, desde el mismo <Modal> (sin apilar varios), permite pasar a
 * "Editar" (reutiliza FormularioAnimal en modo "editar") o a "Eliminar"
 * (confirmación chica dentro del mismo panel). Un solo Modal montado para
 * las tres vistas evita que, si hubiera dos <Modal> apilados, ambos
 * reaccionen al mismo Escape (cada uno agrega su propio listener de
 * teclado al document) o compitan por la trampa de foco.
 */

import { Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ErrorHttp, peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import ValorGmd from '../../componentes/ValorGmd'
import { formatearFecha, formatearPeso } from '../../utilidades/formato'
import EstadoBadge from './EstadoBadge'
import FormularioAnimal from './FormularioAnimal'
import './ModalDetalleAnimal.css'

const TITULOS = {
  detalle: 'Detalle del animal',
  editar: 'Editar animal',
  eliminar: 'Eliminar animal',
}

/** Texto del lote: "Lote — Grupo" para distinguir lotes del mismo nombre en grupos distintos, o "Sin lote". */
function textoLote(animal) {
  if (!animal.subGrupoDescripcion) {
    return 'Sin lote'
  }
  return animal.grupoDescripcion ? `${animal.subGrupoDescripcion} — ${animal.grupoDescripcion}` : animal.subGrupoDescripcion
}

export default function ModalDetalleAnimal({ animal, onCerrar, onActualizado, onEliminado, onYaNoExiste, refDisparador }) {
  const [vista, setVista] = useState('detalle')
  const [eliminando, setEliminando] = useState(false)
  const [errorEliminar, setErrorEliminar] = useState('')

  const refFormulario = useRef(null)
  const refBotonCancelarEliminar = useRef(null)

  // Al entrar a "eliminar", el foco pasa a "Cancelar" (la opción segura
  // por defecto para una acción destructiva), no a "Eliminar".
  useEffect(() => {
    if (vista === 'eliminar') {
      refBotonCancelarEliminar.current?.focus()
    }
  }, [vista])

  function volverADetalle() {
    setVista('detalle')
    setErrorEliminar('')
  }

  // Escape o clic en el fondo: en "editar" se delega en FormularioAnimal
  // (respeta la misma confirmación que su botón Cancelar si hay datos sin
  // guardar); en "eliminar" vuelve al detalle en vez de cerrar todo; en
  // "detalle" cierra el modal.
  function manejarCierre() {
    if (vista === 'editar') {
      refFormulario.current?.solicitarCierre()
      return
    }
    if (vista === 'eliminar') {
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

  const sinPesajes = animal.cantidadPesajes === 0
  const avisoNoEliminable = `Tiene ${animal.cantidadPesajes} pesajes registrados: no se puede eliminar`

  return (
    <Modal titulo={TITULOS[vista]} onCerrar={manejarCierre} refDisparador={refDisparador}>
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
                <EstadoBadge apto={animal.aptoVenta} />
              </dd>
            </div>
            <div className="detalle-animal-dato">
              <dt>Pesajes registrados</dt>
              <dd>{animal.cantidadPesajes}</dd>
            </div>
            <div className="detalle-animal-dato detalle-animal-dato--ancho">
              <dt>Observación</dt>
              <dd>{animal.aniObservacion || 'Sin observaciones'}</dd>
            </div>
          </dl>

          <div className="detalle-animal-acciones">
            <button type="button" className="boton-secundario" onClick={() => setVista('editar')}>
              <Pencil aria-hidden="true" size={16} />
              Editar
            </button>
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
              ref={refBotonCancelarEliminar}
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
    </Modal>
  )
}
