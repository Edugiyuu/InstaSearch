import type { Beat, Catchphrase, LibraryImage, ProjectSettings, Region, ShortProject, SoundItem } from '../api/shorts'
import { audioUrl, catchphraseFileUrl, imageUrl, mediaUrl, soundUrl } from '../api/shorts'

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

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

const libraryMedia = (img: LibraryImage): MediaProps =>
  img.kind === 'cena' && img.clip
    ? { src: mediaUrl(img), regions: img.regions, clip: img.clip, poster: imageUrl(img) }
    : { src: imageUrl(img), regions: img.regions }

/**
 * Distribui o tempo do vídeo entre as batidas pelo número de palavras faladas.
 * Com áudio, o total é a duração do áudio; sem áudio, a duração escolhida no tema.
 * `start` é onde a primeira batida entra (depois da abertura); os `from` já saem somados.
 */
export function buildTimeline(project: ShortProject, images: Map<string, LibraryImage>, sounds: Map<string, SoundItem> = new Map(), start = 0) {
  const seconds = project.audioDuration || project.duration
  const total = Math.max(FPS, Math.round(seconds * FPS))
  const weights = project.beats.map(b => Math.max(2, words(b.say)))
  const sum = weights.reduce((a, b) => a + b, 0) || 1

  let from = start
  const beats: TimedBeat[] = project.beats.map((beat, index) => {
    const isLast = index === project.beats.length - 1
    const frames = isLast ? Math.max(8, total - (from - start)) : Math.max(8, Math.round((weights[index] / sum) * total))
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
