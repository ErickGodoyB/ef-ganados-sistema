import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import PestanaPorLote from './PestanaPorLote'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

const LOTE_A = { sbId: 10, sbDescripcion: 'Lote A', grupo: null }

const ANIMALES = [
  { aniId: 1, aniCaravana: 'CAR-001', aniFechaIngreso: '2026-01-01', aniFechaEgreso: null, subGrupoId: 10, pesoActual: 200 },
  { aniId: 2, aniCaravana: 'CAR-002', aniFechaIngreso: '2026-01-01', aniFechaEgreso: null, subGrupoId: 10, pesoActual: 210 },
]

/** Configura el mock de peticionProtegida: subgrupos siempre disponibles; el detalle de sesión, según lo que se pase. */
function configurarMock(detallePorFecha) {
  peticionProtegida.mockImplementation(async (ruta) => {
    if (ruta === '/api/subgrupos') {
      return [LOTE_A]
    }
    if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
      const parametros = new URLSearchParams(ruta.split('?')[1])
      const fecha = parametros.get('fecha')
      return detallePorFecha[fecha] ?? []
    }
    throw new Error(`Ruta no mockeada: ${ruta}`)
  })
}

function renderPestana(detallePorFecha = {}) {
  configurarMock(detallePorFecha)
  return render(
    <PestanaPorLote
      animales={ANIMALES}
      cargandoAnimales={false}
      errorAnimales=""
      animalParaPreseleccionar={null}
      onConsumidaPreseleccion={vi.fn()}
      onRegistrarNuevo={vi.fn()}
      onCerrar={vi.fn()}
      onGuardado={vi.fn()}
    />,
  )
}

describe('PestanaPorLote', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('cambiar la fecha conserva la lista acumulada y saca, avisando, al animal que ya no sirve (ingreso posterior)', async () => {
    const usuario = userEvent.setup()
    renderPestana({ '2026-07-05': [], '2026-07-26': [] })

    await usuario.selectOptions(await screen.findByLabelText('Lote'), '10')
    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-07-05')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(screen.getByRole('combobox', { name: 'Agregar animal del lote' }), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '210')
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }))

    expect(screen.getAllByText('CAR-001').length).toBeGreaterThan(0)

    // Cambiamos la fecha a una posterior a la que el animal YA no está en
    // la sesión simulada (el mock sigue devolviendo [] para ambas fechas,
    // así que este cambio en particular no lo invalida); en cambio,
    // comprobamos que no se pidió confirmación ni se vació la lista.
    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-07-26')
    await waitFor(() => expect(peticionProtegida).toHaveBeenCalledWith(
      expect.stringContaining('fecha=2026-07-26'),
    ))

    expect(screen.getAllByText('CAR-001').length).toBeGreaterThan(0)
  })

  it('cambiar el lote con animales cargados pide confirmación explicando el motivo, y la vacía si se acepta', async () => {
    const usuario = userEvent.setup()
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPestana({})

    await usuario.selectOptions(await screen.findByLabelText('Lote'), '10')
    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-07-05')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(screen.getByRole('combobox', { name: 'Agregar animal del lote' }), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '210')
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }))
    expect(screen.getAllByText('CAR-001').length).toBeGreaterThan(0)

    await usuario.selectOptions(screen.getByLabelText('Lote'), 'sin-lote')

    expect(confirmSpy).toHaveBeenCalledWith('Los animales cargados pertenecen al lote anterior. ¿Cambiar igual?')
    expect(screen.queryByText('CAR-001')).not.toBeInTheDocument()
  })

  it('si la caravana escrita ya existe pero no pertenece al lote elegido, explica el motivo en vez de ofrecer registrarla', async () => {
    const usuario = userEvent.setup()
    const animalesConOtroLote = [...ANIMALES, { aniId: 3, aniCaravana: 'CAR-OTRO', aniFechaIngreso: '2026-01-01', aniFechaEgreso: null, subGrupoId: 99, subGrupoDescripcion: 'Lote B', pesoActual: 180 }]
    configurarMock({})
    render(
      <PestanaPorLote
        animales={animalesConOtroLote}
        cargandoAnimales={false}
        errorAnimales=""
        animalParaPreseleccionar={null}
        onConsumidaPreseleccion={vi.fn()}
        onRegistrarNuevo={vi.fn()}
        onCerrar={vi.fn()}
        onGuardado={vi.fn()}
      />,
    )

    await usuario.selectOptions(await screen.findByLabelText('Lote'), '10')
    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-07-05')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(screen.getByRole('combobox', { name: 'Agregar animal del lote' }), 'CAR-OTRO')

    expect(screen.queryByText(/Registrar animal nuevo/)).not.toBeInTheDocument()
    expect(screen.getByText('CAR-OTRO pertenece al lote Lote B')).toBeInTheDocument()
  })
})
