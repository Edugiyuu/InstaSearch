import { describe, expect, it } from '@jest/globals'
import { normalize } from './text.js'

describe('normalize', () => {
  it('deixa tudo em minúsculas', () => {
    expect(normalize('Pensativo')).toBe('pensativo')
  })

  it('remove os acentos', () => {
    expect(normalize('mão')).toBe('mao')
    expect(normalize('ação')).toBe('acao')
    expect(normalize('Ícone Ágil')).toBe('icone agil')
  })

  it('faz textos com e sem acento ficarem iguais', () => {
    expect(normalize('Coração')).toBe(normalize('coracao'))
  })

  it('não mexe em espaços, números e pontuação', () => {
    expect(normalize('Gojo vs. Sukuna 2')).toBe('gojo vs. sukuna 2')
  })

  it('aceita texto vazio', () => {
    expect(normalize('')).toBe('')
  })
})
