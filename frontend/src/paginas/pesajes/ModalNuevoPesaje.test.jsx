/**
 * Prueba de integración del flujo completo de alta rápida desde "Nuevo
 * pesaje" (ModalNuevoPesaje + sus dos pestañas + FormularioAnimal, todos
 * reales, con la API simulada): reproduce el caso reportado -en la pestaña
 * "Por lote", elegir un lote, escribir una caravana que no existe,
 * registrar el animal y volver- y confirma que NO se pierde nada de la
 * pestaña de origen (lote, fecha) al mostrar y cerrar el formulario de alta
 * rápida. Las pruebas de PestanaPorLote.test.jsx/PestanaIndividual.test.jsx
 * no cubren esto: montan cada pestaña sola, así que nunca pasan por el
 * cambio de "vista" de ModalNuevoPesaje que es justamente donde estaba el
 * problema (ver el comentario de ModalNuevoPesaje.jsx).
 *
 * Como las dos pestañas quedan siempre montadas (una oculta con "hidden"),
 * y los campos "Fecha"/"Peso (kg)" se llaman igual en las dos, las
 * consultas de cada pestaña van acotadas con within(...) al tabpanel
 * visible (el oculto no se filtra solo por tener el atributo "hidden": eso
 * solo lo hace getByRole, no getByLabelText). La colisión entre el "Lote"
 * de PestanaPorLote y el de FormularioAnimal (durante el alta rápida) se
 * evita usando getByRole en vez de getByLabelText: ese sí excluye lo oculto.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import ModalNuevoPesaje from './ModalNuevoPesaje'

vi.mock('../../auth/useAuth', () => ({
  useAuth: () => ({ personaId: 1, cargandoYo: false, errorYo: '' }),
}))

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {},
}))

const LOTE_B = { sbId: 20, sbDescripcion: 'Lote B', grupo: null }
const RAZA_X = { rzId: 5, rzDescripcion: 'Raza X' }
const DUENIO_X = { perId: 7, perNombre: 'Due', perApellido: 'Ño', perTipo: 'PROPIETARIO' }

/** Animal ya existente (no creado por alta rápida) con un pesaje posterior a la fecha que se va a probar: el caso de "pesaje retroactivo". */
const CAR_RETRO = {
  aniId: 50,
  aniCaravana: 'CAR-RETRO',
  razaDescripcion: RAZA_X.rzDescripcion,
  subGrupoId: null,
  subGrupoDescripcion: null,
  grupoDescripcion: null,
  aniPesoInicial: 200,
  pesoActual: 300,
  fechaUltimoPesaje: '2026-03-01',
  aniFechaIngreso: '2026-01-01',
  aniFechaEgreso: null,
}

/** Configura el mock de peticionProtegida para todo lo que necesita el modal completo (animales, lotes, razas, personas, detalle de sesión, el alta del animal y el registro de un pesaje). */
function configurarMock({ animalesExistentes = [] } = {}) {
  const animalesCreados = []
  let proximoId = 900

  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/animales/resumen') {
      return [...animalesExistentes, ...animalesCreados]
    }
    if (ruta === '/api/subgrupos') {
      return [LOTE_B]
    }
    if (ruta === '/api/razas') {
      return [RAZA_X]
    }
    if (ruta === '/api/personas') {
      return [DUENIO_X]
    }
    if (ruta.startsWith('/api/pesajes/sesiones/detalle')) {
      return []
    }
    if (ruta === '/api/pesajes/sesiones') {
      return []
    }
    if (ruta === '/api/animales' && opciones?.method === 'POST') {
      const cuerpo = JSON.parse(opciones.body)
      const creado = { aniId: proximoId++, ...cuerpo }
      animalesCreados.push({
        aniId: creado.aniId,
        aniCaravana: creado.aniCaravana,
        razaDescripcion: RAZA_X.rzDescripcion,
        subGrupoId: creado.subGrupoId ?? null,
        subGrupoDescripcion: creado.subGrupoId ? LOTE_B.sbDescripcion : null,
        grupoDescripcion: null,
        aniPesoInicial: creado.aniPesoInicial,
        pesoActual: creado.aniPesoInicial,
        fechaUltimoPesaje: null,
        aniFechaIngreso: creado.aniFechaIngreso,
        aniFechaEgreso: null,
      })
      return creado
    }
    if (/^\/api\/animales\/\d+\/pesajes$/.test(ruta) && opciones?.method === 'POST') {
      return { pesaId: 1234, ...JSON.parse(opciones.body) }
    }
    throw new Error(`Ruta no mockeada: ${ruta} ${opciones?.method ?? 'GET'}`)
  })
}

function renderModal(props = {}, mockOpciones = {}) {
  configurarMock(mockOpciones)
  return render(
    <ModalNuevoPesaje
      onCerrar={vi.fn()}
      onGuardado={vi.fn()}
      onGuardadoParcial={vi.fn()}
      refDisparador={{ current: null }}
      {...props}
    />,
  )
}

/** El tabpanel visible en este momento (getByRole, a diferencia de getByLabelText, sí excluye el oculto). */
function panelActivo() {
  return within(screen.getByRole('tabpanel'))
}

