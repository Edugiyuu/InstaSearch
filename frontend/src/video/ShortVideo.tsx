// Composição Remotion do Short (1080×1920, 30fps).
// Cada batida é uma <Sequence>: imagem com movimento, efeito (seta, X, círculo, emoji) e legenda.
import { CSSProperties } from 'react'
import { AbsoluteFill, Audio, Img, interpolate, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ProjectSettings, Region } from '../api/shorts'
import { focusRegion, ShortVideoProps, TimedBeat, WIDTH, HEIGHT } from './timeline'

const RED = '#E52222'
const YELLOW = '#FFD60A'

export function ShortVideo({ beats, settings, audioSrc, musicSrc }: ShortVideoProps) {
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: 'Inter, sans-serif' }}>
      {beats.map(t => (
        <Sequence key={t.beat.id} from={t.from} durationInFrames={t.frames} name={t.beat.text}>
          <BeatScene timed={t} settings={settings} />
          {t.sfxSrc && <Audio src={t.sfxSrc} volume={0.75} />}
        </Sequence>
      ))}
      {audioSrc && <Audio src={audioSrc} />}
      {/* música baixa quando tem voz, para não brigar com a narração */}
      {musicSrc && <Audio src={musicSrc} loop volume={audioSrc ? 0.12 : 0.35} />}
    </AbsoluteFill>
  )
}

function BeatScene({ timed, settings }: { timed: TimedBeat; settings: ProjectSettings }) {
  const frame = useCurrentFrame()
  const { beat, image } = timed
  const region = focusRegion(beat, image?.regions)
  const flash = timed.index > 0 && (settings.pace === 'frenetico' || (settings.pace === 'rapido' && timed.index % 4 === 0))

  return (
    <AbsoluteFill>
      {!image ? (
        <MissingImage query={beat.query} />
      ) : beat.scene === 'evidence' ? (
        <Evidence src={image.src} />
      ) : (
        <FullImage src={image.src} timed={timed} region={region} punch={settings.pace !== 'calmo'} />
      )}

      {image && <BeatEffect timed={timed} region={beat.scene === 'evidence' ? undefined : region} />}

      {settings.caption === 'completa' ? (
        <FullCaption say={beat.say} frames={timed.frames} />
      ) : (
        settings.caption !== 'sem' && <Caption text={beat.text} mode={settings.caption} />
      )}

      {flash && (
        <AbsoluteFill style={{ background: '#fff', opacity: interpolate(frame, [0, 3], [0.45, 0], { extrapolateRight: 'clamp' }) }} />
      )}
    </AbsoluteFill>
  )
}

// ── Cenas ────────────────────────────────────────────────

function FullImage({ src, timed, region, punch }: { src: string; timed: TimedBeat; region?: Region; punch: boolean }) {
  const frame = useCurrentFrame()
  const p = frame / Math.max(1, timed.frames - 1)
  const cx = region ? region.x + region.w / 2 : 0.5
  const cy = region ? region.y + region.h / 2 : 0.4

  let scale = 1
  let x = 0
  let y = 0
  switch (timed.beat.motion) {
    case 'zoom-out':
      scale = interpolate(p, [0, 1], [1.38, 1.08])
      break
    case 'shake': {
      const decay = Math.max(0, 1 - frame / 12)
      scale = interpolate(p, [0, 1], [1.16, 1.24])
      x = Math.sin(frame * 2.3) * 26 * decay
      y = Math.cos(frame * 1.9) * 20 * decay
      break
    }
    case 'pan':
      scale = 1.22
      x = interpolate(p, [0, 1], [-70, 70])
      break
    default:
      // zoom-in: com área marcada, termina perto do rosto/mão
      scale = interpolate(p, [0, 1], [1.06, region ? Math.min(1.9, 0.75 / Math.max(region.w, region.h, 0.3)) : 1.26])
  }
  if (punch) scale += interpolate(frame, [0, 5], [0.08, 0], { extrapolateRight: 'clamp' })

  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    objectPosition: `${cx * 100}% ${cy * 100}%`,
    transformOrigin: `${cx * 100}% ${cy * 100}%`,
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  }

  return (
    <AbsoluteFill>
      <Img src={src} style={imgStyle} />
      {/* escurece o pé do quadro para a legenda aparecer */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  )
}

