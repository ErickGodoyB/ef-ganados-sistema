import { afterEach, describe, expect, it, vi } from 'vitest'
import { construirExcel } from './generarExcel'
import { construirPdf } from './generarPdf'
import { cargarLogo } from './logo'

// PNG de 1×1 píxel: alcanza para que el logo "cargue" (firma, ancho y alto válidos).
const PNG_1X1 = Uint8Array.from(
  atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='),
  (caracter) => caracter.charCodeAt(0),
)

const DATOS = {
  titulo: 'Animales',
  filtros: [],
  columnas: [{ clave: 'nombre', titulo: 'Nombre', tipo: 'texto' }],
  filas: [{ nombre: 'Ana' }],
  usuario: 'Ana',
  ahora: new Date(2026, 10, 8, 9, 5),
}

function leerBytes(blob) {
  return new Promise((resolver) => {
    const lector = new FileReader()
    lector.onload = () => resolver(new Uint8Array(lector.result))
    lector.readAsArrayBuffer(blob)
  })
}

function respuestaConLogo() {
  return { ok: true, arrayBuffer: async () => PNG_1X1.buffer.slice(PNG_1X1.byteOffset, PNG_1X1.byteOffset + PNG_1X1.byteLength) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('cargarLogo', () => {
  it('devuelve el logo con sus dimensiones cuando se puede cargar', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaConLogo()))

    const logo = await cargarLogo()

    expect(logo).toMatchObject({ ancho: 1, alto: 1 })
    expect(logo.datos.startsWith('data:image/png;base64,')).toBe(true)
    expect(logo.base64).toBeTruthy()
  })

  it('devuelve null si falla la red, si no existe o si no es un PNG', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))
    expect(await cargarLogo()).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }))
    expect(await cargarLogo()).toBeNull()

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(40) }))
    expect(await cargarLogo()).toBeNull()
  })
})

describe('archivos con logo', () => {
  it('el PDF se genera con el logo en la cabecera', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaConLogo()))

    const bytes = await leerBytes(await construirPdf(DATOS))

    expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe('%PDF-')
  })

  it('el Excel se genera con el logo insertado como imagen', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respuestaConLogo()))

    const bytes = await leerBytes(await construirExcel(DATOS))

    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('PK')
    // Un .xlsx con imagen lleva su archivo en xl/media (los nombres van sin comprimir en el zip).
    expect(new TextDecoder('latin1').decode(bytes)).toContain('xl/media/')
  })

  it('sin logo, el Excel no lleva imágenes', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('sin red')))

    const bytes = await leerBytes(await construirExcel(DATOS))

    expect(new TextDecoder('latin1').decode(bytes)).not.toContain('xl/media/')
  })
})
