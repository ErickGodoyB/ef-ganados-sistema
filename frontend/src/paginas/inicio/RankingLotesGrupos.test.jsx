import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { GRUPOS, LOTES, RESUMEN } from './datosDePrueba'
import RankingLotesGrupos from './RankingLotesGrupos'

function renderizar(resumen = RESUMEN) {
  return render(<RankingLotesGrupos resumen={resumen} />)
}

function filasDeLaTabla() {
  return within(screen.getByRole('table')).getAllByRole('row').slice(1)
}

describe('Ranking de lotes y grupos', () => {
  it('arranca en Lotes, en el orden que manda el servidor, con el grupo bajo el nombre', () => {
    renderizar()

    expect(screen.getByRole('button', { name: 'Lotes' })).toHaveAttribute('aria-pressed', 'true')
    const filas = filasDeLaTabla()
    expect(filas).toHaveLength(3)
    expect(within(filas[0]).getByRole('rowheader')).toHaveTextContent('Lote BCría')
    expect(within(filas[1]).getByRole('rowheader')).toHaveTextContent('Lote ACría')
    expect(within(filas[2]).getByRole('rowheader')).toHaveTextContent('Sin lote')
  })

  it('muestra animales, peso promedio y GMD promedio, con "—" si no hay dato', () => {
    renderizar()

    const filas = filasDeLaTabla()
    const primera = within(filas[0]).getAllByRole('cell').map((celda) => celda.textContent)
    expect(primera[0]).toBe('5')
    expect(primera[1]).toBe('310,0 kg')
    expect(primera[2]).toBe('1,20 kg/día')
    const sinDatos = within(filas[2]).getAllByRole('cell').map((celda) => celda.textContent)
    expect(sinDatos).toEqual(['3', '—', '—'])
  })

  it('las dos tarjetas destacadas muestran el mayor peso promedio y la mayor GMD', () => {
    renderizar()

    const peso = screen.getByText('Mayor peso promedio').closest('.ranking-destacado')
    expect(within(peso).getByText('Lote A')).toBeInTheDocument()
    expect(within(peso).getByText('420,0 kg')).toBeInTheDocument()
    const gmd = screen.getByText('Mayor GMD').closest('.ranking-destacado')
    expect(within(gmd).getByText('Lote B')).toBeInTheDocument()
    expect(within(gmd).getByText('1,20 kg/día')).toBeInTheDocument()
  })

  it('con empate en el máximo o sin datos, el destacado es "—"', () => {
    const empatados = [
      { ...LOTES[0], pesoPromedio: 400, gmdPromedio: null },
      { ...LOTES[1], pesoPromedio: 400, gmdPromedio: null },
    ]
    renderizar({ ...RESUMEN, lotes: empatados })

    const peso = screen.getByText('Mayor peso promedio').closest('.ranking-destacado')
    expect(within(peso).getAllByText('—')).toHaveLength(2)
    const gmd = screen.getByText('Mayor GMD').closest('.ranking-destacado')
    expect(within(gmd).getAllByText('—')).toHaveLength(2)
  })

  it('la barra es proporcional al mayor GMD, decorativa, y no hay barra sin dato', () => {
    const { container } = renderizar()

    const tabla = container.querySelector('.ranking-tabla')
    const anchos = [...tabla.querySelectorAll('.barra-gmd-relleno')].map((barra) => barra.style.width)
    expect(anchos[0]).toBe('100%')
    expect(parseFloat(anchos[1])).toBeCloseTo((0.9 / 1.2) * 100)
    expect(anchos[2]).toBe('0%')
    expect(tabla.querySelector('.barra-gmd-pista')).toHaveAttribute('aria-hidden', 'true')
  })

  it('una GMD negativa se escribe con su signo y deja la barra en 0', () => {
    const { container } = renderizar({
      ...RESUMEN,
      lotes: [{ ...LOTES[0], gmdPromedio: 0.5 }, { ...LOTES[1], gmdPromedio: -0.3 }],
    })

    const tabla = container.querySelector('.ranking-tabla')
    expect(within(tabla).getByText('-0,30 kg/día')).toBeInTheDocument()
    const anchos = [...tabla.querySelectorAll('.barra-gmd-relleno')].map((barra) => barra.style.width)
    expect(anchos[1]).toBe('0%')
  })

  it('el selector pasa a Grupos, con su columna de lotes y la fila "Sin lote"', async () => {
    const usuario = userEvent.setup()
    renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Grupos' }))

    expect(screen.getByRole('button', { name: 'Grupos' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(screen.getByRole('table')).getByRole('columnheader', { name: 'Lotes' })).toBeInTheDocument()
    const filas = filasDeLaTabla()
    expect(filas).toHaveLength(GRUPOS.length)
    const cria = within(filas[0]).getAllByRole('cell').map((celda) => celda.textContent)
    expect(cria).toEqual(['2', '9', '360,0 kg', '1,05 kg/día'])
    const destacado = screen.getByText('Mayor GMD').closest('.ranking-destacado')
    expect(within(destacado).getByText('Cría')).toBeInTheDocument()
  })

  it('las tarjetas de celular traen los mismos datos', () => {
    const { container } = renderizar()

    const tarjetas = container.querySelectorAll('.ranking-tarjeta')
    expect(tarjetas).toHaveLength(3)
    expect(within(tarjetas[0]).getByText('Lote B')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('1,20 kg/día')).toBeInTheDocument()
    expect(within(tarjetas[0]).getByText('310,0 kg')).toBeInTheDocument()
  })

  it('sin lotes muestra un mensaje de vacío', () => {
    renderizar({ ...RESUMEN, lotes: [], grupos: [] })

    expect(screen.getByText('No hay animales activos para comparar.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
