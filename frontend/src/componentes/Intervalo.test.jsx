import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import Intervalo from './Intervalo'

/** Envoltura controlada: Intervalo espera desde/hasta/onCambiar manejados por quien lo usa. */
function IntervaloControlado({ onCambiar }) {
  const [rango, setRango] = useState({ desde: '', hasta: '' })
  function cambiar(nuevo) {
    setRango(nuevo)
    onCambiar?.(nuevo)
  }
  return <Intervalo desde={rango.desde} hasta={rango.hasta} onCambiar={cambiar} />
}

describe('Intervalo', () => {
  it('muestra la etiqueta por defecto cuando no hay rango aplicado', () => {
    render(<Intervalo desde="" hasta="" onCambiar={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Intervalo' })).toBeInTheDocument()
  })

  it('muestra el rango aplicado en el botón (dd/mm – dd/mm, sin año) y el botón de limpiar', () => {
    render(<Intervalo desde="2026-10-01" hasta="2026-10-29" onCambiar={vi.fn()} />)
    expect(screen.getByRole('button', { name: '01/10 – 29/10' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Quitar el filtro de intervalo' })).toBeInTheDocument()
  })

  it('abre el panel con aria-expanded y foco en el primer elemento (el atajo "Hoy")', async () => {
    const usuario = userEvent.setup()
    render(<Intervalo desde="" hasta="" onCambiar={vi.fn()} />)
    const boton = screen.getByRole('button', { name: 'Intervalo' })
    await usuario.click(boton)
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Hoy' })).toHaveFocus()
  })

  it('Escape cierra el panel y devuelve el foco al botón', async () => {
    const usuario = userEvent.setup()
    render(<Intervalo desde="" hasta="" onCambiar={vi.fn()} />)
    const boton = screen.getByRole('button', { name: 'Intervalo' })
    await usuario.click(boton)
    await usuario.keyboard('{Escape}')
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveFocus()
  })

  it('un atajo completa Desde/Hasta y "Aplicar" confirma el rango', async () => {
    const usuario = userEvent.setup()
    const onCambiar = vi.fn()
    render(<IntervaloControlado onCambiar={onCambiar} />)
    await usuario.click(screen.getByRole('button', { name: 'Intervalo' }))
    await usuario.click(screen.getByRole('button', { name: 'Hoy' }))
    await usuario.click(screen.getByRole('button', { name: 'Aplicar' }))
    expect(onCambiar).toHaveBeenCalledTimes(1)
    const [rango] = onCambiar.mock.calls[0]
    expect(rango.desde).toBe(rango.hasta)
  })

  it('"Limpiar" vacía el rango y lo avisa de inmediato', async () => {
    const usuario = userEvent.setup()
    const onCambiar = vi.fn()
    render(<IntervaloControlado onCambiar={onCambiar} />)
    await usuario.click(screen.getByRole('button', { name: 'Intervalo' }))
    await usuario.click(screen.getByRole('button', { name: 'Hoy' }))
    await usuario.click(screen.getByRole('button', { name: 'Limpiar' }))
    expect(onCambiar).toHaveBeenCalledWith({ desde: '', hasta: '' })
  })

  it('con Desde posterior a Hasta, muestra el error y deshabilita "Aplicar"', async () => {
    const usuario = userEvent.setup()
    render(<Intervalo desde="" hasta="" onCambiar={vi.fn()} />)
    await usuario.click(screen.getByRole('button', { name: 'Intervalo' }))

    const campoDesde = screen.getByLabelText('Desde')
    const campoHasta = screen.getByLabelText('Hasta')
    await usuario.type(campoHasta, '2026-10-01')
    await usuario.type(campoDesde, '2026-10-29')

    expect(screen.getByRole('alert')).toHaveTextContent('La fecha Desde no puede ser posterior a Hasta')
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('el botón "x" de limpiar llama a onCambiar con un rango vacío sin abrir el panel', async () => {
    const usuario = userEvent.setup()
    const onCambiar = vi.fn()
    render(<Intervalo desde="2026-10-01" hasta="2026-10-29" onCambiar={onCambiar} />)
    await usuario.click(screen.getByRole('button', { name: 'Quitar el filtro de intervalo' }))
    expect(onCambiar).toHaveBeenCalledWith({ desde: '', hasta: '' })
  })
})
