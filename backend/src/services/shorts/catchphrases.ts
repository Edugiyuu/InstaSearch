/**
 * Bordões (ADR 0016): o que abre ou fecha o vídeo, escolhido por vídeo na revisão.
 * Ficam em data/bordoes/; os arquivos (clipe, áudio, foto) em data/bordoes/files.
 */

import axios from 'axios'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { AppError } from '../../middleware/errorHandler.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { instagramGraphService } from '../instagramGraphService.js'
import { AUDIO_EXTENSIONS } from './sounds.js'
import { mediaDuration, saveClip } from './videoScenes.js'
import type { Catchphrase, CatchphraseKind } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../../../data')
export const CATCHPHRASE_FILES_DIR = path.join(DATA_DIR, 'bordoes/files')

const storage = new FileStorage<Catchphrase>('bordoes')

/** Duração do "se inscreve" e do montado sem áudio. */
const FIXED_SECONDS = 2.5

/** Id do bordão criado a partir do antigo "Seu canal"; projetos com `outro: true` apontam para ele. */
export const CHANNEL_CATCHPHRASE_ID = 'bordao_canal'

const KINDS: CatchphraseKind[] = ['clipe', 'montado', 'inscreva']
const PHOTO_EXT: Record<string, string> = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' }

const NEW_NAME: Record<CatchphraseKind, string> = { clipe: 'clipe', montado: 'bordão montado', inscreva: 'se inscreve' }

// ── Migração do "Seu canal" ──────────────────────────────

let migrated: Promise<void> | null = null

/**
 * O final de "Seu canal" (data/channel/channel.json) vira o primeiro bordão "se inscreve".
 * Roda uma vez: o channel.json é renomeado (não apagado), então apagar o bordão depois não o traz de volta.
 */
function migrateChannel() {
  migrated ??= (async () => {
    const dir = path.join(DATA_DIR, 'channel')
    const json = path.join(dir, 'channel.json')
    let channel: { name?: string; text?: string; button?: string; photoFile?: string; outroDefault?: boolean }
    try {
      channel = JSON.parse(await fs.readFile(json, 'utf-8'))
    } catch {
      return // nada para migrar
    }
    await fs.mkdir(CATCHPHRASE_FILES_DIR, { recursive: true })
    let photoFile: string | undefined
    if (channel.photoFile) {
      photoFile = `${CHANNEL_CATCHPHRASE_ID}_foto${path.extname(channel.photoFile)}`
      await fs.copyFile(path.join(dir, 'files', channel.photoFile), path.join(CATCHPHRASE_FILES_DIR, photoFile)).catch(() => (photoFile = undefined))
    }
    await storage.save({
      id: CHANNEL_CATCHPHRASE_ID,
      name: 'se inscreve',
      kind: 'inscreva',
      duration: FIXED_SECONDS,
      text: channel.text ?? 'Se inscreve pra mais!',
      channelName: channel.name ?? '',
      button: channel.button ?? 'INSCREVA-SE',
      photoFile,
      defaultOutro: !!channel.outroDefault,
      createdAt: new Date().toISOString(),
    })
    await fs.rename(json, `${json}.migrado`)
    logger.info('🔁 "Seu canal" virou o bordão "se inscreve" (Biblioteca → Bordões)')
  })()
  return migrated
}

// ── Leitura ──────────────────────────────────────────────

