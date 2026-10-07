/**
 * Coleta das métricas dos vídeos publicados no Instagram e no YouTube (ADR 0021).
 *
 * Roda sozinha (a cada hora vê se precisa) e pelo botão "Atualizar métricas":
 * - uma vez por dia, atualiza os números de todos os vídeos recentes;
 * - quando um vídeo faz 1, 7 ou 28 dias, tira a foto daquela idade.
 * Com o backend desligado, a foto sai assim que ele subir, com a idade real anotada.
 */

import { logger } from '../../utils/logger.js'
import { instagramAccountStorage } from '../storage/index.js'
import { FileStorage } from '../storage/FileStorage.js'
import { instagramGraphService } from '../instagramGraphService.js'
import * as youtube from '../youtubeService.js'
import { listProjects } from '../shorts/projects.js'
import type { ShortProject } from '../shorts/types.js'
import { ageInDays, compareVideos, FEW_DATA, hasDueSnapshot, measured, withSnapshot } from './compare.js'
import type { AudienceComment, MetricsSnapshot, MetricsState, Platform, PlatformState, VideoMetrics } from './types.js'

const videoStore = new FileStorage<VideoMetrics>('metrics/videos')
const stateStore = new FileStorage<MetricsState>('metrics')

const HOUR = 60 * 60 * 1000
/** Quantos vídeos recentes de cada plataforma acompanhar. */
const MAX_VIDEOS = 50
/** Dos vídeos acompanhados, de quantos (os mais recentes) ler os comentários para as ideias. */
const COMMENT_VIDEOS = 15
const COMMENTS_PER_VIDEO = 20

/** Comentários com texto, os mais curtidos primeiro. */
function cleanComments(list: { text: string; likes: number; at: string }[]): AudienceComment[] {
  return list
    .map(c => ({ text: c.text.replace(/\s+/g, ' ').trim().slice(0, 300), likes: c.likes || 0, at: c.at }))
    .filter(c => c.text.length > 2)
    .sort((a, b) => b.likes - a.likes)
    .slice(0, COMMENTS_PER_VIDEO)
}

const emptyPlatform = (): PlatformState => ({ connected: false, ok: false, videos: 0 })

async function loadState(): Promise<MetricsState> {
  return (await stateStore.findById('state')) ?? { id: 'state', instagram: emptyPlatform(), youtube: emptyPlatform() }
}

