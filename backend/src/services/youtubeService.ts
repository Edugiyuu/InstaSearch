/**
 * YouTube: conexão por OAuth do Google e envio de Shorts pela YouTube Data API v3.
 *
 * Precisa de um cliente OAuth ("App da Web") no Google Cloud com a YouTube Data API v3 ativada:
 * YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REDIRECT_URI no backend/.env (ver docs/INSTALACAO.md, "Conectar o YouTube").
 * O token fica em data/youtube/account.json; o refresh_token renova o acesso sozinho.
 *
 * As métricas (ADR 0021) usam a Data API (visualizações, curtidas, comentários) e a YouTube
 * Analytics API (retenção, compartilhamentos), que precisa da permissão yt-analytics.readonly
 * e de estar ativada no mesmo projeto do Google Cloud.
 */

import axios from 'axios'
import { randomBytes } from 'crypto'
import fs from 'fs'
import fsp from 'fs/promises'
import { FileStorage } from './storage/FileStorage.js'
import { AppError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const ANALYTICS_SCOPE = 'https://www.googleapis.com/auth/yt-analytics.readonly'
const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly', ANALYTICS_SCOPE]

export interface YouTubeAccount {
  id: 'account'
  channelId: string
  channelTitle: string
  thumbnail?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  connectedAt: string
  /** O que o Google concedeu; contas conectadas antes do ADR 0021 não têm (e não têm a de métricas). */
  scopes?: string[]
}

export type YouTubePrivacy = 'public' | 'unlisted' | 'private'

const storage = new FileStorage<YouTubeAccount>('youtube')
/** state do OAuth em andamento (evita callback forjado). */
const pendingStates = new Set<string>()

function config() {
  const clientId = process.env.YOUTUBE_CLIENT_ID
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET
  const redirectUri = process.env.YOUTUBE_REDIRECT_URI || `http://localhost:${process.env.PORT || 3000}/api/youtube/callback`
  return { clientId, clientSecret, redirectUri, configured: !!clientId && !!clientSecret }
}

function requireConfig() {
  const c = config()
  if (!c.configured) {
    throw new AppError('Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no backend/.env (ver docs/INSTALACAO.md, "Conectar o YouTube").', 503, 'YOUTUBE_NOT_CONFIGURED')
  }
  return c as { clientId: string; clientSecret: string; redirectUri: string }
}

export function authUrl() {
  const { clientId, redirectUri } = requireConfig()
  const state = randomBytes(16).toString('hex')
  pendingStates.add(state)
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPES.join(' '),
    // offline + consent: o Google manda o refresh_token
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

export async function handleCallback(code: string, state: string) {
  if (!pendingStates.delete(state)) throw new AppError('Conexão expirada; tente conectar de novo.', 400, 'YOUTUBE_STATE')
  const { clientId, clientSecret, redirectUri } = requireConfig()
  const { data: token } = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })
  if (!token.refresh_token) throw new AppError('O Google não mandou o refresh_token; remova o acesso do app na conta Google e conecte de novo.', 400, 'YOUTUBE_TOKEN')

  const { data } = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
    params: { part: 'snippet', mine: true },
    headers: { Authorization: `Bearer ${token.access_token}` },
  })
  const channel = data.items?.[0]
  if (!channel) throw new AppError('Essa conta Google não tem canal no YouTube. Crie um canal e conecte de novo.', 400, 'YOUTUBE_NO_CHANNEL')

  const account: YouTubeAccount = {
    id: 'account',
    channelId: channel.id,
    channelTitle: channel.snippet.title,
    thumbnail: channel.snippet.thumbnails?.default?.url,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    connectedAt: new Date().toISOString(),
    scopes: String(token.scope ?? '').split(' ').filter(Boolean),
  }
  await storage.save(account)
  logger.info(`✅ YouTube conectado: ${account.channelTitle}`)
  return account
}

export async function getAccount() {
  return storage.findById('account')
}

/** A conta pode ler retenção e compartilhamentos (permissão concedida ao conectar). */
export const canReadAnalytics = (account: YouTubeAccount) => !!account.scopes?.includes(ANALYTICS_SCOPE)

/** Para a tela: sem tokens. */
export async function status() {
  const account = await getAccount()
  return {
    configured: config().configured,
    account: account
      ? {
          channelId: account.channelId,
          channelTitle: account.channelTitle,
          thumbnail: account.thumbnail,
          connectedAt: account.connectedAt,
          // conectada antes das métricas: precisa conectar de novo para dar a permissão nova
          needsReconnect: !canReadAnalytics(account),
        }
      : null,
  }
}

export async function disconnect() {
  const account = await getAccount()
  if (!account) return
  // revoga no Google também; se falhar, apaga do mesmo jeito
  await axios.post('https://oauth2.googleapis.com/revoke', null, { params: { token: account.refreshToken } }).catch(() => undefined)
  await storage.delete('account')
}

