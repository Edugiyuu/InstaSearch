import type { Beat, LibraryImage, ProjectSettings, Region, ShortProject, SoundItem } from '../api/shorts'
import { imageUrl, soundUrl } from '../api/shorts'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** O que a composição precisa de cada batida: o texto, a imagem e quando entra. */
export interface TimedBeat {
  beat: Beat
  index: number
  from: number
  frames: number
  image?: { src: string; regions: Region[] }
  /** Figurinha no lugar do emoji. */
  stickerSrc?: string
  /** Efeito sonoro que toca no corte. */
  sfxSrc?: string
}

export interface ShortVideoProps extends Record<string, unknown> {
  beats: TimedBeat[]
  settings: ProjectSettings
  audioSrc?: string
  musicSrc?: string
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
      image: img ? { src: imageUrl(img), regions: img.regions } : undefined,
      stickerSrc: sticker ? imageUrl(sticker) : undefined,
      sfxSrc: sfx ? soundUrl(sfx) : undefined,
    }
    from += frames
    return timed
  })

  return { beats, durationInFrames: Math.max(1, from) }
}

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Área da imagem para o zoom e para onde a seta aponta. */
export function focusRegion(beat: Beat, regions: Region[] = []): Region | undefined {
  if (!beat.focus || regions.length === 0) return undefined
  const want = normalize(beat.focus)
  return regions.find(r => normalize(r.label).includes(want) || want.includes(normalize(r.label)))
}
