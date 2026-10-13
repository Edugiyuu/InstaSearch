import { describe, expect, it } from '@jest/globals'
import { bingSafeSearch, danbooruRatings, mentions } from './imageSearch.js'

describe('danbooruRatings: o que entra do Danbooru', () => {
  it('"sensível" entra, menos no strict; questionável e explícito nunca', () => {
    expect(danbooruRatings('moderate')).toEqual(['g', 's'])
    expect(danbooruRatings('off')).toEqual(['g', 's'])
    expect(danbooruRatings('strict')).toEqual(['g'])
  })
})

describe('bingSafeSearch: a busca segura do Bing vem do .env', () => {
  it('sem valor, ou com um valor desconhecido, fica no moderado', () => {
    expect(bingSafeSearch(undefined)).toBe('moderate')
    expect(bingSafeSearch('')).toBe('moderate')
    expect(bingSafeSearch('desligado')).toBe('moderate')
  })

  it('aceita off e strict, sem ligar para maiúsculas e espaços', () => {
    expect(bingSafeSearch(' OFF ')).toBe('off')
    expect(bingSafeSearch('Strict')).toBe('strict')
  })
})

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
