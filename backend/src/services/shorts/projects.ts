import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { AppError } from '../../middleware/errorHandler.js'
import { generateId } from '../../utils/idGenerator.js'
import { logger } from '../../utils/logger.js'
import { getStyle } from './styles.js'
import { CHANNEL_CATCHPHRASE_ID, defaultCatchphrases } from './catchphrases.js'
import { forgetProject, importImageFromUrl, matchBeats, pickSfx, syncUsage } from './library.js'
import { searchWebImages, type WebImage } from './imageSearch.js'
import { adjustBeats, generateScript } from './shortsAI.js'
import { listSounds, syncSoundUsage } from './sounds.js'
import { normalize } from './library.js'
import type { Beat, ProjectSettings, ShortProject } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const AUDIO_DIR = path.join(__dirname, '../../../data/short_projects/audio')
export const RENDERS_DIR = path.join(__dirname, '../../../data/short_projects/renders')

const storage = new FileStorage<ShortProject>('short_projects')
const MAX_UNDO = 15

/**
 * Projetos de antes dos bordões (ADR 0016) guardavam `outro: true/false`, o final do "Seu canal".
 * Na leitura, true vira o bordão migrado e false vira "sem final"; o arquivo muda no próximo save.
 */
function migrateSettings(project: ShortProject) {
  const outro = project.settings.outro as unknown
  if (typeof outro === 'boolean') project.settings.outro = outro ? CHANNEL_CATCHPHRASE_ID : null
  return project
}

export async function listProjects() {
  const all = await storage.findAll()
  return all.map(migrateSettings).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: string) {
  const project = await storage.findById(id)
  if (!project) throw new AppError('Projeto não encontrado', 404, 'NOT_FOUND')
  return migrateSettings(project)
}

async function save(project: ShortProject) {
  project.updatedAt = new Date().toISOString()
  const sounds = new Set([project.musicId, ...project.beats.map(b => b.sfxId)].filter(Boolean) as string[])
  await syncSoundUsage(project.id, sounds)
  return storage.save(project)
}

const MOOD_WORDS: Record<string, string[]> = {
  tensa: ['tensa', 'tenso', 'suspense', 'sombria', 'dark', 'phonk', 'epica'],
  animada: ['animada', 'alegre', 'energica', 'divertida', 'engracada', 'pop'],
  calma: ['calma', 'lofi', 'relax', 'suave', 'triste', 'piano'],
}

/** Música de fundo que combina com o clima do estilo (a menos usada entre as que combinam). */
async function pickMusic(mood: string) {
  if (mood === 'sem') return undefined
  const music = await listSounds('musica')
  if (music.length === 0) return undefined
  const words = MOOD_WORDS[mood] ?? []
  const fits = music.filter(m => words.some(w => normalize(`${m.name} ${m.tags.join(' ')}`).includes(w)))
  const pool = fits.length ? fits : music
  return pool.reduce((a, b) => (b.usedIn.length < a.usedIn.length ? b : a)).id
}

export async function createProject(input: {
  theme: string
  styleId: string
  duration: number
  tone: string
  narration?: string
}) {
  const theme = input.theme?.trim()
  if (!theme && !input.narration?.trim()) throw new AppError('Escreva um tema', 400, 'VALIDATION')
  const duration = Math.min(40, Math.max(15, Number(input.duration) || 30))
  const style = await getStyle(input.styleId)

  const script = await generateScript({
    theme: theme || 'narração do usuário',
    tone: input.tone || 'Curioso',
    duration,
    style,
    narration: input.narration?.trim() || undefined,
  })

  const now = new Date().toISOString()
  const project: ShortProject = {
    id: generateId('short'),
    title: script.title,
    theme: theme || script.title,
    styleId: style.id,
    duration,
    tone: input.tone || 'Curioso',
    narration: script.narration,
    beats: script.beats,
    settings: { pace: style.pace, effects: style.effects, caption: style.caption, ...(await defaultCatchphrases()) },
    status: 'roteiro',
    history: [],
    ai: { script: script.ai },
    undo: [],
    createdAt: now,
    updatedAt: now,
  }
  return storage.save(project)
}

/** Edição direta (roteiro, ajustes rápidos, título, legenda do post). */
export async function updateProject(id: string, changes: Partial<ShortProject>) {
  const project = await getProject(id)
  const next: ShortProject = { ...project }
  if (typeof changes.title === 'string') next.title = changes.title
  if (typeof changes.postCaption === 'string') next.postCaption = changes.postCaption
  if (typeof changes.audioDuration === 'number') next.audioDuration = changes.audioDuration
  if (changes.musicId !== undefined) next.musicId = changes.musicId
  if (changes.status) next.status = changes.status
  if (changes.settings) next.settings = { ...project.settings, ...changes.settings }
  if (Array.isArray(changes.beats)) {
    next.undo = [project.beats, ...project.undo].slice(0, MAX_UNDO)
    next.beats = changes.beats
    next.narration = changes.beats.map(b => b.say).join(' ')
    await syncUsage(id, next.beats)
  }
  return save(next)
}

