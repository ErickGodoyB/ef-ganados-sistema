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

      await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'TEST-25')

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
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'TEST-25')

    expect(screen.getByRole('option', { name: /TEST-25/ })).toBeInTheDocument()
  })

  it('un animal con salida registrada no se ofrece y explica el motivo en vez de "Registrar animal nuevo"', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-VENDIDO')

    expect(screen.queryByRole('option', { name: /CAR-VENDIDO/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/Registrar animal nuevo/)).not.toBeInTheDocument()
    expect(screen.getByText('CAR-VENDIDO tiene salida registrada')).toBeInTheDocument()
  })

  it('una caravana que no existe en el sistema sí ofrece "Registrar animal nuevo"', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'NUEVO-123')

    expect(screen.getByText(/Registrar animal nuevo «NUEVO-123»/)).toBeInTheDocument()
  })

  it('"Guardar y agregar otro" limpia animal y peso, conserva la fecha y devuelve el foco al buscador', async () => {
    peticionProtegida.mockResolvedValue({})
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '210')
    const fechaPrevia = screen.getByLabelText('Fecha').value

    await usuario.click(screen.getByRole('button', { name: 'Guardar y agregar otro' }))

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Buscar animal por caravana' })).toHaveFocus())
    expect(screen.getByRole('combobox', { name: 'Buscar animal por caravana' })).toHaveValue('')
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('')
    expect(screen.getByLabelText('Fecha')).toHaveValue(fechaPrevia)
  })

  it('tras el alta rápida, el animal queda elegido, el peso se precarga con el peso inicial recién puesto y el foco va al peso', () => {
    const onConsumidaPreseleccion = vi.fn()
    const animalNuevo = {
      aniId: 99,
      aniCaravana: 'CAR-NUEVO',
      aniFechaIngreso: '2026-01-01',
      aniFechaEgreso: null,
      aniPesoInicial: 180,
      pesoActual: 180,
    }
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

    expect(screen.getByRole('combobox', { name: 'Buscar animal por caravana' })).toHaveValue('CAR-NUEVO')
    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('180')
    expect(screen.getByLabelText('Peso (kg)')).toHaveFocus()
    expect(onConsumidaPreseleccion).toHaveBeenCalledTimes(1)
  })

  it('tras el alta rápida, si ya había un peso escrito antes, no se lo pisa con el peso inicial', async () => {
    const usuario = userEvent.setup()
    const onConsumidaPreseleccion = vi.fn()
    const animalNuevo = {
      aniId: 99,
      aniCaravana: 'CAR-NUEVO',
      aniFechaIngreso: '2026-01-01',
      aniFechaEgreso: null,
      aniPesoInicial: 180,
      pesoActual: 180,
    }
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
    await usuario.type(screen.getByLabelText('Peso (kg)'), '222')

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

    expect(screen.getByLabelText('Peso (kg)')).toHaveValue('222')
  })

  it('con una fecha anterior a fechaUltimoPesaje del animal, avisa que es retroactivo en vez de avisar peso menor', async () => {
    const usuario = userEvent.setup()
    const animalConPesajePosterior = {
      aniId: 4,
      aniCaravana: 'CAR-RETRO',
      aniFechaIngreso: '2026-01-01',
      aniFechaEgreso: null,
      pesoActual: 300,
      fechaUltimoPesaje: '2026-02-10',
      subGrupoId: 3,
    }
    renderPestana({ animales: [...ANIMALES, animalConPesajePosterior] })

    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-02-01')
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-RETRO')
    await usuario.click(screen.getByRole('option', { name: /CAR-RETRO/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '250')

    expect(
      screen.getByText(
        'CAR-RETRO ya tiene un pesaje posterior (10/02/2026, sesión S-260210-3). ' +
          'Este pesaje se guardará antes y recalculará la ganancia diaria de los posteriores.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Es menor al último peso registrado/)).not.toBeInTheDocument()
  })

  it('si fechaUltimoPesaje no llega del backend, no avisa nada ni rompe', async () => {
    const usuario = userEvent.setup()
    renderPestana()

    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '50')

    expect(screen.getByText('Es menor al último peso registrado (200,0 kg)')).toBeInTheDocument()
  })

  it('el responsable queda preseleccionado con la persona actual y, si se elige otra, se manda esa en el POST', async () => {
    const usuario = userEvent.setup()
    peticionProtegida.mockImplementation(async (ruta, opciones) => {
      if (ruta === '/api/personas') {
        return [
          { perId: 1, perNombre: 'Ana', perApellido: 'Pérez' },
          { perId: 2, perNombre: 'Beto', perApellido: 'Gómez' },
        ]
      }
      if (ruta === '/api/animales/1/pesajes' && opciones?.method === 'POST') {
        return {}
      }
      throw new Error(`Ruta no mockeada: ${ruta}`)
    })
    renderPestana()

    // Preseleccionado con la persona actual (personaId: 1, mockeado en useAuth).
    await waitFor(() => expect(screen.getByLabelText('Responsable')).toHaveValue('1'))

    await usuario.selectOptions(screen.getByLabelText('Responsable'), '2')
    await usuario.type(screen.getByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-001')
    await usuario.click(screen.getByRole('option', { name: /CAR-001/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '210')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith(
        '/api/animales/1/pesajes',
        expect.objectContaining({ body: JSON.stringify({ peso: 210, fecha: screen.getByLabelText('Fecha').value, responsableId: 2 }) }),
      ),
    )
  })
})
