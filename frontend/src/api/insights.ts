// Métricas dos vídeos publicados (ADR 0021). Os tipos espelham backend/src/services/insights/types.ts.
import api from '../services/api'

export type Platform = 'instagram' | 'youtube'
export type Bucket = 1 | 7 | 28

export interface MetricsSnapshot {
  at: string
  ageDays: number
  bucket?: Bucket
  views: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  avgWatchSec?: number
  avgViewPercent?: number
  engagedViews?: number
}

export interface Comparison {
  bucket?: Bucket
  views?: number
  median?: number
  ratio?: number
  peers: number
}

export interface VideoMetrics {
  id: string
  platform: Platform
  mediaId: string
  title: string
  url?: string
  thumbnail?: string
  publishedAt: string
  durationSec?: number
  projectId?: string
  privacy?: string
  current: MetricsSnapshot
  snapshots: MetricsSnapshot[]
  /** Comentários mais curtidos, lidos na coleta (entram no brainstorm). */
  topComments?: { text: string; likes: number; at: string }[]
  updatedAt: string
  comparison: Comparison
}

export interface PlatformState {
  connected: boolean
  ok: boolean
  message?: string
  videos: number
}

export interface MetricsOverview {
  state: { lastRunAt?: string; instagram: PlatformState; youtube: PlatformState }
  collecting: boolean
  measured: Record<Platform, number>
  /** Abaixo deste número de vídeos medidos, ainda é cedo para tirar padrão. */
  fewData: number
  videos: VideoMetrics[]
}

export const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'Instagram', youtube: 'YouTube' }

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data)

export const insightsApi = {
  metrics: () => data<MetricsOverview>(api.get('/metrics')),
  /** Coleta agora nas duas plataformas; pode levar um minuto com muitos Reels. */
  refresh: () => data<MetricsOverview>(api.post('/metrics/refresh', {}, { timeout: 300000 })),
}

/** 12300 → "12,3 mil" */
export function formatCount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
  if (n >= 10_000) return `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mil`
  return n.toLocaleString('pt-BR')
}

/** Quanto do vídeo é assistido: o YouTube diz direto; no Instagram, só quando o app sabe a duração. */
export function watchedPercent(v: Pick<VideoMetrics, 'current' | 'durationSec'>) {
  if (v.current.avgViewPercent !== undefined) return v.current.avgViewPercent
  if (v.current.avgWatchSec !== undefined && v.durationSec) return (v.current.avgWatchSec / v.durationSec) * 100
  return undefined
}

/** Compartilhamentos + salvamentos a cada 1.000 visualizações: o sinal de que o vídeo foi além de passar pelo feed. */
export function sharesPerThousand(s: MetricsSnapshot) {
  if (!s.views || (s.shares === undefined && s.saves === undefined)) return undefined
  return (((s.shares ?? 0) + (s.saves ?? 0)) / s.views) * 1000
}
