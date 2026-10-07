// Composição Remotion do Short (1080×1920, 30fps).
// Cada batida é uma <Sequence>: imagem (ou trecho de vídeo) com movimento, efeito (seta, X, círculo, figurinha de reação) e legenda.
import { CSSProperties } from 'react'
import { AbsoluteFill, Audio, Freeze, Img, interpolate, OffthreadVideo, Sequence, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import type { ProjectSettings, Region } from '../api/shorts'
import { CatchphraseProps, focusRegion, MediaProps, ShortVideoProps, TimedBeat, WIDTH, HEIGHT } from './timeline'
import { framing, regionOnScreen } from './framing'

const RED = '#E52222'
const YELLOW = '#FFD60A'

export function ShortVideo({ beats, settings, audioSrc, musicSrc, intro, outro }: ShortVideoProps) {
  const first = beats[0]
  const last = beats[beats.length - 1]
  const start = intro?.frames ?? 0
  const end = last ? last.from + last.frames : start
  // a música para quando entra um final com som próprio, para não brigar com ele
  const outroHasSound = outro?.kind === 'clipe' || (outro?.kind === 'montado' && !!outro.audioSrc)
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: 'Inter, sans-serif' }}>
      {intro && (
        <Sequence durationInFrames={intro.frames} name="Abertura">
          <CatchphraseScene c={intro} background={first?.image?.poster ?? first?.image?.src} />
        </Sequence>
      )}
      {beats.map(t => (
        <Sequence key={t.beat.id} from={t.from} durationInFrames={t.frames} name={t.beat.text}>
          <BeatScene timed={t} settings={settings} />
          {t.sfxSrc && <Audio src={t.sfxSrc} volume={0.75} />}
        </Sequence>
      ))}
      {outro && (
        <Sequence from={end} durationInFrames={outro.frames} name="Final">
          <CatchphraseScene c={outro} background={last?.image?.poster ?? last?.image?.src} />
        </Sequence>
      )}
      {/* a narração e a música começam depois da abertura, que toca com o som dela */}
      {audioSrc && (
        <Sequence from={start} layout="none" name="Narração">
          <Audio src={audioSrc} />
        </Sequence>
      )}
      {musicSrc && (
        <Sequence from={start} durationInFrames={outroHasSound ? end - start : undefined} layout="none" name="Música">
          {/* música baixa quando tem voz, para não brigar com a narração */}
          <Audio src={musicSrc} loop volume={audioSrc ? 0.12 : 0.35} />
        </Sequence>
      )}
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
      ) : beat.scene === 'evidence' && !image.clip ? (
        <Evidence src={image.src} />
      ) : (
        <FullImage src={image.src} timed={timed} region={region} punch={settings.pace !== 'calmo'} />
      )}

      {image && <BeatEffect timed={timed} region={beat.scene === 'evidence' ? undefined : regionOnScreen(region, image.width, image.height, beat.framing)} />}

      {settings.caption === 'completa' ? (
        <FullCaption say={beat.say} frames={timed.frames} wordStarts={timed.wordStarts} />
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
  const clip = timed.image?.clip
  // o vídeo deitado vira vertical cortando as laterais: centraliza no que a IA marcou
  const center = region ?? (clip ? timed.image?.regions[0] : undefined)
  const cx = center ? center.x + center.w / 2 : 0.5
  const cy = center ? center.y + center.h / 2 : 0.4

  // o zoom conta o recorte que o cover já faz; imagem larga fica inteira (ADR 0020)
  const fr = framing(timed.image?.width, timed.image?.height, region, timed.beat.framing)
  const cap = (s: number) => Math.min(s, fr.maxScale)

  let scale = 1
  let x = 0
  let y = 0
  switch (timed.beat.motion) {
    case 'zoom-out':
      scale = interpolate(p, [0, 1], [cap(1.38), cap(1.08)])
      break
    case 'shake': {
      const decay = Math.max(0, 1 - frame / 12)
      scale = interpolate(p, [0, 1], [cap(1.16), cap(1.24)])
      x = Math.sin(frame * 2.3) * 26 * decay
      y = Math.cos(frame * 1.9) * 20 * decay
      break
    }
    case 'pan': {
      scale = cap(1.22)
      // anda só o que o zoom deixa de sobra, para não mostrar a borda
      const room = Math.min(70, (scale - 1) * 540)
      x = interpolate(p, [0, 1], [-room, room])
      break
    }
    default:
      // zoom-in: termina perto da área marcada (rosto/mão); num close, só um zoom leve
      scale = interpolate(p, [0, 1], [cap(1.04), fr.zoomEnd])
  }
  if (punch) scale += interpolate(frame, [0, 5], [0.08, 0], { extrapolateRight: 'clamp' })

  const fit = fr.mode === 'fit'
  const imgStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit ? 'contain' : 'cover',
    objectPosition: fit ? '50% 50%' : `${cx * 100}% ${cy * 100}%`,
    transformOrigin: fit ? '50% 50%' : `${cx * 100}% ${cy * 100}%`,
    transform: `translate(${x}px, ${y}px) scale(${scale})`,
  }

  return (
    <AbsoluteFill style={{ background: '#000' }}>
      {fit && (
        // a própria imagem, desfocada, preenche o que sobra em cima e embaixo
        <Img
          src={timed.image?.poster ?? src}
          style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(36px) brightness(0.5)', transform: 'scale(1.2)' }}
        />
      )}
      <AbsoluteFill>
        {clip ? <ClipVideo src={src} clip={clip} frames={timed.frames} style={imgStyle} /> : <Img src={src} style={imgStyle} />}
      </AbsoluteFill>
      {/* escurece o pé do quadro para a legenda aparecer */}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)' }} />
    </AbsoluteFill>
  )
}

