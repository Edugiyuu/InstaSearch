/**
 * "Seu canal": o final dos vídeos (foto do perfil, nome, bordão e botão de inscrever).
 * Fica em data/channel/; a foto é guardada localmente (o link da foto do Instagram expira).
 */

import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { AppError } from '../../middleware/errorHandler.js'
import { instagramGraphService } from '../instagramGraphService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const CHANNEL_FILES_DIR = path.join(__dirname, '../../../data/channel/files')

export interface Channel {
  id: 'channel'
  /** Nome que aparece embaixo da foto ("@duhzap.fun"). */
  name: string
  /** O bordão do final ("Se inscreve pra mais teoria!"). */
  text: string
  /** Texto do botão. */
  button: string
  photoFile?: string
  /** Vídeos novos já começam com o final ligado. */
  outroDefault: boolean
}

const storage = new FileStorage<Channel>('channel')

const DEFAULT: Channel = { id: 'channel', name: '', text: 'Se inscreve pra mais!', button: 'INSCREVA-SE', outroDefault: false }

export async function getChannel(): Promise<Channel> {
  return { ...DEFAULT, ...(await storage.findById('channel')) }
}

export async function updateChannel(changes: Partial<Channel>) {
  const channel = await getChannel()
  if (typeof changes.name === 'string') channel.name = changes.name.trim().slice(0, 40)
  if (typeof changes.text === 'string') channel.text = changes.text.trim().slice(0, 80)
  if (typeof changes.button === 'string') channel.button = changes.button.trim().slice(0, 24) || DEFAULT.button
  if (typeof changes.outroDefault === 'boolean') channel.outroDefault = changes.outroDefault
  return storage.save(channel)
}

const EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }

export async function savePhoto(data: Buffer, mimeType: string) {
  const ext = EXT[mimeType.split(';')[0]]
  if (!ext) throw new AppError('Envie a foto em JPG, PNG, WEBP ou GIF', 400, 'INVALID_FILE')
  const channel = await getChannel()
  await fs.mkdir(CHANNEL_FILES_DIR, { recursive: true })
  if (channel.photoFile) await fs.unlink(path.join(CHANNEL_FILES_DIR, channel.photoFile)).catch(() => undefined)
  // nome novo a cada troca: a prévia e o render não usam a foto antiga do cache
  channel.photoFile = `foto_${Date.now()}${ext}`
  await fs.writeFile(path.join(CHANNEL_FILES_DIR, channel.photoFile), data)
  return storage.save(channel)
}

/** Copia a foto e o @ do Instagram conectado. */
export async function useInstagramProfile() {
  let profile
  try {
    profile = await instagramGraphService.getProfile()
  } catch (error: any) {
    throw new AppError(`Não deu para ler o perfil do Instagram: ${error.message}`, 502, 'INSTAGRAM_ERROR')
  }
  if (!profile.profile_picture_url) throw new AppError('O Instagram não devolveu a foto do perfil.', 404, 'NO_PHOTO')
  const res = await axios.get<ArrayBuffer>(profile.profile_picture_url, { responseType: 'arraybuffer', timeout: 15000 })
  const channel = await savePhoto(Buffer.from(res.data), String(res.headers['content-type'] ?? 'image/jpeg'))
  if (!channel.name && profile.username) return updateChannel({ name: `@${profile.username}` })
  return channel
}