describe('ModalNuevoPesaje - alta rápida de un animal', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('en "Por lote": tras registrar el animal nuevo, el lote y la fecha elegidos no se pierden, y el animal queda elegido con foco en el peso', async () => {
    const usuario = userEvent.setup()
    renderModal()

    // Pestaña "Por lote" (la de origen) ya es la activa por defecto.
    await usuario.selectOptions(await panelActivo().findByLabelText('Lote'), '20')
    await waitFor(() => expect(panelActivo().getByRole('combobox', { name: 'Agregar animal del lote' })).not.toBeDisabled())

    await usuario.type(panelActivo().getByRole('combobox', { name: 'Agregar animal del lote' }), 'TEST-95')
    await usuario.click(await screen.findByRole('option', { name: /Registrar animal nuevo «TEST-95»/ }))

    // Alta rápida: la caravana y el lote ya vienen precargados.
    await screen.findByLabelText('Caravana')
    expect(screen.getByLabelText('Caravana')).toHaveValue('TEST-95')
    expect(screen.getByRole('combobox', { name: 'Lote' })).toHaveValue('20')

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Raza' }), String(RAZA_X.rzId))
    await usuario.selectOptions(screen.getByLabelText('Dueño'), String(DUENIO_X.perId))
    await usuario.type(screen.getByLabelText('Peso inicial (kg)'), '180')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // Volvió a "Por lote": nada de lo elegido antes se perdió, el peso
    // queda precargado con el peso inicial recién puesto en el alta
    // rápida (180, no se había escrito nada antes) y el foco va a
    // "+ Agregar" porque ese peso ya es válido.
    await waitFor(() => expect(screen.queryByLabelText('Caravana')).not.toBeInTheDocument())
    expect(panelActivo().getByLabelText('Lote')).toHaveValue('20')
    expect(panelActivo().getByRole('combobox', { name: 'Agregar animal del lote' })).toHaveValue('TEST-95')
    expect(panelActivo().getByLabelText('Peso (kg)')).toHaveValue('180')
    await waitFor(() => expect(panelActivo().getByRole('button', { name: /Agregar/ })).toHaveFocus())
  })

  it('en "Individual": tras registrar el animal nuevo, la fecha elegida no se pierde, y el animal queda elegido con foco en el peso', async () => {
    const usuario = userEvent.setup()
    renderModal()

    await usuario.click(screen.getByRole('tab', { name: 'Individual' }))

    // Cambiamos la fecha a un valor distinto del de hoy (el por defecto):
    // si el estado se pierde al volver del alta rápida, esto es lo que lo
    // delataría (quedaría de nuevo en la fecha de hoy).
    const campoFecha = panelActivo().getByLabelText('Fecha')
    await usuario.clear(campoFecha)
    await usuario.type(campoFecha, '2026-01-15')

    await usuario.type(panelActivo().getByRole('combobox', { name: 'Buscar animal por caravana' }), 'TEST-96')
    await usuario.click(await screen.findByRole('option', { name: /Registrar animal nuevo «TEST-96»/ }))

    await screen.findByLabelText('Caravana')
    expect(screen.getByLabelText('Caravana')).toHaveValue('TEST-96')

    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Raza' }), String(RAZA_X.rzId))
    await usuario.selectOptions(screen.getByRole('combobox', { name: 'Lote' }), String(LOTE_B.sbId))
    await usuario.selectOptions(screen.getByLabelText('Dueño'), String(DUENIO_X.perId))
    await usuario.type(screen.getByLabelText('Peso inicial (kg)'), '150')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    // Volvió a "Individual": la fecha elegida sigue siendo la misma, el
    // peso queda precargado con el peso inicial recién puesto en el alta
    // rápida (150) y el foco va al peso (acá "Guardar" dispara el POST
    // real, así que no conviene dejarlo ahí enfocado).
    await waitFor(() => expect(screen.queryByLabelText('Caravana')).not.toBeInTheDocument())
    expect(panelActivo().getByLabelText('Fecha')).toHaveValue('2026-01-15')
    expect(panelActivo().getByRole('combobox', { name: 'Buscar animal por caravana' })).toHaveValue('TEST-96')
    expect(panelActivo().getByLabelText('Peso (kg)')).toHaveValue('150')
    await waitFor(() => expect(panelActivo().getByLabelText('Peso (kg)')).toHaveFocus())
  })

  it('en "Individual": un pesaje retroactivo (fecha anterior a fechaUltimoPesaje) muestra el aviso pero NO bloquea el guardado', async () => {
    const usuario = userEvent.setup()
    renderModal({}, { animalesExistentes: [CAR_RETRO] })

    await usuario.click(screen.getByRole('tab', { name: 'Individual' }))
    await usuario.type(await panelActivo().findByRole('combobox', { name: 'Buscar animal por caravana' }), 'CAR-RETRO')
    await usuario.click(await screen.findByRole('option', { name: /CAR-RETRO/ }))

    const campoFecha = panelActivo().getByLabelText('Fecha')
    await usuario.clear(campoFecha)
    await usuario.type(campoFecha, '2026-02-01')
    await usuario.type(panelActivo().getByLabelText('Peso (kg)'), '250')

    // El aviso retroactivo está (y no el de "peso menor", que acá no tendría sentido).
    expect(
      screen.getByText(
        'CAR-RETRO ya tiene un pesaje posterior (01/03/2026, sesión S-260301-0). ' +
          'Este pesaje se guardará antes y recalculará la ganancia diaria de los posteriores.',
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Es menor al último peso registrado/)).not.toBeInTheDocument()

    // El aviso es informativo: no bloquea ninguno de los dos botones.
    expect(panelActivo().getByRole('button', { name: 'Guardar' })).not.toBeDisabled()
    expect(panelActivo().getByRole('button', { name: 'Guardar y agregar otro' })).not.toBeDisabled()

    await usuario.click(panelActivo().getByRole('button', { name: 'Guardar' }))

    await waitFor(() =>
      expect(peticionProtegida).toHaveBeenCalledWith(
        '/api/animales/50/pesajes',
        expect.objectContaining({ method: 'POST' }),
      ),
    )
  })
})
