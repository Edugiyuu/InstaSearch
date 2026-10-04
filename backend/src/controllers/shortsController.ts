/**
 * Fluxo tema → Short: projetos, biblioteca de imagens e estilos.
 * Especificação em docs/AUTO_EDIT.md.
 */

import { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import axios from 'axios'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import * as projects from '../services/shorts/projects.js'
import * as library from '../services/shorts/library.js'
import * as styles from '../services/shorts/styles.js'
import * as sounds from '../services/shorts/sounds.js'
import { aiStatus } from '../services/shorts/llm.js'

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
  res.json({ success: true, data: await projects.adjust(req.params.id, req.body.request) })
})

export const undo = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await projects.undo(req.params.id) })
})

export const setBeatImage = asyncHandler(async (req: Request, res: Response) => {
  const { id, beatId } = req.params
  res.json({ success: true, data: await projects.setBeatImage(id, beatId, req.body.imageId ?? null) })
})

export const uploadAudio = [
  audioUpload.single('audio'),
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) throw new AppError('Nenhum áudio enviado', 400, 'NO_FILE')
    const ext = path.extname(req.file.originalname).toLowerCase() || '.mp3'
    res.json({ success: true, data: await projects.saveAudio(req.params.id, req.file.buffer, ext) })
  }),
]

// ── Biblioteca ────────────────────────────────────────────

export const listImages = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q : ''
  res.json({ success: true, data: q ? await library.searchImages(q) : await library.listImages() })
})

export const uploadImages = [
  imageUpload.array('images', 30),
  asyncHandler(async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? []
    if (files.length === 0) throw new AppError('Nenhuma imagem enviada', 400, 'NO_FILE')
    const saved = []
    // em sequência para não estourar o limite por minuto do Gemini
    const kind = req.body.kind === 'figurinha' ? 'figurinha' : undefined
    for (const f of files) saved.push(await library.addImage(f.buffer, f.mimetype, f.originalname, 'upload', kind))
    res.status(201).json({ success: true, data: saved })
  }),
]

export const importImageUrl = asyncHandler(async (req: Request, res: Response) => {
  const url = String(req.body.url ?? '').trim()
  if (!/^https?:\/\//i.test(url)) throw new AppError('Cole um link que comece com http', 400, 'VALIDATION')

  let response
  try {
    response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      maxContentLength: MAX_IMAGE,
      timeout: 15000,
      headers: { 'User-Agent': 'Mozilla/5.0 InstaSearch' },
    })
  } catch (error: any) {
    throw new AppError(`Não consegui baixar a imagem: ${error.message}`, 400, 'DOWNLOAD_FAILED')
  }
  const mime = String(response.headers['content-type'] ?? '').split(';')[0]
  if (!mime.startsWith('image/')) {
    throw new AppError('Esse link não é de uma imagem. Abra a imagem e copie o endereço dela.', 400, 'NOT_IMAGE')
  }
  const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'imagem')
  const image = await library.addImage(Buffer.from(response.data), mime, name, url)
  res.status(201).json({ success: true, data: image })
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
