import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { peticionProtegida } from '../../api/cliente'
import FormularioAnimal from './FormularioAnimal'

vi.mock('../../api/cliente', () => ({
  peticionProtegida: vi.fn(),
  ErrorHttp: class ErrorHttp extends Error {
    constructor(estado, mensaje) {
      super(mensaje)
      this.estado = estado
    }
  },
}))

const PERSONAS = [
  { perId: 2, perNombre: 'Juan', perApellido: 'Pérez', perTipo: 'PROPIETARIO' },
  { perId: 3, perNombre: 'Lucía', perApellido: 'Flores', perTipo: 'CLIENTE' },
  { perId: 4, perNombre: 'Pedro', perApellido: 'Vera', perTipo: 'PROVEEDOR' },
  { perId: 5, perNombre: 'Rosa', perApellido: 'Núñez', perTipo: 'PROVEEDOR' },
]

let guardados

beforeEach(() => {
  guardados = []
  peticionProtegida.mockImplementation(async (ruta, opciones) => {
    if (ruta === '/api/razas') return [{ rzId: 1, rzDescripcion: 'Brangus' }]
    if (ruta === '/api/subgrupos') return [{ sbId: 10, sbDescripcion: 'Lote A', grupo: { grpDescripcion: 'Cría' } }]
    if (ruta === '/api/personas' && !opciones) return PERSONAS
    if (ruta === '/api/personas' && opciones?.method === 'POST') {
      const datos = JSON.parse(opciones.body)
      return { perId: 99, perNombre: datos.perNombre, perApellido: datos.perApellido, perTipo: datos.perTipo }
    }
    if (ruta.startsWith('/api/animales')) {
      guardados.push({ ruta, ...opciones, cuerpo: JSON.parse(opciones.body) })
      return { aniId: 1, aniCaravana: 'CAR-1' }
    }
    return null
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderizar(propiedades = {}) {
  const alGuardar = vi.fn()
  render(<FormularioAnimal alGuardar={alGuardar} alCancelar={vi.fn()} {...propiedades} />)
  await screen.findByLabelText('Caravana')
  return { alGuardar }
}

async function completarObligatorios(usuario) {
  await usuario.type(screen.getByLabelText('Caravana'), 'CAR-1')
  await usuario.selectOptions(screen.getByLabelText('Raza'), '1')
  await usuario.selectOptions(screen.getByLabelText('Lote'), '10')
  await usuario.selectOptions(screen.getByLabelText('Dueño'), '2')
  await usuario.type(screen.getByLabelText('Peso inicial (kg)'), '200')
}

describe('FormularioAnimal: proveedor (alta)', () => {
  it('el campo es opcional: la primera opción es "Sin proveedor" y lista solo a los proveedores', async () => {
    await renderizar()

    const campo = screen.getByLabelText('Proveedor (opcional)')
    expect(within(campo).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Sin proveedor',
      'Pedro Vera',
      'Rosa Núñez',
    ])
    expect(campo).toHaveValue('')
  })

  it('el selector de dueño sigue mostrando solo a los propietarios', async () => {
    await renderizar()

    const duenio = screen.getByLabelText('Dueño')
    expect(within(duenio).getAllByRole('option').map((o) => o.textContent)).toEqual(['Elegí un dueño', 'Juan Pérez'])
  })

  it('sin elegir proveedor envía proveedorId null', async () => {
    const usuario = userEvent.setup()
    const { alGuardar } = await renderizar()

    await completarObligatorios(usuario)
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalled())
    expect(guardados[0].method).toBe('POST')
    expect(guardados[0].cuerpo.proveedorId).toBeNull()
  })

  it('con un proveedor elegido envía su id como número', async () => {
    const usuario = userEvent.setup()
    const { alGuardar } = await renderizar()

    await completarObligatorios(usuario)
    await usuario.selectOptions(screen.getByLabelText('Proveedor (opcional)'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalled())
    expect(guardados[0].cuerpo.proveedorId).toBe(5)
  })

  it('el botón "+" crea un proveedor ahí mismo (tipo PROVEEDOR) y lo deja elegido', async () => {
    const usuario = userEvent.setup()
    await renderizar()

    await usuario.click(screen.getByRole('button', { name: 'Agregar proveedor nuevo' }))
    await usuario.type(screen.getByLabelText('Nombre'), 'Tomás')
    // Hay dos "Guardar" (el del mini formulario y el del formulario): se elige el del mini.
    const miniFormulario = screen.getByLabelText('Nombre').closest('.alta-rapida-mini-formulario')
    await usuario.click(within(miniFormulario).getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(screen.getByLabelText('Proveedor (opcional)')).toHaveValue('99'))
    const llamada = peticionProtegida.mock.calls.find(([ruta, opciones]) => ruta === '/api/personas' && opciones?.method === 'POST')
    expect(JSON.parse(llamada[1].body)).toMatchObject({ perNombre: 'Tomás', perTipo: 'PROVEEDOR' })
    expect(within(screen.getByLabelText('Proveedor (opcional)')).getByRole('option', { name: 'Tomás' })).toBeInTheDocument()
  })

  it('pide las personas de nuevo cada vez que se abre el formulario (datos frescos)', async () => {
    const primera = render(<FormularioAnimal alGuardar={vi.fn()} alCancelar={vi.fn()} />)
    await screen.findByLabelText('Caravana')
    primera.unmount()

    await renderizar()

    const pedidos = peticionProtegida.mock.calls.filter(([ruta]) => ruta === '/api/personas')
    expect(pedidos).toHaveLength(2)
  })
})

describe('FormularioAnimal: proveedor (edición)', () => {
  const VALORES = {
    aniCaravana: 'CAR-1',
    razaId: 1,
    subGrupoId: 10,
    duenioId: 2,
    aniFechaIngreso: '2026-01-01',
    aniPesoInicial: 200,
    aniFechaEgreso: null,
  }

  it('precarga el proveedor actual del animal', async () => {
    await renderizar({ modo: 'editar', animalId: 1, valoresIniciales: { ...VALORES, proveedorId: 4 } })

    expect(screen.getByLabelText('Proveedor (opcional)')).toHaveValue('4')
  })

  it('un animal sin proveedor arranca en "Sin proveedor"', async () => {
    await renderizar({ modo: 'editar', animalId: 1, valoresIniciales: { ...VALORES, proveedorId: null } })

    expect(screen.getByLabelText('Proveedor (opcional)')).toHaveValue('')
  })

  it('cambiar el proveedor lo envía en el PUT', async () => {
    const usuario = userEvent.setup()
    const { alGuardar } = await renderizar({
      modo: 'editar',
      animalId: 1,
      valoresIniciales: { ...VALORES, proveedorId: 4 },
    })

    await usuario.selectOptions(screen.getByLabelText('Proveedor (opcional)'), '5')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalled())
    expect(guardados[0].method).toBe('PUT')
    expect(guardados[0].ruta).toBe('/api/animales/1')
    expect(guardados[0].cuerpo.proveedorId).toBe(5)
  })

  it('volver a "Sin proveedor" envía proveedorId null para quitarlo', async () => {
    const usuario = userEvent.setup()
    const { alGuardar } = await renderizar({
      modo: 'editar',
      animalId: 1,
      valoresIniciales: { ...VALORES, proveedorId: 4 },
    })

    await usuario.selectOptions(screen.getByLabelText('Proveedor (opcional)'), '')
    await usuario.click(screen.getByRole('button', { name: 'Guardar' }))

    await waitFor(() => expect(alGuardar).toHaveBeenCalled())
    expect(guardados[0].cuerpo.proveedorId).toBeNull()
  })

  it('cambiar solo el proveedor no pide confirmación al cancelar (no cuenta como dato sin guardar)', async () => {
    const usuario = userEvent.setup()
    const alCancelar = vi.fn()
    const confirmar = vi.spyOn(window, 'confirm')
    await renderizar({ modo: 'editar', animalId: 1, valoresIniciales: VALORES, alCancelar })

    fireEvent.change(screen.getByLabelText('Proveedor (opcional)'), { target: { value: '4' } })
    await usuario.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(confirmar).not.toHaveBeenCalled()
    expect(alCancelar).toHaveBeenCalled()
  })
})
