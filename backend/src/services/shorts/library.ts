import fs from 'fs/promises'
import path from 'path'
import axios from 'axios'
import { AppError } from '../../middleware/errorHandler.js'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { catalogImage, ImageChoice, pickImagesWithAI } from './shortsAI.js'
import { listSounds, soundIsType } from './sounds.js'
import { normalize } from './text.js'
import { imageSize } from './videoScenes.js'

export { normalize }
import type { AiCredit, AssemblyLogEntry, Beat, ImageStatus, LibraryImage, MediaKind, SoundItem } from './types.js'

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
  kind?: MediaKind,
  hint: ImageHint = {},
) {
  await fs.mkdir(LIBRARY_FILES_DIR, { recursive: true })
  const id = generateId('img')
  const ext = IMAGE_EXTENSIONS.includes(path.extname(originalName).toLowerCase())
    ? path.extname(originalName).toLowerCase()
    : extensionFor(mimeType)
  const file = `${id}${ext}`
  await fs.writeFile(path.join(LIBRARY_FILES_DIR, file), data)
  // o tamanho decide o enquadramento no vídeo (ADR 0020)
  const size = await imageSize(path.join(LIBRARY_FILES_DIR, file)).catch(() => null)

  const base: LibraryImage = {
    id,
    file,
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
    if (kind) base.kind = kind
    base.cataloguing = true
    const saved = await storage.save(base)
    enqueueCatalog(id)
    return saved
  }

  if (hint.catalog !== false) {
    try {
      const info = await catalogImage(data, MIME[ext] ?? mimeType)
      Object.assign(base, info, { catalogued: true })
      if (kind) base.kind = kind
    } catch (error: any) {
      // sem catalogação a imagem fica na biblioteca e pode ser etiquetada à mão
      logger.warn(`⚠️ Imagem ${id} salva sem catalogação: ${error.message}`)
    }
  }
  if (kind) base.kind = kind
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
  return addImage(Buffer.from(response.data), mime, fileName, url, undefined, opts)
}

export async function recatalog(id: string) {
  const img = await storage.findById(id)
  if (!img) return null
  if (img.kind === 'video') throw new AppError('Para catalogar o vídeo de novo, divida em cenas outra vez', 400, 'VALIDATION')
  // nas cenas, a IA olha a miniatura (o arquivo é o vídeo inteiro)
  const file = img.thumb ?? img.file
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
    const kind = fresh.kind === 'figurinha' ? 'figurinha' : info.kind
    // a catalogação nem sempre reconhece o personagem; se ela não achou ninguém, vale o que já foi conferido
    const characters = info.characters.length || !fresh.charactersChecked ? info.characters : fresh.characters
    await storage.save({ ...fresh, ...info, characters, kind, catalogued: true, cataloguing: false })
    logger.info(`🏷️ Imagem ${id} catalogada: ${info.name}`)
  } catch (error: any) {
    // igual a quando a IA não responde no envio: fica salva, sem catalogação, e dá para tentar de novo
    logger.warn(`⚠️ Imagem ${id} ficou sem catalogação: ${error.message}`)
    await storage.update(id, { cataloguing: false })
  }
}

/** Imagem com personagens que ninguém conferiu (antes do ADR 0020, o preenchimento automático copiava os da cena). */
const unchecked = (i: LibraryImage) => !i.catalogued && !i.charactersChecked && i.characters.length > 0 && !['video', 'cena'].includes(i.kind)

/**
 * Ao subir o servidor: volta para a fila o que ficou pela metade e as imagens com personagens
 * não conferidos (catalogar de novo corrige o rótulo; se a IA falhar, tenta no próximo início).
 */
