import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Player, PlayerRef } from '@remotion/player'
import { audioUrl, LibraryImage, ShortProject, SoundItem, soundUrl } from '../api/shorts'
import { ShortVideo } from './ShortVideo'
import { buildTimeline, FPS, HEIGHT, WIDTH } from './timeline'

export interface ShortPlayerHandle {
  seekToBeat: (index: number) => void
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
  const timeline = useMemo(() => buildTimeline(project, images, sounds), [project, images, sounds])
  const inputProps = useMemo(
    () => {
      const music = project.musicId ? sounds?.get(project.musicId) : undefined
      return { beats: timeline.beats, settings: project.settings, audioSrc: audioUrl(project), musicSrc: music ? soundUrl(music) : undefined }
    },
    [timeline, project, sounds],
  )

  useImperativeHandle(ref, () => ({
    seekToBeat: index => {
      const t = timeline.beats[index]
      if (t) playerRef.current?.seekTo(t.from)
    },
  }))

  useEffect(() => {
    const player = playerRef.current
    if (!player || !onBeatChange) return
    let last = -1
    const onFrame = (e: { detail: { frame: number } }) => {
      const i = timeline.beats.findIndex(t => e.detail.frame >= t.from && e.detail.frame < t.from + t.frames)
      if (i !== last) {
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
      durationInFrames={timeline.durationInFrames}
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
