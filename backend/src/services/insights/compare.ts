/**
 * Contas das métricas, sem acesso a rede nem disco (testadas em compare.test.ts).
 *
 * Por que comparar com a mediana, e na mesma idade (ADR 0021, escolhas 2B e 3B):
 * - visualizações brutas enganam: o canal cresce, e um viral isolado distorce a média;
 * - um vídeo de ontem não tem como competir com um de um mês atrás.
 */

import { BUCKETS, type Bucket, type Comparison, type MetricsSnapshot, type VideoMetrics } from './types.js'

const DAY = 24 * 60 * 60 * 1000

/** Quantos vídeos recentes entram na mediana. */
export const PEERS = 20
/** Com menos vizinhos que isso, não há comparação. */
export const MIN_PEERS = 3
/** Abaixo disso, a tela avisa que ainda é cedo para tirar padrão. */
export const FEW_DATA = 10

export function ageInDays(publishedAt: string, now: number) {
  return Math.max(0, (now - Date.parse(publishedAt)) / DAY)
}

/** Em qual foto fixa cai um vídeo com esta idade: 1 (de 1 a 7 dias), 7 (de 7 a 28) ou 28 (de 28 em diante). */
export function bucketOf(ageDays: number): Bucket | undefined {
  let found: Bucket | undefined
  for (const b of BUCKETS) if (ageDays >= b) found = b
  return found
}

/**
 * Registra os números de agora. Se o vídeo entrou numa idade que ainda não tem foto, a foto é esta.
 * Vídeos que o app só conheceu depois de velhos (ex.: 200 dias) ganham só a foto de 28.
 */
export function withSnapshot(video: VideoMetrics, snap: Omit<MetricsSnapshot, 'bucket'>): VideoMetrics {
  const bucket = bucketOf(snap.ageDays)
  const snapshots = bucket && !video.snapshots.some(s => s.bucket === bucket) ? [...video.snapshots, { ...snap, bucket }] : video.snapshots
  return { ...video, current: snap, snapshots, updatedAt: snap.at }
}

/** O vídeo chegou numa idade (1, 7 ou 28 dias) que ainda não tem foto. */
export function hasDueSnapshot(video: VideoMetrics, now: number) {
  const bucket = bucketOf(ageInDays(video.publishedAt, now))
  return !!bucket && !video.snapshots.some(s => s.bucket === bucket)
}

export function median(values: number[]) {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

const snapshotAt = (video: VideoMetrics, bucket: Bucket) => video.snapshots.find(s => s.bucket === bucket)

/** Vídeo privado no YouTube (o envio pelo app sem auditoria) não tem público: fica fora da comparação. */
const comparable = (v: VideoMetrics) => v.privacy !== 'private'

/**
 * Cada vídeo comparado com a mediana dos últimos vídeos da mesma plataforma, na foto mais velha que ele tem.
 * Ex.: um vídeo de 10 dias usa a foto de 7 e é comparado com a foto de 7 dos outros.
 */
export function compareVideos(videos: VideoMetrics[]): Map<string, Comparison> {
  const result = new Map<string, Comparison>()
  for (const video of videos) {
    const bucket = [...BUCKETS].reverse().find(b => snapshotAt(video, b))
    if (!bucket || !comparable(video)) {
      result.set(video.id, { peers: 0 })
      continue
    }
    const views = snapshotAt(video, bucket)!.views
    const peers = videos
      .filter(v => v.id !== video.id && v.platform === video.platform && comparable(v) && snapshotAt(v, bucket))
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
      .slice(0, PEERS)
      .map(v => snapshotAt(v, bucket)!.views)
    const mid = peers.length >= MIN_PEERS ? median(peers) : undefined
    result.set(video.id, {
      bucket,
      views,
      median: mid,
      ratio: mid ? views / mid : undefined,
      peers: peers.length,
    })
  }
  return result
}

/** Vídeos com pelo menos uma foto fixa (os que já dá para comparar). */
export const measured = (videos: VideoMetrics[]) => videos.filter(v => comparable(v) && v.snapshots.length > 0).length
