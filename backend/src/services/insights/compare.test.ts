import { describe, expect, it } from '@jest/globals'
import { bucketOf, compareVideos, hasDueSnapshot, median, withSnapshot } from './compare.js'
import type { Bucket, VideoMetrics } from './types.js'

const DAY = 24 * 60 * 60 * 1000
const NOW = Date.parse('2026-10-07T12:00:00Z')
const daysAgo = (d: number) => new Date(NOW - d * DAY).toISOString()

function video(id: string, publishedDaysAgo: number, snapshots: { bucket: Bucket; views: number }[] = [], platform: VideoMetrics['platform'] = 'instagram'): VideoMetrics {
  return {
    id,
    platform,
    mediaId: id,
    title: id,
    publishedAt: daysAgo(publishedDaysAgo),
    current: { at: daysAgo(0), ageDays: publishedDaysAgo, views: 0 },
    snapshots: snapshots.map(s => ({ at: daysAgo(0), ageDays: s.bucket, views: s.views, bucket: s.bucket })),
    updatedAt: daysAgo(0),
  }
}

describe('bucketOf', () => {
  it('não tem foto antes de 1 dia', () => {
    expect(bucketOf(0.5)).toBeUndefined()
  })

  it('cai na foto da idade alcançada', () => {
    expect(bucketOf(1)).toBe(1)
    expect(bucketOf(6.9)).toBe(1)
    expect(bucketOf(7)).toBe(7)
    expect(bucketOf(27)).toBe(7)
    expect(bucketOf(28)).toBe(28)
  })

  it('vídeo velho entra na foto de 28', () => {
    expect(bucketOf(400)).toBe(28)
  })
})

describe('withSnapshot', () => {
  it('guarda a foto da idade quando ela ainda não existe', () => {
    const v = withSnapshot(video('a', 1.4), { at: daysAgo(0), ageDays: 1.4, views: 500 })
    expect(v.snapshots).toHaveLength(1)
    expect(v.snapshots[0]).toMatchObject({ bucket: 1, views: 500, ageDays: 1.4 })
    expect(v.current.views).toBe(500)
  })

  it('não troca a foto já tirada, só os números de agora', () => {
    const first = withSnapshot(video('a', 2), { at: daysAgo(0), ageDays: 2, views: 500 })
    const again = withSnapshot(first, { at: daysAgo(0), ageDays: 3, views: 900 })
    expect(again.snapshots).toHaveLength(1)
    expect(again.snapshots[0].views).toBe(500)
    expect(again.current.views).toBe(900)
  })

  it('vídeo com menos de 1 dia não ganha foto', () => {
    const v = withSnapshot(video('a', 0.3), { at: daysAgo(0), ageDays: 0.3, views: 80 })
    expect(v.snapshots).toHaveLength(0)
  })
})

describe('hasDueSnapshot', () => {
  it('avisa quando o vídeo faz 7 dias e só tem a foto de 1', () => {
    expect(hasDueSnapshot(video('a', 7.1, [{ bucket: 1, views: 10 }]), NOW)).toBe(true)
  })

  it('fica quieto quando a foto da idade já existe', () => {
    expect(hasDueSnapshot(video('a', 8, [{ bucket: 1, views: 10 }, { bucket: 7, views: 30 }]), NOW)).toBe(false)
  })

  it('fica quieto antes de 1 dia', () => {
    expect(hasDueSnapshot(video('a', 0.5), NOW)).toBe(false)
  })
})

describe('median', () => {
  it('pega o do meio, ou a média dos dois do meio', () => {
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeUndefined()
  })
})

describe('compareVideos', () => {
  it('compara com a mediana dos outros na mesma idade', () => {
    const videos = [
      video('alvo', 10, [{ bucket: 7, views: 3000 }]),
      video('b', 20, [{ bucket: 7, views: 1000 }]),
      video('c', 30, [{ bucket: 7, views: 1500 }]),
      video('d', 40, [{ bucket: 7, views: 500 }]),
    ]
    const c = compareVideos(videos).get('alvo')!
    expect(c.bucket).toBe(7)
    expect(c.median).toBe(1000)
    expect(c.ratio).toBe(3)
    expect(c.peers).toBe(3)
  })

  it('usa a foto mais velha que o vídeo tem', () => {
    const videos = [
      video('alvo', 30, [{ bucket: 1, views: 100 }, { bucket: 7, views: 400 }, { bucket: 28, views: 900 }]),
      video('b', 40, [{ bucket: 28, views: 300 }]),
      video('c', 50, [{ bucket: 28, views: 300 }]),
      video('d', 60, [{ bucket: 28, views: 300 }]),
    ]
    expect(compareVideos(videos).get('alvo')).toMatchObject({ bucket: 28, ratio: 3 })
  })

  it('não compara com menos de 3 vizinhos', () => {
    const videos = [video('alvo', 10, [{ bucket: 7, views: 3000 }]), video('b', 20, [{ bucket: 7, views: 1000 }])]
    const c = compareVideos(videos).get('alvo')!
    expect(c.ratio).toBeUndefined()
    expect(c.peers).toBe(1)
  })

  it('não mistura Instagram com YouTube', () => {
    const videos = [
      video('alvo', 10, [{ bucket: 7, views: 3000 }]),
      video('y1', 20, [{ bucket: 7, views: 10 }], 'youtube'),
      video('y2', 20, [{ bucket: 7, views: 10 }], 'youtube'),
      video('y3', 20, [{ bucket: 7, views: 10 }], 'youtube'),
    ]
    expect(compareVideos(videos).get('alvo')!.peers).toBe(0)
  })

  it('deixa os vídeos privados de fora, como alvo e como vizinho', () => {
    const privado = { ...video('p', 15, [{ bucket: 7, views: 0 }]), privacy: 'private' }
    const videos = [
      video('alvo', 10, [{ bucket: 7, views: 2000 }]),
      video('b', 20, [{ bucket: 7, views: 1000 }]),
      video('c', 30, [{ bucket: 7, views: 1000 }]),
      video('d', 40, [{ bucket: 7, views: 1000 }]),
      privado,
    ]
    const result = compareVideos(videos)
    expect(result.get('alvo')).toMatchObject({ peers: 3, median: 1000, ratio: 2 })
    expect(result.get('p')).toEqual({ peers: 0 })
  })

  it('vídeo sem foto fica sem comparação', () => {
    expect(compareVideos([video('novo', 0.2)]).get('novo')).toEqual({ peers: 0 })
  })
})