/** Primeira linha da legenda, sem hashtags, para servir de título. */
function captionTitle(caption?: string) {
  const line = (caption ?? '').split('\n').find(l => l.replace(/#\S+/g, '').trim()) ?? ''
  const text = line.replace(/#\S+/g, '').trim()
  return text.length > 90 ? `${text.slice(0, 89)}…` : text || 'Reel sem legenda'
}

function newVideo(platform: Platform, mediaId: string, fields: Partial<VideoMetrics>): VideoMetrics {
  return {
    id: `${platform}_${mediaId}`,
    platform,
    mediaId,
    title: '',
    publishedAt: new Date().toISOString(),
    current: { at: new Date().toISOString(), ageDays: 0, views: 0 },
    snapshots: [],
    updatedAt: new Date().toISOString(),
    ...fields,
  }
}

/** Projeto do app que publicou cada post, por plataforma e id. */
function projectsByMedia(projects: ShortProject[]) {
  const map = new Map<string, ShortProject>()
  for (const p of projects) {
    if (p.published?.instagram?.id) map.set(`instagram_${p.published.instagram.id}`, p)
    if (p.published?.youtube?.id) map.set(`youtube_${p.published.youtube.id}`, p)
  }
  return map
}

async function collectInstagram(existing: Map<string, VideoMetrics>, projects: Map<string, ShortProject>): Promise<PlatformState> {
  const accounts = await instagramAccountStorage.findAll()
  if (accounts.length === 0) return emptyPlatform()

  const state: PlatformState = { connected: true, ok: false, videos: 0 }
  try {
    if ((await instagramGraphService.hasPermission('instagram_manage_insights')) === false) {
      state.message = 'O token do Instagram não tem a permissão instagram_manage_insights. Gere um token novo com ela e conecte de novo em Configurações.'
      return state
    }
    const reels = await instagramGraphService.listReels(MAX_VIDEOS)
    const now = Date.now()
    let failed = 0
    let commentsBlocked = false
    for (const [index, reel] of reels.entries()) {
      const id = `instagram_${reel.id}`
      try {
        // um pedido por Reel, um de cada vez: o limite da Meta é de ~200 pedidos por hora
        const m = await instagramGraphService.getMediaInsights(reel.id, 'REELS')
        const project = projects.get(id)
        const snap: Omit<MetricsSnapshot, 'bucket'> = {
          at: new Date(now).toISOString(),
          ageDays: ageInDays(reel.timestamp, now),
          views: m.views ?? 0,
          reach: m.reach,
          likes: m.likes,
          comments: m.comments,
          shares: m.shares,
          saves: m.saved,
          avgWatchSec: m.ig_reels_avg_watch_time !== undefined ? m.ig_reels_avg_watch_time / 1000 : undefined,
        }
        const base =
          existing.get(id) ??
          newVideo('instagram', reel.id, { publishedAt: reel.timestamp })
        // comentários só dos mais recentes e com comentário; sem a permissão, segue sem eles
        let topComments = base.topComments
        if (!commentsBlocked && index < COMMENT_VIDEOS && (m.comments ?? 0) > 0) {
          try {
            const raw = await instagramGraphService.getMediaComments(reel.id, COMMENTS_PER_VIDEO * 2)
            topComments = cleanComments(raw.map((c: any) => ({ text: String(c.text ?? ''), likes: Number(c.like_count ?? 0), at: c.timestamp })))
          } catch (error: any) {
            commentsBlocked = true
            logger.warn(`⚠️ Comentários do Instagram: ${error.message}`)
          }
        }
        await videoStore.save(
          withSnapshot(
            {
              ...base,
              title: project?.title ?? captionTitle(reel.caption),
              url: reel.permalink,
              thumbnail: reel.thumbnail_url,
              projectId: project?.id,
              // o Instagram não diz a duração do Reel; dos vídeos do app, sabemos
              durationSec: project ? Math.round(project.audioDuration || project.duration) : base.durationSec,
              topComments,
            },
            snap,
          ),
        )
        state.videos++
      } catch (error: any) {
        failed++
        // token sem permissão ou expirado: os outros vão falhar do mesmo jeito
        if (/permissão|expirou|limitou/.test(error.message)) throw error
        logger.warn(`⚠️ Métricas do Reel ${reel.id}: ${error.message}`)
      }
    }
    state.ok = true
    const notes = [
      failed ? `${failed} Reel(s) sem métricas nesta coleta.` : '',
      commentsBlocked ? 'Não deu para ler os comentários: o token precisa da permissão instagram_manage_comments.' : '',
    ].filter(Boolean)
    if (notes.length) state.message = notes.join(' ')
  } catch (error: any) {
    state.message = error.message
    logger.warn(`⚠️ Métricas do Instagram: ${error.message}`)
  }
  return state
}

async function collectYouTube(existing: Map<string, VideoMetrics>, projects: Map<string, ShortProject>): Promise<PlatformState> {
  const account = await youtube.getAccount()
  if (!account) return emptyPlatform()

  const state: PlatformState = { connected: true, ok: false, videos: 0 }
  try {
    const shorts = await youtube.listShorts(MAX_VIDEOS)
    const now = Date.now()

    // retenção e compartilhamentos vêm da Analytics API; se ela falhar, ficam só os números básicos
    let analytics = new Map<string, youtube.YouTubeAnalyticsRow>()
    if (!youtube.canReadAnalytics(account)) {
      state.message = 'Conecte o YouTube de novo em Configurações para ler a retenção e os compartilhamentos.'
    } else if (shorts.length) {
      const oldest = shorts.reduce((min, s) => (s.publishedAt < min ? s.publishedAt : min), shorts[0].publishedAt)
      try {
        analytics = await youtube.shortsAnalytics(
          shorts.map(s => s.id),
          oldest,
        )
      } catch (error: any) {
        state.message = error.message
      }
    }

    let commentsBlocked = false
    for (const [index, short] of shorts.entries()) {
      const id = `youtube_${short.id}`
      const a = analytics.get(short.id)
      const project = projects.get(id)
      const snap: Omit<MetricsSnapshot, 'bucket'> = {
        at: new Date(now).toISOString(),
        ageDays: ageInDays(short.publishedAt, now),
        views: short.views,
        likes: short.likes,
        comments: short.comments,
        shares: a?.shares,
        avgWatchSec: a?.averageViewDuration,
        avgViewPercent: a?.averageViewPercentage,
        engagedViews: a?.engagedViews,
      }
      const base = existing.get(id) ?? newVideo('youtube', short.id, { publishedAt: short.publishedAt })
      let topComments = base.topComments
      if (!commentsBlocked && index < COMMENT_VIDEOS && short.comments > 0) {
        try {
          topComments = cleanComments(await youtube.listComments(short.id, COMMENTS_PER_VIDEO))
        } catch (error: any) {
          commentsBlocked = true
          logger.warn(`⚠️ Comentários do YouTube: ${error.message}`)
        }
      }
      await videoStore.save(
        withSnapshot(
          {
            ...base,
            title: project?.title ?? short.title,
            url: `https://youtube.com/shorts/${short.id}`,
            thumbnail: short.thumbnail,
            durationSec: short.durationSec,
            privacy: short.privacy,
            projectId: project?.id,
            topComments,
          },
          snap,
        ),
      )
      state.videos++
    }
    state.ok = true
  } catch (error: any) {
    state.message = error.message
    logger.warn(`⚠️ Métricas do YouTube: ${error.message}`)
  }
  return state
}

async function runCollection(): Promise<MetricsState> {
  const [all, projects, previous] = await Promise.all([videoStore.findAll(), listProjects(), loadState()])
  const existing = new Map(all.map(v => [v.id, v]))
  const byMedia = projectsByMedia(projects)
  // uma plataforma de cada vez: se uma falhar, a outra segue
  const instagram = await collectInstagram(existing, byMedia)
  const youtubeState = await collectYouTube(existing, byMedia)
  const state: MetricsState = { ...previous, lastRunAt: new Date().toISOString(), instagram, youtube: youtubeState }
  await stateStore.save(state)
  logger.info(`📈 Métricas coletadas: Instagram ${instagram.videos}, YouTube ${youtubeState.videos}`)
  return state
}

let running: Promise<MetricsState> | null = null

/** Coleta agora; se já houver uma coleta em andamento, espera por ela em vez de começar outra. */
export function collectNow() {
  running ??= runCollection().finally(() => {
    running = null
  })
  return running
}

/** Decide, sem chamar as APIs, se está na hora de coletar. */
async function tick() {
  const state = await loadState()
  const now = Date.now()
  const last = state.lastRunAt ? Date.parse(state.lastRunAt) : 0
  const failed = [state.instagram, state.youtube].some(p => p.connected && !p.ok)
  const due = (await videoStore.findAll()).some(v => hasDueSnapshot(v, now))
  if (now - last >= 24 * HOUR || due || (failed && now - last >= 3 * HOUR)) {
    await collectNow()
  }
}

let timer: NodeJS.Timeout | null = null

/** Liga a coleta automática. A primeira olhada é 1 minuto depois de subir, para não atrasar a inicialização. */
export function startMetricsCollector() {
  if (timer) return
  const run = () => tick().catch(error => logger.warn(`⚠️ Coleta de métricas: ${error.message}`))
  setTimeout(run, 60 * 1000)
  timer = setInterval(run, HOUR)
}

export function stopMetricsCollector() {
  if (timer) clearInterval(timer)
  timer = null
}

/** Para a tela: os vídeos com a comparação, do mais novo para o mais velho. */
export async function listMetrics() {
  const [videos, state] = await Promise.all([videoStore.findAll(), loadState()])
  const comparisons = compareVideos(videos)
  const count = (p: Platform) => measured(videos.filter(v => v.platform === p))
  return {
    state,
    collecting: running !== null,
    measured: { instagram: count('instagram'), youtube: count('youtube') },
    fewData: FEW_DATA,
    videos: videos
      .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
      .map(v => ({ ...v, comparison: comparisons.get(v.id)! })),
  }
}
