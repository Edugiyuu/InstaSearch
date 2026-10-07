import { describe, expect, it } from '@jest/globals'
import { buildRefs, cleanIdeas, snapDuration, videoLine, type MeasuredVideo } from './clean.js'
import type { ShortProject } from '../shorts/types.js'

function video(id: string, publishedAt: string, extra: Partial<MeasuredVideo> = {}): MeasuredVideo {
  return {
    id,
    platform: 'instagram',
    mediaId: id,
    title: `Vídeo ${id}`,
    url: `https://instagram.com/reel/${id}`,
    publishedAt,
    current: { at: publishedAt, ageDays: 10, views: 12300, avgWatchSec: 8.5 },
    snapshots: [],
    updatedAt: publishedAt,
    comparison: { bucket: 7, ratio: 2.4, median: 5125, views: 12300, peers: 5 },
    ...extra,
  }
}

const options = { styleIds: ['comentario-anime', 'ranking'], toneIds: ['polemico', 'papo-reto'], defaultStyle: 'comentario-anime', defaultTone: 'polemico' }

describe('buildRefs', () => {
  it('etiqueta os vídeos do mais novo para o mais velho e deixa os privados de fora', () => {
    const refs = buildRefs(
      [video('velho', '2026-09-01T00:00:00Z'), video('novo', '2026-10-01T00:00:00Z'), video('priv', '2026-10-02T00:00:00Z', { privacy: 'private' })],
      [],
    )
    expect(refs.videos.map(v => [v.ref, v.video.id])).toEqual([
      ['V1', 'novo'],
      ['V2', 'velho'],
    ])
  })

  it('junta os comentários de todos os vídeos, os mais curtidos primeiro', () => {
    const refs = buildRefs(
      [
        video('a', '2026-10-01T00:00:00Z', { topComments: [{ text: 'faz do sukuna', likes: 3, at: '' }] }),
        video('b', '2026-09-01T00:00:00Z', { topComments: [{ text: 'e o toji?', likes: 40, at: '' }] }),
      ],
      [],
    )
    expect(refs.comments.map(c => [c.ref, c.comment.text, c.video.ref])).toEqual([
      ['C1', 'e o toji?', 'V2'],
      ['C2', 'faz do sukuna', 'V1'],
    ])
  })
})

describe('videoLine', () => {
  const names = { style: (id: string) => (id === 'ranking' ? 'Ranking' : id), tone: (p: ShortProject) => p.tone }

  it('mostra a comparação e os números reais', () => {
    const [ref] = buildRefs([video('a', '2026-10-01T00:00:00Z')], []).videos
    const line = videoLine(ref, names)
    expect(line).toContain('[V1] Instagram')
    expect(line).toContain('2,4× a mediana do canal (aos 7 dias)')
    expect(line).toContain('12.300 visualizações')
    expect(line).toContain('feito fora do app')
  })

  it('usa o tema, o estilo e o tom do projeto quando o vídeo saiu do app', () => {
    const project = { id: 'p1', theme: 'Por que o Gojo perdeu?', styleId: 'ranking', tone: 'Polêmico', duration: 30 } as ShortProject
    const [ref] = buildRefs([video('a', '2026-10-01T00:00:00Z', { projectId: 'p1' })], [project]).videos
    const line = videoLine(ref, names)
    expect(line).toContain('tema: Por que o Gojo perdeu?')
    expect(line).toContain('estilo: Ranking')
    expect(line).toContain('tom: Polêmico')
  })
})

describe('snapDuration', () => {
  it('arredonda para a duração mais perto do Novo vídeo', () => {
    expect(snapDuration(30)).toBe(30)
    expect(snapDuration(33)).toBe(30)
    expect(snapDuration(60)).toBe(40)
    expect(snapDuration('16')).toBe(15)
    expect(snapDuration('meio minuto')).toBe(30)
  })
})

describe('cleanIdeas', () => {
  const refs = buildRefs(
    [video('a', '2026-10-01T00:00:00Z', { topComments: [{ text: 'faz do sukuna', likes: 3, at: '' }] })],
    [],
  )

  it('troca as etiquetas pelos dados reais', () => {
    const [idea] = cleanIdeas(
      [{ theme: 'O Sukuna venceria o Gojo no auge?', hook: 'Ninguém fala disso.', styleId: 'ranking', toneId: 'papo-reto', duration: 30, why: 'Pedido nos comentários.', videos: ['V1'], comments: ['[C1]'], web: 'Capítulo 236 saiu.' }],
      refs,
      options,
    )
    expect(idea.styleId).toBe('ranking')
    expect(idea.toneId).toBe('papo-reto')
    expect(idea.evidence).toEqual([
      { kind: 'video', text: 'Vídeo a', url: 'https://instagram.com/reel/a', platform: 'instagram', ratio: 2.4 },
      { kind: 'comentario', text: 'faz do sukuna', url: 'https://instagram.com/reel/a', platform: 'instagram' },
      { kind: 'web', text: 'Capítulo 236 saiu.' },
    ])
  })

  it('descarta etiquetas que não existem, em vez de inventar a prova', () => {
    const [idea] = cleanIdeas([{ theme: 'Tema que é bem específico', videos: ['V9'], comments: ['C7'] }], refs, options)
    expect(idea.evidence).toEqual([])
  })

  it('usa o estilo e o tom padrão quando a IA inventa um id', () => {
    const [idea] = cleanIdeas([{ theme: 'Tema que é bem específico', styleId: 'estilo-que-nao-existe', toneId: 42 }], refs, options)
    expect(idea.styleId).toBe('comentario-anime')
    expect(idea.toneId).toBe('polemico')
  })

  it('ignora tema vazio, curto demais ou repetido', () => {
    const ideas = cleanIdeas([{ theme: '' }, { theme: 'Gojo' }, { theme: 'Tema que é bem específico' }, { theme: 'tema que é bem específico' }], refs, options)
    expect(ideas).toHaveLength(1)
  })
})
