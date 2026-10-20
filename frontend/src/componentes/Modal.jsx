/**
 * Modal genérico y reutilizable: diálogo accesible (role="dialog",
 * aria-modal, aria-labelledby con el título), con trampa de foco, cierre
 * con Escape y con clic en el fondo oscurecido, el foco vuelve al elemento
 * que lo abrió (refDisparador) cuando se cierra, y bloquea el scroll del
 * fondo mientras está montado. No tiene una prop "abierto": estar montado
 * ya significa estar abierto, así que quien lo usa decide cuándo mostrarlo
 * montándolo o desmontándolo (ver ModalNuevoAnimal.jsx). En celular ocupa
 * casi toda la pantalla (hoja inferior); en escritorio queda centrado con
 * un ancho máximo de ~32rem (ver Modal.css).
 */

import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import './Modal.css'

export default function Modal({ titulo, onCerrar, refDisparador, children }) {
  const idTitulo = useId()
  const refPanel = useRef(null)

  // onCerrar se guarda en un ref (actualizado en este efecto chico) para
  // que el efecto grande de abajo pueda leer siempre la versión más nueva
  // sin tener que reiniciar la trampa de foco (y sin volver a robar el
  // foco al primer campo) en cada render de quien usa el modal.
  const refOnCerrar = useRef(onCerrar)
  useEffect(() => {
    refOnCerrar.current = onCerrar
  }, [onCerrar])

  useEffect(() => {
    // Se copia ahora, no se lee de nuevo en el cleanup: para entonces el
    // modal ya se está desmontando y, si refDisparador apunta a un nodo
    // que React también está por desmontar/reemplazar, ".current" podría
    // no ser el mismo que cuando se abrió el modal.
    const disparador = refDisparador?.current
    const overflowPrevio = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function elementosFocables() {
      if (!refPanel.current) {
        return []
      }
      return Array.from(
        refPanel.current.querySelectorAll(
          'a[href], button:not(:disabled), select:not(:disabled), input:not(:disabled), textarea:not(:disabled)',
        ),
      )
    }

    // Foco inicial al abrirse. Si el contenido todavía no tiene nada
    // enfocable (ej. está cargando datos), no hay nada para enfocar
    // todavía; quien use el modal puede enfocar su primer campo cuando
    // esté listo (ver el efecto de ModalNuevoAnimal que espera "cargando").
    elementosFocables()[0]?.focus()

    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        refOnCerrar.current()
        return
      }
      if (evento.key !== 'Tab') {
        return
      }
      // Se vuelve a consultar en cada Tab (no una sola vez al abrir) porque
      // el contenido puede cambiar mientras el modal está abierto (ej. de
      // "cargando" al formulario real).
      const focables = elementosFocables()
      if (focables.length === 0) {
        return
      }
      const primero = focables[0]
      const ultimo = focables[focables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alPresionarTecla)

    return () => {
      document.removeEventListener('keydown', alPresionarTecla)
      document.body.style.overflow = overflowPrevio
      disparador?.focus()
    }
    // Solo al montar/desmontar (ver comentario del ref de arriba sobre
    // onCerrar); refDisparador es un ref estable (no cambia de identidad).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="modal-fondo" onClick={() => refOnCerrar.current()}>
      <div
        ref={refPanel}
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(evento) => evento.stopPropagation()}
      >
        <div className="modal-encabezado">
          <h2 id={idTitulo} className="modal-titulo">
            {titulo}
          </h2>
          {/* Mismo cierre que Escape/el fondo (refOnCerrar.current), nada
              nuevo: solo una forma visible más de disparar lo mismo. */}
          <button type="button" className="modal-boton-cerrar" aria-label="Cerrar" onClick={() => refOnCerrar.current()}>
            <X aria-hidden="true" size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