async function accessToken() {
  const account = await getAccount()
  if (!account) throw new AppError('Conecte o YouTube em Configurações.', 400, 'YOUTUBE_NOT_CONNECTED')
  if (Date.now() < account.expiresAt - 60_000) return account.accessToken

  const { clientId, clientSecret } = requireConfig()
  try {
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: account.refreshToken,
      grant_type: 'refresh_token',
    })
    account.accessToken = data.access_token
    account.expiresAt = Date.now() + data.expires_in * 1000
    await storage.save(account)
    return account.accessToken
  } catch (error: any) {
    if (error.response?.data?.error === 'invalid_grant') {
      throw new AppError('O acesso ao YouTube expirou ou foi removido. Conecte de novo em Configurações.', 401, 'YOUTUBE_EXPIRED')
    }
    throw error
  }
}

/** Envia o MP4 (upload resumível) e devolve o id e o link do Short. */
export async function uploadShort(file: string, meta: { title: string; description: string; privacy: YouTubePrivacy; tags?: string[] }) {
  const token = await accessToken()
  const size = (await fsp.stat(file)).size
  // título: até 100 caracteres e sem < >
  const title = meta.title.replace(/[<>]/g, '').trim().slice(0, 100) || 'Short'
  const description = meta.description.replace(/[<>]/g, '').slice(0, 5000)

  try {
    const session = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos',
      {
        snippet: { title, description, tags: meta.tags?.slice(0, 30), categoryId: '24' },
        status: { privacyStatus: meta.privacy, selfDeclaredMadeForKids: false },
      },
      {
        params: { uploadType: 'resumable', part: 'snippet,status' },
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Upload-Content-Type': 'video/mp4',
          'X-Upload-Content-Length': String(size),
        },
      },
    )
    const uploadUrl = session.headers.location as string

    logger.info(`📤 Enviando ${(size / 1024 / 1024).toFixed(1)} MB para o YouTube…`)
    const { data } = await axios.put(uploadUrl, fs.createReadStream(file), {
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(size) },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: 15 * 60 * 1000,
    })
    logger.info(`✅ Short enviado ao YouTube: ${data.id}`)
    return { id: data.id as string, url: `https://youtube.com/shorts/${data.id}`, privacy: data.status?.privacyStatus as string | undefined }
  } catch (error: any) {
    const reason = error.response?.data?.error?.errors?.[0]?.reason
    const message = error.response?.data?.error?.message || error.message
    logger.error(`❌ YouTube: ${message}`)
    if (reason === 'quotaExceeded') throw new AppError('A cota diária da API do YouTube acabou. Tente amanhã.', 429, 'YOUTUBE_QUOTA')
    if (reason === 'uploadLimitExceeded') throw new AppError('O canal atingiu o limite de envios de hoje.', 429, 'YOUTUBE_LIMIT')
    if (error instanceof AppError) throw error
    throw new AppError(`Erro ao enviar ao YouTube: ${message}`, 502, 'YOUTUBE_ERROR')
  }
}

// ── Métricas (ADR 0021) ──────────────────────────────────

export interface YouTubeShort {
  id: string
  title: string
  publishedAt: string
  durationSec: number
  thumbnail?: string
  privacy?: string
  views: number
  likes: number
  comments: number
}

export interface YouTubeAnalyticsRow {
  engagedViews?: number
  averageViewDuration?: number
  averageViewPercentage?: number
  shares?: number
}

/** "PT1M5S" → 65 */
export function isoDurationSeconds(iso: string): number {
  const m = iso.match(/^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/)
  if (!m) return 0
  const [, d, h, min, sec] = m
  return Number(d ?? 0) * 86400 + Number(h ?? 0) * 3600 + Number(min ?? 0) * 60 + Number(sec ?? 0)
}

function youtubeError(error: any): never {
  const reason = error.response?.data?.error?.errors?.[0]?.reason
  const message = error.response?.data?.error?.message || error.message
  if (error instanceof AppError) throw error
  if (reason === 'quotaExceeded') throw new AppError('A cota diária da API do YouTube acabou. Tente amanhã.', 429, 'YOUTUBE_QUOTA')
  if (reason === 'accessNotConfigured' || /has not been used|is disabled/i.test(message)) {
    throw new AppError('Ative a "YouTube Analytics API" no seu projeto do Google Cloud (ver docs/INSTALACAO.md, "Conectar o YouTube").', 503, 'YOUTUBE_ANALYTICS_OFF')
  }
  if (error.response?.status === 403) throw new AppError('Conecte o YouTube de novo em Configurações para liberar as métricas.', 403, 'YOUTUBE_SCOPE')
  throw new AppError(`YouTube: ${message}`, 502, 'YOUTUBE_ERROR')
}

/**
 * Os Shorts mais recentes do canal (vídeos de até 3 minutos), com os números da Data API.
 * Custa poucas unidades da cota: 1 por página da lista e 1 por lote de 50 vídeos.
 */
