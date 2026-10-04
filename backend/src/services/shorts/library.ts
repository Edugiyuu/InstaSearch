import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { catalogImage, ImageChoice, pickImagesWithAI } from './shortsAI.js'
import { listSounds } from './sounds.js'
import type { AssemblyLogEntry, Beat, ImageStatus, LibraryImage, MediaKind, SoundItem } from './types.js'

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

export function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

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

export async function addImage(data: Buffer, mimeType: string, originalName: string, source?: string, kind?: MediaKind) {
  await fs.mkdir(LIBRARY_FILES_DIR, { recursive: true })
  const id = generateId('img')
  const ext = IMAGE_EXTENSIONS.includes(path.extname(originalName).toLowerCase())
    ? path.extname(originalName).toLowerCase()
    : extensionFor(mimeType)
  const file = `${id}${ext}`
  await fs.writeFile(path.join(LIBRARY_FILES_DIR, file), data)

  const base: LibraryImage = {
    id,
    file,
    name: path.parse(originalName).name.replace(/[_-]+/g, ' ').slice(0, 40) || 'imagem',
    kind: 'imagem',
    characters: [],
    tags: [],
    description: '',
    regions: [],
    usedIn: [],
    catalogued: false,
    source,
    createdAt: new Date().toISOString(),
  }

  try {
    const info = await catalogImage(data, MIME[ext] ?? mimeType)
    Object.assign(base, info, { catalogued: true })
    if (kind) base.kind = kind
  } catch (error: any) {
    // sem catalogação a imagem fica na biblioteca e pode ser etiquetada à mão
    logger.warn(`⚠️ Imagem ${id} salva sem catalogação: ${error.message}`)
  }
  if (kind) base.kind = kind
  return storage.save(base)
}

export async function recatalog(id: string) {
  const img = await storage.findById(id)
  if (!img) return null
  const data = await fs.readFile(path.join(LIBRARY_FILES_DIR, img.file))
  const info = await catalogImage(data, MIME[path.extname(img.file)] ?? 'image/jpeg')
  return storage.save({ ...img, ...info, catalogued: true })
}

export async function updateImage(id: string, changes: Partial<LibraryImage>) {
  const allowed: Partial<LibraryImage> = {}
  if (changes.name !== undefined) allowed.name = String(changes.name)
  if (Array.isArray(changes.tags)) allowed.tags = changes.tags.map(t => String(t).toLowerCase())
  if (Array.isArray(changes.characters)) allowed.characters = changes.characters.map(String)
  if (Array.isArray(changes.regions)) allowed.regions = changes.regions
  if (changes.kind) allowed.kind = changes.kind
  return storage.update(id, allowed)
}

export async function deleteImage(id: string) {
  const img = await storage.findById(id)
  if (!img) return false
  await fs.unlink(path.join(LIBRARY_FILES_DIR, img.file)).catch(() => undefined)
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
  const images = all.filter(i => i.kind !== 'figurinha' && (i.catalogued || i.tags.length || i.characters.length))
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
  const open = beats.filter(b => !keep(b))
  if (opts.ai && open.length && images.length) {
    try {
      const candidates = images.length <= 120 ? images : shortlist(open, images, 10)
      const usedElsewhere = new Map(candidates.map(i => [i.id, i.usedIn.filter(p => p !== projectId).length]))
      const choices = await pickImagesWithAI({
        title: opts.title ?? '',
        narration: opts.narration ?? beats.map(b => b.say).join(' '),
        beats: open,
        images: candidates,
        usedElsewhere,
      })
      aiChoices = new Map(choices.map(c => [c.beatId, c]))
      log.push({ beatId: 'ia', status: 'match', message: '✨ A IA leu o roteiro e escolheu as imagens' })
    } catch (error: any) {
      log.push({ beatId: 'ia', status: 'similar', message: `A IA não respondeu (${String(error.message).slice(0, 80)}); escolhi pelas palavras` })
    }
  }
  const byId = new Map(images.map(i => [i.id, i]))

  const result = beats.map(beat => {
    if (keep(beat)) return beat

    const choice = aiChoices?.get(beat.id)
    if (choice) {
      const img = choice.imageId ? byId.get(choice.imageId) : undefined
      const status: ImageStatus = img ? choice.fit : 'missing'
      if (img) usedHere.set(img.id, (usedHere.get(img.id) ?? 0) + 1)
      // o zoom vai para a área que a IA indicou, se a imagem tiver essa área marcada
      const focus = img && choice.focus && img.regions.some(r => normalize(r.label) === normalize(choice.focus!)) ? choice.focus : beat.focus
      log.push({
        beatId: beat.id,
        status,
        message: img
          ? `“${beat.text}” → ${img.name}${choice.reason ? ` · ${choice.reason}` : ''}`
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
      const chars = matchCharacters(beat.characters, img, hay)
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
    .map((beat, index) => ({
      ...beat,
      stickerId: pickSticker(beat, stickers, stickerUses),
      sfxId: pickSfx(beat, index, sfx, sfxUses),
    }))

  await syncUsage(projectId, result)
  return { beats: result, log }
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

/** Figurinha para batidas com reação (effect = emoji); sem uma que combine, fica o emoji. */
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
const SFX_WORDS: Record<string, string[]> = {
  whoosh: ['whoosh', 'swoosh', 'swish', 'woosh', 'transicao', 'vento'],
  boom: ['boom', 'explos', 'bass', 'grave', 'impacto'],
  impacto: ['impacto', 'impact', 'hit', 'punch', 'soco', 'boom'],
  pop: ['pop', 'bolha', 'bubble', 'plop'],
  ding: ['ding', 'bell', 'sino', 'plim'],
  erro: ['erro', 'error', 'wrong', 'fail', 'buzz', 'errado'],
  risada: ['risada', 'laugh', 'rindo', 'haha', 'sitcom'],
  suspense: ['suspense', 'tensao', 'riser', 'drone', 'tenso'],
  glitch: ['glitch', 'estatica', 'static', 'distor'],
  click: ['click', 'clique', 'camera', 'shutter', 'foto'],
}

function defaultSfx(beat: Beat, index: number) {
  if (index === 0) return 'boom'
  if (beat.effect === 'arrow') return 'whoosh'
  if (beat.effect === 'cross') return 'erro'
  if (beat.effect === 'circle') return 'ding'
  if (beat.effect === 'emoji') return 'pop'
  if (beat.scene === 'evidence') return 'click'
  return undefined
}

function pickSfx(beat: Beat, index: number, sounds: SoundItem[], uses: Map<string, number>) {
  const wanted = beat.sfx ?? defaultSfx(beat, index)
  if (!wanted || sounds.length === 0) return undefined
  if (beat.sfxId && sounds.some(s => s.id === beat.sfxId)) return beat.sfxId
  const words = SFX_WORDS[wanted] ?? [wanted]
  const matches = sounds.filter(s => {
    const hay = normalize(`${s.name} ${s.tags.join(' ')}`)
    return words.some(w => hay.includes(w))
  })
  if (matches.length === 0) return undefined
  // alterna entre os sons do mesmo tipo para não repetir sempre o mesmo
  const pick = matches.reduce((a, b) => ((uses.get(b.id) ?? 0) < (uses.get(a.id) ?? 0) ? b : a))
  uses.set(pick.id, (uses.get(pick.id) ?? 0) + 1)
  return pick.id
}
