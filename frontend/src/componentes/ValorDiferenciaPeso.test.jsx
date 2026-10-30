import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ValorDiferenciaPeso from './ValorDiferenciaPeso'

describe('ValorDiferenciaPeso', () => {
  it('muestra "—" si la diferencia es null, sin ícono', () => {
    render(<ValorDiferenciaPeso diferencia={null} />)
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('muestra el valor positivo formateado, sin ícono', () => {
    render(<ValorDiferenciaPeso diferencia={20} />)
    expect(screen.getByText('20,0 kg')).toBeInTheDocument()
    expect(document.querySelector('svg')).not.toBeInTheDocument()
  })

  it('para un valor negativo muestra el ícono y el texto accesible "Pérdida de peso"', () => {
    render(<ValorDiferenciaPeso diferencia={-15} />)
    expect(screen.getByText('-15,0 kg')).toBeInTheDocument()
    expect(screen.getByText(/Pérdida de peso/i)).toBeInTheDocument()
    expect(document.querySelector('svg')).toBeInTheDocument()
  })
})