/**
 * Trecho de uma cena de vídeo, sem som. Se a cena for mais curta que a batida, desacelera
 * até a metade da velocidade e, se ainda faltar, congela no último quadro (nunca mostra a cena seguinte).
 */
function ClipVideo({ src, clip, frames, style }: { src: string; clip: { start: number; end: number }; frames: number; style: CSSProperties }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const clipFrames = Math.max(1, Math.floor((clip.end - clip.start) * fps))
  const rate = Math.min(1, Math.max(0.5, clipFrames / frames))
  const last = Math.max(0, Math.floor(clipFrames / rate) - 1)
  return (
    <Freeze frame={last} active={frame > last}>
      <OffthreadVideo src={src} muted trimBefore={Math.round(clip.start * fps)} playbackRate={rate} pauseWhenBuffering style={style} />
    </Freeze>
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
      // a reação só aparece com figurinha da biblioteca; emoji desenhado no vídeo não fica bom
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
      return null
    default:
      return null
  }
}

// ── Bordões (abertura e final) ───────────────────────────

/** Um bordão sozinho; background é a imagem da cena vizinha, para o fundo desfocado. */
export function CatchphraseScene({ c, background }: { c: CatchphraseProps; background?: string }) {
  switch (c.kind) {
    case 'clipe':
      return (
        <AbsoluteFill style={{ background: '#000' }}>
          <OffthreadVideo src={c.src} pauseWhenBuffering style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </AbsoluteFill>
      )
    case 'montado':
      return <MountedCatchphrase c={c} background={background} />
    case 'inscreva':
      return <Subscribe c={c} background={background} />
  }
}

/** Composição só com o bordão, para a prévia na biblioteca. */
export function CatchphrasePreview({ c }: { c: CatchphraseProps } & Record<string, unknown>) {
  return (
    <AbsoluteFill style={{ background: '#000', fontFamily: 'Inter, sans-serif' }}>
      <CatchphraseScene c={c} />
    </AbsoluteFill>
  )
}