export async function listShorts(max = 50): Promise<YouTubeShort[]> {
  const token = await accessToken()
  const headers = { Authorization: `Bearer ${token}` }
  try {
    const { data: channels } = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
      params: { part: 'contentDetails', mine: true },
      headers,
    })
    const uploads = channels.items?.[0]?.contentDetails?.relatedPlaylists?.uploads
    if (!uploads) return []

    // o canal pode ter vídeos longos também: pega até 2 páginas e filtra pela duração
    const ids: string[] = []
    let pageToken: string | undefined
    for (let page = 0; page < 2; page++) {
      const { data } = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
        params: { part: 'contentDetails', playlistId: uploads, maxResults: 50, pageToken },
        headers,
      })
      ids.push(...(data.items ?? []).map((i: any) => i.contentDetails.videoId))
      pageToken = data.nextPageToken
      if (!pageToken) break
    }

    const shorts: YouTubeShort[] = []
    for (let i = 0; i < ids.length && shorts.length < max; i += 50) {
      const { data } = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: { part: 'snippet,statistics,contentDetails,status', id: ids.slice(i, i + 50).join(','), maxResults: 50 },
        headers,
      })
      for (const v of data.items ?? []) {
        const durationSec = isoDurationSeconds(v.contentDetails?.duration ?? '')
        if (durationSec === 0 || durationSec > 180) continue
        shorts.push({
          id: v.id,
          title: v.snippet?.title ?? '',
          publishedAt: v.snippet?.publishedAt,
          durationSec,
          thumbnail: v.snippet?.thumbnails?.medium?.url ?? v.snippet?.thumbnails?.default?.url,
          privacy: v.status?.privacyStatus,
          views: Number(v.statistics?.viewCount ?? 0),
          likes: Number(v.statistics?.likeCount ?? 0),
          comments: Number(v.statistics?.commentCount ?? 0),
        })
      }
    }
    return shorts.slice(0, max)
  } catch (error) {
    youtubeError(error)
  }
}

/**
 * Retenção, visualizações engajadas e compartilhamentos de cada vídeo, pela YouTube Analytics API.
 * Os dados chegam com 2 a 3 dias de atraso: um vídeo novo pode ainda não aparecer.
 */
export async function shortsAnalytics(ids: string[], since: string): Promise<Map<string, YouTubeAnalyticsRow>> {
  const result = new Map<string, YouTubeAnalyticsRow>()
  if (ids.length === 0) return result
  const account = await getAccount()
  if (!account || !canReadAnalytics(account)) return result
  const token = await accessToken()
  const today = new Date().toISOString().slice(0, 10)
  const full = ['engagedViews', 'averageViewDuration', 'averageViewPercentage', 'shares']

  const ask = async (batch: string[], metrics: string[]) => {
    const { data } = await axios.get('https://youtubeanalytics.googleapis.com/v2/reports', {
      params: {
        ids: 'channel==MINE',
        startDate: since.slice(0, 10),
        endDate: today,
        metrics: metrics.join(','),
        dimensions: 'video',
        filters: `video==${batch.join(',')}`,
        sort: `-${metrics[0]}`,
        maxResults: 200,
      },
      headers: { Authorization: `Bearer ${token}` },
    })
    const columns: string[] = (data.columnHeaders ?? []).map((c: any) => c.name)
    for (const row of data.rows ?? []) {
      const entry: Record<string, number> = {}
      columns.forEach((name, i) => {
        if (name !== 'video') entry[name] = Number(row[i])
      })
      result.set(String(row[columns.indexOf('video')]), entry)
    }
  }

  try {
    for (let i = 0; i < ids.length; i += 50) {
      const batch = ids.slice(i, i + 50)
      try {
        await ask(batch, full)
      } catch (error: any) {
        // relatório que não aceita "engagedViews" com a dimensão vídeo: tenta sem ela
        if (error.response?.status !== 400) throw error
        await ask(batch, full.slice(1))
      }
    }
  } catch (error) {
    youtubeError(error)
  }
  return result
}

/** Os comentários mais relevantes de um vídeo (1 unidade da cota). Comentários desativados devolvem lista vazia. */
export async function listComments(videoId: string, max = 20): Promise<{ text: string; likes: number; at: string }[]> {
  const token = await accessToken()
  try {
    const { data } = await axios.get('https://www.googleapis.com/youtube/v3/commentThreads', {
      params: { part: 'snippet', videoId, maxResults: max, order: 'relevance', textFormat: 'plainText' },
      headers: { Authorization: `Bearer ${token}` },
    })
    return (data.items ?? []).map((item: any) => {
      const c = item.snippet?.topLevelComment?.snippet ?? {}
      return { text: String(c.textDisplay ?? ''), likes: Number(c.likeCount ?? 0), at: c.publishedAt }
    })
  } catch (error: any) {
    if (error.response?.data?.error?.errors?.[0]?.reason === 'commentsDisabled') return []
    youtubeError(error)
  }
}
