/**
 * Fluxo tema → Short: projetos, biblioteca de imagens e estilos.
 * Como o fluxo funciona: docs/USO.md e docs/ARQUITETURA.md.
 */

import { Request, Response } from 'express'
import multer from 'multer'
import os from 'os'
import path from 'path'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import * as projects from '../services/shorts/projects.js'
import * as library from '../services/shorts/library.js'
import * as videoScenes from '../services/shorts/videoScenes.js'
import * as styles from '../services/shorts/styles.js'
import * as sounds from '../services/shorts/sounds.js'
import { aiStatus } from '../services/shorts/llm.js'
import * as render from '../services/shorts/render.js'
import * as publish from '../services/shorts/publish.js'
import * as catchphrases from '../services/shorts/catchphrases.js'
import { fetchThumb, searchWebImages } from '../services/shorts/imageSearch.js'
import { ensureWhisper, whisperStatus } from '../services/shorts/transcription.js'
import * as tones from '../services/shorts/tones.js'
import { suggestTone } from '../services/shorts/shortsAI.js'

const MAX_IMAGE = 15 * 1024 * 1024

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE, files: 30 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('image/') || library.IMAGE_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())
    if (ok) cb(null, true)
    else cb(new AppError('Envie imagens (jpg, png, webp ou gif)', 400, 'INVALID_FILE'))
  },
})

// episódios são grandes: vão direto para o disco
const videoUpload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: 4 * 1024 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = videoScenes.VIDEO_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())
    if (ok) cb(null, true)
    else cb(new AppError(`Envie um vídeo (${videoScenes.VIDEO_EXTENSIONS.join(', ')})`, 400, 'INVALID_FILE'))
  },
})

const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || ['.mp3', '.wav', '.m4a', '.ogg', '.webm'].includes(path.extname(file.originalname).toLowerCase())
    if (ok) cb(null, true)
    else cb(new AppError('Envie um áudio (mp3, wav, m4a, ogg)', 400, 'INVALID_FILE'))
  },
})

export const getAiStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: aiStatus() })
})

// ── Projetos ──────────────────────────────────────────────

export const listProjects = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await projects.listProjects() })
})

export const getProject = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await projects.getProject(req.params.id) })
})

export const createProject = asyncHandler(async (req: Request, res: Response) => {
  res.status(201).json({ success: true, data: await projects.createProject(req.body) })
})

export const updateProject = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await projects.updateProject(req.params.id, req.body) })
})

export const deleteProject = asyncHandler(async (req: Request, res: Response) => {
  await projects.deleteProject(req.params.id)
  res.json({ success: true })
})

export const assemble = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await projects.assemble(req.params.id) })
})

export const adjust = asyncHandler(async (req: Request, res: Response) => {
  const scene = Number(req.body.scene)
  res.json({ success: true, data: await projects.adjust(req.params.id, req.body.request, Number.isInteger(scene) && scene > 0 ? scene : undefined) })
})

export const undo = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await projects.undo(req.params.id) })
})

export const setBeatImage = asyncHandler(async (req: Request, res: Response) => {
  const { id, beatId } = req.params
  res.json({ success: true, data: await projects.setBeatImage(id, beatId, req.body.imageId ?? null) })
})

/** Body: { framing: 'cover' | 'fit' | null } → tela cheia, imagem inteira ou automático. */
export const setBeatFraming = asyncHandler(async (req: Request, res: Response) => {
  const { id, beatId } = req.params
  const framing = req.body.framing === 'cover' || req.body.framing === 'fit' ? req.body.framing : null
  res.json({ success: true, data: await projects.setBeatFraming(id, beatId, framing) })
})

export const uploadAudio = [
  audioUpload.single('audio'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Nenhum áudio enviado', 400, 'NO_FILE')
    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3'
    res.json({ success: true, data: await projects.saveAudio(req.params.id, req.file.buffer, ext) })
  }),
]

/** POST /shorts/projects/:id/transcribe → transcreve (de novo) a voz em segundo plano (ADR 0018). */
export const transcribe = asyncHandler(async (req: Request, res: Response) => {
  res.status(202).json({ success: true, data: await projects.requestTranscription(req.params.id) })
})

/** GET /shorts/whisper → o Whisper está instalado? */
export const getWhisper = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: whisperStatus() })
})

