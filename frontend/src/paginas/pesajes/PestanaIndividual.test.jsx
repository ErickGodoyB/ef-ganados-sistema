import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PestanaIndividual from './PestanaIndividual'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('./useIdsYaPesadosEnFecha', () => ({
  useIdsYaPesadosEnFecha: () => new Set(),
}))

const ANIMALES = [
  { aniId: 1, aniCaravana: 'CAR-001', aniFechaIngreso: '2026-01-01', aniFechaEgreso: null, pesoActual: 200 },
  {
    aniId: 2,
    aniCaravana: 'TEST-25',
    aniFechaIngreso: '2026-07-26',
    aniFechaEgreso: null,
    pesoActual: 210,
  },
  { aniId: 3, aniCaravana: 'CAR-VENDIDO', aniFechaIngreso: '2026-01-01', aniFechaEgreso: '2026-06-01', pesoActual: 250 },
]

function renderPestana(props = {}) {
  return render(
    <PestanaIndividual
      animales={ANIMALES}
      cargandoAnimales={false}
      errorAnimales=""
      animalParaPreseleccionar={null}
      onConsumidaPreseleccion={vi.fn()}
      onRegistrarNuevo={vi.fn()}
      onGuardado={vi.fn()}
      onGuardadoParcial={vi.fn()}
      {...props}
    />,
  )
}

describe('PestanaIndividual', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it(
    'reproduce el caso reportado (TEST-25, ingreso 2026-07-26): con fecha 2026-07-05 no se ofrece como opción ' +
      'ni se permite "Registrar animal nuevo", y se explica el motivo',
    async () => {
      const usuario = userEvent.setup()
      renderPestana()

      await usuario.clear(screen.getByLabelText('Fecha'))
      await usuario.type(screen.getByLabelText('Fecha'), '2026-07-05')

      await usuario.type(screen.getByRole('combobox'), 'TEST-25')

      expect(screen.queryByRole('option', { name: /TEST-25/ })).not.toBeInTheDocument()
      expect(screen.queryByText(/Registrar animal nuevo/)).not.toBeInTheDocument()
      expect(screen.getByText('TEST-25 ingresó el 26/07/2026, posterior a la fecha elegida')).toBeInTheDocument()
    },
  )

  it('con una fecha donde TEST-25 ya ingresó, sí aparece como opción elegible', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-08-01')
    await usuario.type(screen.getByRole('combobox'), 'TEST-25')

    expect(screen.getByRole('option', { name: /TEST-25/ })).toBeInTheDocument()
  })

  it('un animal con salida registrada no se ofrece y explica el motivo en vez de "Registrar animal nuevo"', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox'), 'CAR-VENDIDO')

    expect(screen.queryByRole('option', { name: /CAR-VENDIDO/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Registrar animal nuevo/)).not.toBeInTheDocument()
    expect(screen.getByText('CAR-VENDIDO tiene salida registrada')).toBeInTheDocument()
  })

  it('una caravana que no existe en el sistema sí ofrece "Registrar animal nuevo"', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox'), 'NUEVO-123')

    expect(screen.getByText(/Registrar animal nuevo «NUEVO-123»/)).toBeInTheDocument()
  })
})
