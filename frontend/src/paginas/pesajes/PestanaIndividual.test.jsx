import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import PestanaIndividual from './PestanaIndividual'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('./useIdsYaPesadosEnFecha', () => ({
  useIdsYaPesadosEnFecha: () => new Set(),
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
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

  it('"Guardar y agregar otro" limpia animal y peso, conserva la fecha y devuelve el foco al buscador', async () => {
    peticionProtegida.mockResolvedValue({})
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox'), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '210')
    const fechaPrevia = screen.getByLabelText('Fecha').value

    await usuario.click(screen.getByRole('button', { name: 'Guardar y agregar otro' }))

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveFocus())
    expect(screen.getByRole('combobox')).toHaveValue('')
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('')
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaPrevia)
  })

  it('tras el alta rápida, el animal queda elegido en el buscador y el foco va al peso', () => {
    const onConsumidaPreseleccion = vi.fn()
    const animalNuevo = { aniId: 99, aniCaravana: 'CAR-NUEVO', aniFechaIngreso: '2026-01-01', aniFechaEgreso: null, pesoActual: 180 }
    const { rerender } = render(
      <PestanaIndividual
        animales={ANIMALES}
        cargandoAnimales={false}
        errorAnimales=""
        animalParaPreseleccionar={null}
        onConsumidaPreseleccion={onConsumidaPreseleccion}
        onRegistrarNuevo={vi.fn()}
        onGuardado={vi.fn()}
        onGuardadoParcial={vi.fn()}
      />,
    )

    rerender(
      <PestanaIndividual
        animales={[...ANIMALES, animalNuevo]}
        cargandoAnimales={false}
        errorAnimales=""
        animalParaPreseleccionar={{ pestana: 'individual', animal: animalNuevo }}
        onConsumidaPreseleccion={onConsumidaPreseleccion}
        onRegistrarNuevo={vi.fn()}
        onGuardado={vi.fn()}
        onGuardadoParcial={vi.fn()}
      />,
    )

    expect(screen.getByRole('combobox')).toHaveValue('CAR-NUEVO')
    expect(screen.getByLabelText('Peso (kg)')).toHaveFocus()
    expect(onConsumidaPreseleccion).toHaveBeenCalledTimes(1)
  })
})
