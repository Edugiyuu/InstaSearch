/**
 * O que a IA lê e o que fica da resposta dela, sem rede nem disco (testado em clean.test.ts).
 *
 * Vídeos e comentários entram no pedido com uma etiqueta ([V3], [C5]). A IA cita as etiquetas,
 * e aqui elas viram o título, o link e o número reais. Etiqueta que não existe é descartada:
 * a prova de uma ideia nunca é um link ou um número inventado pela IA (ADR 0011, "sem dados de mentira").
 */

import type { AudienceComment, Comparison, VideoMetrics } from '../insights/types.js'
import type { ShortProject } from '../shorts/types.js'
import type { Idea, IdeaEvidence } from './types.js'

export const DURATIONS = [15, 20, 30, 40]
/** Quantos vídeos e comentários entram no pedido (o suficiente para achar padrão sem estourar o prompt). */
export const MAX_VIDEOS = 30
export const MAX_COMMENTS = 40
export const MAX_IDEAS = 8

export type MeasuredVideo = VideoMetrics & { comparison: Comparison }

export interface VideoRef {
  ref: string
  video: MeasuredVideo
  project?: ShortProject
}

export interface CommentRef {
  ref: string
  comment: AudienceComment
  video: VideoRef
}

export interface Refs {
  videos: VideoRef[]
  comments: CommentRef[]
}

/** Etiqueta os vídeos (mais novos primeiro, sem os privados) e os comentários mais curtidos deles. */
export function buildRefs(videos: MeasuredVideo[], projects: ShortProject[]): Refs {
  const byId = new Map(projects.map(p => [p.id, p]))
  const refs: VideoRef[] = videos
    .filter(v => v.privacy !== 'private')
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    .slice(0, MAX_VIDEOS)
    .map((video, i) => ({ ref: `V${i + 1}`, video, project: video.projectId ? byId.get(video.projectId) : undefined }))
  const comments = refs
    .flatMap(v => (v.video.topComments ?? []).map(comment => ({ comment, video: v })))
    .sort((a, b) => b.comment.likes - a.comment.likes)
    .slice(0, MAX_COMMENTS)
    .map((c, i) => ({ ...c, ref: `C${i + 1}` }))
  return { videos: refs, comments }
}

const num = (n: number) => Math.round(n).toLocaleString('pt-BR')
const ratioText = (r: number) => `${r.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×`

/** Uma linha por vídeo, com o que o app sabe de verdade. */
export function videoLine(v: VideoRef, names: { style: (id: string) => string; tone: (p: ShortProject) => string }) {
  const { video, project } = v
  const s = video.current
  const parts = [`[${v.ref}] ${video.platform === 'instagram' ? 'Instagram' : 'YouTube'}`, `"${video.title}"`]
  if (project) {
    parts.push(`tema: ${project.theme}`, `estilo: ${names.style(project.styleId)}`, `tom: ${names.tone(project)}`, `${Math.round(project.audioDuration || project.duration)} s`)
  } else {
    parts.push('feito fora do app (o título é a legenda; deduza o tema)')
  }
  const c = video.comparison
  if (c.ratio !== undefined && c.bucket) parts.push(`${ratioText(c.ratio)} a mediana do canal (aos ${c.bucket} dias)`)
  else parts.push(c.bucket ? 'ainda sem com quem comparar' : 'publicado há menos de 1 dia')
  parts.push(`${num(s.views)} visualizações`)
  if (s.avgViewPercent !== undefined) parts.push(`${Math.round(s.avgViewPercent)}% assistido`)
  else if (s.avgWatchSec !== undefined) parts.push(`${s.avgWatchSec.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s assistidos em média`)
  if (s.views && (s.shares !== undefined || s.saves !== undefined)) {
    parts.push(`${(((s.shares ?? 0) + (s.saves ?? 0)) / s.views * 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} compartilhamentos+salvamentos por mil`)
  }
  return parts.join(' · ')
}

export const commentLine = (c: CommentRef) => `[${c.ref}] no ${c.video.ref}, ${c.comment.likes} curtida(s): "${c.comment.text}"`

/** O que a IA devolve para cada ideia. */
export interface RawIdea {
  theme?: unknown
  hook?: unknown
  styleId?: unknown
  toneId?: unknown
  duration?: unknown
  why?: unknown
  videos?: unknown
  comments?: unknown
  web?: unknown
}

export type CleanIdea = Pick<Idea, 'theme' | 'hook' | 'styleId' | 'toneId' | 'duration' | 'why' | 'evidence'>

const text = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '')
const list = (v: unknown) => (Array.isArray(v) ? v.map(x => String(x).replace(/[[\]\s]/g, '').toUpperCase()) : [])

/** A duração mais perto entre as que o Novo vídeo oferece. */
export function snapDuration(value: unknown) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 30
  return DURATIONS.reduce((best, d) => (Math.abs(d - n) < Math.abs(best - n) ? d : best), DURATIONS[0])
}

/** Fica só o que dá para usar: tema de verdade, estilo e tom que existem e provas que apontam para dados reais. */
export function cleanIdeas(
  raw: RawIdea[],
  refs: Refs,
  options: { styleIds: string[]; toneIds: string[]; defaultStyle: string; defaultTone: string },
): CleanIdea[] {
  const videos = new Map(refs.videos.map(v => [v.ref, v]))
  const comments = new Map(refs.comments.map(c => [c.ref, c]))
  const seen = new Set<string>()
  const out: CleanIdea[] = []

  for (const r of raw) {
    const theme = text(r.theme, 200)
    const key = theme.toLowerCase()
    if (theme.length < 8 || seen.has(key)) continue
    seen.add(key)

    const evidence: IdeaEvidence[] = []
    for (const ref of new Set(list(r.videos))) {
      const v = videos.get(ref)
      if (v) evidence.push({ kind: 'video', text: v.video.title, url: v.video.url, platform: v.video.platform, ratio: v.video.comparison.ratio })
    }
    for (const ref of new Set(list(r.comments))) {
      const c = comments.get(ref)
      if (c) evidence.push({ kind: 'comentario', text: c.comment.text, url: c.video.video.url, platform: c.video.video.platform })
    }
    const web = text(r.web, 400)
    if (web) evidence.push({ kind: 'web', text: web })

    out.push({
      theme,
      hook: text(r.hook, 200),
      styleId: typeof r.styleId === 'string' && options.styleIds.includes(r.styleId) ? r.styleId : options.defaultStyle,
      toneId: typeof r.toneId === 'string' && options.toneIds.includes(r.toneId) ? r.toneId : options.defaultTone,
      duration: snapDuration(r.duration),
      why: text(r.why, 600),
      evidence,
    })
    if (out.length >= MAX_IDEAS) break
  }
  return out
}
