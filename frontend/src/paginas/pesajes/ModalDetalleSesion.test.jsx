import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalDetalleSesion from './ModalDetalleSesion'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const ITEM_1 = {
  pesaId: 10,
  animalId: 1,
  caravana: 'CAR-001',
  razaDescripcion: 'Raza A',
  peso: 200,
  pesoAnterior: null,
  gmd: null,
  responsableNombre: 'Responsable',
  observaciones: '',
}

const ITEM_2 = {
  pesaId: 11,
  animalId: 2,
  caravana: 'CAR-002',
  razaDescripcion: 'Raza A',
  peso: 220,
  pesoAnterior: null,
  gmd: null,
  responsableNombre: 'Responsable',
  observaciones: '',
}

const SESION = { fecha: '2026-07-05', subGrupoId: 10, subGrupoDescripcion: 'Lote A', grupoDescripcion: null }

function renderModal(props = {}) {
  return render(
    <ModalDetalleSesion
      sesion={SESION}
      onCerrar={vi.fn()}
      onCambiada={vi.fn()}
      onQuedoSinAnimales={vi.fn()}
      refDisparador={{ current: null }}
      {...props}
    />,
  )
}

describe('ModalDetalleSesion', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('anular un pesaje puntual (con un chip de motivo) llama a PUT /api/pesajes/{id}/anular y avisa', async () => {
    const usuario = userEvent.setup()
    const onCambiada = vi.fn()
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
        return [ITEM_1, ITEM_2]
      }
      if (ruta === `/api/pesajes/${ITEM_1.pesaId}/anular` && opciones?.method === 'PUT') {
        return { ...ITEM_1, pesaEstado: 'ANULADO' }
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })

    renderModal({ onCambiada })
    await screen.findAllByText('CAR-001')

    // Para evitar la ambigüedad tabla/tarjeta (ambas están en el DOM),
    // se trabaja dentro de la tabla de escritorio.
    const tabla = document.querySelector('.detalle-sesion-tabla-solo-escritorio')
    await usuario.click(within(tabla).getByRole('button', { name: 'Anular el pesaje de CAR-001' }))
    await usuario.click(within(tabla).getByRole('button', { name: 'Error de carga' }))

    // Ahora el detalle, al recargar, solo devuelve ITEM_2 (el otro quedó anulado).
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
        return [ITEM_2]
      }
      if (ruta === `/api/pesajes/${ITEM_1.pesaId}/anular` && opciones?.method === 'PUT') {
        return { ...ITEM_1, pesaEstado: 'ANULADO' }
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })

    await usuario.click(within(tabla).getByRole('button', { name: 'Anular' }))

    await waitFor(() => expect(onCambiada).toHaveBeenCalledWith('Pesaje de CAR-001 anulado'))
    expect(screen.getByText('Pesaje de CAR-001 anulado')).toBeInTheDocument()
  })

  it('"Anular sesión" pide motivo y, al confirmar, llama a PUT /api/pesajes/sesion/anular y cierra el modal', async () => {
    const usuario = userEvent.setup()
    const onCerrar = vi.fn()
    const onCambiada = vi.fn()
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
        return [ITEM_1, ITEM_2]
      }
      if (ruta === '/api/pesajes/sesion/anular' && opciones?.method === 'PUT') {
        expect(JSON.parse(opciones.body)).toEqual({ fecha: '2026-07-05', subGrupoId: 10, motivo: 'Pesaje duplicado' })
        return { cantidad: 2 }
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })

    renderModal({ onCerrar, onCambiada })
    await screen.findAllByText('CAR-001')

    await usuario.click(screen.getByRole('button', { name: /Anular sesión/ }))
    await usuario.click(screen.getByRole('button', { name: 'Pesaje duplicado' }))
    await usuario.click(screen.getByRole('button', { name: 'Confirmar anulación' }))

    await waitFor(() => expect(onCerrar).toHaveBeenCalled())
    expect(onCambiada).toHaveBeenCalledWith('Sesión anulada: 2 pesajes')
  })

  it('"Cambiar fecha" mueve la sesión y recarga el detalle con la fecha nueva', async () => {
    const usuario = userEvent.setup()
    const onCambiada = vi.fn()
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta.includes('fecha=2026-07-05')) {
        return [ITEM_1, ITEM_2]
      }
      if (ruta.includes('fecha=2026-07-10')) {
        return [ITEM_1, ITEM_2]
      }
      if (ruta === '/api/pesajes/sesion/fecha' && opciones?.method === 'PUT') {
        expect(JSON.parse(opciones.body)).toEqual({ fecha: '2026-07-05', subGrupoId: 10, nuevaFecha: '2026-07-10' })
        return { cantidad: 2 }
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })

    renderModal({ onCambiada })
    await screen.findAllByText('CAR-001')

    await usuario.click(screen.getByRole('button', { name: /Cambiar fecha/ }))
    await usuario.type(screen.getByLabelText('Fecha nueva'), '2026-07-10')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cambio de fecha' }))

    await waitFor(() => expect(onCambiada).toHaveBeenCalledWith('Fecha cambiada: 2 pesajes movidos al 10/07/2026'))
    expect(screen.getByRole('heading', { name: /10\/07\/2026/ })).toBeInTheDocument()
  })

  it('un error del servidor al cambiar la fecha se muestra en el panel (role alert) sin cerrarlo', async () => {
    const usuario = userEvent.setup()
    const ErrorHttpMock = (await import('../../api/cliente')).ErrorHttp
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
        return [ITEM_1]
      }
      if (ruta === '/api/pesajes/sesion/fecha' && opciones?.method === 'PUT') {
        throw new ErrorHttpMock(409, 'El animal CAR-001 ya tiene un pesaje activo el 10/07/2026. Editá ese pesaje o anulalo.')
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })

    renderModal()
    await screen.findAllByText('CAR-001')

    await usuario.click(screen.getByRole('button', { name: /Cambiar fecha/ }))
    await usuario.type(screen.getByLabelText('Fecha nueva'), '2026-07-10')
    await usuario.click(screen.getByRole('button', { name: 'Confirmar cambio de fecha' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El animal CAR-001 ya tiene un pesaje activo el 10/07/2026. Editá ese pesaje o anulalo.',
    )
    // El panel sigue abierto: el campo de fecha nueva sigue en pantalla.
    expect(screen.getByLabelText('Fecha nueva')).toBeInTheDocument()
  })
})
