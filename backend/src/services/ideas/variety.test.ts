import { describe, expect, it } from '@jest/globals'
import { aboveMedian, blockReason, mentions, pickCandidates, revisitReason, sameWork, shuffle, varietyLines, type RecentVideo } from './variety.js'
import type { Trend } from './types.js'

// os últimos vídeos de verdade em 13/10 (ADR 0028): três da Tatsumaki em seis
const recent: RecentVideo[] = [
  { title: 'Tatsumaki: Trauma ou Tirania?', work: 'One-Punch Man', trend: 'atemporal' },
  { title: 'O passado de Tatsumaki', work: 'One-Punch Man', trend: 'atemporal' },
  { title: 'OPM S3: PIOR que a S2?', work: 'One-Punch Man', trend: 'alta' },
  { title: 'Megumi vs Sukuna: E o Yuji?', work: 'Jujutsu Kaisen', trend: 'alta' },
]

const idea = (theme: string, work: string, character?: string, trend: Trend = 'alta', bet = false, revisit = false) => ({ theme, work, character, trend, bet, revisit })
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

// os últimos vídeos de verdade em 14/10 (ADR 0033), com o "acima da mediana" dos já medidos
const recent14: RecentVideo[] = [
  { title: 'Em defesa da Yoruichi', work: 'Bleach' },
  { title: 'Momo Ayase: mais que visual', work: 'Dandadan' },
  { title: 'Tsunade, a Hokage mais forte', work: 'Naruto' },
  { title: 'Aizen nunca foi bonzinho', work: 'Bleach' },
  { title: 'Jujutsu Kaisen: Crítica Dividida?', work: 'Jujutsu Kaisen' },
  { title: 'MAKIMA: MANIPULADORA OU VILÃ GENIAL?', work: 'Chainsaw Man' },
  { title: 'Tatsumaki: Trauma ou Tirania?', work: 'One-Punch Man' },
  { title: 'O passado de Tatsumaki', work: 'One-Punch Man', above: false },
  { title: 'OPM S3: PIOR que a S2?', work: 'One-Punch Man', above: false },
  { title: 'Tatsumaki: Heroína Odiada?', work: 'One-Punch Man', above: true },
  { title: 'Edgerunners 2 muda tudo?' },
  { title: 'Yuki Tsukumo: A Feiticeira Mais Ousada?', above: true },
  { title: 'Todo e a vida em dois segundos', above: false },
  { title: 'Kenjaku vs Yuki e Choso: Roteiro Salvou?', above: true },
  { title: 'Quem mata o Gojo em 2v1', above: false },
]