/** POST /shorts/whisper/install → começa o download e responde na hora (acompanhe pelo GET). */
export const installWhisper = asyncHandler(async (_req: Request, res: Response) => {
  ensureWhisper().catch(() => undefined) // o erro fica no whisperStatus()
  res.status(202).json({ success: true, data: whisperStatus() })
})

// ── Biblioteca ────────────────────────────────────────────

export const listImages = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : ''
  res.json({ success: true, data: videoScenes.withLiveStatus(q ? await library.searchImages(q) : await library.listImages()) })
})

/** Envia um episódio ou trecho (campo "video") e começa a dividir em cenas. Body: { hint? } (anime/episódio). */
export const uploadVideo = [
  videoUpload.single('video'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Nenhum vídeo enviado', 400, 'NO_FILE')
    const video = await videoScenes.addVideo(req.file.path, req.file.originalname, String(req.body.hint ?? ''))
    res.status(202).json({ success: true, data: video })
  }),
]

export const reprocessVideo = asyncHandler(async (req: Request, res: Response) => {
  const video = await videoScenes.reprocess(req.params.id)
  if (!video) throw new AppError('Vídeo não encontrado', 404, 'NOT_FOUND')
  res.json({ success: true, data: video })
})

export const uploadImages = [
  imageUpload.array('images', 30),
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length === 0) throw new AppError('Nenhuma imagem enviada', 400, 'NO_FILE')
    const saved = []
    // em sequência para não estourar o limite por minuto do Gemini
    const kind = req.body.kind === 'figurinha' ? 'figurinha' : undefined
    const catalog = req.body.background === 'true' ? 'background' : undefined
    for (const f of files) saved.push(await library.addImage(f.buffer, f.mimetype, f.originalname, 'upload', kind, { catalog }))
    res.status(201).json({ success: true, data: saved })
  }),
]

/**
 * Body: { url, fallbackUrl?, name?, characters?, background? }. fallbackUrl (a miniatura) é usada se o site
 * bloquear a imagem grande; name e characters vêm da sugestão e valem se a IA não catalogar.
 * background: true responde assim que a imagem baixa e cataloga depois (troca de imagem de uma cena).
 */
export const importImageUrl = asyncHandler(async (req: Request, res: Response) => {
  const url = String(req.body.url ?? '').trim()
  const characters = Array.isArray(req.body.characters) ? req.body.characters.map(String).slice(0, 6) : undefined
  const name = typeof req.body.name === 'string' && req.body.name.trim() ? req.body.name.trim() : undefined
  const fallbackUrl = String(req.body.fallbackUrl ?? '').trim() || undefined
  const catalog = req.body.background === true ? 'background' : undefined
  const image = await library.importImageFromUrl(url, { fallbackUrl, name, characters, catalog })
  res.status(201).json({ success: true, data: image })
})

/** GET /library/web-search?q=&characters=a,b&tags=a,b&context=&page= → sugestões da internet para uma cena. */
/** Tipo de imagem do estilo do projeto (mangá, anime…), para ordenar as sugestões. */
async function projectImageType(projectId: string) {
  try {
    return (await styles.getStyle((await projects.getProject(projectId)).styleId)).imageType
  } catch {
    return undefined
  }
}

export const webImageSearch = asyncHandler(async (req: Request, res: Response) => {
  const q = String(req.query.q ?? '').trim()
  if (!q) throw new AppError('Escreva o que a imagem precisa mostrar', 400, 'VALIDATION')
  const list = (v: unknown) =>
    String(v ?? '')
      .split(',')
      .map(c => c.trim())
      .filter(Boolean)
  const result = await searchWebImages({
    query: q.slice(0, 200),
    characters: list(req.query.characters),
    tags: list(req.query.tags).slice(0, 6),
    context: String(req.query.context ?? '').slice(0, 200),
    page: Number(req.query.page) || 1,
    imageType: typeof req.query.projectId === 'string' ? await projectImageType(req.query.projectId) : undefined,
  })
  res.json({ success: true, data: result })
})

/** PUT /shorts/projects/:id/beats/:beatId/sfx { sfxId: id | null | 'auto' } → efeito sonoro da cena */
export const setBeatSfx = asyncHandler(async (req: Request, res: Response) => {
  const raw = req.body?.sfxId
  const sfxId = raw === null || raw === undefined || raw === '' ? null : String(raw)
  res.json({ success: true, data: await projects.setBeatSfx(req.params.id, req.params.beatId, sfxId) })
})