export async function resumeCataloguing() {
  const all = await storage.findAll()
  const toCheck = all.filter(i => !i.cataloguing && unchecked(i))
  for (const img of toCheck) await storage.save({ ...img, cataloguing: true })
  const pending = all.filter(i => i.cataloguing || toCheck.includes(i))
  if (pending.length) logger.info(`🏷️ Catalogando ${pending.length} imagem(ns) em segundo plano (${toCheck.length} com personagens não conferidos)`)
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

/**
 * A imagem mostra algum dos personagens que a cena pede? Só vale com os personagens conferidos
 * (catalogada pela IA, escrita pelo usuário ou confirmada pela visão). Cena sem personagem: qualquer uma serve.
 */
function showsWanted(beat: Beat, img: LibraryImage) {
  if (!beat.characters.length) return true
  if (!img.catalogued && !img.charactersChecked) return false
  return matchCharacters(beat.characters, img, haystack(img)) > 0
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
  await unlinkFile(img.thumb)
  return storage.delete(id)
}

/** Marca em quais projetos cada imagem está sendo usada. */
export async function syncUsage(projectId: string, beats: Beat[]) {
  const used = new Set(beats.flatMap(b => [b.imageId, b.stickerId]).filter(Boolean))
  for (const img of await storage.findAll()) {
    const has = img.usedIn.includes(projectId)
    if (used.has(img.id) && !has) await storage.update(img.id, { usedIn: [...img.usedIn, projectId] })
    if (!used.has(img.id) && has) await storage.update(img.id, { usedIn: img.usedIn.filter(p => p !== projectId) })
  }
}

export async function forgetProject(projectId: string) {
  await syncUsage(projectId, [])
}

/** Personagens pedidos que aparecem na imagem (ou no nome/etiquetas, para animais e objetos). */
function matchCharacters(wanted: string[], img: LibraryImage, hay: string): number {
  const have = img.characters.map(normalize)
  return wanted.filter(w => {
    const n = normalize(w)
    return have.some(h => h.includes(n) || n.includes(h)) || tokens(n).some(t => t.length > 2 && hay.includes(t))
  }).length
}

/** Relevância por palavras (personagem vale mais), sem contar repetição. */
function relevance(beat: Beat, img: LibraryImage) {
  const hay = haystack(img)
  return matchCharacters(beat.characters, img, hay) * 3 + tokens(beat.query).filter(w => hay.includes(w)).length
}

/** Biblioteca grande: manda para a IA só as melhores candidatas de cada cena. */
function shortlist(beats: Beat[], images: LibraryImage[], perBeat: number) {
  const picked = new Set<LibraryImage>()
  for (const beat of beats) {
    images
      .map(img => ({ img, score: relevance(beat, img) }))
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, perBeat)
      .forEach(r => picked.add(r.img))
  }
  return [...picked]
}

export interface MatchOptions {
  /** A IA escolhe lendo o roteiro inteiro; sem isso, escolha por palavras. */
  ai?: boolean
  title?: string
  narration?: string
  /** Mantém as imagens que as cenas já têm (usado depois de um ajuste, para só preencher as novas). */
  keepExisting?: boolean
}

/**
 * Escolhe uma imagem da biblioteca para cada batida.
 * Batidas travadas (o usuário escolheu) ficam como estão.
 */
