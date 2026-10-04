import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../storage/FileStorage.js'
import { AppError } from '../../middleware/errorHandler.js'
import { generateId } from '../../utils/idGenerator.js'
import { getStyle } from './styles.js'
import { forgetProject, matchBeats, syncUsage } from './library.js'
import { adjustBeats, generateScript } from './shortsAI.js'
import { listSounds, syncSoundUsage } from './sounds.js'
import { normalize } from './library.js'
import type { Beat, ProjectSettings, ShortProject } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const AUDIO_DIR = path.join(__dirname, '../../../data/short_projects/audio')

const storage = new FileStorage<ShortProject>('short_projects')
const MAX_UNDO = 15

export async function listProjects() {
  const all = await storage.findAll()
  return all.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
}

export async function getProject(id: string) {
  const project = await storage.findById(id)
  if (!project) throw new AppError('Projeto não encontrado', 404, 'NOT_FOUND')
  return project
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
    settings: { pace: style.pace, effects: style.effects, caption: style.caption },
    status: 'roteiro',
    history: [],
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

/** 04b: escolhe as imagens e passa o projeto para revisão. */
export async function assemble(id: string) {
  const project = await getProject(id)
  const { beats, log } = await matchBeats(project.beats, id, {
    ai: (project.settings.imagePicker ?? 'ia') === 'ia',
    title: project.title,
    narration: project.narration,
  })
  project.beats = beats
  if (project.musicId === undefined) {
    const style = await getStyle(project.styleId)
    const musicId = await pickMusic(style.music)
    if (musicId) project.musicId = musicId
  }
  if (project.status === 'roteiro') project.status = 'revisao'
  return { project: await save(project), log }
}

/** "Peça um ajuste": a IA muda as batidas e a montagem procura imagens para as novas. */
export async function adjust(id: string, request: string) {
  if (!request?.trim()) throw new AppError('Escreva o que quer mudar', 400, 'VALIDATION')
  const project = await getProject(id)
  const style = await getStyle(project.styleId)
  const out = await adjustBeats({
    request: request.trim(),
    beats: project.beats,
    narration: project.narration,
    settings: project.settings,
    style,
  })

  const changed = out.beats !== project.beats
  const { beats } = changed
    ? await matchBeats(out.beats, id, {
        ai: (project.settings.imagePicker ?? 'ia') === 'ia',
        title: project.title,
        narration: out.narration,
        keepExisting: true,
      })
    : { beats: project.beats }

  project.undo = [project.beats, ...project.undo].slice(0, MAX_UNDO)
  project.beats = beats
  project.narration = out.narration
  project.settings = out.settings as ProjectSettings
  project.history = [
    ...project.history,
    { id: generateId('adj'), request: request.trim(), reply: out.reply, at: new Date().toISOString() },
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
  await forgetProject(id)
  await syncSoundUsage(id, new Set())
  return storage.delete(id)
}
