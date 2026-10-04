import fs from 'fs/promises'
import path from 'path'
import { execFile } from 'child_process'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { AppError } from '../../middleware/errorHandler.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { catalogSound, SFX } from './shortsAI.js'
import type { SoundItem, SoundKind } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const SOUND_FILES_DIR = path.join(__dirname, '../../../data/sounds/files')

const storage = new FileStorage<SoundItem>('sounds')

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.ogg', '.aac', '.flac', '.webm', '.opus', '.mp4']

/** Formatos que o Gemini aceita para ouvir e catalogar. */
const GEMINI_AUDIO: Record<string, string> = {
  '.mp3': 'audio/mp3',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
}

/** Etiquetas a partir do nome do arquivo ("whoosh_rapido_02.mp3" → whoosh, rapido). */
function tagsFromName(name: string) {
  return name
    .toLowerCase()
    .split(/[^a-zà-ú]+/)
    .filter(t => t.length > 2)
    .slice(0, 6)
}

export async function listSounds(kind?: SoundKind) {
  const all = await storage.findAll()
  return all.filter(s => !kind || s.kind === kind).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getSound(id: string) {
  return storage.findById(id)
}

export async function addSound(data: Buffer, originalName: string, kind: SoundKind, source?: string) {
  await fs.mkdir(SOUND_FILES_DIR, { recursive: true })
  const id = generateId('snd')
  const ext = path.extname(originalName).toLowerCase() || '.mp3'
  const file = `${id}${ext}`
  await fs.writeFile(path.join(SOUND_FILES_DIR, file), data)
  return finish(id, file, path.parse(originalName).name, kind, source, data)
}

async function finish(id: string, file: string, baseName: string, kind: SoundKind, source: string | undefined, data?: Buffer) {
  const ext = path.extname(file)
  const sound: SoundItem = {
    id,
    file,
    name: baseName.replace(/[_-]+/g, ' ').trim().slice(0, 40).toLowerCase() || (kind === 'sfx' ? 'efeito' : 'música'),
    kind,
    tags: tagsFromName(baseName),
    usedIn: [],
    source,
    createdAt: new Date().toISOString(),
  }

  // Músicas longas e formatos que o Gemini não lê ficam só com o nome do arquivo
  const mime = GEMINI_AUDIO[ext]
  if (data && mime && data.length < 15 * 1024 * 1024) {
    try {
      const info = await catalogSound(data, mime, kind)
      // quando o nome do arquivo já diz o tipo ("pop_01.wav"), ele vale mais que o palpite da IA
      const fileTypes = SFX.filter(t => sound.tags.some(tag => tag.includes(t)))
      if (kind === 'sfx' && fileTypes.length) {
        sound.tags = [...new Set([...sound.tags, ...info.tags.filter(t => !SFX.includes(t))])]
      } else {
        if (info.name) sound.name = info.name
        sound.tags = [...new Set([...info.tags, ...sound.tags])]
      }
    } catch (error: any) {
      logger.warn(`⚠️ Som ${id} salvo sem catalogação: ${error.message}`)
    }
  }
  return storage.save(sound)
}

function run(cmd: string, args: string[]) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    execFile(cmd, args, { timeout: 180000, maxBuffer: 10 * 1024 * 1024, windowsHide: true }, (error, stdout, stderr) =>
      error ? reject(Object.assign(error, { stderr })) : resolve({ stdout, stderr }),
    )
  })
}

/** yt-dlp como executável ou como módulo do Python (pip install yt-dlp). */
async function ytDlp(args: string[]) {
  const attempts: [string, string[]][] = [
    ['yt-dlp', args],
    ['python', ['-m', 'yt_dlp', ...args]],
    ['py', ['-m', 'yt_dlp', ...args]],
  ]
  let last: any
  for (const [cmd, a] of attempts) {
    try {
      return await run(cmd, a)
    } catch (error: any) {
      last = error
      // comando não existe ou módulo não instalado: tenta o próximo
      if (error.code === 'ENOENT' || /No module named/i.test(error.stderr ?? '')) continue
      throw error
    }
  }
  throw Object.assign(new Error('yt-dlp não encontrado'), { code: 'NO_YTDLP', cause: last })
}

/** Baixa o áudio de um Reel, TikTok ou Short e guarda na biblioteca de sons. */
export async function importSoundFromUrl(url: string, kind: SoundKind) {
  await fs.mkdir(SOUND_FILES_DIR, { recursive: true })
  const id = generateId('snd')
  try {
    const { stdout } = await ytDlp([
      '--no-playlist',
      '--no-warnings',
      '--max-filesize', '40M',
      // só o áudio quando existe; senão o vídeo inteiro (o navegador toca o áudio do mp4)
      '-f', 'bestaudio[ext=m4a]/bestaudio/best[ext=mp4]/best',
      '-o', path.join(SOUND_FILES_DIR, `${id}.%(ext)s`),
      '--print', 'title',
      '--no-simulate',
      url,
    ])
    const file = (await fs.readdir(SOUND_FILES_DIR)).find(f => f.startsWith(`${id}.`))
    if (!file) throw new Error('o download não gerou arquivo')
    const title = stdout.trim().split('\n')[0] || 'áudio importado'
    const data = await fs.readFile(path.join(SOUND_FILES_DIR, file))
    return finish(id, file, title, kind, url, data)
  } catch (error: any) {
    if (error.code === 'NO_YTDLP') {
      throw new AppError('Para pegar áudio de links, instale o yt-dlp: pip install yt-dlp (e reinicie o backend).', 501, 'NO_YTDLP')
    }
    const detail = String(error.stderr || error.message).split('\n').filter(Boolean).pop()
    throw new AppError(`Não consegui baixar o áudio desse link. ${detail ?? ''}`.trim(), 400, 'DOWNLOAD_FAILED')
  }
}

export async function updateSound(id: string, changes: Partial<SoundItem>) {
  const allowed: Partial<SoundItem> = {}
  if (changes.name !== undefined) allowed.name = String(changes.name)
  if (Array.isArray(changes.tags)) allowed.tags = changes.tags.map(t => String(t).toLowerCase())
  if (changes.kind === 'sfx' || changes.kind === 'musica') allowed.kind = changes.kind
  return storage.update(id, allowed)
}

export async function deleteSound(id: string) {
  const sound = await storage.findById(id)
  if (!sound) return false
  await fs.unlink(path.join(SOUND_FILES_DIR, sound.file)).catch(() => undefined)
  return storage.delete(id)
}

/** Marca em quais projetos cada som está sendo usado. */
export async function syncSoundUsage(projectId: string, used: Set<string>) {
  for (const s of await storage.findAll()) {
    const has = s.usedIn.includes(projectId)
    if (used.has(s.id) && !has) await storage.update(s.id, { usedIn: [...s.usedIn, projectId] })
    if (!used.has(s.id) && has) await storage.update(s.id, { usedIn: s.usedIn.filter(p => p !== projectId) })
  }
}
