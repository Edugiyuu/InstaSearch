/**
 * Vídeos na biblioteca: um episódio (ou trecho) vira várias cenas que entram nas batidas.
 *
 * 1. preparando: se o navegador não toca o arquivo (mkv, hevc…), converte para mp4/h264
 * 2. cortes: lê o vídeo em 64×36 tons de cinza e marca um corte onde o quadro muda de repente
 * 3. catalogando: tira o quadro do meio de cada cena e manda para a IA em lotes de 10
 *
 * Cada cena é um item da biblioteca (kind 'cena') que aponta para o arquivo do vídeo com
 * início e fim; a composição toca só esse trecho. O ffmpeg usado é o que vem com o Remotion
 * (ou FFMPEG_PATH): ele não tem os filtros de detectar cena, por isso o corte é feito aqui.
 */

import { spawn } from 'child_process'
import { existsSync, readdirSync } from 'fs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { AppError } from '../../middleware/errorHandler.js'
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { LIBRARY_FILES_DIR } from './library.js'
import { catalogScenes } from './shortsAI.js'
import type { LibraryImage, VideoProcessing } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_MODULES = path.join(__dirname, '../../../../frontend/node_modules/@remotion')

const storage = new FileStorage<LibraryImage>('library')

export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mov', '.webm', '.mkv', '.avi']
/** Contêineres e codecs que o navegador (prévia) e o Remotion (render) tocam sem converter. */
const PLAYABLE_CONTAINERS = ['.mp4', '.m4v', '.mov', '.webm']
const PLAYABLE_CODECS = ['h264', 'vp8', 'vp9']

/** Cenas mais curtas que isso se juntam à anterior (clarões, quadros soltos). */
const MIN_SCENE = 0.6
/** Cenas mais longas que isso são divididas (planos longos de conversa). */
const MAX_SCENE = 8
const BATCH = 10

// ── ffmpeg ───────────────────────────────────────────────

let binDir: string | null | undefined

/** Pasta do ffmpeg que vem com o Remotion (frontend), se existir. */
function remotionBinDir() {
  if (binDir !== undefined) return binDir
  binDir = null
  try {
    const dir = readdirSync(FRONTEND_MODULES).find(d => d.startsWith(`compositor-${process.platform}-${process.arch}`))
    if (dir) binDir = path.join(FRONTEND_MODULES, dir)
  } catch {
    // sem o frontend instalado: usa o ffmpeg do PATH
  }
  return binDir
}

function bin(name: 'ffmpeg' | 'ffprobe') {
  const env = name === 'ffmpeg' ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH
  if (env) return env
  const dir = remotionBinDir()
  const exe = process.platform === 'win32' ? `${name}.exe` : name
  if (dir && existsSync(path.join(dir, exe))) return path.join(dir, exe)
  return name
}

/** Roda o ffmpeg/ffprobe; onStdout recebe a saída binária, onStderr as linhas de progresso. */
function run(
  name: 'ffmpeg' | 'ffprobe',
  args: string[],
  handlers: { onStdout?: (chunk: Buffer) => void; onStderr?: (text: string) => void } = {},
) {
  return new Promise<string>((resolve, reject) => {
    const exe = bin(name)
    // o ffmpeg do Remotion precisa das DLLs da própria pasta
    const child = spawn(exe, args, { cwd: path.isAbsolute(exe) ? path.dirname(exe) : undefined, windowsHide: true })
    let out = ''
    let err = ''
    child.stdout.on('data', (d: Buffer) => (handlers.onStdout ? handlers.onStdout(d) : (out += d)))
    child.stderr.on('data', (d: Buffer) => {
      const text = d.toString()
      err = (err + text).slice(-4000)
      handlers.onStderr?.(text)
    })
    child.on('error', error => {
      const missing = (error as NodeJS.ErrnoException).code === 'ENOENT'
      reject(missing ? new Error(`${name} não encontrado (instale as dependências do frontend ou defina FFMPEG_PATH)`) : error)
    })
    child.on('close', code => (code === 0 ? resolve(out) : reject(new Error(err.trim().split('\n').pop() || `${name} saiu com código ${code}`))))
  })
}

