import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../api/cliente'
import Transferencias from './Transferencias'

vi.mock('../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 5, personaNombre: 'Ana Pérez', errorYo: '' }),
}))

const GRUPO = { grpId: 1, grpDescripcion: 'Invernada' }
const LOTES = [
  { sbId: 10, sbDescripcion: 'Lote A', grupo: GRUPO },
  { sbId: 11, sbDescripcion: 'Lote B', grupo: GRUPO },
]
const ANIMALES = [
  {
    aniId: 1,
    aniCaravana: 'CAR-001',
    razaId: 1,
    razaDescripcion: 'Brangus',
    subGrupoId: 10,
    subGrupoDescripcion: 'Lote A',
    grupoDescripcion: 'Invernada',
    pesoActual: 250,
    gmd: 1.2,
    aniFechaEgreso: null,
  },
]

beforeEach(() => {
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/animales/resumen') {
      return ANIMALES
    }
    if (ruta === '/api/subgrupos') {
      return LOTES
    }
    if (ruta === '/api/personas') {
      return [{ perId: 5, perNombre: 'Ana', perApellido: 'Pérez', perTipo: 'EMPLEADO' }]
    }
    if (ruta === '/api/transferencias' && opciones?.method === 'POST') {
      return { traId: 9 }
    }
    if (ruta.startsWith('/api/transferencias')) {
      return []
    }
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function vecesPedido(ruta) {
  return peticionProtegida.mock.calls.filter(([r, opciones]) => r === ruta && !opciones).length
}

describe('Transferencias', () => {
  it('tiene las pestañas "Nueva transferencia" (activa) e "Historial"', async () => {
    render(<Transferencias />)

    expect(screen.getByRole('tab', { name: 'Nueva transferencia' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'false')
    expect(await screen.findByText('Animales')).toBeInTheDocument()
  })

  it('cambiar a "Historial" muestra su panel y oculta el de la nueva transferencia, sin perder la selección', async () => {
    const usuario = userEvent.setup()
    render(<Transferencias />)
    await screen.findByText('Animales')
    await usuario.click(screen.getAllByRole('checkbox', { name: 'Seleccionar CAR-001' })[0])

    await usuario.click(screen.getByRole('tab', { name: 'Historial' }))

    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    // Un panel oculto no entra en las consultas por rol/nombre: se comprueba su atributo directamente.
    expect(document.getElementById('transferencias-panel-nueva')).toHaveAttribute('hidden')
    expect(document.getElementById('transferencias-panel-historial')).not.toHaveAttribute('hidden')
    expect(await screen.findByText('Todavía no hay transferencias registradas')).toBeInTheDocument()

    await usuario.click(screen.getByRole('tab', { name: 'Nueva transferencia' }))
    expect(screen.getAllByRole('checkbox', { name: 'Seleccionar CAR-001' })[0]).toBeChecked()
  })

  it('las flechas del teclado cambian de pestaña', async () => {
    const usuario = userEvent.setup()
    render(<Transferencias />)
    await screen.findByText('Animales')

    screen.getByRole('tab', { name: 'Nueva transferencia' }).focus()
    await usuario.keyboard('{ArrowRight}')

    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Historial' })).toHaveFocus()
  })

  it('al transferir con éxito muestra el aviso, limpia la selección y refresca la lista y el historial', async () => {
    const usuario = userEvent.setup()
    render(<Transferencias />)
    await screen.findByText('Animales')
    expect(vecesPedido('/api/animales/resumen')).toBe(1)

    await usuario.click(screen.getAllByRole('checkbox', { name: 'Seleccionar CAR-001' })[0])
    await usuario.selectOptions(screen.getByLabelText('Lote de destino'), '11')
    await usuario.click(screen.getByRole('button', { name: 'Transferir' }))
    await usuario.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))

    expect(await screen.findByText('1 animal transferido a Lote B')).toBeInTheDocument()
    await waitFor(() => expect(vecesPedido('/api/animales/resumen')).toBe(2))
    expect(screen.getAllByRole('checkbox', { name: 'Seleccionar CAR-001' })[0]).not.toBeChecked()
    expect(vecesPedido('/api/transferencias')).toBeGreaterThanOrEqual(2)
  })
})
