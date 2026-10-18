import { describe, expect, it } from '@jest/globals'
import { applyChoice, clearChoices, effectiveBeat, mentionedEffects, protectChosen, validChoice } from './effects.js'
import { cleanBeats } from './shortsAI.js'
import type { Beat } from './types.js'

const beat = (id: string, changes: Partial<Beat> = {}): Beat => ({
  id,
  say: `fala ${id}`,
  text: id.toUpperCase(),
  query: `imagem ${id}`,
  characters: ['sukuna'],
  scene: 'full',
  effect: 'none',
  motion: 'zoom-in',
  imageStatus: 'match',
  ...changes,
})

const ids = (beats: Beat[]) => new Set(beats.map(b => b.id))

describe('validChoice', () => {
  it('aceita os valores de cada efeito e o automático', () => {
    expect(validChoice('motion', 'still')).toBe(true)
    expect(validChoice('transition', 'flash-black')).toBe(true)
    expect(validChoice('effect', 'circle')).toBe(true)
    expect(validChoice('focus', '')).toBe(true)
    expect(validChoice('motion', null)).toBe(true)
  })

  it('recusa valor de outro efeito e a reação (que é a figurinha)', () => {
    expect(validChoice('motion', 'flash')).toBe(false)
    expect(validChoice('effect', 'emoji')).toBe(false)
    expect(validChoice('focus', 42)).toBe(false)
  })
})

describe('effectiveBeat: a escolha vale por cima da IA', () => {
  it('sem escolha, é a cena da IA', () => {
    const b = beat('a', { focus: 'rosto' })
    expect(effectiveBeat(b)).toBe(b)
  })

  it('a escolha troca só o campo escolhido; foco vazio é a imagem inteira', () => {
    const b = effectiveBeat(beat('a', { focus: 'rosto', chosen: { motion: 'shake', focus: '' } }))
    expect(b.motion).toBe('shake')
    expect(b.focus).toBeUndefined()
    expect(b.effect).toBe('none')
  })
})

describe('applyChoice e clearChoices', () => {
  const beats = [beat('a'), beat('b', { characters: ['gojo'] }), beat('c', { characters: ['Sukuna'] })]

  it('só esta cena', () => {
    const out = applyChoice(beats, 'c', 'motion', 'shake')
    expect(out.map(b => b.chosen?.motion)).toEqual([undefined, undefined, 'shake'])
  })

  it('as cenas do mesmo personagem, sem ligar para maiúsculas', () => {
    const out = applyChoice(beats, 'a', 'effect', 'circle', 'personagem')
    expect(out.map(b => b.chosen?.effect)).toEqual(['circle', undefined, 'circle'])
  })

  it('a transição para todas pula a primeira cena, que não tem corte antes', () => {
    const out = applyChoice(beats, 'b', 'transition', 'flash', 'todas')
    expect(out.map(b => b.chosen?.transition)).toEqual([undefined, 'flash', 'flash'])
  })

  it('o automático tira o campo, e o `chosen` vazio some', () => {
    const chosen = applyChoice(beats, 'a', 'motion', 'still')
    const back = applyChoice(chosen, 'a', 'motion', null)
    expect(back[0]).not.toHaveProperty('chosen')
  })

  it('"voltar ao que a IA fez" tira todas as escolhas da cena', () => {
    const chosen = applyChoice(applyChoice(beats, 'a', 'motion', 'still'), 'a', 'effect', 'arrow')
    expect(clearChoices(chosen, 'a')[0]).not.toHaveProperty('chosen')
  })
})

describe('mentionedEffects', () => {
  it('acha o efeito pelas palavras do pedido', () => {
    expect(mentionedEffects('tira o tremor da cena 3')).toEqual(new Set(['motion']))
    expect(mentionedEffects('põe um flash branco antes da cena 4')).toEqual(new Set(['transition']))
    expect(mentionedEffects('troca a seta por um círculo')).toEqual(new Set(['effect']))
    expect(mentionedEffects('foca na mão')).toEqual(new Set(['focus']))
  })

  it('pedido que não fala de efeito', () => {
    expect(mentionedEffects('final mais polêmico').size).toBe(0)
  })
})

describe('protectChosen: o chat diante da escolha do usuário (ADR 0037, 3A)', () => {
  // o usuário escolheu tremer na cena 2; por baixo, a IA tinha posto zoom in
  const before = [beat('a'), beat('b', { chosen: { motion: 'shake' } })]

  it('pedido geral não troca a escolha, e a resposta diz qual cena ficou', () => {
    const fromChat = [beat('a', { motion: 'pan' }), beat('b', { motion: 'pan' })]
    const { beats, kept } = protectChosen(before, fromChat, new Set(), mentionedEffects('mais movimento'))
    expect(beats[0].motion).toBe('pan')
    expect(effectiveBeat(beats[1]).motion).toBe('shake')
    expect(beats[1].motion).toBe('zoom-in')
    expect(kept).toEqual([2])
  })

  it('pedido que cita a cena e fala do efeito troca, e continua sendo escolha do usuário', () => {
    const fromChat = [beat('a'), beat('b', { motion: 'still' })]
    const { beats, kept } = protectChosen(before, fromChat, ids([before[1]]), mentionedEffects('deixa a cena 2 parada'))
    expect(beats[1].chosen?.motion).toBe('still')
    expect(beats[1].motion).toBe('zoom-in')
    expect(kept).toEqual([])
  })

  it('pedido que cita a cena mas fala de outra coisa não troca a escolha', () => {
    const fromChat = [beat('a'), beat('b', { motion: 'pan', query: 'sukuna rindo' })]
    const { beats, kept } = protectChosen(before, fromChat, ids([before[1]]), mentionedEffects('troca a imagem da cena 2'))
    expect(effectiveBeat(beats[1]).motion).toBe('shake')
    expect(beats[1].query).toBe('sukuna rindo')
    expect(kept).toEqual([2])
  })

  it('o chat devolve o valor escolhido como se fosse dele: o da IA, por baixo, não se perde', () => {
    // o chat vê "shake" (o efetivo) e devolve "shake" sem mexer
    const fromChat = cleanBeats([{ ...beat('b'), motion: 'shake' }], before)
    const { beats, kept } = protectChosen(before, fromChat, new Set(), new Set())
    expect(beats[0].motion).toBe('zoom-in')
    expect(beats[0].chosen?.motion).toBe('shake')
    expect(kept).toEqual([])
  })
})