function Evidence({ src }: { src: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 160 } })
  const grid = 'rgba(255,255,255,0.07)'

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#16171b',
        backgroundImage: `repeating-linear-gradient(0deg, ${grid} 0 2px, transparent 2px 72px), repeating-linear-gradient(90deg, ${grid} 0 2px, transparent 2px 72px)`,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Img
        src={src}
        style={{
          maxWidth: 960,
          maxHeight: 1250,
          border: '14px solid #fff',
          borderRadius: 6,
          boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          transform: `translateY(${interpolate(enter, [0, 1], [120, -80])}px) rotate(${interpolate(enter, [0, 1], [-8, -2.5])}deg) scale(${interpolate(enter, [0, 1], [0.7, 1])})`,
        }}
      />
    </AbsoluteFill>
  )
}

/** Batida sem imagem: aparece assim na prévia para ninguém achar que está pronta. */
function MissingImage({ query }: { query: string }) {
  return (
    <AbsoluteFill
      style={{
        background: 'repeating-linear-gradient(135deg, #1b1114 0 40px, #160e10 40px 80px)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 90,
      }}
    >
      <div
        style={{
          border: `8px dashed ${RED}`,
          borderRadius: 40,
          padding: '70px 60px',
          textAlign: 'center',
          color: '#fff',
          marginTop: -260,
        }}
      >
        <div style={{ fontSize: 64, fontWeight: 900, color: RED, letterSpacing: 2 }}>FALTA IMAGEM</div>
        <div style={{ fontSize: 46, fontWeight: 600, marginTop: 24, opacity: 0.85, lineHeight: 1.25 }}>{query}</div>
      </div>
    </AbsoluteFill>
  )
}

// ── Efeitos ──────────────────────────────────────────────

function BeatEffect({ timed, region }: { timed: TimedBeat; region?: Region }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const start = Math.min(4, Math.floor(timed.frames * 0.15))
  const f = frame - start
  if (f < 0 || timed.beat.effect === 'none') return null

  const tx = (region ? region.x + region.w / 2 : 0.5) * WIDTH
  const ty = (region ? region.y + region.h / 2 : 0.38) * HEIGHT
  const draw = interpolate(f, [0, 7], [0, 1], { extrapolateRight: 'clamp' })
  const pop = spring({ frame: f, fps, config: { damping: 9, stiffness: 220 } })

  switch (timed.beat.effect) {
    case 'arrow': {
      // a seta entra de baixo/direita e para apontando para a área
      const dx = tx > WIDTH * 0.6 ? -1 : 1
      const len = 330
      const ox = interpolate(pop, [0, 1], [dx * 260, 0])
      const oy = interpolate(pop, [0, 1], [260, 0])
      const sx = tx + dx * len * 0.75
      const sy = ty + len * 0.75
      const angle = Math.atan2(ty - sy, tx - sx)
      const head = 90
      const hx1 = tx - head * Math.cos(angle - 0.5)
      const hy1 = ty - head * Math.sin(angle - 0.5)
      const hx2 = tx - head * Math.cos(angle + 0.5)
      const hy2 = ty - head * Math.sin(angle + 0.5)
      return (
        <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', transform: `translate(${ox}px, ${oy}px)`, filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.5))' }}>
          <line x1={sx} y1={sy} x2={tx - 30 * Math.cos(angle)} y2={ty - 30 * Math.sin(angle)} stroke={RED} strokeWidth={30} strokeLinecap="round" />
          <polygon points={`${tx},${ty} ${hx1},${hy1} ${hx2},${hy2}`} fill={RED} />
        </svg>
      )
    }
    case 'cross': {
      const r = 300
      const len = Math.hypot(r * 2, r * 2)
      return (
        <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute', filter: 'drop-shadow(0 6px 12px rgba(0,0,0,0.5))' }}>
          {[
            [tx - r, ty - r, tx + r, ty + r],
            [tx + r, ty - r, tx - r, ty + r],
          ].map(([x1, y1, x2, y2], i) => (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={RED}
              strokeWidth={46}
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - interpolate(f - i * 4, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))}
            />
          ))}
        </svg>
      )
    }
    case 'circle': {
      const rx = region ? Math.max(170, (region.w * WIDTH) / 2 + 50) : 300
      const ry = region ? Math.max(150, (region.h * HEIGHT) / 2 + 40) : 260
      const len = 2 * Math.PI * Math.sqrt((rx * rx + ry * ry) / 2)
      return (
        <svg width={WIDTH} height={HEIGHT} style={{ position: 'absolute' }}>
          <ellipse
            cx={tx}
            cy={ty}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={RED}
            strokeWidth={18}
            strokeDasharray={len}
            strokeDashoffset={len * (1 - draw)}
            transform={`rotate(-8 ${tx} ${ty})`}
          />
        </svg>
      )
    }
    case 'emoji':
      if (timed.stickerSrc) {
        return (
          <Img
            src={timed.stickerSrc}
            style={{
              position: 'absolute',
              right: 50,
              top: 230,
              width: 420,
              height: 420,
              objectFit: 'contain',
              transform: `scale(${pop}) rotate(${Math.sin(f / 4) * 6 - 4}deg)`,
              filter: 'drop-shadow(0 12px 20px rgba(0,0,0,0.55))',
            }}
          />
        )
      }
      return (
        <div
          style={{
            position: 'absolute',
            right: 90,
            top: 300,
            fontSize: 230,
            transform: `scale(${pop}) rotate(${Math.sin(f / 3) * 10}deg)`,
            filter: 'drop-shadow(0 10px 18px rgba(0,0,0,0.5))',
          }}
        >
          {timed.beat.emoji || '😱'}
        </div>
      )
    default:
      return null
  }
}