/** POST /shorts/projects/:id/auto-images → busca na internet e coloca imagem nas cenas que precisam. */
export const autoImages = asyncHandler(async (req: Request, res: Response) => {
  const result = await projects.autoFillImages(req.params.id)
  res.json({ success: true, data: result })
})

/** GET /library/web-thumb?url= → miniatura de uma sugestão (só domínios das fontes de busca). */
export const webThumb = asyncHandler(async (req: Request, res: Response) => {
  let thumb
  try {
    thumb = await fetchThumb(String(req.query.url ?? ''))
  } catch {
    thumb = null
  }
  if (!thumb) {
    res.status(404).end()
    return
  }
  res.set('Content-Type', thumb.type).set('Cache-Control', 'public, max-age=86400').send(thumb.data)
})

export const updateImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await library.updateImage(req.params.id, req.body)
  if (!image) throw new AppError('Imagem não encontrada', 404, 'NOT_FOUND')
  res.json({ success: true, data: image })
})

export const recatalogImage = asyncHandler(async (req: Request, res: Response) => {
  const image = await library.recatalog(req.params.id)
  if (!image) throw new AppError('Imagem não encontrada', 404, 'NOT_FOUND')
  res.json({ success: true, data: image })
})

export const deleteImage = asyncHandler(async (req: Request, res: Response) => {
  if (!(await library.deleteImage(req.params.id))) throw new AppError('Imagem não encontrada', 404, 'NOT_FOUND')
  res.json({ success: true })
})

// ── Sons (efeitos sonoros e músicas) ──────────────────────

const soundUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 30 },
  fileFilter: (_req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || sounds.AUDIO_EXTENSIONS.includes(path.extname(file.originalname).toLowerCase())
    if (ok) cb(null, true)
    else cb(new AppError('Envie áudios (mp3, wav, m4a, ogg)', 400, 'INVALID_FILE'))
  },
})

const soundKind = (value: unknown) => (value === 'musica' ? 'musica' : 'sfx')

export const listSounds = asyncHandler(async (req: Request, res: Response) => {
  const kind = req.query.kind === 'sfx' || req.query.kind === 'musica' ? req.query.kind : undefined
  res.json({ success: true, data: await sounds.listSounds(kind) })
})

export const uploadSounds = [
  soundUpload.array('sounds', 30),
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length === 0) throw new AppError('Nenhum áudio enviado', 400, 'NO_FILE')
    const kind = soundKind(req.body.kind)
    const saved = []
    for (const f of files) saved.push(await sounds.addSound(f.buffer, f.originalname, kind, 'upload'))
    res.status(201).json({ success: true, data: saved })
  }),
]

export const importSoundUrl = asyncHandler(async (req: Request, res: Response) => {
  const url = String(req.body.url ?? '').trim()
  if (!/^https?:\/\//i.test(url)) throw new AppError('Cole um link que comece com http', 400, 'VALIDATION')
  res.status(201).json({ success: true, data: await sounds.importSoundFromUrl(url, soundKind(req.body.kind ?? 'musica')) })
})

export const updateSound = asyncHandler(async (req: Request, res: Response) => {
  const sound = await sounds.updateSound(req.params.id, req.body)
  if (!sound) throw new AppError('Som não encontrado', 404, 'NOT_FOUND')
  res.json({ success: true, data: sound })
})

export const deleteSound = asyncHandler(async (req: Request, res: Response) => {
  if (!(await sounds.deleteSound(req.params.id))) throw new AppError('Som não encontrado', 404, 'NOT_FOUND')
  res.json({ success: true })
})

// ── Estilos ───────────────────────────────────────────────

export const listStyles = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await styles.listStyles() })
})

export const saveStyle = asyncHandler(async (req: Request, res: Response) => {
  if (!req.body?.name) throw new AppError('Dê um nome ao estilo', 400, 'VALIDATION')
  res.json({ success: true, data: await styles.saveStyle({ ...req.body, id: req.params.id ?? req.body.id }) })
})

export const deleteStyle = asyncHandler(async (req: Request, res: Response) => {
  if (styles.BUILT_IN_STYLES.some(s => s.id === req.params.id)) {
    throw new AppError('Estilos que vêm com o app não podem ser apagados', 400, 'BUILT_IN')
  }
  await styles.deleteStyle(req.params.id)
  res.json({ success: true })
})