describe('volta de personagens que deram views (ADR 0033)', () => {
  it('a volta precisa de um vídeo acima da mediana', () => {
    expect(revisitReason({ character: 'Yuki Tsukumo' }, recent14)).toBeNull()
    expect(revisitReason({ character: 'Kenjaku' }, recent14)).toBeNull()
    expect(revisitReason({ character: 'Aoi Todo' }, recent14)).toMatch(/não tem vídeo acima da mediana/)
    expect(revisitReason({ character: 'Satoru Gojo' }, recent14)).toMatch(/não tem vídeo acima da mediana/)
    expect(revisitReason({}, recent14)).toMatch(/precisa de uma personagem/)
  })

  it('nunca é a personagem do último vídeo, mas fica livre da janela de 3', () => {
    expect(revisitReason({ character: 'Tsunade' }, [{ title: 'Tsunade, a Hokage mais forte', above: true }])).toMatch(/último vídeo/)
    // a Makima está no 3º vídeo: como ideia comum, não entraria
    const withMakima = [recent14[0], recent14[1], { ...recent14[5], above: true }]
    expect(blockReason({ work: 'Chainsaw Man', character: 'Makima' }, withMakima)).toMatch(/3 últimos/)
    expect(revisitReason({ character: 'Makima' }, withMakima)).toBeNull()
  })

  it('não suga: descansa com o último vídeo abaixo da mediana ou com 3 dos últimos 8', () => {
    // "Heroína Odiada?" foi a campeã, mas "O passado de Tatsumaki" (o mais recente medido) ficou abaixo
    expect(revisitReason({ character: 'Tatsumaki' }, recent14)).toMatch(/O passado de Tatsumaki.*abaixo da mediana/)
    const three = [recent14[0], ...recent14.slice(6, 10)] // 3 da Tatsumaki nos últimos 8 (sem os 3 vídeos de hoje)
    expect(revisitReason({ character: 'Tatsumaki' }, three)).toMatch(/3 dos 8 últimos/)
    // e vale também para a ideia comum, fora da janela de 3
    expect(blockReason({ work: 'Outra', character: 'Tatsumaki' }, [recent14[0], recent14[1], recent14[2], ...three.slice(1)])).toMatch(/descansa/)
  })

  it('uma volta só, que não conta na regra da obra e sempre entra', () => {
    const jjk = [{ title: 'Megumi vs Sukuna', work: 'Jujutsu Kaisen' }, { title: 'O final de JJK', work: 'Jujutsu Kaisen' }, ...recent14]
    const { chosen, rejected } = pickCandidates(
      [
        idea('Tema 1', 'Naruto', 'Kakashi Hatake'),
        idea('Tema 2', 'Dandadan', 'Momo Ayase'),
        idea('Tema 3', 'Jujutsu Kaisen', 'Maki Zenin'),
        idea('Tema 4', 'JoJo', 'Jotaro Kujo'),
        idea('Tema 5', 'Spy x Family', 'Yor Forger'),
        idea('A Yuki é a feiticeira mais livre de JJK', 'Jujutsu Kaisen', 'Yuki Tsukumo', 'atemporal', false, true),
        idea('Outra volta', 'Jujutsu Kaisen', 'Kenjaku', 'alta', false, true),
      ],
      jjk,
      4,
      noShuffle,
    )
    expect(chosen.map(i => i.theme)).toEqual(['A Yuki é a feiticeira mais livre de JJK', 'Tema 1', 'Tema 2', 'Tema 4'])
    expect(rejected.find(r => r.theme === 'Tema 3')?.reason).toMatch(/Jujutsu Kaisen já tem 2/)
    expect(rejected.find(r => r.theme === 'Outra volta')?.reason).toBe('já há uma volta')
  })

  it('acima da mediana com 5% de raspão, pela plataforma, sem os vídeos do dia nem os privados', () => {
    const v = (projectId: string, views: number, platform: 'instagram' | 'youtube' = 'instagram', snapshots = 1, privacy?: string) => ({
      projectId,
      platform,
      privacy,
      current: { at: '', ageDays: 2, views },
      snapshots: Array.from({ length: snapshots }, () => ({ at: '', ageDays: 1, views })),
    })
    // os números do Instagram em 15/10
    const above = aboveMedian([
      v('tatsumaki', 1718), v('tsunade', 1407), v('yuki', 1382), v('kenjaku', 1368), v('opm', 1350),
      v('todo', 1343), v('passado', 1330), v('makima', 1258), v('gojo', 167),
      v('maki', 173, 'instagram', 0), // publicado há horas: fora da mediana e sem resultado
      v('tatsumaki', 0, 'instagram', 0), // o mesmo projeto de novo (post apagado): fica o de mais visualizações
      v('gojo', 50, 'youtube'), v('e', 10, 'youtube'), v('f', 5, 'youtube'),
      v('g', 999, 'youtube', 1, 'private'),
    ])
    // mediana do Instagram = 1.350 (5% abaixo: 1.282,5); a do YouTube (5, 10, 50) = 10
    expect(above.get('tatsumaki')).toBe(true)
    expect(above.get('todo')).toBe(true) // 1.343: 0,5% abaixo, passa de raspão
    expect(above.get('passado')).toBe(true) // 1.330: 1,5% abaixo
    expect(above.get('makima')).toBe(false) // 1.258: 7% abaixo
    expect(above.has('maki')).toBe(false)
    expect(above.get('gojo')).toBe(true) // ruim no Instagram, bom no YouTube
    expect(above.get('f')).toBe(false)
    expect(above.has('g')).toBe(false)
  })

  it('mostra às IAs quem ficou acima ou abaixo da mediana', () => {
    expect(varietyLines(recent14)).toContain('- O passado de Tatsumaki · One-Punch Man · abaixo da mediana')
  })
})
