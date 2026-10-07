import type { Beat, Catchphrase, LibraryImage, ProjectSettings, Region, ShortProject, SoundItem } from '../api/shorts'
import { audioUrl, catchphraseFileUrl, imageUrl, mediaUrl, soundUrl } from '../api/shorts'
import { alignWords, type WordTime } from './align'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** Imagem (ou trecho de vídeo) da biblioteca, como a composição usa. */
export interface MediaProps {
  src: string
  regions: Region[]
  /** a cena de vídeo: src é o vídeo e o trecho vai de clip.start a clip.end */
  clip?: { start: number; end: number }
  poster?: string
  /** Tamanho em pixels, quando conhecido: decide o enquadramento (ADR 0020). */
  width?: number
  height?: number
}

/** O que a composição precisa de cada batida: o texto, a imagem e quando entra. */
export interface TimedBeat {
  beat: Beat
  index: number
  from: number
  frames: number
  image?: MediaProps
  /** Figurinha no lugar do emoji. */
  stickerSrc?: string
  /** Efeito sonoro que toca no corte. */
  sfxSrc?: string
  /** Com a voz transcrita: em que quadro (desde o início da batida) cada palavra da fala começa. */
  wordStarts?: number[]
}

/** Abertura ou final (ADR 0016): o que a composição precisa de um bordão. */
export type CatchphraseProps =
  | { kind: 'clipe'; frames: number; src: string }
  | { kind: 'montado'; frames: number; audioSrc?: string; image?: MediaProps; text?: string }
  | { kind: 'inscreva'; frames: number; photoSrc?: string; name: string; text: string; button: string }

export interface ShortVideoProps extends Record<string, unknown> {
  beats: TimedBeat[]
  settings: ProjectSettings
  audioSrc?: string
  musicSrc?: string
  /** Toca antes da narração; as batidas já vêm deslocadas pela duração dela. */
  intro?: CatchphraseProps
  /** Entra depois da última batida. */
  outro?: CatchphraseProps
}

const splitWords = (text: string) => text.split(/\s+/).filter(Boolean)
const words = (text: string) => splitWords(text).length

/** Tempo de cada palavra de cada batida, vindo da voz. */
export interface VoiceTiming {
  beats: WordTime[][]
  /** Palavras do roteiro que bateram com o que o Whisper ouviu. */
  matched: number
  total: number
}

/**
 * Casa o roteiro com a transcrição da voz (ADR 0018). null = sem transcrição pronta para o áudio
 * atual, ou nada bateu: o vídeo usa o tempo estimado.
 */
export function voiceTiming(project: ShortProject): VoiceTiming | null {
  const t = project.transcript
  if (!t || t.status !== 'pronto' || !t.words?.length || !project.audioFile || t.audioFile !== project.audioFile) return null
  const perBeat = project.beats.map(b => splitWords(b.say))
  const times = alignWords(perBeat.flat(), t.words)
  if (!times) return null
  let at = 0
  const beats = perBeat.map(list => times.slice(at, (at += list.length)))
  return { beats, matched: times.filter(w => w.matched).length, total: times.length }
}

/** Menor batida possível com a voz: uma fala muito rápida não some da tela. */
const MIN_VOICE_FRAMES = 4

const libraryMedia = (img: LibraryImage): MediaProps => {
  const size = img.width && img.height ? { width: img.width, height: img.height } : {}
  return img.kind === 'cena' && img.clip
    ? { src: mediaUrl(img), regions: img.regions, clip: img.clip, poster: imageUrl(img), ...size }
    : { src: imageUrl(img), regions: img.regions, ...size }
}

/**
 * Quadro (desde o começo da narração) em que cada batida começa, pela voz: quando a primeira
 * palavra dela é falada. A primeira batida começa no 0, para o vídeo não abrir sem imagem.
 * Os quadros são arredondados a partir do tempo absoluto, então o erro não se acumula.
 */
function voiceStarts(voice: VoiceTiming) {
  const starts: number[] = []
  voice.beats.forEach((list, i) => {
    const wanted = i === 0 ? 0 : Math.round((list[0]?.start ?? 0) * FPS)
    starts.push(i === 0 ? 0 : Math.max(starts[i - 1] + MIN_VOICE_FRAMES, wanted))
  })
  return starts
}

/**
 * Distribui o tempo do vídeo entre as batidas.
 * - Com a voz transcrita (ADR 0018): cada batida começa quando a primeira palavra dela é falada.
 * - Sem: pelo número de palavras faladas (estimado).
 * Com áudio, o total é a duração do áudio; sem áudio, a duração escolhida no tema.
 * `start` é onde a primeira batida entra (depois da abertura); os `from` já saem somados.
 */
