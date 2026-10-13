import { describe, expect, it } from '@jest/globals'
import { blockReason, mentions, pickCandidates, sameWork, shuffle, varietyLines, type RecentVideo } from './variety.js'
import type { Trend } from './types.js'

// os últimos vídeos de verdade em 13/10 (ADR 0028): três da Tatsumaki em seis
const recent: RecentVideo[] = [
  { title: 'Tatsumaki: Trauma ou Tirania?', work: 'One-Punch Man', trend: 'atemporal' },
  { title: 'O passado de Tatsumaki', work: 'One-Punch Man', trend: 'atemporal' },
  { title: 'OPM S3: PIOR que a S2?', work: 'One-Punch Man', trend: 'alta' },
  { title: 'Megumi vs Sukuna: E o Yuji?', work: 'Jujutsu Kaisen', trend: 'alta' },
]

const idea = (theme: string, work: string, character?: string, trend: Trend = 'alta', bet = false) => ({ theme, work, character, trend, bet })
const noShuffle = () => 0.999 // com 0,999 o Fisher–Yates troca cada item com ele mesmo

describe('variedade nos temas do debate (ADR 0028)', () => {
  it('compara obra sem ligar para hífen, acento ou subtítulo', () => {
    expect(sameWork('One-Punch Man', 'One Punch Man')).toBe(true)
    expect(sameWork('Jujutsu Kaisen Modulo', 'Jujutsu Kaisen')).toBe(true)
    expect(sameWork('Naruto', 'Jujutsu Kaisen')).toBe(false)
    expect(sameWork(undefined, 'Naruto')).toBe(false)
  })

  it('acha a personagem por uma palavra do nome, sem acento', () => {
    expect(mentions('O passado de Tatsumaki', 'Tatsumaki')).toBe(true)
    expect(mentions('E se Yuji fosse Sukuna?', 'Yuji Itadori')).toBe(true)
    expect(mentions('Por que Naruto gostava da Sakura?', 'Hinata Hyuga')).toBe(false)
    expect(mentions('Gojo é o mais forte', undefined)).toBe(false)
  })

  it('bloqueia a personagem dos 3 últimos vídeos e a obra com 2 dos 4 últimos', () => {
    expect(blockReason({ work: 'One-Punch Man', character: 'Tatsumaki' }, recent)).toMatch(/Tatsumaki/)
    expect(blockReason({ work: 'One-Punch Man', character: 'Garou' }, recent)).toMatch(/One-Punch Man já tem 3/)
    // Jujutsu Kaisen tem só 1 dos 4 últimos, e o Megumi está no 4º vídeo (fora da janela de 3)
    expect(blockReason({ work: 'Jujutsu Kaisen', character: 'Megumi Fushiguro' }, recent)).toBeNull()
  })

  it('fica com uma ideia por obra e só uma aposta, e diz por que tirou as outras', () => {
    const { chosen, rejected } = pickCandidates(
      [
        idea('A Tatsumaki tem razão?', 'One-Punch Man', 'Tatsumaki'),
        idea('O Yuji vira o novo Sukuna?', 'Jujutsu Kaisen', 'Yuji Itadori'),
        idea('O final de Jujutsu Kaisen', 'Jujutsu Kaisen'),
        idea('Por que a Malfoid bombou?', 'Harry Potter', 'Draco Malfoy', 'alta', true),
        idea('Outra aposta qualquer', 'Arcane', 'Jinx', 'alta', true),
        idea('Kakashi foi um bom sensei?', 'Naruto', 'Kakashi Hatake', 'atemporal'),
      ],
      recent,
      4,
      noShuffle,
    )
    expect(chosen.map(i => i.work)).toEqual(['Jujutsu Kaisen', 'Harry Potter', 'Naruto'])
    expect(rejected.map(r => r.theme)).toEqual(['A Tatsumaki tem razão?', 'O final de Jujutsu Kaisen', 'Outra aposta qualquer'])
  })

  it('não deixa as 4 todas em alta quando sobra uma atemporal', () => {
    const { chosen } = pickCandidates(
      [
        idea('Tema 1', 'Naruto'),
        idea('Tema 2', 'Bleach'),
        idea('Tema 3', 'Chainsaw Man'),
        idea('Tema 4', 'Dandadan'),
        idea('Tema 5', 'JoJo', undefined, 'atemporal'),
      ],
      [],
      4,
      noShuffle,
    )
    expect(chosen.map(i => i.theme)).toEqual(['Tema 1', 'Tema 2', 'Tema 3', 'Tema 5'])
  })

  it('sorteia a ordem sem perder nem repetir temas', () => {
    const items = [1, 2, 3, 4]
    const out = shuffle(items, () => 0)
    expect(out).not.toEqual(items)
    expect([...out].sort()).toEqual(items)
  })

  it('resume a variedade para as IAs', () => {
    const text = varietyLines(recent)
    expect(text).toContain('Obras repetidas nos últimos 4: 3× One-Punch Man')
    expect(text).toContain('2 de 4 (dos que têm a marca) foram de tema em alta.')
  })
})
