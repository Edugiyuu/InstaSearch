import { describe, expect, it } from '@jest/globals'
import { alreadyRanked, ensureTierScenes, sameCharacter, tierBoard, tierLetterProblem, tierSeries } from './formats.js'
import type { Beat, ShortProject, TierEntry } from './types.js'

const OPM = 'One Punch Man: o melhor personagem'
const video = (id: string, createdAt: string, tier?: Partial<TierEntry>): Pick<ShortProject, 'id' | 'format' | 'tier' | 'createdAt'> => ({
  id,
  createdAt,
  ...(tier ? { format: 'tierlist' as const, tier: { series: OPM, character: '', rank: 'B' as const, ...tier } } : {}),
})

describe('tier list em série (ADR 0036)', () => {
  const genos = video('genos', '2026-10-01', { character: 'Genos', rank: 'A' })
  const fubuki = video('fubuki', '2026-10-03', { character: 'Fubuki', rank: 'B' })
  const garou = video('garou', '2026-10-05', { character: 'Garou', rank: 'S' })
  const outro = video('outro', '2026-10-02')
  const all = [garou, outro, genos, fubuki]

  it('o quadro de um vídeo são os da série feitos antes dele, mais ele', () => {
    const board = tierBoard(garou, all)!
    expect(board.previous.map(e => e.character)).toEqual(['Genos', 'Fubuki'])
    expect(board.current.character).toBe('Garou')
    expect(board.part).toBe(3)
    // o vídeo do Genos, renderizado de novo, mostra o quadro de quando foi feito
    expect(tierBoard(genos, all)!.previous).toEqual([])
  })

  it('apagar um vídeo tira o personagem do quadro dos seguintes; trocar a fileira já aparece', () => {
    expect(tierBoard(garou, [garou, genos])!.previous.map(e => e.character)).toEqual(['Genos'])
    const genosNoB = { ...genos, tier: { ...genos.tier!, rank: 'B' as const } }
    expect(tierBoard(garou, [garou, genosNoB, fubuki])!.previous[0].rank).toBe('B')
  })

  it('série com outro nome não entra, e vídeo que não é tier list não tem quadro', () => {
    const outraSerie = video('x', '2026-10-04', { character: 'Saitama', series: 'Bleach: o melhor capitão' })
    expect(tierBoard(garou, [...all, outraSerie])!.previous).toHaveLength(2)
    expect(tierBoard(outro, all)).toBeUndefined()
  })

  it('a narração não pode dizer a fileira', () => {
    expect(tierLetterProblem('Por isso o Genos é tier A.')).toMatch(/tier A/)
    expect(tierLetterProblem('Ele merece o rank S, fácil.')).toMatch(/rank S/)
    expect(tierLetterProblem('Isso é coisa de S-tier.')).toMatch(/S-tier/)
    // "Classe B" é a classe de herói; "A tier list" é o começo da frase; "nota a" é o verbo
    expect(tierLetterProblem('A tier list de One Punch Man: a Fubuki lidera a Classe B, e ninguém nota a diferença.')).toBeNull()
    expect(tierLetterProblem('E pra mim, o lugar do Genos é aqui.')).toBeNull()
  })

  it('marca o quadro e a revelação mesmo se a IA não marcar', () => {
    const beat = (say: string): Beat => ({ id: say, say, text: say, query: '', characters: [], scene: 'full', effect: 'none', motion: 'zoom-in', imageStatus: 'missing' })
    const beats = ensureTierScenes([beat('Tier list de OPM, parte 3'), beat('Ele venceu o Saitama?'), beat('Não, mas chegou perto.'), beat('E o lugar dele é aqui.'), beat('Concorda com esse lugar?')])
    expect(beats.map(b => b.tier)).toEqual(['quadro', undefined, undefined, 'revelacao', 'quadro'])
    expect(beats[3].sfx).toBe('impacto')
  })

  it('compara o personagem pelo nome', () => {
    expect(sameCharacter('Garou', 'garou')).toBe(true)
    expect(sameCharacter('Saitama', 'Saitama Sensei')).toBe(true)
    expect(sameCharacter('Genos', 'Garou')).toBe(false)
  })

  it('a próxima parte é de alguém que ainda não está no quadro (para quando a tier list voltar)', () => {
    const series = tierSeries(all)
    expect(alreadyRanked(series, { series: 'One-Punch Man: o melhor personagem', character: 'Genos' })?.rank).toBe('A')
    expect(alreadyRanked(series, { series: OPM, character: 'Saitama' })).toBeUndefined()
  })
})
