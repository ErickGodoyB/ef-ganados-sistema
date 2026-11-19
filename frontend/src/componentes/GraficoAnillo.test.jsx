import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import GraficoAnillo from './GraficoAnillo'

const ITEMS = [
  { etiqueta: 'Lote A', valor: 6 },
  { etiqueta: 'Lote B', valor: 3 },
  { etiqueta: 'Lote C', valor: 1 },
]

describe('GraficoAnillo', () => {
  it('es una imagen con un aria-label que resume los datos y el total', () => {
    render(<GraficoAnillo titulo="Animales por lote" items={ITEMS} />)

    expect(screen.getByRole('img', { name: /Animales por lote: Lote A 6 \(60 %\), Lote B 3 \(30 %\), Lote C 1 \(10 %\)\. Total: 10 animales\./ })).toBeInTheDocument()
  })

  it('la leyenda trae cada etiqueta con su número y su porcentaje', () => {
    render(<GraficoAnillo titulo="Animales por lote" items={ITEMS} />)

    const leyenda = screen.getByRole('list')
    const entradas = within(leyenda).getAllByRole('listitem').map((item) => item.textContent)
    expect(entradas).toEqual(['Lote A6 (60 %)', 'Lote B3 (30 %)', 'Lote C1 (10 %)'])
  })

  it('muestra el total en el centro', () => {
    const { container } = render(<GraficoAnillo titulo="Animales por lote" items={ITEMS} />)

    expect(container.querySelector('.grafico-anillo-total')).toHaveTextContent('10')
    expect(container.querySelector('.grafico-anillo-total-etiqueta')).toHaveTextContent('animales')
  })

  it('cada porción usa el color de serie de su posición, y "Otros" el suyo', () => {
    const { container } = render(
      <GraficoAnillo
        titulo="Animales por lote"
        items={[
          { etiqueta: 'A', valor: 3 },
          { etiqueta: 'B', valor: 2 },
          { etiqueta: 'Otros', valor: 1, esOtros: true },
        ]}
      />,
    )

    const rellenos = [...container.querySelectorAll('path')].map((camino) => camino.getAttribute('fill'))
    expect(rellenos).toEqual(['var(--serie-1)', 'var(--serie-2)', 'var(--serie-otros)'])
  })

  it('con un solo dato dibuja un anillo completo (dos circunferencias) y su leyenda al 100 %', () => {
    const { container } = render(<GraficoAnillo titulo="Animales por lote" items={[{ etiqueta: 'Único', valor: 4 }]} />)

    const caminos = container.querySelectorAll('path')
    expect(caminos).toHaveLength(1)
    expect(caminos[0].getAttribute('d').match(/Z/g)).toHaveLength(2)
    expect(screen.getByText('4 (100 %)')).toBeInTheDocument()
  })

  it('por defecto la leyenda omite las porciones en 0, y con mostrarCeros las muestra', () => {
    const items = [
      { etiqueta: 'Aptos', valor: 0 },
      { etiqueta: 'No aptos', valor: 5 },
    ]
    const { rerender } = render(<GraficoAnillo titulo="Aptos" items={items} />)
    expect(screen.queryByText('Aptos')).not.toBeInTheDocument()

    rerender(<GraficoAnillo titulo="Aptos" items={items} mostrarCeros />)

    expect(screen.getByText('Aptos')).toBeInTheDocument()
    expect(screen.getByText('0 (0 %)')).toBeInTheDocument()
  })

  it('sin datos muestra el mensaje de vacío y no dibuja el anillo', () => {
    render(<GraficoAnillo titulo="Animales por lote" items={[]} mensajeVacio="No hay animales." />)

    expect(screen.getByText('No hay animales.')).toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
})
