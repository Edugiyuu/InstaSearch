// Métricas dos vídeos publicados (ADR 0021). Dados em data/metrics/.

export type Platform = 'instagram' | 'youtube'

/** As fotos fixas: 1, 7 e 28 dias depois de publicar. A de 28 vale para qualquer idade a partir daí. */
export const BUCKETS = [1, 7, 28] as const
export type Bucket = (typeof BUCKETS)[number]

export interface MetricsSnapshot {
  at: string
  /** Idade do vídeo na hora da foto, em dias. 1,4 = o backend estava desligado quando o vídeo fez 1 dia. */
  ageDays: number
  /** Em qual foto fixa esta entra; sem valor = só a foto de agora. */
  bucket?: Bucket
  views: number
  reach?: number
  likes?: number
  comments?: number
  shares?: number
  saves?: number
  /** Tempo médio assistido, em segundos. */
  avgWatchSec?: number
  /** Quanto do vídeo é assistido em média, em % (YouTube). */
  avgViewPercent?: number
  /** YouTube: visualizações que passaram dos primeiros segundos (a contagem antiga dos Shorts). */
  engagedViews?: number
}

/** Um comentário do público, guardado para as ideias (ADR 0021, escolha 1B). */
export interface AudienceComment {
  text: string
  likes: number
  at: string
}

export interface VideoMetrics {
  /** `${platform}_${mediaId}` */
  id: string
  platform: Platform
  /** Id do post no Instagram ou do vídeo no YouTube. */
  mediaId: string
  /** Título do projeto, se o vídeo saiu do app; senão a legenda ou o título da plataforma. */
  title: string
  url?: string
  thumbnail?: string
  publishedAt: string
  durationSec?: number
  /** O projeto que gerou o vídeo (só para os publicados pelo app). */
  projectId?: string
  /** YouTube: public, unlisted ou private. Vídeo privado não tem visualizações. */
  privacy?: string
  /** Os números de agora. */
  current: MetricsSnapshot
  /** As fotos fixas (1, 7 e 28 dias), uma por idade. */
  snapshots: MetricsSnapshot[]
  /** Os comentários mais curtidos e recentes (até 20), lidos na coleta. */
  topComments?: AudienceComment[]
  updatedAt: string
}

export interface PlatformState {
  connected: boolean
  /** A última coleta desta plataforma deu certo. */
  ok: boolean
  /** O que deu errado ou o que falta (permissão, API desativada). */
  message?: string
  videos: number
}

export interface MetricsState {
  id: 'state'
  lastRunAt?: string
  instagram: PlatformState
  youtube: PlatformState
}

/** Como um vídeo se sai perto dos outros da mesma plataforma, na mesma idade. */
export interface Comparison {
  /** A foto usada: a mais velha que o vídeo já tem. */
  bucket?: Bucket
  views?: number
  /** Mediana das visualizações dos últimos vídeos na mesma foto. */
  median?: number
  /** views / median; sem valor quando ainda não há com quem comparar. */
  ratio?: number
  /** Quantos vídeos entraram na mediana. */
  peers: number
}
