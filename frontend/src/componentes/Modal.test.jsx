import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

/**
 * El modal de arriba siempre se abre DESPUÉS que el de abajo (ej. "Exportar"
 * desde el detalle de una sesión), así que los tests lo montan en un segundo
 * render, como pasa en la app.
 */
function Externo({ onCerrarExterno, onCerrarInterno, conInterno }) {
  return (
    <Modal titulo="Externo" onCerrar={onCerrarExterno}>
      <button type="button">Botón externo</button>
      {conInterno && (
        <Modal titulo="Interno" onCerrar={onCerrarInterno}>
          <button type="button">Botón interno</button>
        </Modal>
      )}
    </Modal>
  )
}

describe('Modal anidado (pila de modales)', () => {
  it('Escape solo cierra el modal de arriba', async () => {
    const usuario = userEvent.setup()
    const onCerrarExterno = vi.fn()
    const onCerrarInterno = vi.fn()
    const { rerender } = render(<Externo onCerrarExterno={onCerrarExterno} onCerrarInterno={onCerrarInterno} />)
    rerender(<Externo onCerrarExterno={onCerrarExterno} onCerrarInterno={onCerrarInterno} conInterno />)
    expect(screen.getAllByRole('dialog')).toHaveLength(2)

    await usuario.keyboard('{Escape}')

    expect(onCerrarInterno).toHaveBeenCalledTimes(1)
    expect(onCerrarExterno).not.toHaveBeenCalled()
  })

  it('al desmontarse el de arriba, Escape vuelve a cerrar el de abajo', async () => {
    const usuario = userEvent.setup()
    const onCerrarExterno = vi.fn()
    const { rerender } = render(<Externo onCerrarExterno={onCerrarExterno} onCerrarInterno={vi.fn()} />)
    rerender(<Externo onCerrarExterno={onCerrarExterno} onCerrarInterno={vi.fn()} conInterno />)

    rerender(<Externo onCerrarExterno={onCerrarExterno} onCerrarInterno={vi.fn()} />)
    await usuario.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: 'Interno' })).not.toBeInTheDocument()
    expect(onCerrarExterno).toHaveBeenCalledTimes(1)
  })

  it('un modal solo sigue cerrándose con Escape como siempre', async () => {
    const usuario = userEvent.setup()
    const onCerrar = vi.fn()
    render(
      <Modal titulo="Solo" onCerrar={onCerrar}>
        <button type="button">Botón</button>
      </Modal>,
    )

    await usuario.keyboard('{Escape}')

    expect(onCerrar).toHaveBeenCalledTimes(1)
  })
})