export async function listCatchphrases() {
  await migrateChannel()
  const all = await storage.findAll()
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

async function getCatchphrase(id: string) {
  await migrateChannel()
  const item = await storage.findById(id)
  if (!item) throw new AppError('Bordão não encontrado', 404, 'NOT_FOUND')
  return item
}

/** Os bordões que vídeos novos já trazem. */
export async function defaultCatchphrases() {
  const all = await listCatchphrases()
  return { intro: all.find(c => c.defaultIntro)?.id ?? null, outro: all.find(c => c.defaultOutro)?.id ?? null }
}

// ── Escrita ──────────────────────────────────────────────

type Upload = { path: string; originalname: string; mimetype?: string }

/** O upload vem para a pasta temporária; se o pedido falhar antes de usar, apaga. */
const discard = (upload?: Upload) => upload && fs.unlink(upload.path).catch(() => undefined)

/** Bordão novo. O clipe precisa do vídeo; o montado e o "se inscreve" começam vazios e se completam depois. */
export async function createCatchphrase(kind: CatchphraseKind, upload?: Upload) {
  if (!KINDS.includes(kind)) {
    await discard(upload)
    throw new AppError('Tipo de bordão inválido', 400, 'VALIDATION')
  }
  if (kind === 'clipe' && !upload) throw new AppError('Envie o vídeo do bordão', 400, 'NO_FILE')
  const item: Catchphrase = {
    id: generateId('bordao'),
    name: upload ? path.parse(upload.originalname).name.replace(/[_.-]+/g, ' ').trim().slice(0, 40) || NEW_NAME[kind] : NEW_NAME[kind],
    kind,
    duration: FIXED_SECONDS,
    ...(kind === 'inscreva' ? { text: 'Se inscreve pra mais!', channelName: '', button: 'INSCREVA-SE' } : {}),
    createdAt: new Date().toISOString(),
  }
  if (upload) return setFile(item, upload)
  return storage.save(item)
}

export async function updateCatchphrase(id: string, changes: Partial<Catchphrase>) {
  const item = await getCatchphrase(id)
  if (typeof changes.name === 'string') item.name = changes.name.trim().slice(0, 40) || item.name
  if (typeof changes.text === 'string') item.text = changes.text.trim().slice(0, 80)
  if (item.kind === 'inscreva') {
    if (typeof changes.channelName === 'string') item.channelName = changes.channelName.trim().slice(0, 40)
    if (typeof changes.button === 'string') item.button = changes.button.trim().slice(0, 24) || 'INSCREVA-SE'
  }
  if (item.kind === 'montado' && changes.imageId !== undefined) item.imageId = changes.imageId || undefined
  // só um padrão por ponta: marcar este desmarca o anterior
  for (const key of ['defaultIntro', 'defaultOutro'] as const) {
    if (typeof changes[key] !== 'boolean') continue
    item[key] = changes[key]
    if (changes[key]) {
      for (const other of await storage.findAll()) {
        if (other.id !== id && other[key]) await storage.update(other.id, { [key]: false })
      }
    }
  }
  return storage.save(item)
}

/** O arquivo do bordão: o vídeo (clipe), o áudio (montado) ou a foto (inscreva). Nome novo a cada troca, por causa do cache. */
export async function replaceFile(id: string, upload: Upload) {
  const item = await getCatchphrase(id).catch(async error => {
    await discard(upload)
    throw error
  })
  return setFile(item, upload)
}

async function setFile(item: Catchphrase, upload: Upload) {
  const ext = path.extname(upload.originalname).toLowerCase()
  const base = `${item.id}_${Date.now()}`
  const previous = item.kind === 'inscreva' ? item.photoFile : item.file
  await fs.mkdir(CATCHPHRASE_FILES_DIR, { recursive: true })
  try {
    if (item.kind === 'clipe') {
      const clip = await saveClip(upload.path, upload.originalname, CATCHPHRASE_FILES_DIR, base)
      item.file = clip.file
      item.duration = clip.duration || FIXED_SECONDS
    } else if (item.kind === 'montado') {
      if (!AUDIO_EXTENSIONS.includes(ext)) throw new AppError('Envie um áudio (mp3, wav, m4a, ogg)', 400, 'INVALID_FILE')
      item.file = `${base}${ext}`
      await fs.copyFile(upload.path, path.join(CATCHPHRASE_FILES_DIR, item.file))
      item.duration = (await mediaDuration(path.join(CATCHPHRASE_FILES_DIR, item.file)).catch(() => 0)) || FIXED_SECONDS
    } else {
      const photoExt = PHOTO_EXT[(upload.mimetype ?? '').split(';')[0]] ?? (Object.values(PHOTO_EXT).includes(ext) ? ext : undefined)
      if (!photoExt) throw new AppError('Envie a foto em JPG, PNG, WEBP ou GIF', 400, 'INVALID_FILE')
      item.photoFile = `${base}${photoExt}`
      await fs.copyFile(upload.path, path.join(CATCHPHRASE_FILES_DIR, item.photoFile))
    }
  } finally {
    await fs.unlink(upload.path).catch(() => undefined)
  }
  if (previous) await fs.unlink(path.join(CATCHPHRASE_FILES_DIR, previous)).catch(() => undefined)
  return storage.save(item)
}

/** "Se inscreve": copia a foto e o @ do Instagram conectado. */
export async function photoFromInstagram(id: string) {
  const item = await getCatchphrase(id)
  if (item.kind !== 'inscreva') throw new AppError('Só o bordão "se inscreve" tem foto', 400, 'VALIDATION')
  let profile
  try {
    profile = await instagramGraphService.getProfile()
  } catch (error: any) {
    throw new AppError(`Não deu para ler o perfil do Instagram: ${error.message}`, 502, 'INSTAGRAM_ERROR')
  }
  if (!profile.profile_picture_url) throw new AppError('O Instagram não devolveu a foto do perfil.', 404, 'NO_PHOTO')
  const res = await axios.get<ArrayBuffer>(profile.profile_picture_url, { responseType: 'arraybuffer', timeout: 15000 })
  const mimetype = String(res.headers['content-type'] ?? 'image/jpeg')
  const temp = path.join(CATCHPHRASE_FILES_DIR, `${item.id}_instagram.tmp`)
  await fs.mkdir(CATCHPHRASE_FILES_DIR, { recursive: true })
  await fs.writeFile(temp, Buffer.from(res.data))
  const saved = await setFile(item, { path: temp, originalname: 'instagram.jpg', mimetype })
  if (!saved.channelName && profile.username) return updateCatchphrase(id, { channelName: `@${profile.username}` })
  return saved
}

/** Apaga o bordão e o arquivo. Projetos que o usavam ficam sem esse bordão (a composição ignora id que não existe). */
export async function deleteCatchphrase(id: string) {
  const item = await getCatchphrase(id)
  for (const file of [item.file, item.photoFile]) {
    if (file) await fs.unlink(path.join(CATCHPHRASE_FILES_DIR, file)).catch(() => undefined)
  }
  return storage.delete(id)
}
