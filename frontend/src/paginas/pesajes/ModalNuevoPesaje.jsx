/**
 * Modal "Nuevo pesaje" (RF002/RF011): una sola instancia de Modal (tamano
 * "grande") con tres vistas posibles: las pestañas "Por lote"/"Individual"
 * (la vista normal), o el alta rápida de un animal que no existe todavía
 * (FormularioAnimal en modo "crear", como otra vista del mismo modal, ver
 * ModalDetalleAnimal.jsx para el mismo criterio con un animal existente).
 *
 * Los animales (TODOS, sin filtrar por salida/ingreso/lote acá) se traen
 * una sola vez y se comparten entre las dos pestañas por props, en vez de
 * que cada una pida lo mismo por su cuenta; cada pestaña filtra sus propios
 * elegibles (ver utilidades/elegibilidadPesaje.js) según su fecha y lote.
 * Se necesita la lista completa (no solo los elegibles) para poder avisar
 * el motivo cuando se escribe la caravana de un animal que existe pero no
 * sirve para esta fecha/lote, en vez de ofrecer registrarlo de nuevo. Las
 * dos pestañas quedan siempre montadas (una oculta con el atributo
 * "hidden", no desmontada): así cambiar de pestaña nunca pierde lo que se
 * estaba cargando en la otra.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { peticionProtegida } from '../../api/cliente'
import Modal from '../../componentes/Modal'
import FormularioAnimal from '../animales/FormularioAnimal'
import './ModalNuevoPesaje.css'
import PestanaIndividual from './PestanaIndividual'
import PestanaPorLote from './PestanaPorLote'

const TITULOS = {
  tabs: 'Nuevo pesaje',
  'alta-rapida': 'Registrar animal nuevo',
}

export default function ModalNuevoPesaje({ onCerrar, onGuardado, onGuardadoParcial, refDisparador }) {
  const [vista, setVista] = useState('tabs')
  const [pestanaActiva, setPestanaActiva] = useState('lote')

  const [animales, setAnimales] = useState([])
  const [cargandoAnimales, setCargandoAnimales] = useState(true)
  const [errorAnimales, setErrorAnimales] = useState('')

  // Quién pidió el alta rápida (para saber a qué pestaña volver) y con qué
  // datos precargar el formulario (caravana escrita, lote y fecha del
  // pesaje, y el peso si ya lo habían escrito).
  const [origenAltaRapida, setOrigenAltaRapida] = useState(null)
  const [datosAltaRapida, setDatosAltaRapida] = useState(null)
  // El animal recién creado, para que la pestaña de origen lo preseleccione
  // en su buscador apenas vuelve a mostrarse (ver el useEffect de cada
  // pestaña que consume esto y avisa de vuelta con onConsumidaPreseleccion).
  const [animalParaPreseleccionar, setAnimalParaPreseleccionar] = useState(null)

  const refTabLote = useRef(null)
  const refTabIndividual = useRef(null)
  const refFormularioAltaRapida = useRef(null)
  const refPestanaLote = useRef(null)

  const cargarAnimales = useCallback(async () => {
    setCargandoAnimales(true)
    setErrorAnimales('')
    try {
      const datos = await peticionProtegida('/api/animales/resumen')
      const todos = datos ?? []
      setAnimales(todos)
      return todos
    } catch {
      setErrorAnimales('No se pudieron cargar los animales.')
      return null
    } finally {
      setCargandoAnimales(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    cargarAnimales()
  }, [cargarAnimales])

  useEffect(() => {
    if (vista === 'tabs') {
      (pestanaActiva === 'lote' ? refTabLote : refTabIndividual).current?.focus()
    }
  }, [vista, pestanaActiva])

  /** Flechas izquierda/derecha alternan entre las dos pestañas y mueven el foco con ellas (patrón ARIA tablist). */
  function manejarTeclaTab(evento) {
    if (evento.key === 'ArrowRight' || evento.key === 'ArrowLeft') {
      evento.preventDefault()
      setPestanaActiva((actual) => (actual === 'lote' ? 'individual' : 'lote'))
    }
  }

  /** Pedido de alta rápida desde cualquiera de las dos pestañas: cambia a esa vista con los datos que ya se habían cargado. */
  function iniciarAltaRapida(pestana, datos) {
    setOrigenAltaRapida(pestana)
    setDatosAltaRapida(datos)
    setVista('alta-rapida')
  }

  /** Vuelve a la pestaña de origen sin cambios (Cancelar del alta rápida). */
  function volverDeAltaRapida() {
    setVista('tabs')
    setPestanaActiva(origenAltaRapida)
  }

  /**
   * El animal se guardó: refresca la lista de elegibles (así aparece con
   * los datos reales, ej. pesoActual = peso inicial) y vuelve a la pestaña
   * que lo pidió con ese animal ya preseleccionado.
   */
  async function alGuardarAltaRapida(animalCreado) {
    const lista = await cargarAnimales()
    const encontrado = lista?.find((animal) => animal.aniCaravana === animalCreado.aniCaravana) ?? null
    setAnimalParaPreseleccionar(encontrado ? { pestana: origenAltaRapida, animal: encontrado } : null)
    setVista('tabs')
    setPestanaActiva(origenAltaRapida)
  }

  const limpiarPreseleccion = useCallback(() => setAnimalParaPreseleccionar(null), [])

  /** Escape/clic en el fondo/botón X: según la vista, delega en quien sabe si hay algo que perder. */
  function manejarCierre() {
    if (vista === 'alta-rapida') {
      refFormularioAltaRapida.current?.solicitarCierre()
      return
    }
    if (pestanaActiva === 'lote') {
      refPestanaLote.current?.solicitarCierre()
      return
    }
    onCerrar()
  }

  return (
    <Modal titulo={TITULOS[vista]} onCerrar={manejarCierre} refDisparador={refDisparador} tamano="grande">
      {vista === 'tabs' && (
        <>
          <div role="tablist" aria-label="Tipo de carga de pesajes" className="modal-nuevo-pesaje-tabs">
            <button
              type="button"
              ref={refTabLote}
              role="tab"
              id="nuevo-pesaje-tab-lote"
              aria-selected={pestanaActiva === 'lote'}
              aria-controls="nuevo-pesaje-panel-lote"
              tabIndex={pestanaActiva === 'lote' ? 0 : -1}
              className={`modal-nuevo-pesaje-tab${pestanaActiva === 'lote' ? ' modal-nuevo-pesaje-tab--activa' : ''}`}
              onClick={() => setPestanaActiva('lote')}
              onKeyDown={manejarTeclaTab}
            >
              Por lote
            </button>
            <button
              type="button"
              ref={refTabIndividual}
              role="tab"
              id="nuevo-pesaje-tab-individual"
              aria-selected={pestanaActiva === 'individual'}
              aria-controls="nuevo-pesaje-panel-individual"
              tabIndex={pestanaActiva === 'individual' ? 0 : -1}
              className={`modal-nuevo-pesaje-tab${pestanaActiva === 'individual' ? ' modal-nuevo-pesaje-tab--activa' : ''}`}
              onClick={() => setPestanaActiva('individual')}
              onKeyDown={manejarTeclaTab}
            >
              Individual
            </button>
          </div>

          <div
            role="tabpanel"
            id="nuevo-pesaje-panel-lote"
            aria-labelledby="nuevo-pesaje-tab-lote"
            hidden={pestanaActiva !== 'lote'}
          >
            <PestanaPorLote
              ref={refPestanaLote}
              animales={animales}
              cargandoAnimales={cargandoAnimales}
              errorAnimales={errorAnimales}
              animalParaPreseleccionar={animalParaPreseleccionar}
              onConsumidaPreseleccion={limpiarPreseleccion}
              onRegistrarNuevo={(datos) => iniciarAltaRapida('lote', datos)}
              onCerrar={onCerrar}
              onGuardado={onGuardado}
            />
          </div>

          <div
            role="tabpanel"
            id="nuevo-pesaje-panel-individual"
            aria-labelledby="nuevo-pesaje-tab-individual"
            hidden={pestanaActiva !== 'individual'}
          >
            <PestanaIndividual
              animales={animales}
              cargandoAnimales={cargandoAnimales}
              errorAnimales={errorAnimales}
              animalParaPreseleccionar={animalParaPreseleccionar}
              onConsumidaPreseleccion={limpiarPreseleccion}
              onRegistrarNuevo={(datos) => iniciarAltaRapida('individual', datos)}
              onGuardado={onGuardado}
              onGuardadoParcial={onGuardadoParcial}
            />
          </div>
        </>
      )}

      {vista === 'alta-rapida' && (
        <FormularioAnimal
          ref={refFormularioAltaRapida}
          modo="crear"
          valoresIniciales={{
            aniCaravana: datosAltaRapida?.caravana,
            subGrupoId: datosAltaRapida?.subGrupoId,
            aniFechaIngreso: datosAltaRapida?.fecha,
            aniPesoInicial: datosAltaRapida?.pesoInicial,
          }}
          alGuardar={alGuardarAltaRapida}
          alCancelar={volverDeAltaRapida}
        />
      )}
    </Modal>
  )
}
