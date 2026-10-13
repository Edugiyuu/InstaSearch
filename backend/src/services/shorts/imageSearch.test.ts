import { describe, expect, it } from '@jest/globals'
import { interleave, mentions, pickCandidates, safety, type WebImage } from './imageSearch.js'

describe('safety: o filtro das sugestões pela opção "Imagens sugestivas"', () => {
  it('desligada: Bing rígido e Danbooru só "geral"', () => {
    expect(safety(false)).toEqual({ bing: 'strict', danbooru: ['g'] })
  })

  it('ligada: Bing moderado e Danbooru também "sensível"; nunca questionável nem explícito', () => {
    expect(safety(true)).toEqual({ bing: 'moderate', danbooru: ['g', 's'] })
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

describe('pickCandidates: metade web, metade fanart (adendo ao ADR 0020)', () => {
  const img = (source: WebImage['source'], n: number, characters?: string[]): WebImage => ({
    id: `${source}-${n}`,
    thumb: `https://x/${source}/${n}.jpg`,
    url: `https://x/${source}/${n}.jpg`,
    source,
    title: `${source} ${n}`,
    characters,
  })
  const web = (count: number) => Array.from({ length: count }, (_, n) => img('web', n))
  const fanart = (count: number) => Array.from({ length: count }, (_, n) => img('danbooru', n, ['gojo']))
  const sources = (list: WebImage[]) => list.map(i => i.source)

  it('intercala 3 da web e 3 fanarts, mesmo com a fanart no fim da lista', () => {
    const out = pickCandidates([...web(12), ...fanart(10)], 1)
    expect(sources(out)).toEqual(['web', 'danbooru', 'web', 'danbooru', 'web', 'danbooru'])
  })

  it('sem fanart (cena sem personagem), a web ocupa todas as vagas', () => {
    expect(sources(pickCandidates(web(12), 0))).toEqual(Array(6).fill('web'))
  })

  it('com pouca web, a fanart completa as vagas', () => {
    const out = pickCandidates([...web(1), ...fanart(10)], 1)
    expect(sources(out)).toEqual(['web', 'danbooru', 'danbooru', 'danbooru', 'danbooru', 'danbooru'])
  })

  it('fanart com gente a mais vai para o fim, sem mudar a ordem das outras', () => {
    const crowd = img('danbooru', 99, ['gojo', 'toji', 'yuji'])
    const out = pickCandidates([crowd, ...fanart(3)], 1, 3)
    expect(out.map(i => i.id)).toEqual(['danbooru-0', 'danbooru-1', 'danbooru-2'])
  })
})

describe('interleave: web e fanart alternadas na lista de sugestões', () => {
  it('alterna e põe no fim o que sobra da lista maior', () => {
    expect(interleave([1, 2, 3, 4], ['a', 'b'])).toEqual([1, 'a', 2, 'b', 3, 4])
    expect(interleave([1], ['a', 'b', 'c'])).toEqual([1, 'a', 'b', 'c'])
  })

  it('uma lista vazia devolve a outra', () => {
    expect(interleave([], ['a'])).toEqual(['a'])
  })
})