interface Probe {
  duration: number
  codec: string
  width: number
  height: number
  fps: number
}

async function probe(file: string): Promise<Probe> {
  const out = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file])
  const info = JSON.parse(out)
  const video = (info.streams ?? []).find((s: any) => s.codec_type === 'video')
  if (!video) throw new AppError('Esse arquivo não tem vídeo', 400, 'NOT_VIDEO')
  const [num, den] = String(video.avg_frame_rate || video.r_frame_rate || '24/1').split('/').map(Number)
  return {
    duration: Number(info.format?.duration ?? video.duration ?? 0),
    codec: String(video.codec_name),
    width: Number(video.width),
    height: Number(video.height),
    fps: den ? num / den : num || 24,
  }
}

/** "time=00:01:23.45" da saída do ffmpeg → segundos. */
function progressTime(text: string) {
  const m = text.match(/time=(\d+):(\d+):(\d+(?:\.\d+)?)/g)?.pop()?.match(/(\d+):(\d+):(\d+(?:\.\d+)?)/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : null
}

/** Converte para mp4/h264 até 1080p, com quadros-chave a cada segundo (a prévia pula de cena em cena). */
async function toPlayable(input: string, output: string, duration: number, onProgress: (p: number) => void) {
  await run(
    'ffmpeg',
    [
      '-y', '-i', input,
      '-map', '0:v:0', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-pix_fmt', 'yuv420p',
      '-vf', "scale=-2:'min(1080,ih)'",
      '-g', '24',
      '-c:a', 'aac', '-b:a', '128k',
      '-movflags', '+faststart',
      output,
    ],
    { onStderr: text => {
      const t = progressTime(text)
      if (t !== null && duration) onProgress(Math.min(1, t / duration))
    } },
  )
}

// ── Cortes ───────────────────────────────────────────────

const SMALL_W = 64
const SMALL_H = 36

/**
 * Tempos (em segundos) onde a imagem muda de repente. Compara cada quadro com o anterior
 * em 64×36 tons de cinza: um corte é uma diferença grande e bem acima da média dos quadros
 * anteriores (assim tremor e luta rápida não viram dezenas de cortes).
 */
async function detectCuts(file: string, fps: number, duration: number, onProgress: (p: number) => void) {
  const size = SMALL_W * SMALL_H
  const cuts: number[] = []
  let pending: Buffer = Buffer.alloc(0)
  let prev: Buffer | null = null
  let index = 0
  const recent: number[] = []

  const onFrame = (frame: Buffer) => {
    if (prev) {
      let sum = 0
      for (let i = 0; i < size; i++) sum += Math.abs(frame[i] - prev[i])
      const diff = sum / size
      const avg = recent.length ? recent.reduce((a, b) => a + b, 0) / recent.length : 0
      if (diff > 24 && diff > avg * 2.5 + 6) cuts.push(index / fps)
      recent.push(diff)
      if (recent.length > 6) recent.shift()
    }
    prev = Buffer.from(frame)
    index++
    if (index % 240 === 0 && duration) onProgress(Math.min(1, index / fps / duration))
  }

  await run(
    'ffmpeg',
    ['-v', 'error', '-i', file, '-map', '0:v:0', '-an', '-vf', `scale=${SMALL_W}:${SMALL_H}`, '-pix_fmt', 'gray', '-c:v', 'rawvideo', '-f', 'image2pipe', '-'],
    { onStdout: chunk => {
      pending = pending.length ? Buffer.concat([pending, chunk]) : chunk
      let offset = 0
      while (pending.length - offset >= size) {
        onFrame(pending.subarray(offset, offset + size))
        offset += size
      }
      pending = pending.subarray(offset)
    } },
  )
  return cuts
}

/** Cortes → cenas: junta as muito curtas e divide as muito longas. */
export function scenesFromCuts(cuts: number[], duration: number) {
  const bounds = [0, ...cuts.filter(c => c > 0 && c < duration), duration]
  const scenes: { start: number; end: number }[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    const start = bounds[i]
    const end = bounds[i + 1]
    const last = scenes[scenes.length - 1]
    if (end - start < MIN_SCENE && last) last.end = end
    else scenes.push({ start, end })
  }
  // a primeira pode ter ficado curta (não tinha anterior para juntar)
  if (scenes.length > 1 && scenes[0].end - scenes[0].start < MIN_SCENE) {
    scenes[1].start = scenes[0].start
    scenes.shift()
  }
  return scenes.flatMap(s => {
    const length = s.end - s.start
    if (length <= MAX_SCENE) return [s]
    const parts = Math.ceil(length / 6)
    return Array.from({ length: parts }, (_, n) => ({ start: s.start + (length / parts) * n, end: s.start + (length / parts) * (n + 1) }))
  })
}

async function extractFrame(file: string, at: number, output: string) {
  await run('ffmpeg', ['-v', 'error', '-y', '-ss', at.toFixed(3), '-i', file, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '5', output])
}

// ── Trabalho em segundo plano ────────────────────────────

/** Vídeos sendo divididos agora (um vídeo "processando" fora daqui foi interrompido). */
const running = new Set<string>()

/** Marca como erro os vídeos que estavam sendo divididos quando o servidor parou. */
export function withLiveStatus(items: LibraryImage[]) {
  return items.map(i =>
    i.kind === 'video' && i.processing && !['pronto', 'erro'].includes(i.processing.stage) && !running.has(i.id)
      ? { ...i, processing: { stage: 'erro' as const, progress: 0, error: 'O servidor parou no meio. Tente de novo.' } }
      : i,
  )
}

class Cancelled extends Error {}

/** Gravações de cada vídeo em fila: uma atualização de andamento atrasada não desfaz a seguinte. */
const writes = new Map<string, Promise<unknown>>()

function setProcessing(id: string, processing: VideoProcessing, extra: Partial<LibraryImage> = {}) {
  const next = (writes.get(id) ?? Promise.resolve())
    .catch(() => undefined)
    .then(async () => {
      const current = await storage.findById(id)
      // o vídeo foi apagado no meio: para o trabalho
      if (!current) throw new Cancelled()
      return storage.save({ ...current, ...extra, processing })
    })
  writes.set(id, next)
  return next
}

/** Move o arquivo enviado para a biblioteca (rename falha entre discos: copia). */
async function moveInto(from: string, to: string) {
  try {
    await fs.rename(from, to)
  } catch {
    await fs.copyFile(from, to)
    await fs.unlink(from).catch(() => undefined)
  }
}

/** Duração em segundos de um áudio ou vídeo (0 se o ffprobe não souber). */
export async function mediaDuration(file: string) {
  const out = await run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', file])
  return Number(JSON.parse(out).format?.duration ?? 0) || 0
}

/** Converte um áudio para WAV mono de 16 kHz e 16 bits, o único formato que o Whisper lê. */
export async function toWav16k(input: string, output: string) {
  await run('ffmpeg', ['-y', '-v', 'error', '-i', input, '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', output])
}

/**
 * Guarda um vídeo curto inteiro (o clipe de um bordão) em `dir/base.mp4`, convertendo se o
 * navegador não tocar o arquivo. Diferente do episódio, não vira cenas e o som é mantido.
 */
export async function saveClip(tempFile: string, originalName: string, dir: string, base: string) {
  const ext = path.extname(originalName).toLowerCase()
  if (!VIDEO_EXTENSIONS.includes(ext)) throw new AppError(`Envie um vídeo (${VIDEO_EXTENSIONS.join(', ')})`, 400, 'INVALID_FILE')
  await fs.mkdir(dir, { recursive: true })
  const info = await probe(tempFile)
  if (PLAYABLE_CONTAINERS.includes(ext) && PLAYABLE_CODECS.includes(info.codec)) {
    const file = `${base}${ext}`
    await moveInto(tempFile, path.join(dir, file))
    return { file, duration: info.duration }
  }
  const file = `${base}.mp4`
  await toPlayable(tempFile, path.join(dir, file), info.duration, () => undefined)
  await fs.unlink(tempFile).catch(() => undefined)
  return { file, duration: info.duration }
}

/** Salva o vídeo enviado e começa a dividir em cenas. Devolve logo; o andamento fica em processing. */
export async function addVideo(tempFile: string, originalName: string, hint: string) {
  const ext = path.extname(originalName).toLowerCase()
  if (!VIDEO_EXTENSIONS.includes(ext)) {
    await fs.unlink(tempFile).catch(() => undefined)
    throw new AppError(`Envie um vídeo (${VIDEO_EXTENSIONS.join(', ')})`, 400, 'INVALID_FILE')
  }
  await fs.mkdir(LIBRARY_FILES_DIR, { recursive: true })
  const id = generateId('vid')
  const original = `${id}_original${ext}`
  await moveInto(tempFile, path.join(LIBRARY_FILES_DIR, original))

  const video: LibraryImage = {
    id,
    file: original,
    name: path.parse(originalName).name.replace(/[_.-]+/g, ' ').trim().slice(0, 60) || 'vídeo',
    kind: 'video',
    characters: [],
    tags: [],
    description: '',
    regions: [],
    usedIn: [],
    catalogued: false,
    source: 'upload',
    hint: hint.trim().slice(0, 120) || undefined,
    processing: { stage: 'preparando', progress: 0 },
    createdAt: new Date().toISOString(),
  }
  await storage.save(video)
  start(id)
  return video
}

/** Divide de novo (depois de um erro): apaga as cenas que já existiam. */
export async function reprocess(id: string) {
  const video = await storage.findById(id)
  if (!video || video.kind !== 'video') return null
  if (running.has(id)) return video
  await removeScenes(id)
  const fresh = await storage.save({ ...video, processing: { stage: 'preparando', progress: 0 } })
  start(id)
  return fresh
}

/** Apaga as cenas de um vídeo (os arquivos de miniatura e os itens). */
export async function removeScenes(videoId: string) {
  for (const scene of (await storage.findAll()).filter(i => i.kind === 'cena' && i.videoId === videoId)) {
    if (scene.thumb) await fs.unlink(path.join(LIBRARY_FILES_DIR, scene.thumb)).catch(() => undefined)
    await storage.delete(scene.id)
  }
}

function start(id: string) {
  running.add(id)
  processVideo(id)
    .catch(async error => {
      if (error instanceof Cancelled) return
      logger.error(`❌ Vídeo ${id}: ${error.message}`)
      await setProcessing(id, { stage: 'erro', progress: 0, error: String(error.message).slice(0, 200) }).catch(() => undefined)
    })
    .finally(() => {
      running.delete(id)
      writes.delete(id)
    })
}

async function processVideo(id: string) {
  let video = (await storage.findById(id))!
  const dir = LIBRARY_FILES_DIR
  let info = await probe(path.join(dir, video.file))
  if (!info.duration) throw new Error('não consegui ler a duração do vídeo')

  // 1. preparando: o navegador precisa conseguir tocar o arquivo
  const ext = path.extname(video.file).toLowerCase()
  if (!PLAYABLE_CONTAINERS.includes(ext) || !PLAYABLE_CODECS.includes(info.codec) || info.height > 1080) {
    const converted = `${id}.mp4`
    let last = 0
    await toPlayable(path.join(dir, video.file), path.join(dir, converted), info.duration, p => {
      if (p - last < 0.02) return
      last = p
      setProcessing(id, { stage: 'preparando', progress: p }).catch(() => undefined)
    })
    await fs.unlink(path.join(dir, video.file)).catch(() => undefined)
    video = await setProcessing(id, { stage: 'cortes', progress: 0 }, { file: converted })
    info = await probe(path.join(dir, converted))
  } else {
    video = await setProcessing(id, { stage: 'cortes', progress: 0 })
  }
  const file = path.join(dir, video.file)

  // 2. cortes
  let lastCut = 0
  const cuts = await detectCuts(file, info.fps, info.duration, p => {
    if (p - lastCut < 0.03) return
    lastCut = p
    setProcessing(id, { stage: 'cortes', progress: p }).catch(() => undefined)
  })
  const scenes = scenesFromCuts(cuts, info.duration)
  logger.info(`🎬 Vídeo ${id}: ${cuts.length} cortes → ${scenes.length} cenas (${info.duration.toFixed(0)}s)`)

  const thumb = `${id}_capa.jpg`
  await extractFrame(file, Math.min(info.duration * 0.1, 60), path.join(dir, thumb))
  await setProcessing(id, { stage: 'catalogando', progress: 0 }, { thumb, duration: info.duration })

  // 3. catalogando: miniatura do meio de cada cena, a IA descreve 10 de cada vez
  const frame = 1 / (info.fps || 24)
  let created = 0
  let failed = 0
  for (let b = 0; b < scenes.length; b += BATCH) {
    const batch = scenes.slice(b, b + BATCH)
    const thumbs: string[] = []
    for (const [n, s] of batch.entries()) {
      const name = `${id}_c${String(b + n + 1).padStart(4, '0')}.jpg`
      await extractFrame(file, (s.start + s.end) / 2, path.join(dir, name))
      thumbs.push(name)
    }

    let infos: Awaited<ReturnType<typeof catalogScenes>> | null = null
    try {
      infos = await catalogScenes(await Promise.all(thumbs.map(t => fs.readFile(path.join(dir, t)))), video.hint ?? video.name)
    } catch (error: any) {
      // sem IA as cenas ficam na biblioteca sem etiquetas (dá para catalogar depois)
      failed += batch.length
      logger.warn(`⚠️ Vídeo ${id}: lote ${b / BATCH + 1} sem catalogação: ${error.message}`)
    }

    for (const [n, s] of batch.entries()) {
      const info = infos?.[n]
      if (info?.skip) {
        await fs.unlink(path.join(dir, thumbs[n])).catch(() => undefined)
        continue
      }
      // um quadro de folga em cada ponta: o corte nunca mostra um pedaço da cena vizinha
      const clip = { start: +(s.start + frame).toFixed(3), end: +Math.max(s.start + frame * 2, s.end - frame).toFixed(3) }
      const scene: LibraryImage = {
        id: generateId('img'),
        file: video.file,
        thumb: thumbs[n],
        clip,
        videoId: id,
        name: info?.name ?? `cena ${b + n + 1}`,
        kind: 'cena',
        characters: info?.characters ?? [],
        tags: info?.tags ?? [],
        description: info?.description ?? '',
        regions: info?.regions ?? [],
        usedIn: [],
        catalogued: !!info,
        source: `video:${id}`,
        createdAt: new Date(Date.now() + b + n).toISOString(),
      }
      await storage.save(scene)
      created++
    }
    await setProcessing(id, { stage: 'catalogando', progress: Math.min(1, (b + batch.length) / scenes.length) })
  }

  const characters = await sceneCharacters(id)
  await setProcessing(
    id,
    { stage: 'pronto', progress: 1, ...(failed ? { error: `${failed} cenas ficaram sem catalogar (a IA não respondeu)` } : {}) },
    { catalogued: failed === 0, characters, description: `${created} cenas` },
  )
  logger.info(`✅ Vídeo ${id}: ${created} cenas na biblioteca`)
}

/** Os personagens que mais aparecem nas cenas (vão para o card do vídeo). */
async function sceneCharacters(videoId: string) {
  const count = new Map<string, number>()
  for (const s of await storage.findAll()) {
    if (s.kind === 'cena' && s.videoId === videoId) s.characters.forEach(c => count.set(c, (count.get(c) ?? 0) + 1))
  }
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([c]) => c)
}