export function buildTimeline(project: ShortProject, images: Map<string, LibraryImage>, sounds: Map<string, SoundItem> = new Map(), start = 0) {
  const voice = voiceTiming(project)
  const lastWordEnd = voice ? Math.max(0, ...voice.beats.flat().map(w => w.end)) : 0
  const seconds = Math.max(project.audioDuration || project.duration, lastWordEnd)
  const total = Math.max(FPS, Math.round(seconds * FPS))
  const weights = project.beats.map(b => Math.max(2, words(b.say)))
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const starts = voice ? voiceStarts(voice) : null

  let from = start
  const beats: TimedBeat[] = project.beats.map((beat, index) => {
    const isLast = index === project.beats.length - 1
    const frames = starts
      ? Math.max(MIN_VOICE_FRAMES, (isLast ? total : starts[index + 1]) - starts[index])
      : isLast
        ? Math.max(8, total - (from - start))
        : Math.max(8, Math.round((weights[index] / sum) * total))
    const img = beat.imageId ? images.get(beat.imageId) : undefined
    const sticker = beat.stickerId ? images.get(beat.stickerId) : undefined
    const sfx = beat.sfxId ? sounds.get(beat.sfxId) : undefined
    const timed: TimedBeat = {
      beat,
      index,
      from,
      frames,
      image: img ? libraryMedia(img) : undefined,
      stickerSrc: sticker ? imageUrl(sticker) : undefined,
      sfxSrc: sfx ? soundUrl(sfx) : undefined,
      wordStarts: starts && voice ? voice.beats[index].map(w => Math.max(0, Math.round(w.start * FPS) - starts[index])) : undefined,
    }
    from += frames
    return timed
  })

  /** end: o quadro em que a última batida termina */
  return { beats, end: Math.max(start + 1, from) }
}

/** Bordão → props da composição. Sem o arquivo que ele precisa (clipe sem vídeo), não entra. */
export function catchphraseProps(c: Catchphrase, images: Map<string, LibraryImage>): CatchphraseProps | undefined {
  const frames = Math.max(1, Math.round(c.duration * FPS))
  switch (c.kind) {
    case 'clipe':
      return c.file ? { kind: 'clipe', frames, src: catchphraseFileUrl(c.file)! } : undefined
    case 'montado': {
      const img = c.imageId ? images.get(c.imageId) : undefined
      return { kind: 'montado', frames, audioSrc: catchphraseFileUrl(c.file), image: img ? libraryMedia(img) : undefined, text: c.text || undefined }
    }
    case 'inscreva':
      return { kind: 'inscreva', frames, photoSrc: catchphraseFileUrl(c.photoFile), name: c.channelName ?? '', text: c.text ?? '', button: c.button || 'INSCREVA-SE' }
  }
}

/**
 * Props da composição: as mesmas na prévia e no render em MP4.
 * A abertura vem antes da primeira cena (e da narração); o final, depois da última.
 */
export function shortVideoProps(
  project: ShortProject,
  images: Map<string, LibraryImage>,
  sounds?: Map<string, SoundItem>,
  catchphrases?: Map<string, Catchphrase>,
) {
  const pick = (id?: string | null) => {
    const c = id ? catchphrases?.get(id) : undefined
    return c ? catchphraseProps(c, images) : undefined
  }
  const intro = pick(project.settings.intro)
  const outro = pick(project.settings.outro)
  const timeline = buildTimeline(project, images, sounds, intro?.frames ?? 0)
  const music = project.musicId ? sounds?.get(project.musicId) : undefined
  const props: ShortVideoProps = {
    beats: timeline.beats,
    settings: project.settings,
    audioSrc: audioUrl(project),
    musicSrc: music ? soundUrl(music) : undefined,
    ...(intro ? { intro } : {}),
    ...(outro ? { outro } : {}),
  }
  const durationInFrames = timeline.end + (outro?.frames ?? 0)
  return { timeline, props, durationInFrames }
}

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Área da imagem para o zoom e para onde a seta aponta. */
export function focusRegion(beat: Beat, regions: Region[] = []): Region | undefined {
  if (!beat.focus || regions.length === 0) return undefined
  const want = normalize(beat.focus)
  return regions.find(r => normalize(r.label).includes(want) || want.includes(normalize(r.label)))
}