/** Guarda o MP4 renderizado e as publicações (o updateProject só aceita edições do usuário). */
export async function recordOutput(id: string, changes: Pick<Partial<ShortProject>, 'render' | 'published' | 'status'>) {
  const project = await getProject(id)
  return save({ ...project, ...changes })
}

/** 04b: escolhe as imagens e passa o projeto para revisão. */
export async function assemble(id: string) {
  const project = await getProject(id)
  const { beats, log, ai } = await matchBeats(project.beats, id, {
    ai: (project.settings.imagePicker ?? 'ia') === 'ia',
    title: project.title,
    narration: project.narration,
  })
  project.beats = beats
  if (ai) project.ai = { ...project.ai, images: ai }
  if (project.musicId === undefined) {
    const style = await getStyle(project.styleId)
    const musicId = await pickMusic(style.music)
    if (musicId) project.musicId = musicId
  }
  if (project.status === 'roteiro') project.status = 'revisao'
  return { project: await save(project), log }
}

/** "Peça um ajuste": a IA muda as batidas e a montagem procura imagens para as novas. */
/** openScene: a cena aberta na prévia (a primeira é 1), para o chat entender "esta cena". */
export async function adjust(id: string, request: string, openScene?: number) {
  if (!request?.trim()) throw new AppError('Escreva o que quer mudar', 400, 'VALIDATION')
  const project = await getProject(id)
  const style = await getStyle(project.styleId)
  const sfx = await listSounds('sfx')
  const out = await adjustBeats({
    request: request.trim(),
    beats: project.beats,
    narration: project.narration,
    settings: project.settings,
    style,
    sounds: sfx.map(s => ({ id: s.id, name: s.name })),
    openScene,
  })

  const changed = out.beats !== project.beats
  const { beats, ai } = changed
    ? await matchBeats(out.beats, id, {
        ai: (project.settings.imagePicker ?? 'ia') === 'ia',
        title: project.title,
        narration: out.narration,
        keepExisting: true,
      })
    : { beats: project.beats, ai: undefined }

  project.undo = [project.beats, ...project.undo].slice(0, MAX_UNDO)
  project.beats = beats
  project.narration = out.narration
  project.settings = out.settings as ProjectSettings
  if (ai) project.ai = { ...project.ai, images: ai }
  project.history = [
    ...project.history,
    { id: generateId('adj'), request: request.trim(), reply: out.reply, at: new Date().toISOString(), ai: out.ai },
  ]
  return save(project)
}

export async function undo(id: string) {
  const project = await getProject(id)
  const [previous, ...rest] = project.undo
  if (!previous) throw new AppError('Nada para desfazer', 400, 'NOTHING_TO_UNDO')
  project.beats = previous
  project.undo = rest
  project.narration = previous.map(b => b.say).join(' ')
  project.history = [
    ...project.history,
    { id: generateId('adj'), request: 'Desfazer', reply: 'Voltei para a versão anterior.', at: new Date().toISOString() },
  ]
  await syncUsage(id, previous)
  return save(project)
}

/** Tela 05: o usuário escolheu a imagem de uma batida. */
export async function setBeatImage(id: string, beatId: string, imageId: string | null) {
  const project = await getProject(id)
  project.beats = project.beats.map((b: Beat) =>
    b.id === beatId
      ? imageId
        ? { ...b, imageId, imageStatus: 'match' as const, locked: true }
        : { ...b, locked: true, imageStatus: b.imageId ? ('match' as const) : b.imageStatus }
      : b,
  )
  await syncUsage(id, project.beats)
  return save(project)
}

/** Cenas que ainda precisam de imagem: sem imagem, ou com uma parecida que o usuário não aprovou. */
const needsImage = (b: Beat) => !b.locked && b.imageStatus !== 'match'

/** Entre as sugestões, a que melhor serve num vídeo vertical e ainda não foi usada. */
function bestCandidate(images: WebImage[], used: Set<string>, wanted: number) {
  const free = images.filter(i => !used.has(i.url)).slice(0, 8)
  // as primeiras batem com a cena; entre elas, prefere imagem em pé, com boa resolução
  // e sem gente a mais (cena só do Gojo não quer o Gojo com o Toji)
  const score = (i: WebImage, n: number) => {
    const tall = i.width && i.height ? (i.height >= i.width * 0.9 ? 2 : 0) : 1
    const sharp = i.width && i.width >= 700 ? 1 : 0
    const extra = Math.max(0, new Set(i.characters ?? []).size - Math.max(1, wanted))
    return tall + sharp - extra * 0.8 - n * 0.35
  }
  return free.map((img, n) => ({ img, s: score(img, n) })).sort((a, b) => b.s - a.s)[0]?.img
}