// ── Tons do roteiro (ADR 0019) ───────────────────────────

export const listTones = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await tones.listTones() })
})

export const saveTone = asyncHandler(async (req: Request, res: Response) => {
  if (!String(req.body?.name ?? '').trim()) throw new AppError('Dê um nome ao tom', 400, 'VALIDATION')
  if (!String(req.body?.guide ?? '').trim()) throw new AppError('Escreva como a IA deve falar nesse tom', 400, 'VALIDATION')
  res.json({ success: true, data: await tones.saveTone({ ...req.body, id: req.params.id ?? req.body.id }) })
})

export const deleteTone = asyncHandler(async (req: Request, res: Response) => {
  if (tones.BUILT_IN_TONES.some(t => t.id === req.params.id)) {
    throw new AppError('Tons que vêm com o app não podem ser apagados', 400, 'BUILT_IN')
  }
  await tones.deleteTone(req.params.id)
  res.json({ success: true })
})

/** Body: { description, example? } → a IA sugere nome, resumo e instrução; nada é salvo ainda. */
export const suggestToneHandler = asyncHandler(async (req: Request, res: Response) => {
  const description = String(req.body?.description ?? '').trim()
  if (description.length < 5) throw new AppError('Descreva o tom que você quer', 400, 'VALIDATION')
  res.json({ success: true, data: await suggestTone({ description, example: req.body?.example ? String(req.body.example) : undefined }) })
})

// ── MP4 e publicação ─────────────────────────────────────

/** POST: começa o render com as props da prévia (ou devolve o MP4 que já bate com elas). */
export const startRender = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await render.startRender(req.params.id, req.body?.props) })
})

/** GET ?key=: andamento do render (null = nada renderizado para essas props). */
export const getRender = asyncHandler(async (req: Request, res: Response) => {
  const key = typeof req.query.key === 'string' ? req.query.key : undefined
  res.json({ success: true, data: await render.renderStatus(req.params.id, key) })
})

/** GET: baixa o MP4 com o título do projeto como nome. */
export const downloadVideo = asyncHandler(async (req: Request, res: Response) => {
  const { project, file } = await render.renderedFile(req.params.id)
  const name = project.title.replace(/[\/:*?"<>|]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'short'
  res.download(file, `${name}.mp4`)
})

export const publishInstagram = asyncHandler(async (req: Request, res: Response) => {
  const caption = String(req.body?.caption ?? '')
  if (!caption.trim()) throw new AppError('Escreva a legenda do post', 400, 'VALIDATION_ERROR')
  res.json({ success: true, data: await publish.publishInstagram(req.params.id, caption) })
})

export const publishYouTube = asyncHandler(async (req: Request, res: Response) => {
  const { title, description, privacy } = req.body ?? {}
  if (!String(title ?? '').trim()) throw new AppError('Escreva o título do vídeo', 400, 'VALIDATION_ERROR')
  res.json({
    success: true,
    data: await publish.publishYouTube(req.params.id, { title: String(title), description: String(description ?? ''), privacy }),
  })
})

// ── Bordões (abertura e final, ADR 0016) ─────────────────

// clipe, áudio ou foto: vai para o disco, o serviço confere pelo tipo do bordão
const catchphraseUpload = multer({
  storage: multer.diskStorage({ destination: os.tmpdir() }),
  limits: { fileSize: 300 * 1024 * 1024, files: 1 },
})

export const listCatchphrases = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await catchphrases.listCatchphrases() })
})

/** multipart: kind (clipe | montado | inscreva) e, no clipe, o vídeo em file. */
export const createCatchphrase = [
  catchphraseUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    res.status(201).json({ success: true, data: await catchphrases.createCatchphrase(req.body.kind, req.file) })
  }),
]

export const updateCatchphrase = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await catchphrases.updateCatchphrase(req.params.id, req.body ?? {}) })
})

export const replaceCatchphraseFile = [
  catchphraseUpload.single('file'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Envie o arquivo', 400, 'NO_FILE')
    res.json({ success: true, data: await catchphrases.replaceFile(req.params.id, req.file) })
  }),
]

export const catchphrasePhotoFromInstagram = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await catchphrases.photoFromInstagram(req.params.id) })
})

export const deleteCatchphrase = asyncHandler(async (req: Request, res: Response) => {
  await catchphrases.deleteCatchphrase(req.params.id)
  res.json({ success: true })
})