export async function matchBeats(beats: Beat[], projectId: string, opts: MatchOptions = {}) {
  const all = await storage.findAll()
  // o vídeo inteiro não entra numa batida: as cenas dele, sim
  const images = all.filter(i => i.kind !== 'figurinha' && i.kind !== 'video' && (i.catalogued || i.tags.length || i.characters.length))
  const stickers = all.filter(i => i.kind === 'figurinha')
  const sfx = await listSounds('sfx')
  const stickerUses = new Map<string, number>()
  const sfxUses = new Map<string, number>()
  const usedHere = new Map<string, number>()
  const keep = (b: Beat) => !!b.imageId && (b.locked || opts.keepExisting)
  for (const b of beats) if (keep(b)) usedHere.set(b.imageId!, (usedHere.get(b.imageId!) ?? 0) + 1)

  const log: AssemblyLogEntry[] = []

  // escolha pela IA, com a escolha por palavras como reserva
  let aiChoices: Map<string, ImageChoice> | null = null
  let ai: AiCredit | undefined
  const open = beats.filter(b => !keep(b))
  if (opts.ai && open.length && images.length) {
    try {
      const candidates = images.length <= 120 ? images : shortlist(open, images, 10)
      const usedElsewhere = new Map(candidates.map(i => [i.id, i.usedIn.filter(p => p !== projectId).length]))
      const picked = await pickImagesWithAI({
        title: opts.title ?? '',
        narration: opts.narration ?? beats.map(b => b.say).join(' '),
        beats: open,
        images: candidates,
        usedElsewhere,
      })
      aiChoices = new Map(picked.choices.map(c => [c.beatId, c]))
      ai = picked.ai
      log.push({ beatId: 'ia', status: 'match', message: '✨ A IA leu o roteiro e escolheu as imagens', ai })
    } catch (error: any) {
      log.push({ beatId: 'ia', status: 'similar', message: `A IA não respondeu (${String(error.message).slice(0, 80)}); escolhi pelas palavras` })
    }
  }
  const byId = new Map(images.map(i => [i.id, i]))

  const result = beats.map(beat => {
    if (keep(beat)) return beat

    const choice = aiChoices?.get(beat.id)
    if (choice) {
      const picked = choice.imageId ? byId.get(choice.imageId) : undefined
      // o prompt já proíbe outro personagem, mas a IA às vezes usa mesmo assim (o Wamuu numa cena do Vanilla Ice)
      const img = picked && showsWanted(beat, picked) ? picked : undefined
      const status: ImageStatus = img ? choice.fit : 'missing'
      if (img) usedHere.set(img.id, (usedHere.get(img.id) ?? 0) + 1)
      // o zoom vai para a área que a IA indicou, se a imagem tiver essa área marcada
      const focus = img && choice.focus && img.regions.some(r => normalize(r.label) === normalize(choice.focus!)) ? choice.focus : beat.focus
      log.push({
        beatId: beat.id,
        status,
        message: img
          ? `“${beat.text}” → ${img.name}${choice.reason ? ` · ${choice.reason}` : ''}`
          : picked
            ? `“${beat.text}” → recusei “${picked.name}”: ${picked.catalogued || picked.charactersChecked ? 'não mostra' : 'personagens ainda não conferidos, e a cena pede'} ${beat.characters.join(' e ')}`
            : `“${beat.text}” → falta imagem: ${beat.query}`,
      })
      return { ...beat, imageId: img?.id, imageStatus: status, focus }
    }

    const words = tokens(`${beat.query} ${beat.focus ?? ''}`)
    type Candidate = { img: LibraryImage; score: number; chars: number; hits: number }
    let best: Candidate | null = null
    // a mais relevante sem contar repetição: vira "parecida" se não houver outra
    let relevant: Candidate | null = null

    for (const img of images) {
      const hay = haystack(img)
      // personagem só conta se foi conferido: sem isso, o rótulo pode ser só o que outra cena pediu
      const chars = showsWanted(beat, img) ? matchCharacters(beat.characters, img, hay) : 0
      const hits = words.filter(w => hay.includes(w)).length
      const repeats = usedHere.get(img.id) ?? 0
      const others = img.usedIn.filter(p => p !== projectId).length
      const score = chars * 3 + hits - repeats * 2.5 - others * 0.3
      if (!best || score > best.score) best = { img, score, chars, hits }
      const relevance = chars * 3 + hits
      if (!relevant || relevance > relevant.score) relevant = { img, score: relevance, chars, hits }
    }

    let status: ImageStatus = 'missing'
    if (best) {
      const needsChars = beat.characters.length > 0
      if (needsChars ? best.chars >= 1 && best.hits >= 1 : best.hits >= 2) status = 'match'
      else if (needsChars ? best.chars >= 1 || best.hits >= 2 : best.hits >= 1) status = 'similar'
    }

    if (status === 'missing' && relevant && (beat.characters.length ? relevant.chars >= 1 : relevant.hits >= 1)) {
      best = relevant
      status = 'similar'
    }

    const imageId = status === 'missing' ? undefined : best!.img.id
    if (imageId) usedHere.set(imageId, (usedHere.get(imageId) ?? 0) + 1)

    log.push({
      beatId: beat.id,
      status,
      message:
        status === 'match'
          ? `“${beat.text}” → ${best!.img.name}`
          : status === 'similar'
            ? `“${beat.text}” → ${best!.img.name} (parecida; ideal: ${beat.query})`
            : `“${beat.text}” → falta imagem: ${beat.query}`,
    })
    return { ...beat, imageId, imageStatus: status }
  })
    // figurinhas e efeitos sonoros (não dependem de a imagem estar travada)
    .map((beat, index) => {
      const withSticker = { ...beat, stickerId: pickSticker(beat, stickers, stickerUses) }
      return { ...withSticker, sfxId: pickSfx(withSticker, index, sfx, sfxUses) }
    })

  await syncUsage(projectId, result)
  return { beats: result, log, ai }
}

