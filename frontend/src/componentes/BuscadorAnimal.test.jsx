import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import BuscadorAnimal from './BuscadorAnimal'

const OPCIONES = [
  { id: 1, caravana: 'CAR-001', lote: 'Lote A', pesoActual: 200 },
  { id: 2, caravana: 'CAR-002', lote: 'Lote A', pesoActual: 220 },
  { id: 3, caravana: 'TEST-25', lote: null, pesoActual: 300 },
]

/** Envoltura controlada: BuscadorAnimal espera valor/alCambiarValor manejados por quien lo usa. */
function BuscadorControlado(props) {
  const [valor, setValor] = useState(props.valorInicial ?? '')
  return <BuscadorAnimal {...props} valor={valor} alCambiarValor={setValor} />
}

describe('BuscadorAnimal', () => {
  it('el ícono de lupa queda en el mismo contenedor con padding reservado (no se superpone al texto)', () => {
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={vi.fn()} textoSinResultados="Nada" />)
    const entrada = document.querySelector('.campo-busqueda-entrada')
    // El padding-left que separa el ícono del texto sale de .campo-busqueda--con-icono
    // (ver base.css); tiene que estar en el MISMO elemento que contiene el ícono y el
    // input (no en el input solo), porque la regla CSS es un selector descendiente.
    expect(entrada).toHaveClass('campo-busqueda--con-icono')
    expect(entrada?.querySelector('svg')).toBeInTheDocument()
    expect(entrada?.querySelector('input')).toBeInTheDocument()
  })

  it('muestra las opciones al enfocar el campo', async () => {
    const usuario = userEvent.setup()
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={vi.fn()} textoSinResultados="Nada" />)
    await usuario.click(screen.getByRole('combobox'))
    expect(screen.getByRole('option', { name: /CAR-001/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /TEST-25/ })).toBeInTheDocument()
  })

  it('filtra las opciones por el texto escrito, sin distinguir mayúsculas', async () => {
    const usuario = userEvent.setup()
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={vi.fn()} textoSinResultados="Nada" />)
    await usuario.type(screen.getByRole('combobox'), 'test')
    expect(screen.getByRole('option', { name: /TEST-25/ })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /CAR-001/ })).not.toBeInTheDocument()
  })

  it('muestra el mensaje de "sin resultados" cuando no hay coincidencias y no se pasó alNoEncontrado', async () => {
    const usuario = userEvent.setup()
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={vi.fn()} textoSinResultados="No hay animales con ese texto" />)
    await usuario.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.getByText('No hay animales con ese texto')).toBeInTheDocument()
  })

  it('flecha abajo mueve la opción activa y Enter la elige', async () => {
    const usuario = userEvent.setup()
    const alElegir = vi.fn()
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={alElegir} textoSinResultados="Nada" />)
    const campo = screen.getByRole('combobox')
    await usuario.click(campo)
    await usuario.keyboard('{ArrowDown}{Enter}')
    expect(alElegir).toHaveBeenCalledWith(OPCIONES[0])
  })

  it('Escape cierra la lista de opciones', async () => {
    const usuario = userEvent.setup()
    render(<BuscadorControlado label="Buscar" opciones={OPCIONES} alElegir={vi.fn()} textoSinResultados="Nada" />)
    const campo = screen.getByRole('combobox')
    await usuario.click(campo)
    expect(campo).toHaveAttribute('aria-expanded', 'true')
    await usuario.keyboard('{Escape}')
    expect(campo).toHaveAttribute('aria-expanded', 'false')
  })

  it('ofrece "Registrar animal nuevo" cuando no hay coincidencias y se pasó alNoEncontrado, y lo llama con el texto escrito', async () => {
    const usuario = userEvent.setup()
    const alNoEncontrado = vi.fn()
    render(
      <BuscadorControlado
        label="Buscar"
        opciones={OPCIONES}
        alElegir={vi.fn()}
        textoSinResultados="Nada"
        alNoEncontrado={alNoEncontrado}
      />,
    )
    await usuario.type(screen.getByRole('combobox'), 'NUEVO-99')
    const opcionNueva = screen.getByRole('option', { name: /Registrar animal nuevo «NUEVO-99»/ })
    await usuario.click(opcionNueva)
    expect(alNoEncontrado).toHaveBeenCalledWith('NUEVO-99')
  })

  it('no ofrece "Registrar animal nuevo" si hay coincidencias, aunque se haya pasado alNoEncontrado', async () => {
    const usuario = userEvent.setup()
    render(
      <BuscadorControlado
        label="Buscar"
        opciones={OPCIONES}
        alElegir={vi.fn()}
        textoSinResultados="Nada"
        alNoEncontrado={vi.fn()}
      />,
    )
    await usuario.type(screen.getByRole('combobox'), 'CAR-001')
    expect(screen.queryByText(/Registrar animal nuevo/)).not.toBeInTheDocument()
  })
})
