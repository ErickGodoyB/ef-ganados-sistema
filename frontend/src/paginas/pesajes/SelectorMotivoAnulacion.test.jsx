import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SelectorMotivoAnulacion from './SelectorMotivoAnulacion'

describe('SelectorMotivoAnulacion', () => {
  it('un chip de motivo frecuente completa el texto', async () => {
    const usuario = userEvent.setup()
    const onCambiarMotivo = vi.fn()
    render(<SelectorMotivoAnulacion id="motivo-1" motivo="" onCambiarMotivo={onCambiarMotivo} />)

    await usuario.click(screen.getByRole('button', { name: 'Error de carga' }))
    expect(onCambiarMotivo).toHaveBeenCalledWith('Error de carga')
  })

  it('el chip "Otro" vacía el campo para escribir uno propio', async () => {
    const usuario = userEvent.setup()
    const onCambiarMotivo = vi.fn()
    render(<SelectorMotivoAnulacion id="motivo-1" motivo="Error de carga" onCambiarMotivo={onCambiarMotivo} />)

    await usuario.click(screen.getByRole('button', { name: 'Otro' }))
    expect(onCambiarMotivo).toHaveBeenCalledWith('')
  })

  it('escribir en el textarea llama a onCambiarMotivo con el texto', async () => {
    const usuario = userEvent.setup()
    const onCambiarMotivo = vi.fn()
    render(<SelectorMotivoAnulacion id="motivo-1" motivo="" onCambiarMotivo={onCambiarMotivo} />)

    await usuario.type(screen.getByLabelText('Motivo de la anulación'), 'x')
    expect(onCambiarMotivo).toHaveBeenCalledWith('x')
  })

  it('muestra el error cuando se pasa', () => {
    render(<SelectorMotivoAnulacion id="motivo-1" motivo="ab" onCambiarMotivo={vi.fn()} error="Motivo muy corto" />)
    expect(screen.getByRole('alert')).toHaveTextContent('Motivo muy corto')
  })
})
