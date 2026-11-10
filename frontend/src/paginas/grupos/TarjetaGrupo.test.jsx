import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import TarjetaGrupo from './TarjetaGrupo'

const GRUPO_SIN_LOTES = {
  grpId: 1,
  grpDescripcion: 'Invernada',
  cantidadLotes: 0,
  cantidadAnimales: 0,
  cantidadActivos: 0,
  lotes: [],
}

const GRUPO_CON_LOTES = {
  grpId: 2,
  grpDescripcion: 'Engorde',
  cantidadLotes: 2,
  cantidadAnimales: 3,
  cantidadActivos: 2,
  lotes: [
    { sbId: 10, sbDescripcion: 'Lote A', cantidadAnimales: 2, cantidadActivos: 1 },
    { sbId: 11, sbDescripcion: 'Lote B', cantidadAnimales: 0, cantidadActivos: 0 },
  ],
}

function manejadores() {
  return {
    onAlternarAbierto: vi.fn(),
    onEditarGrupo: vi.fn(),
    onEliminarGrupo: vi.fn(),
    onAgregarLote: vi.fn(),
    onEditarLote: vi.fn(),
    onEliminarLote: vi.fn(),
  }
}

describe('TarjetaGrupo', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('el desplegable arranca cerrado y no muestra los lotes', () => {
    render(<TarjetaGrupo grupo={GRUPO_CON_LOTES} abierto={false} {...manejadores()} />)

    const boton = screen.getByRole('button', { name: /Engorde/ })
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Lote A')).not.toBeInTheDocument()
  })

  it('abierto muestra los lotes, con sus datos y acciones', () => {
    render(<TarjetaGrupo grupo={GRUPO_CON_LOTES} abierto {...manejadores()} />)

    const boton = screen.getByRole('button', { name: /Engorde/ })
    expect(boton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Lote A')).toBeInTheDocument()
    expect(screen.getByText('Lote B')).toBeInTheDocument()
  })

  it('un clic en el disclosure llama a onAlternarAbierto', async () => {
    const usuario = userEvent.setup()
    const funciones = manejadores()
    render(<TarjetaGrupo grupo={GRUPO_SIN_LOTES} abierto={false} {...funciones} />)

    await usuario.click(screen.getByRole('button', { name: /Invernada/ }))

    expect(funciones.onAlternarAbierto).toHaveBeenCalledTimes(1)
  })

  it('un grupo sin lotes tiene el botón Eliminar habilitado y sin aviso', () => {
    render(<TarjetaGrupo grupo={GRUPO_SIN_LOTES} abierto={false} {...manejadores()} />)

    const encabezado = screen.getByText('Invernada').closest('.tarjeta-grupo-encabezado')
    const botonEliminar = within(encabezado).getByRole('button', { name: 'Eliminar' })
    expect(botonEliminar).not.toBeDisabled()
    expect(screen.queryByText(/Tiene \d+ lote/)).not.toBeInTheDocument()
  })

  it('un grupo con lotes tiene el botón Eliminar deshabilitado con una explicación visible', () => {
    render(<TarjetaGrupo grupo={GRUPO_CON_LOTES} abierto={false} {...manejadores()} />)

    const encabezado = screen.getByText('Engorde').closest('.tarjeta-grupo-encabezado')
    const botonEliminar = within(encabezado).getByRole('button', { name: 'Eliminar' })
    expect(botonEliminar).toBeDisabled()
    expect(within(encabezado).getByText('Tiene 2 lotes')).toBeInTheDocument()
    expect(botonEliminar).toHaveAttribute('aria-describedby', expect.stringContaining(''))
  })

  it('un lote sin animales tiene su Eliminar habilitado; uno con animales lo tiene deshabilitado con aviso', () => {
    render(<TarjetaGrupo grupo={GRUPO_CON_LOTES} abierto {...manejadores()} />)

    const filaA = screen.getByText('Lote A').closest('.fila-lote')
    const filaB = screen.getByText('Lote B').closest('.fila-lote')

    expect(within(filaA).getByRole('button', { name: 'Eliminar' })).toBeDisabled()
    expect(within(filaA).getByText('Tiene 2 animales')).toBeInTheDocument()

    expect(within(filaB).getByRole('button', { name: 'Eliminar' })).not.toBeDisabled()
    expect(within(filaB).queryByText(/Tiene \d+ animales/)).not.toBeInTheDocument()
  })

  it('"Agregar lote" y "Editar" de un lote llaman a sus manejadores', async () => {
    const usuario = userEvent.setup()
    const funciones = manejadores()
    render(<TarjetaGrupo grupo={GRUPO_CON_LOTES} abierto {...funciones} />)

    await usuario.click(screen.getByRole('button', { name: 'Agregar lote' }))
    expect(funciones.onAgregarLote).toHaveBeenCalledTimes(1)

    const filaB = screen.getByText('Lote B').closest('.fila-lote')
    await usuario.click(within(filaB).getByRole('button', { name: 'Editar' }))
    expect(funciones.onEditarLote).toHaveBeenCalledWith(GRUPO_CON_LOTES.lotes[1], expect.anything())
  })
})
