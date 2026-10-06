import type { Beat, Channel, LibraryImage, ProjectSettings, Region, ShortProject, SoundItem } from '../api/shorts'
import { audioUrl, channelPhotoUrl, imageUrl, mediaUrl, soundUrl } from '../api/shorts'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920
/** Duração do final com o bordão (2,5 s). */
export const OUTRO_FRAMES = 75

/** O que a composição precisa de cada batida: o texto, a imagem e quando entra. */
export interface TimedBeat {
  beat: Beat
  index: number
  from: number
  frames: number
  /** clip: a batida usa uma cena de vídeo; src é o vídeo e o trecho vai de clip.start a clip.end. */
  image?: { src: string; regions: Region[]; clip?: { start: number; end: number }; poster?: string }
  /** Figurinha no lugar do emoji. */
  stickerSrc?: string
  /** Efeito sonoro que toca no corte. */
  sfxSrc?: string
}

/** Final do vídeo: foto do perfil, nome, bordão e botão. */
export interface OutroProps {
  photoSrc?: string
  name: string
  text: string
  button: string
}

export interface ShortVideoProps extends Record<string, unknown> {
  beats: TimedBeat[]
  settings: ProjectSettings
  audioSrc?: string
  musicSrc?: string
  outro?: OutroProps
}

const words = (text: string) => text.split(/\s+/).filter(Boolean).length

/**
 * Distribui o tempo do vídeo entre as batidas pelo número de palavras faladas.
 * Com áudio, o total é a duração do áudio; sem áudio, a duração escolhida no tema.
 */
export function buildTimeline(project: ShortProject, images: Map<string, LibraryImage>, sounds: Map<string, SoundItem> = new Map()) {
  const seconds = project.audioDuration || project.duration
  const total = Math.max(FPS, Math.round(seconds * FPS))
  const weights = project.beats.map(b => Math.max(2, words(b.say)))
  const sum = weights.reduce((a, b) => a + b, 0) || 1

  let from = 0
  const beats: TimedBeat[] = project.beats.map((beat, index) => {
    const isLast = index === project.beats.length - 1
    const frames = isLast ? Math.max(8, total - from) : Math.max(8, Math.round((weights[index] / sum) * total))
    const img = beat.imageId ? images.get(beat.imageId) : undefined
    const sticker = beat.stickerId ? images.get(beat.stickerId) : undefined
    const sfx = beat.sfxId ? sounds.get(beat.sfxId) : undefined
    const timed: TimedBeat = {
      beat,
      index,
      from,
      frames,
      image: img
        ? img.kind === 'cena' && img.clip
          ? { src: mediaUrl(img), regions: img.regions, clip: img.clip, poster: imageUrl(img) }
          : { src: imageUrl(img), regions: img.regions }
        : undefined,
      stickerSrc: sticker ? imageUrl(sticker) : undefined,
      sfxSrc: sfx ? soundUrl(sfx) : undefined,
    }
    from += frames
    return timed
  })

  return { beats, durationInFrames: Math.max(1, from) }
}

/** Props da composição: as mesmas na prévia e no render em MP4. O final entra depois da última cena. */
export function shortVideoProps(
  project: ShortProject,
  images: Map<string, LibraryImage>,
  sounds?: Map<string, SoundItem>,
  channel?: Channel | null,
) {
  const timeline = buildTimeline(project, images, sounds)
  const music = project.musicId ? sounds?.get(project.musicId) : undefined
  const outro: OutroProps | undefined =
    project.settings.outro && channel
      ? { photoSrc: channelPhotoUrl(channel), name: channel.name, text: channel.text, button: channel.button }
      : undefined
  const props: ShortVideoProps = {
    beats: timeline.beats,
    settings: project.settings,
    audioSrc: audioUrl(project),
    musicSrc: music ? soundUrl(music) : undefined,
    ...(outro ? { outro } : {}),
  }
  const durationInFrames = timeline.durationInFrames + (outro ? OUTRO_FRAMES : 0)
  return { timeline, props, durationInFrames }
}

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Área da imagem para o zoom e para onde a seta aponta. */
export function focusRegion(beat: Beat, regions: Region[] = []): Region | undefined {
  if (!beat.focus || regions.length === 0) return undefined
  const want = normalize(beat.focus)
  return regions.find(r => normalize(r.label).includes(want) || want.includes(normalize(r.label)))
}
