/**
 * Botón "Exportar" de los listados: ícono de descarga y texto. Mismo alto
 * táctil (44 px) que el resto de los botones de acción; quien lo usa decide
 * qué hace al tocarlo (abrir ModalExportar) y recibe el evento para guardar
 * el botón como disparador (el modal le devuelve el foco al cerrarse).
 */

import { Download } from 'lucide-react'

export default function BotonExportar({ onClick, disabled = false }) {
  return (
    <button type="button" className="boton boton-secundario boton-exportar" onClick={onClick} disabled={disabled}>
      <Download aria-hidden="true" size={18} />
      Exportar
    </button>
  )
}
