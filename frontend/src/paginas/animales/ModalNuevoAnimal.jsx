/**
 * Modal de "Nuevo animal" (RF001): envuelve FormularioAnimal (que hace
 * todo el trabajo real: campos, validación, altas rápidas de Raza/Lote y
 * el POST) dentro del Modal genérico. Delega el cierre por Escape o clic
 * en el fondo al propio formulario (vía su ref), para que respete la
 * misma confirmación que su botón "Cancelar" cuando hay datos sin
 * guardar, sin que Modal tenga que saber nada de formularios.
 */

import { useRef } from 'react'
import Modal from '../../componentes/Modal'
import FormularioAnimal from './FormularioAnimal'

export default function ModalNuevoAnimal({ onCerrar, onGuardado, refDisparador }) {
  const refFormulario = useRef(null)

  /** "Guardar" cierra el modal; "Guardar y agregar otro" (continuar: true) lo deja abierto. */
  function alGuardar(animalCreado, { continuar }) {
    onGuardado(animalCreado)
    if (!continuar) {
      onCerrar()
    }
  }

  return (
    <Modal titulo="Nuevo animal" onCerrar={() => refFormulario.current?.solicitarCierre()} refDisparador={refDisparador}>
      <FormularioAnimal ref={refFormulario} modo="crear" alGuardar={alGuardar} alCancelar={onCerrar} />
    </Modal>
  )
}
