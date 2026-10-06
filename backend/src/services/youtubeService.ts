/**
 * YouTube: conexão por OAuth do Google e envio de Shorts pela YouTube Data API v3.
 *
 * Precisa de um cliente OAuth ("App da Web") no Google Cloud com a YouTube Data API v3 ativada:
 * YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET e YOUTUBE_REDIRECT_URI no backend/.env (ver docs/YOUTUBE.md).
 * O token fica em data/youtube/account.json; o refresh_token renova o acesso sozinho.
 */

import axios from 'axios'
import { randomBytes } from 'crypto'
import fs from 'fs'
import fsp from 'fs/promises'
import { FileStorage } from './storage/FileStorage.js'
import { AppError } from '../middleware/errorHandler.js'
import { logger } from '../utils/logger.js'

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']

export interface YouTubeAccount {
  id: 'account'
  channelId: string
  channelTitle: string
  thumbnail?: string
  accessToken: string
  refreshToken: string
  expiresAt: number
  connectedAt: string
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
    throw new AppError('Configure YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no backend/.env (ver docs/YOUTUBE.md).', 503, 'YOUTUBE_NOT_CONFIGURED')
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
  }
  await storage.save(account)
  logger.info(`✅ YouTube conectado: ${account.channelTitle}`)
  return account
}

export async function getAccount() {
  return storage.findById('account')
}

/** Para a tela: sem tokens. */
export async function status() {
  const account = await getAccount()
  return {
    configured: config().configured,
    account: account ? { channelId: account.channelId, channelTitle: account.channelTitle, thumbnail: account.thumbnail, connectedAt: account.connectedAt } : null,
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
