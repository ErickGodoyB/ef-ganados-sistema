import { describe, expect, it } from 'vitest'
import { etiquetaTipo, TIPOS_PERSONA } from './tiposPersona'

describe('TIPOS_PERSONA', () => {
  it('incluye a PROPIETARIO, EMPLEADO y CLIENTE', () => {
    const valores = TIPOS_PERSONA.map((tipo) => tipo.valor)
    expect(valores).toEqual(['PROPIETARIO', 'EMPLEADO', 'CLIENTE'])
  })

  it('la etiqueta de CLIENTE es "Cliente"', () => {
    const cliente = TIPOS_PERSONA.find((tipo) => tipo.valor === 'CLIENTE')
    expect(cliente.etiqueta).toBe('Cliente')
  })
})

describe('etiquetaTipo', () => {
  it('devuelve "Cliente" para el valor CLIENTE', () => {
    expect(etiquetaTipo('CLIENTE')).toBe('Cliente')
  })

  it('devuelve el valor crudo si no reconoce el tipo', () => {
    expect(etiquetaTipo('INEXISTENTE')).toBe('INEXISTENTE')
  })
})
