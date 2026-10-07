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
import { fetchThumb, searchWebImages, type WebImage } from './imageSearch.js'
import { adjustBeats, generateScript, pickWebImagesWithAI } from './shortsAI.js'
import { listSounds, syncSoundUsage } from './sounds.js'
import { normalize } from './library.js'
import { transcribeAudio, WHISPER_MODEL } from './transcription.js'
import { BUILT_IN_TONES, getTone, toneByName } from './tones.js'
import type { AiCredit, Beat, ProjectSettings, ShortProject, Transcript } from './types.js'

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
  /** Tom da biblioteca (ADR 0019). */
  toneId?: string
  /** Antes dos tons na biblioteca: o nome ("Polêmico"). */
  tone?: string
  narration?: string
}) {
  const theme = input.theme?.trim()
  if (!theme && !input.narration?.trim()) throw new AppError('Escreva um tema', 400, 'VALIDATION')
  const duration = Math.min(40, Math.max(15, Number(input.duration) || 30))
  const style = await getStyle(input.styleId)
  const tone =
    (input.toneId ? await getTone(input.toneId) : null) ??
    (input.tone ? await toneByName(input.tone) : null) ??
    BUILT_IN_TONES.find(t => t.id === 'curioso')!

  const script = await generateScript({
    theme: theme || 'narração do usuário',
    toneGuide: tone.guide,
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
    tone: tone.name,
    toneId: tone.id,
    toneGuide: tone.guide,
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

/**
 * As sugestões que valem mostrar para a IA, das melhores para as piores: as primeiras batem com a
 * cena; entre elas, prefere imagem em pé, com boa resolução e sem gente a mais (cena só do Gojo
 * não quer o Gojo com o Toji).
 */
function rankCandidates(images: WebImage[], wanted: number) {
  const score = (i: WebImage, n: number) => {
    const tall = i.width && i.height ? (i.height >= i.width * 0.9 ? 2 : 0) : 1
    const sharp = i.width && i.width >= 700 ? 1 : 0
    const extra = Math.max(0, new Set(i.characters ?? []).size - Math.max(1, wanted))
    return tall + sharp - extra * 0.8 - n * 0.35
  }
  return images
    .slice(0, 8)
    .map((img, n) => ({ img, s: score(img, n) }))
    .sort((a, b) => b.s - a.s)
    .map(r => r.img)
}

/** Fontes cujos personagens vêm das etiquetas (Danbooru) ou do cadastro (AniList), e não de um título qualquer. */
const trustedSource = (img: WebImage) => (img.source === 'danbooru' || img.source === 'anilist') && !!img.characters?.length

/** Sugestões por cena mostradas à IA, e cenas por chamada de visão (≈ 20 miniaturas). */
const PER_SCENE = 4
const SCENES_PER_CALL = 5

/** 3 por vez: rápido sem abusar das fontes. */
async function inParallel<T>(items: T[], work: (item: T) => Promise<void>) {
  const queue = [...items]
  const worker = async () => {
    for (let item = queue.shift(); item !== undefined; item = queue.shift()) await work(item)
  }
  await Promise.all([worker(), worker(), worker()])
}

/**
 * Preenche as cenas sem imagem com sugestões da internet (ADR 0020):
 * 1. busca (o meme ou a variação primeiro, quando a cena pede) e separa até 4 candidatas;
 * 2. a IA olha as miniaturas, várias cenas por chamada, e escolhe a que mostra o personagem certo, ou nenhuma;
 * 3. importa a escolhida, que é catalogada em segundo plano (ADR 0017).
 * Se a IA de visão não responder, usa a mais bem colocada, sem marcar os personagens como conferidos.
 */
export async function autoFillImages(id: string) {
  const project = await getProject(id)
  const pending = project.beats.filter(needsImage)
  const { imageType } = await getStyle(project.styleId)
  const results: { beatId: string; ok: boolean; message: string }[] = []
  const search = (query: string, beat: Beat, tags: string[]) =>
    searchWebImages({ query, characters: beat.characters, tags, context: project.title, imageType })

  // 1. busca
  const options = new Map<string, WebImage[]>()
  await inParallel(pending, async beat => {
    try {
      const literal = await search(beat.query || beat.text, beat, beat.searchTags ?? [])
      const twist = beat.twist ? await search(beat.twist.query, beat, beat.twist.tags ?? []).catch(() => null) : null
      const wanted = beat.characters.length
      const list = twist
        ? [...rankCandidates(twist.images, wanted).slice(0, 2), ...rankCandidates(literal.images, wanted)]
        : rankCandidates(literal.images, wanted)
      const unique = list.filter((img, i) => list.findIndex(o => o.url === img.url) === i).slice(0, PER_SCENE)
      if (unique.length) options.set(beat.id, unique)
      else results.push({ beatId: beat.id, ok: false, message: `Nada encontrado para “${beat.query}”` })
    } catch (error: any) {
      results.push({ beatId: beat.id, ok: false, message: `“${beat.text}”: ${String(error.message).slice(0, 80)}` })
    }
  })

  // 2. a IA olha as miniaturas (só as que o servidor consegue baixar)
  const scenes: { beat: Beat; shown: WebImage[]; thumbs: { data: Buffer; mimeType: string }[] }[] = []
  await inParallel(
    pending.filter(b => options.has(b.id)),
    async beat => {
      const shown: WebImage[] = []
      const thumbs: { data: Buffer; mimeType: string }[] = []
      for (const img of options.get(beat.id)!) {
        const thumb = await fetchThumb(img.thumb).catch(() => null)
        if (!thumb) continue
        shown.push(img)
        thumbs.push({ data: thumb.data, mimeType: thumb.type })
      }
      scenes.push({ beat, shown, thumbs })
    },
  )
  scenes.sort((a, b) => pending.indexOf(a.beat) - pending.indexOf(b.beat))

  const chosen = new Map<string, { img: WebImage; checked: boolean; reason?: string; characters?: string[] }>()
  let ai: AiCredit | undefined
  for (let i = 0; i < scenes.length; i += SCENES_PER_CALL) {
    const batch = scenes.slice(i, i + SCENES_PER_CALL)
    const viewable = batch.filter(s => s.thumbs.length)
    // sem miniatura para olhar: fica para o usuário, em vez de entrar às cegas
    batch
      .filter(s => !s.thumbs.length)
      .forEach(s => results.push({ beatId: s.beat.id, ok: false, message: `“${s.beat.text}”: não deu para conferir as sugestões; escolha na tela de troca` }))
    if (!viewable.length) continue
    try {
      const out = await pickWebImagesWithAI(viewable.map(s => ({ beat: s.beat, thumbs: s.thumbs })))
      ai = out.ai
      viewable.forEach((s, k) => {
        const pick = out.picks[k]
        if (pick.index !== null) chosen.set(s.beat.id, { img: s.shown[pick.index], checked: true, reason: pick.reason, characters: pick.characters })
        else
          results.push({
            beatId: s.beat.id,
            ok: false,
            message: `“${s.beat.text}”: nenhuma sugestão mostra ${s.beat.characters.join(' e ') || s.beat.query}; escolha na tela de troca`,
          })
      })
    } catch (error: any) {
      logger.warn(`⚠️ A visão não escolheu as imagens (${String(error.message).slice(0, 100)}); usando a mais bem colocada`)
      for (const s of viewable) chosen.set(s.beat.id, { img: s.shown[0], checked: false })
    }
  }

  // 3. importa a escolhida; a mesma imagem não entra em duas cenas
  const used = new Set<string>()
  const toImport: Beat[] = []
  for (const beat of pending) {
    const pick = chosen.get(beat.id)
    if (!pick) continue
    if (used.has(pick.img.url)) {
      results.push({ beatId: beat.id, ok: false, message: `“${beat.text}”: a melhor sugestão já está em outra cena; escolha na tela de troca` })
      continue
    }
    used.add(pick.img.url)
    toImport.push(beat)
  }
  await inParallel(toImport, async beat => {
    const { img: pick, checked, reason, characters: seen = [] } = chosen.get(beat.id)!
    try {
      const fromSource = trustedSource(pick)
      const img = await importImageFromUrl(pick.url, {
        fallbackUrl: pick.thumb !== pick.url ? pick.thumb : undefined,
        name: pick.title.slice(0, 40),
        // personagens só os conferidos: os que a visão viu, ou as etiquetas da fonte; nunca só os que a cena pediu
        characters: checked && seen.length ? seen : fromSource ? pick.characters : [],
        charactersChecked: (checked && seen.length > 0) || fromSource,
        catalog: 'background',
      })
      const b = project.beats.find(x => x.id === beat.id)!
      b.imageId = img.id
      b.imageStatus = 'match'
      b.locked = true
      const twist = beat.twist && options.get(beat.id)!.indexOf(pick) < 2 ? ` (${beat.twist.kind === 'meme' ? 'meme' : 'variação'})` : ''
      const note = checked ? (reason ? ` · ${reason}` : '') : ' · sem conferir: a IA de visão não respondeu'
      results.push({ beatId: beat.id, ok: true, message: `“${beat.text}” → ${pick.title}${twist}${note}` })
    } catch (error: any) {
      results.push({ beatId: beat.id, ok: false, message: `“${beat.text}”: ${String(error.message).slice(0, 80)}` })
    }
  })

  await syncUsage(id, project.beats)
  if (ai) project.ai = { ...project.ai, images: ai }
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
  project.transcript = { audioFile: project.audioFile, status: 'pendente' }
  await fs.writeFile(path.join(AUDIO_DIR, project.audioFile), data)
  const saved = await save(project)
  queueTranscription(id)
  return saved
}

// ── Transcrição da voz (ADR 0018) ─────────────────────────
// Fila em memória, um áudio por vez: o Whisper ocupa todos os núcleos do processador.

const transcribeQueue: string[] = []
let transcribing = false

/** Transcreve (de novo) o áudio do projeto em segundo plano. */
export async function requestTranscription(id: string) {
  const project = await getProject(id)
  if (!project.audioFile) throw new AppError('Envie a sua voz primeiro', 400, 'NO_AUDIO')
  project.transcript = { audioFile: project.audioFile, status: 'pendente' }
  await storage.save(project)
  queueTranscription(id)
  return project
}

function queueTranscription(id: string) {
  if (!transcribeQueue.includes(id)) transcribeQueue.push(id)
  void drainTranscriptions()
}

async function drainTranscriptions() {
  if (transcribing) return
  transcribing = true
  try {
    for (let id = transcribeQueue.shift(); id; id = transcribeQueue.shift()) await runTranscription(id)
  } finally {
    transcribing = false
  }
}

/**
 * Grava o andamento relendo o projeto antes: o usuário pode ter editado enquanto o Whisper
 * trabalhava. Se o áudio mudou (ou o projeto foi apagado), a transcrição não vale e nada é gravado.
 * Usa o storage direto: não é uma edição do usuário, então o updatedAt não muda.
 */
async function setTranscript(id: string, audioFile: string, changes: Partial<Transcript>) {
  const project = await storage.findById(id)
  if (!project || project.audioFile !== audioFile) return
  project.transcript = { ...project.transcript, ...changes, audioFile } as Transcript
  await storage.save(project)
}

async function runTranscription(id: string) {
  const project = await storage.findById(id)
  const audioFile = project?.audioFile
  if (!project || !audioFile) return
  // as gravações em fila, uma depois da outra: um aviso de andamento atrasado não sobrescreve o resultado
  let writing = Promise.resolve()
  const write = (changes: Partial<Transcript>) => (writing = writing.then(() => setTranscript(id, audioFile, changes)))
  const started = Date.now()
  try {
    write({ status: 'transcrevendo', stage: undefined, progress: undefined, error: undefined })
    const words = await transcribeAudio(path.join(AUDIO_DIR, audioFile), (stage, progress) => write({ stage, progress }))
    if (words.length === 0) throw new Error('o Whisper não ouviu nenhuma palavra no áudio')
    write({ status: 'pronto', stage: undefined, progress: undefined, words, model: WHISPER_MODEL, at: new Date().toISOString() })
    logger.info(`🎙️ Voz de ${id} transcrita: ${words.length} palavras em ${((Date.now() - started) / 1000).toFixed(1)}s`)
  } catch (error: any) {
    logger.error(`❌ Transcrição de ${id}: ${error.message}`)
    write({ status: 'erro', stage: undefined, progress: undefined, error: String(error.message ?? error).slice(0, 300) })
  }
  await writing
}

/** Ao subir o servidor: volta para a fila o que ficou pela metade. */
export async function resumeTranscriptions() {
  const pending = (await storage.findAll()).filter(
    p => p.audioFile && p.transcript?.audioFile === p.audioFile && (p.transcript.status === 'pendente' || p.transcript.status === 'transcrevendo'),
  )
  if (pending.length) logger.info(`🎙️ Retomando a transcrição de ${pending.length} projeto(s)`)
  pending.forEach(p => queueTranscription(p.id))
}

export async function deleteProject(id: string) {
  const project = await getProject(id)
  if (project.audioFile) await fs.unlink(path.join(AUDIO_DIR, project.audioFile)).catch(() => undefined)
  if (project.render) await fs.unlink(path.join(RENDERS_DIR, project.render.file)).catch(() => undefined)
  await forgetProject(id)
  await syncSoundUsage(id, new Set())
  return storage.delete(id)
}
