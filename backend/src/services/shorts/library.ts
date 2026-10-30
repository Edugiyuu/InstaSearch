import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { AppError } from '../../middleware/errorHandler.js'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { catalogImage } from './shortsAI.js'
import { listSounds, soundIsType } from './sounds.js'
import { normalize } from './text.js'
import { imageSize } from './videoScenes.js'
import { makeVariants } from './imageVariants.js'

export { normalize }
import type { Beat, LibraryImage, MediaKind, SoundItem } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const LIBRARY_FILES_DIR = path.join(__dirname, '../../../data/library/files')

const storage = new FileStorage<LibraryImage>('library')

const MIME: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
}

export const IMAGE_EXTENSIONS = Object.keys(MIME)

export function extensionFor(mimeType: string): string {
  return Object.entries(MIME).find(([, m]) => m === mimeType)?.[0] ?? '.jpg'
}

const STOPWORDS = new Set(
  'a o as os um uma de da do das dos em no na nos nas e ou com sem por para pra que quem the of and com sua seu dele dela imagem foto cena'.split(' '),
)


function tokens(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9&]+/)
    .filter(t => t.length > 1 && !STOPWORDS.has(t))
}

function haystack(img: LibraryImage): string {
  return normalize([img.name, img.kind, img.description, ...img.tags, ...img.characters].join(' '))
}

