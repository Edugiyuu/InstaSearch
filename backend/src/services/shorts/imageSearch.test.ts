import { describe, expect, it } from '@jest/globals'
import { mentions } from './imageSearch.js'

describe('mentions: a busca já cita a obra do vídeo? (ADR 0024)', () => {
  it('não cita: a obra entra na busca', () => {
    expect(mentions('cena violenta com sangue, mangá', 'Cyberpunk: Edgerunners')).toBe(false)
    expect(mentions('Night City visto de cima', 'Cyberpunk: Edgerunners')).toBe(false)
  })

  it('só uma parte do nome não basta', () => {
    expect(mentions('grupo de edgerunners novos posando', 'Cyberpunk: Edgerunners')).toBe(false)
  })

  it('cita, sem ligar para maiúsculas, acentos e pontuação', () => {
    expect(mentions('Lucy olhando a lua, cyberpunk edgerunners', 'Cyberpunk: Edgerunners')).toBe(true)
    expect(mentions('pôster da temporada de MIRACULOUS ladybug', 'Miraculous Ladybug')).toBe(true)
  })

  it('vídeo sem obra: nada a acrescentar', () => {
    expect(mentions('pessoa organizando a mesa', '')).toBe(true)
  })
})