/**
 * Botão "Buscar imagens automaticamente": para cada cena que precisa, busca na internet,
 * baixa a melhor sugestão e coloca na cena. Sem IA (não gasta cota): a imagem entra na
 * biblioteca com o que a fonte informa e pode ser catalogada depois.
 */
export async function autoFillImages(id: string) {
  const project = await getProject(id)
  const pending = project.beats.filter(needsImage)
  const { imageType } = await getStyle(project.styleId)
  const used = new Set<string>()
  const results: { beatId: string; ok: boolean; message: string }[] = []

  // 3 cenas por vez: rápido sem abusar das fontes
  const queue = [...pending]
  const worker = async () => {
    for (let beat = queue.shift(); beat; beat = queue.shift()) {
      try {
        const found = await searchWebImages({
          query: beat.query || beat.text,
          characters: beat.characters,
          tags: beat.searchTags,
          context: project.title,
          imageType,
        })
        const pick = bestCandidate(found.images, used, beat.characters.length)
        if (!pick) {
          results.push({ beatId: beat.id, ok: false, message: `Nada encontrado para “${beat.query}”` })
          continue
        }
        used.add(pick.url)
        const img = await importImageFromUrl(pick.url, {
          fallbackUrl: pick.thumb !== pick.url ? pick.thumb : undefined,
          name: (beat.characters.join(' e ') || pick.title).slice(0, 40),
          characters: beat.characters.length ? beat.characters : pick.characters,
          tags: beat.searchTags?.map(t => t.replace(/_/g, ' ')) ?? [],
          description: beat.query,
          catalog: false,
        })
        const b = project.beats.find(x => x.id === beat.id)!
        b.imageId = img.id
        b.imageStatus = 'match'
        b.locked = true
        results.push({ beatId: beat.id, ok: true, message: `“${beat.text}” → ${pick.title}` })
      } catch (error: any) {
        results.push({ beatId: beat.id, ok: false, message: `“${beat.text}”: ${String(error.message).slice(0, 80)}` })
      }
    }
  }
  await Promise.all([worker(), worker(), worker()])

  await syncUsage(id, project.beats)
  const saved = await save(project)
  const added = results.filter(r => r.ok).length
  logger.info(`🖼️ Imagens automáticas em ${id}: ${added} de ${pending.length}`)
  return { project: saved, added, total: pending.length, results }
}

/**
 * Editor: o usuário escolhe o efeito sonoro de uma cena. sfxId = um som da biblioteca,
 * null = sem som, 'auto' = deixa a montagem escolher de novo.
 */
export async function setBeatSfx(id: string, beatId: string, sfxId: string | null) {
  const project = await getProject(id)
  const index = project.beats.findIndex(b => b.id === beatId)
  if (index < 0) throw new AppError('Cena não encontrada', 404, 'NOT_FOUND')
  const sounds = await listSounds('sfx')
  const beat = project.beats[index]
  if (sfxId === 'auto') {
    const uses = new Map<string, number>()
    project.beats.forEach(b => b.sfxId && uses.set(b.sfxId, (uses.get(b.sfxId) ?? 0) + 1))
    project.beats[index] = { ...beat, sfxLocked: false, sfxId: pickSfx({ ...beat, sfxLocked: false, sfxId: undefined }, index, sounds, uses) }
  } else {
    if (sfxId && !sounds.some(s => s.id === sfxId)) throw new AppError('Esse efeito não está na biblioteca', 400, 'VALIDATION')
    project.beats[index] = { ...beat, sfxId: sfxId ?? undefined, sfxLocked: true }
  }
  return save(project)
}

export async function saveAudio(id: string, data: Buffer, ext: string) {
  const project = await getProject(id)
  await fs.mkdir(AUDIO_DIR, { recursive: true })
  if (project.audioFile) await fs.unlink(path.join(AUDIO_DIR, project.audioFile)).catch(() => undefined)
  project.audioFile = `${id}_${Date.now()}${ext}`
  project.audioDuration = undefined
  await fs.writeFile(path.join(AUDIO_DIR, project.audioFile), data)
  return save(project)
}

export async function deleteProject(id: string) {
  const project = await getProject(id)
  if (project.audioFile) await fs.unlink(path.join(AUDIO_DIR, project.audioFile)).catch(() => undefined)
  if (project.render) await fs.unlink(path.join(RENDERS_DIR, project.render.file)).catch(() => undefined)
  await forgetProject(id)
  await syncSoundUsage(id, new Set())
  return storage.delete(id)
}