export async function listImages(): Promise<LibraryImage[]> {
  const all = await storage.findAll()
  return all.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function getImage(id: string) {
  return storage.findById(id)
}

/** Busca em linguagem natural: todas as palavras importantes precisam aparecer. */
export async function searchImages(query: string): Promise<LibraryImage[]> {
  const all = await listImages()
  const words = tokens(query)
  if (words.length === 0) return all
  return all
    .map(img => {
      const hay = haystack(img)
      return { img, hits: words.filter(w => hay.includes(w)).length }
    })
    .filter(r => r.hits === words.length || r.hits >= 2)
    .sort((a, b) => b.hits - a.hits)
    .map(r => r.img)
}

export interface ImageHint {
  name?: string
  characters?: string[]
  tags?: string[]
  description?: string
  /** Os personagens da dica foram conferidos (pela visão na montagem, ou a fonte é confiável). */
  charactersChecked?: boolean
  /**
   * false = não chama a IA para catalogar (economiza; dá para catalogar depois na biblioteca).
   * 'background' = salva já e cataloga em segundo plano: quem troca a imagem de uma cena não espera a IA.
   */
  catalog?: boolean | 'background'
}

/** hint: o que a origem já informa (nome, personagens…); vale se a IA não catalogar. */
export async function addImage(
  data: Buffer,
  mimeType: string,
  originalName: string,
  source?: string,
  hint: ImageHint = {},
) {
  await fs.mkdir(LIBRARY_FILES_DIR, { recursive: true })
  const id = generateId('img')
  const ext = IMAGE_EXTENSIONS.includes(path.extname(originalName).toLowerCase())
    ? path.extname(originalName).toLowerCase()
    : extensionFor(mimeType)
  const file = `${id}${ext}`
  await fs.writeFile(path.join(LIBRARY_FILES_DIR, file), data)
  // a versão leve para o vídeo e a miniatura; a original fica guardada. Sem elas, a imagem segue
  // como veio: o tamanho decide o enquadramento no vídeo (ADR 0020)
  const variants = await makeVariants(LIBRARY_FILES_DIR, file).catch(error => {
    logger.warn(`⚠️ Imagem ${id} sem versão reduzida: ${error.message}`)
    return null
  })
  const size = variants ? null : await imageSize(path.join(LIBRARY_FILES_DIR, file)).catch(() => null)

  const base: LibraryImage = {
    id,
    file,
    ...(variants ?? {}),
    name: (hint.name || path.parse(originalName).name.replace(/[_-]+/g, ' ')).slice(0, 40) || 'imagem',
    kind: 'imagem',
    characters: hint.characters ?? [],
    tags: hint.tags ?? [],
    description: hint.description ?? '',
    regions: [],
    usedIn: [],
    catalogued: false,
    ...(hint.charactersChecked && hint.characters?.length ? { charactersChecked: true } : {}),
    ...(size ?? {}),
    source,
    createdAt: new Date().toISOString(),
  }

  if (hint.catalog === 'background') {
    base.cataloguing = true
    const saved = await storage.save(base)
    enqueueCatalog(id)
    return saved
  }

  if (hint.catalog !== false) {
    try {
      // a IA olha a versão do vídeo: o que vai para a tela, e mais leve que a original
      const seen = base.original ? await fs.readFile(path.join(LIBRARY_FILES_DIR, base.file)) : data
      const info = await catalogImage(seen, MIME[path.extname(base.file)] ?? mimeType)
      Object.assign(base, info, { catalogued: true })
    } catch (error: any) {
      // sem catalogação a imagem fica na biblioteca e pode ser etiquetada à mão
      logger.warn(`⚠️ Imagem ${id} salva sem catalogação: ${error.message}`)
    }
  }
  return storage.save(base)
}

const MAX_IMAGE = 15 * 1024 * 1024

const fetchImage = (url: string, userAgent: string) =>
  axios.get<ArrayBuffer>(url, {
    responseType: 'arraybuffer',
    maxContentLength: MAX_IMAGE,
    timeout: 20000,
    headers: { 'User-Agent': userAgent, Accept: 'image/*' },
  })

// O CDN do Danbooru recusa um "Mozilla" falso e aceita um nome honesto; outros sites só aceitam "Mozilla".
async function downloadImage(url: string) {
  try {
    return await fetchImage(url, 'InstaSearch/1.0 (uso pessoal)')
  } catch (error: any) {
    if (error.response?.status !== 403) throw error
    return fetchImage(url, 'Mozilla/5.0 InstaSearch')
  }
}

/**
 * Baixa uma imagem de um link e salva na biblioteca. fallbackUrl (a miniatura) é usada se o site
 * bloquear a grande.
 */
export async function importImageFromUrl(url: string, opts: ImageHint & { fallbackUrl?: string } = {}) {
  if (!/^https?:\/\//i.test(url)) throw new AppError('Cole um link que comece com http', 400, 'VALIDATION')
  let response
  try {
    response = await downloadImage(url)
  } catch (error: any) {
    if (!opts.fallbackUrl || !/^https?:\/\//i.test(opts.fallbackUrl)) {
      throw new AppError(`Não consegui baixar a imagem: ${error.message}`, 400, 'DOWNLOAD_FAILED')
    }
    try {
      response = await downloadImage(opts.fallbackUrl)
    } catch {
      throw new AppError(`O site bloqueou o download dessa imagem (${error.message}). Escolha outra.`, 400, 'DOWNLOAD_FAILED')
    }
  }
  const mime = String(response.headers['content-type'] ?? '').split(';')[0]
  if (!mime.startsWith('image/')) {
    throw new AppError('Esse link não é de uma imagem. Abra a imagem e copie o endereço dela.', 400, 'NOT_IMAGE')
  }
  const fileName = decodeURIComponent(new URL(url).pathname.split('/').pop() || 'imagem')
  return addImage(Buffer.from(response.data), mime, fileName, url, opts)
}

export async function recatalog(id: string) {
  const img = await storage.findById(id)
  if (!img) return null
  if (img.kind === 'video') throw new AppError('Para catalogar o vídeo de novo, divida em cenas outra vez', 400, 'VALIDATION')
  // nas cenas, a IA olha a miniatura (o arquivo é o vídeo inteiro)
  const file = img.kind === 'cena' && img.thumb ? img.thumb : img.file
  const data = await fs.readFile(path.join(LIBRARY_FILES_DIR, file))
  const info = await catalogImage(data, MIME[path.extname(file)] ?? 'image/jpeg')
  return storage.save({ ...img, ...info, kind: img.kind === 'cena' ? 'cena' : info.kind, catalogued: true, cataloguing: false })
}

// ── Catalogação em segundo plano ─────────────────────────
// Fila em memória, uma imagem por vez: não estoura o limite por minuto do Gemini.

const catalogQueue: string[] = []
let draining = false

function enqueueCatalog(id: string) {
  if (!catalogQueue.includes(id)) catalogQueue.push(id)
  void drainCatalogQueue()
}

async function drainCatalogQueue() {
  if (draining) return
  draining = true
  try {
    for (let id = catalogQueue.shift(); id; id = catalogQueue.shift()) await catalogInBackground(id)
  } finally {
    draining = false
  }
}

async function catalogInBackground(id: string) {
  const img = await storage.findById(id)
  if (!img?.cataloguing) return // apagada, ou já catalogada pelo botão da biblioteca
  try {
    const data = await fs.readFile(path.join(LIBRARY_FILES_DIR, img.file))
    const info = await catalogImage(data, MIME[path.extname(img.file)] ?? 'image/jpeg')
    // relê: a imagem pode ter sido apagada enquanto a IA olhava
    const fresh = await storage.findById(id)
    if (!fresh) return
    // a catalogação nem sempre reconhece o personagem; se ela não achou ninguém, vale o que já foi conferido
    const characters = info.characters.length || !fresh.charactersChecked ? info.characters : fresh.characters
    await storage.save({ ...fresh, ...info, characters, catalogued: true, cataloguing: false })
    logger.info(`🏷️ Imagem ${id} catalogada: ${info.name}`)
  } catch (error: any) {
    // igual a quando a IA não responde no envio: fica salva, sem catalogação, e dá para tentar de novo
    logger.warn(`⚠️ Imagem ${id} ficou sem catalogação: ${error.message}`)
    await storage.update(id, { cataloguing: false })
  }
}

/** Ao subir o servidor: volta para a fila o que ficou pela metade (a catalogação marca onde dar zoom). */
export async function resumeCataloguing() {
  const all = await storage.findAll()
  const pending = all.filter(i => i.cataloguing)
  if (pending.length) logger.info(`🏷️ Catalogando ${pending.length} imagem(ns) em segundo plano`)
  pending.forEach(i => enqueueCatalog(i.id))
  void measureLibrary(all)
}

/** Mede as imagens antigas, sem tamanho (uma vez): o enquadramento no vídeo depende dele. */
async function measureLibrary(all: LibraryImage[]) {
  const missing = all.filter(i => i.kind !== 'video' && !i.width && (i.kind === 'cena' ? i.thumb : i.file))
  let measured = 0
  for (const img of missing) {
    const size = await imageSize(path.join(LIBRARY_FILES_DIR, img.kind === 'cena' ? img.thumb! : img.file)).catch(() => null)
    if (!size) continue
    await storage.update(img.id, size)
    measured++
  }
  if (measured) logger.info(`📐 ${measured} imagem(ns) medidas para o enquadramento`)
}

export async function updateImage(id: string, changes: Partial<LibraryImage>) {
  const allowed: Partial<LibraryImage> = {}
  if (changes.name !== undefined) allowed.name = String(changes.name)
  if (Array.isArray(changes.tags)) allowed.tags = changes.tags.map(t => String(t).toLowerCase())
  // personagens escritos pelo usuário contam como conferidos (ADR 0020)
  if (Array.isArray(changes.characters)) {
    allowed.characters = changes.characters.map(String)
    allowed.charactersChecked = true
  }
  if (Array.isArray(changes.regions)) allowed.regions = changes.regions
  // vídeo e cena não viram imagem (nem imagem vira cena)
  const fixed = (k?: MediaKind) => k === 'video' || k === 'cena'
  if (changes.kind && !fixed(changes.kind)) {
    const current = await storage.findById(id)
    if (current && !fixed(current.kind)) allowed.kind = changes.kind
  }
  return storage.update(id, allowed)
}

const unlinkFile = (file?: string) => (file ? fs.unlink(path.join(LIBRARY_FILES_DIR, file)).catch(() => undefined) : undefined)

/** Apagar um vídeo apaga as cenas dele; apagar uma cena não mexe no arquivo do vídeo. */
export async function deleteImage(id: string) {
  const img = await storage.findById(id)
  if (!img) return false
  if (img.kind === 'video') {
    for (const scene of (await storage.findAll()).filter(i => i.kind === 'cena' && i.videoId === id)) {
      await unlinkFile(scene.thumb)
      await storage.delete(scene.id)
    }
  }
  if (img.kind !== 'cena') await unlinkFile(img.file)
  await unlinkFile(img.original)
  await unlinkFile(img.thumb)
  return storage.delete(id)
}

/** Marca em quais projetos cada imagem está sendo usada. */
export async function syncUsage(projectId: string, beats: Beat[]) {
  const used = new Set(beats.map(b => b.imageId).filter(Boolean))
  for (const img of await storage.findAll()) {
    const has = img.usedIn.includes(projectId)
    if (used.has(img.id) && !has) await storage.update(img.id, { usedIn: [...img.usedIn, projectId] })
    if (!used.has(img.id) && has) await storage.update(img.id, { usedIn: img.usedIn.filter(p => p !== projectId) })
  }
}

export async function forgetProject(projectId: string) {
  await syncUsage(projectId, [])
}

/**
 * Escolhe os efeitos sonoros, sem mexer nas imagens: na montagem e depois do ajuste do vídeo.
 * O que o usuário escolheu na cena fica; o volume da cena foi acertado para aquele som, e com outro volta ao normal.
 */
export async function refreshSfx(projectId: string, beats: Beat[]) {
  const sounds = await listSounds('sfx')
  const uses = new Map<string, number>()
  const next = beats.map((beat, index) => {
    const sfxId = pickSfx(beat, index, sounds, uses)
    return { ...beat, sfxId, sfxVolume: sfxId === beat.sfxId ? beat.sfxVolume : undefined }
  })
  await syncUsage(projectId, next)
  return next
}

/** Palavras que identificam cada tipo de efeito sonoro no nome ou nas etiquetas. */

function defaultSfx(beat: Beat, index: number) {
  if (index === 0) return 'boom'
  if (beat.effect === 'arrow') return 'whoosh'
  if (beat.effect === 'cross') return 'erro'
  if (beat.effect === 'circle') return 'ding'
  if (beat.scene === 'evidence') return 'click'
  return undefined
}

/**
 * Efeito sonoro da batida. O que o usuário escolheu no editor (ou pediu no chat) fica;
 * no resto, a montagem procura um som do tipo pedido pelo nome e pelas etiquetas.
 */
export function pickSfx(beat: Beat, index: number, sounds: SoundItem[], uses: Map<string, number>) {
  if (beat.sfxLocked) return beat.sfxId && sounds.some(s => s.id === beat.sfxId) ? beat.sfxId : undefined
  const wanted = beat.sfx ?? defaultSfx(beat, index)
  if (!wanted) return undefined
  const matches = sounds.filter(s => soundIsType(s, wanted))
  if (matches.length === 0) return undefined
  // mantém o som que a batida já tinha, se ele ainda vale para o tipo
  if (beat.sfxId && matches.some(s => s.id === beat.sfxId)) {
    uses.set(beat.sfxId, (uses.get(beat.sfxId) ?? 0) + 1)
    return beat.sfxId
  }
  // alterna entre os sons do mesmo tipo para não repetir sempre o mesmo
  const pick = matches.reduce((a, b) => ((uses.get(b.id) ?? 0) < (uses.get(a.id) ?? 0) ? b : a))
  uses.set(pick.id, (uses.get(pick.id) ?? 0) + 1)
  return pick.id
}
