import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import type { LibraryImage, ShortProject, SoundItem } from '../api/shorts'
import { ShortVideo } from './ShortVideo'
import { useCatchphrases } from '../hooks/useShorts'
import { useTierBoard } from '../hooks/useTierBoard'
import { FPS, HEIGHT, shortVideoProps, WIDTH } from './timeline'

export interface ShortPlayerHandle {
  seekToBeat: (index: number) => void
  /** Toca a cena (ADR 0037, prévia de um efeito); `lead` = quantos quadros antes dela começar (para ver o corte). */
  playBeat: (index: number, lead?: number) => void
  /** Para e volta para o meio da cena. */
  stopAt: (index: number) => void
}

interface Props {
  project: ShortProject
  images: Map<string, LibraryImage>
  sounds?: Map<string, SoundItem>
  onBeatChange?: (index: number) => void
  autoPlay?: boolean
  controls?: boolean
  /** Cena em que o vídeo abre (começa em 0). */
  initialBeat?: number
  className?: string
}

/** Prévia ao vivo do Short no @remotion/player (a mesma composição vai para o render). */
export const ShortPlayer = forwardRef<ShortPlayerHandle, Props>(function ShortPlayer(
  { project, images, sounds, onBeatChange, autoPlay = false, controls = true, initialBeat, className },
  ref,
) {
  const playerRef = useRef<PlayerRef>(null)
  // a prévia de um efeito (ADR 0037) repete só a cena: [start, end) em quadros; null = tocando normal
  const loop = useRef<{ start: number; end: number } | null>(null)
  const { byId: catchphrases } = useCatchphrases()
  const { board: tier } = useTierBoard(project)
  const { timeline, props: inputProps, durationInFrames } = useMemo(
    () => shortVideoProps(project, images, sounds, catchphrases, tier),
    [project, images, sounds, catchphrases, tier],
  )

  useImperativeHandle(ref, () => ({
    seekToBeat: index => {
      const t = timeline.beats[index]
      if (t) playerRef.current?.seekTo(t.from)
    },
    playBeat: (index, lead = 0) => {
      const t = timeline.beats[index]
      if (!t) return
      loop.current = { start: Math.max(0, t.from - lead), end: t.from + t.frames }
      playerRef.current?.seekTo(loop.current.start)
      playerRef.current?.play()
    },
    stopAt: index => {
      const t = timeline.beats[index]
      loop.current = null
      playerRef.current?.pause()
      if (t) playerRef.current?.seekTo(t.from + Math.floor(t.frames / 2))
    },
  }))

  useEffect(() => {
    const player = playerRef.current
    if (!player || !onBeatChange) return
    let last = -1
    const onFrame = (e: { detail: { frame: number } }) => {
      // na prévia, volta ao começo da cena em vez de seguir para a próxima (e a cena aberta não muda)
      const l = loop.current
      if (l) {
        if (e.detail.frame >= l.end - 1 || e.detail.frame < l.start) player.seekTo(l.start)
        return
      }
      const i = timeline.beats.findIndex(t => e.detail.frame >= t.from && e.detail.frame < t.from + t.frames)
      // no final (depois da última cena) continua marcando a última cena
      if (i !== last && i !== -1) {
        last = i
        onBeatChange(i)
      }
    }
    player.addEventListener('frameupdate', onFrame)
    return () => player.removeEventListener('frameupdate', onFrame)
  }, [timeline, onBeatChange])

  return (
    <Player
      ref={playerRef}
      component={ShortVideo}
      inputProps={inputProps}
      durationInFrames={durationInFrames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      controls={controls}
      autoPlay={autoPlay}
      initialFrame={initialBeat && timeline.beats[initialBeat] ? timeline.beats[initialBeat].from + Math.floor(timeline.beats[initialBeat].frames / 2) : 0}
      loop
      clickToPlay
      doubleClickToFullscreen
      className={className}
      style={{ width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}`, borderRadius: 16, overflow: 'hidden', background: '#000' }}
    />
  )
})
