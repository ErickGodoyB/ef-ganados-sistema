import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ValorGmd from './ValorGmd'

describe('ValorGmd', () => {
  it('muestra solo "—" si gmd es null, sin ícono ni texto de pérdida', () => {
    render(<ValorGmd gmd={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/Pérdida de peso/i)).not.toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('muestra solo "—" si gmd es undefined (animal sin pesaje anterior), sin la flecha', () => {
    render(<ValorGmd gmd={undefined} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('muestra el valor formateado con la unidad para un valor positivo, sin ícono', () => {
    render(<ValorGmd gmd={1.5} />)
    expect(screen.getByText('1,50 kg/día')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('para un valor negativo muestra el ícono y el texto accesible "Pérdida de peso"', () => {
    render(<ValorGmd gmd={-0.3} />)
    expect(screen.getByText('-0,30 kg/día')).toBeInTheDocument()
    expect(screen.getByText(/Pérdida de peso/i)).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeInTheDocument()
  })

  it('un gmd de 0 (no negativo) no muestra el ícono de pérdida', () => {
    render(<ValorGmd gmd={0} />)
    expect(screen.getByText('0,00 kg/día')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })
})
