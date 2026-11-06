import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TarjetaSesion from './TarjetaSesion'

const SESION = {
  fecha: '2026-10-29',
  subGrupoId: 3,
  subGrupoDescripcion: 'Recría',
  grupoDescripcion: 'Campo Norte',
  cantidad: 2,
  total: 400,
  promedio: 200,
  minimo: 190,
  maximo: 210,
}

describe('TarjetaSesion', () => {
  it('muestra el código de sesión como primer dato de la tarjeta, antes de la fecha', () => {
    render(<TarjetaSesion sesion={SESION} columnasVisibles={{ codigo: true }} onAbrirDetalle={vi.fn()} />)

    const tarjeta = screen.getByText('S-261029-3').closest('article')
    const primerHijo = tarjeta.firstElementChild
    expect(primerHijo).toHaveTextContent('S-261029-3')
    expect(screen.getByRole('button', { name: /Ver detalle de la sesión del 29\/10\/2026/ })).toBeInTheDocument()
  })

  it('no muestra el código si la columna está oculta', () => {
    render(<TarjetaSesion sesion={SESION} columnasVisibles={{ codigo: false }} onAbrirDetalle={vi.fn()} />)
    expect(screen.queryByText('S-261029-3')).not.toBeInTheDocument()
  })
})
