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

/** Configura el mock de peticionProtegida: subgrupos siempre disponibles; el detalle de sesión, según lo que se pase; el POST de la sesión, siempre exitoso. */
function configurarMock(detallePorFecha) {
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/subgrupos') {
      return [LOTE_A]
    }
    if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
      const parametros = new URLSearchParams(ruta.split('?')[1])
      const fecha = parametros.get('fecha')
      return detallePorFecha[fecha] ?? []
    }
    if (ruta === '/api/pesajes/sesion' && opciones?.method === 'POST') {
      return JSON.parse(opciones.body).items.map((item, indice) => ({ pesaId: indice + 1, ...item }))
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

  it(
    'tras el alta rápida, sin un peso ya escrito, se precarga con el peso inicial recién puesto y el foco va a "Agregar"',
    async () => {
      const usuario = userEvent.setup()
      const onConsumidaPreseleccion = vi.fn()
      configurarMock({})
      const { rerender } = render(
        <PestanaPorLote
          animales={ANIMALES}
          cargandoAnimales={false}
          errorAnimales=""
          animalParaPreseleccionar={null}
          onConsumidaPreseleccion={onConsumidaPreseleccion}
          onRegistrarNuevo={vi.fn()}
          onCerrar={vi.fn()}
          onGuardado={vi.fn()}
        />,
      )
      await usuario.selectOptions(await screen.findByLabelText('Lote'), '10')
      await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

      const animalNuevo = {
        aniId: 99,
        aniCaravana: 'CAR-NUEVO',
        aniFechaIngreso: '2026-01-01',
        aniFechaEgreso: null,
        subGrupoId: 10,
        aniPesoInicial: 150,
        pesoActual: 150,
      }
      rerender(
        <PestanaPorLote
          animales={[...ANIMALES, animalNuevo]}
          cargandoAnimales={false}
          errorAnimales=""
          animalParaPreseleccionar={{ pestana: 'lote', animal: animalNuevo }}
          onConsumidaPreseleccion={onConsumidaPreseleccion}
          onRegistrarNuevo={vi.fn()}
          onCerrar={vi.fn()}
          onGuardado={vi.fn()}
        />,
      )

      expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).toHaveValue('CAR-NUEVO')
      expect(screen.getByLabelText('Peso (kg)')).toHaveValue('150')
      await waitFor(() => expect(screen.getByRole('button', { name: /Agregar/ })).toHaveFocus())
      expect(onConsumidaPreseleccion).toHaveBeenCalledTimes(1)
    },
  )

  it(
    'tras el alta rápida, con un peso ya escrito, el animal queda elegido, el peso se conserva (no se pisa con el inicial) y el foco va a "Agregar"',
    async () => {
      const usuario = userEvent.setup()
      const onConsumidaPreseleccion = vi.fn()
      configurarMock({})
      const { rerender } = render(
        <PestanaPorLote
          animales={ANIMALES}
          cargandoAnimales={false}
          errorAnimales=""
          animalParaPreseleccionar={null}
          onConsumidaPreseleccion={onConsumidaPreseleccion}
          onRegistrarNuevo={vi.fn()}
          onCerrar={vi.fn()}
          onGuardado={vi.fn()}
        />,
      )
      await usuario.selectOptions(await screen.findByLabelText('Lote'), '10')
      await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())
      await usuario.type(screen.getByLabelText('Peso (kg)'), '175')

      const animalNuevo = {
        aniId: 99,
        aniCaravana: 'CAR-NUEVO',
        aniFechaIngreso: '2026-01-01',
        aniFechaEgreso: null,
        subGrupoId: 10,
        aniPesoInicial: 150,
        pesoActual: 150,
      }
      rerender(
        <PestanaPorLote
          animales={[...ANIMALES, animalNuevo]}
          cargandoAnimales={false}
          errorAnimales=""
          animalParaPreseleccionar={{ pestana: 'lote', animal: animalNuevo }}
          onConsumidaPreseleccion={onConsumidaPreseleccion}
          onRegistrarNuevo={vi.fn()}
          onCerrar={vi.fn()}
          onGuardado={vi.fn()}
        />,
      )

      expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).toHaveValue('CAR-NUEVO')
      expect(screen.getByLabelText('Peso (kg)')).toHaveValue('175')
      await waitFor(() => expect(screen.getByRole('button', { name: /Agregar/ })).toHaveFocus())
      expect(onConsumidaPreseleccion).toHaveBeenCalledTimes(1)
    },
  )

  it('avisa que el pesaje es retroactivo en la fila de la lista cuando la fecha es anterior a fechaUltimoPesaje del animal, y se actualiza si cambia la fecha', async () => {
    const usuario = userEvent.setup()
    const animalConPesajePosterior = {
      aniId: 5,
      aniCaravana: 'CAR-RETRO',
      aniFechaIngreso: '2026-01-01',
      aniFechaEgreso: null,
      subGrupoId: 10,
      pesoActual: 300,
      fechaUltimoPesaje: '2026-02-10',
    }
    configurarMock({})
    render(
      <PestanaPorLote
        animales={[...ANIMALES, animalConPesajePosterior]}
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
    await usuario.type(screen.getByLabelText('Fecha'), '2026-02-01')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(screen.getByRole('combobox', { name: 'Agregar animal del lote' }), 'CAR-RETRO')
    await usuario.click(screen.getByRole('option', { name: /CAR-RETRO/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '310')
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }))

    const mensaje =
      'CAR-RETRO ya tiene un pesaje posterior (10/02/2026, sesión S-260210-10). ' +
      'Este pesaje se guardará antes y recalculará la ganancia diaria de los posteriores.'
    expect(screen.getAllByText(mensaje).length).toBeGreaterThan(0)

    // Cambiamos la fecha a una posterior a fechaUltimoPesaje: ya no es retroactivo, el aviso desaparece.
    await usuario.clear(screen.getByLabelText('Fecha'))
    await usuario.type(screen.getByLabelText('Fecha'), '2026-03-01')

    expect(screen.queryByText(mensaje)).not.toBeInTheDocument()
  })

  it('un pesaje retroactivo en la lista no bloquea "Guardar": el aviso es informativo, el POST de la sesión se envía igual', async () => {
    const usuario = userEvent.setup()
    const animalConPesajePosterior = {
      aniId: 5,
      aniCaravana: 'CAR-RETRO',
      aniFechaIngreso: '2026-01-01',
      aniFechaEgreso: null,
      subGrupoId: 10,
      pesoActual: 300,
      fechaUltimoPesaje: '2026-02-10',
    }
    configurarMock({})
    render(
      <PestanaPorLote
        animales={[...ANIMALES, animalConPesajePosterior]}
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
    await usuario.type(screen.getByLabelText('Fecha'), '2026-02-01')
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(screen.getByRole('combobox', { name: 'Agregar animal del lote' }), 'CAR-RETRO')
    await usuario.click(screen.getByRole('option', { name: /CAR-RETRO/ }))
    await usuario.type(screen.getByLabelText('Peso (kg)'), '310')
    await usuario.click(screen.getByRole('button', { name: /Agregar/ }))

    // El aviso está, pero el botón "Guardar" de la sesión sigue habilitado.
    expect(screen.getAllByText(/ya tiene un pesaje posterior/).length).toBeGreaterThan(0)
    const botonGuardar = screen.getByRole('button', { name: 'Guardar' })
    expect(botonGuardar).not.toBeDisabled()

    await usuario.click(botonGuardar)

    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith(
        '/api/pesajes/sesion',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})
