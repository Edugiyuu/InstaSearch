import { describe, expect, it } from '@jest/globals'
import { catchphraseRole, markPivot, pickPhrase, pickPivotClip, pivotHistory } from './pivot.js'
import type { Beat, Catchphrase, ShortProject } from './types.js'

const beat = (id: string, say: string, pivot?: Beat['pivot']): Beat => ({
  id, say, text: say, query: '', characters: [], scene: 'full', effect: 'none', motion: 'zoom-in', imageStatus: 'missing', ...(pivot ? { pivot } : {}),
})
const clip = (id: string, createdAt: string, extra: Partial<Catchphrase> = {}): Catchphrase => ({
  id, name: id, kind: 'clipe', file: `${id}.mp4`, duration: 5, role: 'meio', createdAt, ...extra,
})
const video = (id: string, createdAt: string, phrase?: string, clipId?: string | null): Pick<ShortProject, 'id' | 'beats' | 'createdAt'> => ({
  id, createdAt, beats: [beat('a', 'gancho'), ...(phrase ? [beat('b', phrase, { phrase, clipId })] : [])],
})

describe('a frase da virada (ADR 0039)', () => {
  it('marca a batida que fala a frase, sem contar caixa, acento e pontuação', () => {
    const beats = markPivot([beat('1', 'O Toji venceria?'), beat('2', 'calma que PIORA'), beat('3', 'Ele tinha')], 'Calma, que piora.')
    expect(beats.map(b => b.pivot?.phrase)).toEqual([undefined, 'Calma, que piora.', undefined])
  })

  it('sem a frase como foi escrita, nenhuma cena vira a virada (nada inventado)', () => {
    const beats = markPivot([beat('1', 'Calma, que vai piorar.'), beat('2', 'x', { phrase: 'Calma, que piora.' })], 'Calma, que piora.')
    expect(beats.every(b => !b.pivot)).toBe(true)
  })

  it('a cena que já era a virada guarda o clipe escolhido', () => {
    const [b] = markPivot([beat('1', 'Calma, que piora.', { phrase: 'Calma, que piora.', clipId: 'd1', locked: true })], 'Calma, que piora.')
    expect(b.pivot).toEqual({ phrase: 'Calma, que piora.', clipId: 'd1', locked: true })
  })

  it('a frase da vez é a que está há mais tempo sem sair; a nunca usada primeiro', () => {
    const history = pivotHistory([video('v1', '2026-10-01', 'Pera.'), video('v2', '2026-10-02', 'Calma, que piora.'), video('v3', '2026-10-03')])
    expect(pickPhrase(['Calma, que piora.', 'Pera.'], history)).toBe('Pera.')
    expect(pickPhrase(['Calma, que piora.', 'Pera.', 'Respira.'], history)).toBe('Respira.')
    expect(pickPhrase([], history)).toBeUndefined()
  })
})

describe('o rodízio dos clipes do meio (ADR 0039)', () => {
  const clips = [clip('d1', '2026-10-01'), clip('d2', '2026-10-02'), clip('d3', '2026-10-03')]
  // do mais novo para o mais velho: d2 saiu no último vídeo, d1 no penúltimo
  const history = pivotHistory([video('v1', '2026-10-10', 'x', 'd1'), video('v2', '2026-10-11', 'x', 'd2')])

  it('descanso: sorteia entre os que não saíram nos últimos N vídeos', () => {
    expect(pickPivotClip(clips, history, { order: 'descanso', rest: 2 }, () => 0)).toBe('d3')
    // com N = 1, d1 já descansou: entra no sorteio com o d3
    expect(pickPivotClip(clips, history, { order: 'descanso', rest: 1 }, () => 0)).toBe('d1')
  })

  it('descanso: se todos saíram há pouco, o que descansou mais', () => {
    expect(pickPivotClip(clips.slice(0, 2), history, { order: 'descanso', rest: 5 })).toBe('d1')
  })

  it('aleatório: nunca o do último vídeo', () => {
    for (const r of [0, 0.5, 0.99]) expect(pickPivotClip(clips, history, { order: 'aleatorio', rest: 2 }, () => r)).not.toBe('d2')
  })

  it('sequência: o seguinte ao do último vídeo, na ordem de envio, voltando ao começo', () => {
    expect(pickPivotClip(clips, history, { order: 'sequencia', rest: 2 })).toBe('d3')
    expect(pickPivotClip(clips, pivotHistory([video('v', '2026-10-12', 'x', 'd3')]), { order: 'sequencia', rest: 2 })).toBe('d1')
  })

  it('só clipes do meio, com arquivo e no rodízio; "sem virada" não conta como uso', () => {
    const mixed = [clip('a', '2026-10-01', { role: 'abertura' }), clip('fora', '2026-10-02', { inRotation: false }), clip('ok', '2026-10-03')]
    expect(pickPivotClip(mixed, [], { order: 'descanso', rest: 2 })).toBe('ok')
    expect(pickPivotClip([], [], { order: 'descanso', rest: 2 })).toBeUndefined()
    expect(pivotHistory([video('v', '2026-10-01', 'x', null)])).toEqual([{ phrase: 'x', clipId: undefined }])
  })

  it('bordões de antes do campo: o padrão de abertura abre; o de final e o "se inscreve" fecham', () => {
    expect(catchphraseRole({ kind: 'clipe', defaultIntro: true })).toBe('abertura')
    expect(catchphraseRole({ kind: 'inscreva' })).toBe('final')
    expect(catchphraseRole({ kind: 'montado', defaultOutro: true })).toBe('final')
    expect(catchphraseRole({ kind: 'montado' })).toBe('abertura')
  })
})
