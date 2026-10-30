import { describe, expect, it } from 'vitest'
import { calcularDiferenciaPeso, parsearPeso, pesoEsValido, pesoTextoEsValido } from './peso'

describe('parsearPeso', () => {
  it('parsea un número con punto decimal', () => {
    expect(parsearPeso('245.5')).toBe(245.5)
  })

  it('parsea un número con coma decimal', () => {
    expect(parsearPeso('245,5')).toBe(245.5)
  })

  it('parsea un entero sin decimales', () => {
    expect(parsearPeso('200')).toBe(200)
  })

  it('devuelve NaN si el texto está vacío', () => {
    expect(parsearPeso('')).toBeNaN()
    expect(parsearPeso('   ')).toBeNaN()
  })

  it('devuelve NaN si el texto no es un número', () => {
    expect(parsearPeso('abc')).toBeNaN()
  })

  it('ignora espacios alrededor', () => {
    expect(parsearPeso('  210  ')).toBe(210)
  })
})

describe('pesoEsValido', () => {
  it('rechaza 0', () => {
    expect(pesoEsValido(0)).toBe(false)
  })

  it('rechaza negativos', () => {
    expect(pesoEsValido(-5)).toBe(false)
  })

  it('rechaza más de 2000', () => {
    expect(pesoEsValido(2000.1)).toBe(false)
  })

  it('acepta 2000 (límite inclusive)', () => {
    expect(pesoEsValido(2000)).toBe(true)
  })

  it('acepta un valor típico', () => {
    expect(pesoEsValido(250)).toBe(true)
  })

  it('rechaza NaN', () => {
    expect(pesoEsValido(NaN)).toBe(false)
  })
})

describe('pesoTextoEsValido', () => {
  it('acepta un texto con coma en rango', () => {
    expect(pesoTextoEsValido('250,5')).toBe(true)
  })

  it('rechaza texto vacío', () => {
    expect(pesoTextoEsValido('')).toBe(false)
  })

  it('rechaza texto no numérico', () => {
    expect(pesoTextoEsValido('abc')).toBe(false)
  })

  it('rechaza fuera de rango', () => {
    expect(pesoTextoEsValido('2500')).toBe(false)
    expect(pesoTextoEsValido('0')).toBe(false)
  })
})

describe('calcularDiferenciaPeso', () => {
  it('resta el peso anterior del nuevo', () => {
    expect(calcularDiferenciaPeso(220, 200)).toBe(20)
  })

  it('devuelve un valor negativo si el animal perdió peso', () => {
    expect(calcularDiferenciaPeso(180, 200)).toBe(-20)
  })

  it('devuelve null si no hay peso anterior', () => {
    expect(calcularDiferenciaPeso(200, null)).toBeNull()
  })

  it('devuelve null si el peso nuevo no es válido', () => {
    expect(calcularDiferenciaPeso(NaN, 200)).toBeNull()
  })
})
