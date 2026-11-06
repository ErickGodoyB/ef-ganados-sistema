import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ValorPesoAnterior from './ValorPesoAnterior'

describe('ValorPesoAnterior', () => {
  it('muestra "—" si no hay peso anterior', () => {
    render(<ValorPesoAnterior pesoAnterior={null} pesoAnteriorEsIngreso={false} fechaPesoAnterior={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('ingreso')).not.toBeInTheDocument()
  })

  it('con un pesaje real anterior, muestra solo el peso, sin la etiqueta "ingreso"', () => {
    render(<ValorPesoAnterior pesoAnterior={200} pesoAnteriorEsIngreso={false} fechaPesoAnterior="2026-01-11" />)
    expect(screen.getByText('200,0 kg')).toBeInTheDocument()
    expect(screen.queryByText('ingreso')).not.toBeInTheDocument()
  })

  it('cuando el anterior es el ingreso, muestra el peso con la etiqueta "ingreso" y la fecha en el title/aria-label', () => {
    render(<ValorPesoAnterior pesoAnterior={200} pesoAnteriorEsIngreso fechaPesoAnterior="2026-01-01" />)
    expect(screen.getByText('200,0 kg')).toBeInTheDocument()
    const etiqueta = screen.getByText('ingreso')
    expect(etiqueta).toHaveAttribute('title', 'Es el peso de ingreso del animal, del 01/01/2026')
    expect(etiqueta).toHaveAttribute('aria-label', 'Es el peso de ingreso del animal, del 01/01/2026')
  })

  it('si pesoAnteriorEsIngreso todavía no llega del backend (undefined), no rompe: se trata como que no es el ingreso', () => {
    render(<ValorPesoAnterior pesoAnterior={200} pesoAnteriorEsIngreso={undefined} fechaPesoAnterior={undefined} />)
    expect(screen.getByText('200,0 kg')).toBeInTheDocument()
    expect(screen.queryByText('ingreso')).not.toBeInTheDocument()
  })
})