/** Imagem ou cena da biblioteca com um zoom lento, o áudio do bordão e o texto grande no meio. */
function MountedCatchphrase({ c, background }: { c: Extract<CatchphraseProps, { kind: 'montado' }>; background?: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const textIn = spring({ frame: frame - 3, fps, config: { damping: 11, stiffness: 220 } })
  const style: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${interpolate(frame, [0, c.frames], [1.04, 1.16])})`,
  }
  const media: MediaProps | undefined = c.image
  return (
    <AbsoluteFill style={{ background: '#0b0b0d' }}>
      {media?.clip ? (
        <ClipVideo src={media.src} clip={media.clip} frames={c.frames} style={style} />
      ) : media ? (
        <Img src={media.src} style={style} />
      ) : (
        background && <Img src={background} style={{ ...style, filter: 'blur(36px) brightness(0.45)' }} />
      )}
      <AbsoluteFill style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0) 40%, rgba(0,0,0,0.5) 100%)' }} />
      {c.text && (
        <div
          style={{
            position: 'absolute',
            left: 60,
            right: 60,
            top: 1180,
            textAlign: 'center',
            color: YELLOW,
            fontSize: c.text.length <= 18 ? 120 : c.text.length <= 40 ? 92 : 70,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: -1,
            WebkitTextStroke: '14px #000',
            paintOrder: 'stroke fill',
            textShadow: '0 8px 0 #000',
            transform: `rotate(-2deg) scale(${textIn})`,
          }}
        >
          {c.text.toUpperCase()}
        </div>
      )}
      {c.audioSrc && <Audio src={c.audioSrc} />}
    </AbsoluteFill>
  )
}

/** Foto do perfil, nome, frase e o botão de inscrever sendo clicado. */
function Subscribe({ c: outro, background }: { c: Extract<CatchphraseProps, { kind: 'inscreva' }>; background?: string }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const photoPop = spring({ frame, fps, config: { damping: 12, stiffness: 180 } })
  const textIn = spring({ frame: frame - 8, fps, config: { damping: 14, stiffness: 200 } })
  const buttonIn = spring({ frame: frame - 16, fps, config: { damping: 10, stiffness: 240 } })
  // o cursor chega no botão e clica: o botão afunda e vira "inscrito"
  const CLICK = 44
  const cursor = interpolate(frame, [22, CLICK - 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const press = interpolate(frame, [CLICK - 3, CLICK, CLICK + 4], [1, 0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const clicked = frame >= CLICK
  const fadeOut = interpolate(frame, [outro.frames - 6, outro.frames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const initial = (outro.name.replace(/^@/, '')[0] ?? '?').toUpperCase()
  const buttonY = 1270

  return (
    <AbsoluteFill style={{ background: '#0b0b0d', opacity: fadeOut }}>
      {background && (
        <Img
          src={background}
          style={{
            position: 'absolute',
            inset: -80,
            width: WIDTH + 160,
            height: HEIGHT + 160,
            objectFit: 'cover',
            filter: 'blur(36px) brightness(0.45)',
            transform: `scale(${interpolate(frame, [0, outro.frames], [1.05, 1.15])})`,
          }}
        />
      )}
      <AbsoluteFill style={{ background: 'radial-gradient(circle at 50% 38%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.55) 70%)' }} />

      {/* foto */}
      <div
        style={{
          position: 'absolute',
          left: WIDTH / 2 - 210,
          top: 380,
          width: 420,
          height: 420,
          borderRadius: '50%',
          border: `14px solid ${YELLOW}`,
          overflow: 'hidden',
          background: '#222',
          boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
          transform: `scale(${photoPop})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {outro.photoSrc ? (
          <Img src={outro.photoSrc} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span style={{ color: '#fff', fontSize: 200, fontWeight: 900 }}>{initial}</span>
        )}
      </div>

      {/* nome e bordão */}
      <div
        style={{
          position: 'absolute',
          left: 60,
          right: 60,
          top: 850,
          textAlign: 'center',
          opacity: textIn,
          transform: `translateY(${(1 - textIn) * 40}px)`,
        }}
      >
        {outro.name && <div style={{ color: '#fff', fontSize: 62, fontWeight: 800, textShadow: '0 4px 18px rgba(0,0,0,0.8)' }}>{outro.name}</div>}
        {outro.text && (
          <div
            style={{
              marginTop: 34,
              color: YELLOW,
              fontSize: outro.text.length <= 22 ? 104 : outro.text.length <= 40 ? 84 : 68,
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: -1,
              WebkitTextStroke: '14px #000',
              paintOrder: 'stroke fill',
              textShadow: '0 8px 0 #000',
              transform: 'rotate(-2deg)',
            }}
          >
            {outro.text.toUpperCase()}
          </div>
        )}
      </div>

      {/* botão */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: buttonY,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${buttonIn * press})`,
        }}
      >
        <div
          style={{
            padding: '34px 76px',
            borderRadius: 999,
            background: clicked ? '#3a3a3f' : RED,
            color: '#fff',
            fontSize: 64,
            fontWeight: 900,
            letterSpacing: 1,
            boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
          }}
        >
          {clicked ? 'INSCRITO' : outro.button.toUpperCase()}
        </div>
      </div>

      {/* cursor */}
      <svg
        width="110"
        height="110"
        viewBox="0 0 24 24"
        style={{
          position: 'absolute',
          left: interpolate(cursor, [0, 1], [900, WIDTH / 2 + 40]),
          top: interpolate(cursor, [0, 1], [1780, buttonY + 70]),
          opacity: interpolate(frame, [20, 24], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          transform: `scale(${clicked && frame < CLICK + 4 ? 0.85 : 1})`,
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.6))',
        }}
      >
        <path d="M4 2 L4 19 L8.5 15 L11.5 22 L14.5 20.7 L11.6 14 L18 14 Z" fill="#fff" stroke="#000" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    </AbsoluteFill>
  )
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
 * com a palavra falada acendendo em amarelo. Com a voz transcrita, cada palavra acende
 * quando é falada (wordStarts, ADR 0018); sem, o tempo é proporcional ao tamanho dela.
 */
function FullCaption({ say, frames, wordStarts }: { say: string; frames: number; wordStarts?: number[] }) {
  const frame = useCurrentFrame()
  const words = say.split(/\s+/).filter(Boolean)
  if (words.length === 0) return null

  const weights = words.map(w => w.replace(/[^\p{L}\p{N}]/gu, '').length + 2)
  const total = weights.reduce((a, b) => a + b, 0)
  let acc = 0
  const estimated = weights.map(w => {
    const start = (acc / total) * frames
    acc += w
    return start
  })
  const starts = wordStarts?.length === words.length ? wordStarts : estimated
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