// ── Legenda ──────────────────────────────────────────────

function Caption({ text, mode }: { text: string; mode: ProjectSettings['caption'] }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const upper = text.toUpperCase()

  if (mode === 'limpa') {
    const enter = interpolate(frame, [0, 5], [0, 1], { extrapolateRight: 'clamp' })
    return (
      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          top: 1290,
          textAlign: 'center',
          color: '#fff',
          fontSize: 84,
          fontWeight: 800,
          lineHeight: 1.1,
          textShadow: '0 4px 24px rgba(0,0,0,0.85)',
          opacity: enter,
          transform: `translateY(${(1 - enter) * 30}px)`,
        }}
      >
        {text}
      </div>
    )
  }

  const pop = spring({ frame, fps, config: { damping: 11, stiffness: 260 } })
  const size = upper.length <= 8 ? 176 : upper.length <= 14 ? 146 : upper.length <= 22 ? 118 : 96
  return (
    <div
      style={{
        position: 'absolute',
        left: 40,
        right: 40,
        top: 1150,
        textAlign: 'center',
        color: YELLOW,
        fontSize: size,
        fontWeight: 900,
        lineHeight: 1.02,
        letterSpacing: -1,
        WebkitTextStroke: '16px #000',
        paintOrder: 'stroke fill',
        textShadow: '0 10px 0 #000',
        transform: `scale(${interpolate(pop, [0, 1], [0.55, 1])}) rotate(-3deg)`,
      }}
    >
      {upper}
    </div>
  )
}

/**
 * Legenda completa: todas as palavras da fala, em blocos de até 4,
 * com a palavra falada acendendo em amarelo. O tempo de cada palavra é
 * proporcional ao tamanho dela dentro da batida (sem transcrição ainda).
 */
function FullCaption({ say, frames }: { say: string; frames: number }) {
  const frame = useCurrentFrame()
  const words = say.split(/\s+/).filter(Boolean)
  if (words.length === 0) return null

  const weights = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2)
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  const starts = weights.map(w => {
    const start = (acc / total) * frames
    acc += w
    return start
  })
  let current = starts.findIndex((s, i) => frame >= s && (i === words.length - 1 || frame < starts[i + 1]))
  if (current < 0) current = words.length - 1

  const CHUNK = 4
  const chunkStart = Math.floor(current / CHUNK) * CHUNK
  const chunk = words.slice(chunkStart, chunkStart + CHUNK)

  return (
    <div
      style={{
        position: 'absolute',
        left: 60,
        right: 60,
        top: 1200,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 26px',
        textAlign: 'center',
        fontSize: 92,
        fontWeight: 900,
        lineHeight: 1.12,
        textTransform: 'uppercase',
        WebkitTextStroke: '12px #000',
        paintOrder: 'stroke fill',
        textShadow: '0 8px 0 #000',
      }}
    >
      {chunk.map((w, i) => {
        const index = chunkStart + i
        const on = index === current
        return (
          <span
            key={index}
            style={{
              color: on ? YELLOW : '#fff',
              transform: on ? 'scale(1.12)' : 'scale(1)',
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        )
      })}
    </div>
  )
}