/** Reações parecidas: "chocado" acha uma figurinha etiquetada "surpreso". */
const REACTIONS = [
  ['chocado', 'surpreso', 'espantado', 'assustado', 'choque', 'omg', 'surpresa', 'medo'],
  ['rindo', 'risada', 'feliz', 'engracado', 'kkk', 'gargalhada', 'alegre', 'sorrindo'],
  ['bravo', 'raiva', 'irritado', 'furioso', 'nervoso'],
  ['triste', 'chorando', 'choro', 'decepcionado', 'magoado'],
  ['pensando', 'duvida', 'confuso', 'hmm', 'pensativo', 'curioso'],
  ['convencido', 'confiante', 'sarcastico', 'debochado', 'malicioso'],
  ['nojo', 'enojado', 'eca'],
  ['legal', 'joinha', 'aprovado', 'positivo', 'top'],
]

function expandReaction(words: string[]) {
  const out = new Set(words)
  for (const w of words) for (const group of REACTIONS) if (group.some(g => w.startsWith(g) || g.startsWith(w))) group.forEach(g => out.add(g))
  return [...out]
}

/** Figurinha para batidas com reação (effect = emoji); sem uma que combine, a cena fica sem reação. */
function pickSticker(beat: Beat, stickers: LibraryImage[], uses: Map<string, number>) {
  if (beat.effect !== 'emoji' || stickers.length === 0) return undefined
  if (beat.stickerId && stickers.some(s => s.id === beat.stickerId)) return beat.stickerId
  const words = expandReaction(tokens(`${beat.sticker ?? ''} ${beat.text}`))
  let best: { id: string; score: number } | null = null
  for (const s of stickers) {
    const hay = haystack(s)
    const hits = words.filter(w => hay.includes(w)).length
    if (hits === 0) continue
    const score = hits - (uses.get(s.id) ?? 0) * 0.6
    if (!best || score > best.score) best = { id: s.id, score }
  }
  if (best) uses.set(best.id, (uses.get(best.id) ?? 0) + 1)
  return best?.id
}

/** Palavras que identificam cada tipo de efeito sonoro no nome ou nas etiquetas. */

function defaultSfx(beat: Beat, index: number) {
  if (index === 0) return 'boom'
  if (beat.effect === 'arrow') return 'whoosh'
  if (beat.effect === 'cross') return 'erro'
  if (beat.effect === 'circle') return 'ding'
  if (beat.effect === 'emoji') return 'pop'
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
  // reação sem figurinha não aparece no vídeo: o "pop" tocaria sem nada na tela
  if (beat.effect === 'emoji' && !beat.stickerId && wanted === 'pop') return undefined
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
