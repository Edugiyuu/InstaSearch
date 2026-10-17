// A cena da tier list (ADR 0036): o quadro da série, desenhado no próprio vídeo, como no TierMaker.
// Em cima, o quadro (até y≈1150, porque a legenda fica entre 1200 e 1500); embaixo, o personagem da vez,
// que na revelação voa para a fileira dele. A letra só existe aqui: a narração aponta ("é aqui").
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { TIER_RANKS, type TierBoard, type TierEntry, type TierRank } from '../api/shorts'
import { WIDTH } from './timeline'

/** As cores do TierMaker: o público reconhece o quadro de cara. */
const COLORS: Record<TierRank, string> = { S: '#FF7F7F', A: '#FFBF7F', B: '#FFDF7F', C: '#FFFF7F', D: '#BFFF7F' }

const TOP = 270
const ROW = 170
const GAP = 6
const LABEL = 170
const PAD = 8
/** O personagem da vez, embaixo da legenda. */
const CARD = { cx: WIDTH / 2, cy: 1680, size: 300 }

/** antes = abertura (ele ainda não entrou); revelacao = a cena em que ele voa; depois = já está na fileira. */
export type TierPhase = 'antes' | 'revelacao' | 'depois'

type Box = { x: number; y: number; size: number }

/** Onde fica cada personagem: as fileiras na ordem do quadro, e cada uma na ordem dos vídeos. */
function slots(previous: TierEntry[], current: TierEntry, withCurrent: boolean) {
  const out = new Map<TierEntry, Box>()
  TIER_RANKS.forEach((rank, r) => {
    const row = [...previous.filter(e => e.rank === rank), ...(withCurrent && current.rank === rank ? [current] : [])]
    const room = WIDTH - LABEL - PAD * 2
    // a fileira cheia encolhe as fotos em vez de cortar alguém
    const size = Math.min(ROW - PAD * 2, row.length ? room / row.length - PAD : ROW)
    row.forEach((e, i) => out.set(e, { x: LABEL + PAD + i * (size + PAD), y: TOP + r * (ROW + GAP) + (ROW - size) / 2, size }))
  })
  return out
}

function Portrait({ entry, box, glow = 0, style }: { entry: TierEntry; box: Box; glow?: number; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.size,
        height: box.size,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#333',
        boxShadow: glow ? `0 0 ${40 * glow}px ${12 * glow}px rgba(255,214,10,${0.9 * glow})` : '0 4px 10px rgba(0,0,0,.5)',
        border: glow ? `${Math.max(3, 6 * glow)}px solid #FFD60A` : '3px solid #111',
        ...style,
      }}
    >
      {entry.portrait ? (
        <Img src={entry.portrait} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} />
      ) : (
        // sem retrato oficial: as iniciais, nunca a foto de outro personagem
        <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', color: '#fff', fontSize: box.size * 0.32, fontWeight: 900 }}>
          {entry.character
            .split(/\s+/)
            .map(w => w[0])
            .join('')
            .slice(0, 2)
            .toUpperCase()}
        </div>
      )}
    </div>
  )
}

export function TierListScene({ board, phase, revealAt = 0 }: { board: TierBoard; phase: TierPhase; revealAt?: number }) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const { previous, current } = board
  const placed = slots(previous, current, phase !== 'antes')
  const target = placed.get(current)

  // a viagem até a fileira: começa na palavra que aponta ("aqui") e assenta com um quique
  const fly = phase === 'revelacao' ? spring({ frame: frame - revealAt, fps, config: { damping: 13, stiffness: 140 } }) : phase === 'depois' ? 1 : 0
  const landed = phase === 'revelacao' && frame >= revealAt ? interpolate(frame - revealAt, [8, 14, 40], [0, 1, 0.6], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : phase === 'depois' ? 0.6 : 0
  const bob = phase === 'revelacao' && frame >= revealAt ? 0 : Math.sin(frame / 7) * 10
  const card: Box = { x: CARD.cx - CARD.size / 2, y: CARD.cy - CARD.size / 2 + bob, size: CARD.size }
  const box: Box = target
    ? { x: interpolate(fly, [0, 1], [card.x, target.x]), y: interpolate(fly, [0, 1], [card.y, target.y]), size: interpolate(fly, [0, 1], [card.size, target.size]) }
    : card
  // a fileira dele pisca quando ele chega
  const rowFlash = (rank: TierRank) => (rank === current.rank ? landed : 0)

  return (
    <AbsoluteFill style={{ background: 'linear-gradient(#141414, #0b0b0b)' }}>
      <div style={{ position: 'absolute', top: 110, left: 40, right: 40, textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: 30, fontWeight: 800, letterSpacing: 6, color: '#FFD60A' }}>TIER LIST · PARTE {board.part}</div>
        <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1.1, marginTop: 8 }}>{board.series}</div>
      </div>

      {TIER_RANKS.map((rank, r) => (
        <div key={rank} style={{ position: 'absolute', top: TOP + r * (ROW + GAP), left: 0, width: WIDTH, height: ROW, background: '#1c1c1c' }}>
          <div
            style={{
              width: LABEL,
              height: ROW,
              background: COLORS[rank],
              display: 'grid',
              placeItems: 'center',
              fontSize: 96,
              fontWeight: 900,
              color: '#1a1a1a',
              transform: `scale(${1 + rowFlash(rank) * 0.08})`,
              boxShadow: rowFlash(rank) ? `0 0 ${50 * rowFlash(rank)}px ${COLORS[rank]}` : undefined,
            }}
          >
            {rank}
          </div>
        </div>
      ))}

      {previous.map(e => {
        const b = placed.get(e)
        return b ? <Portrait key={`${e.character}-${e.rank}`} entry={e} box={b} /> : null
      })}

      <Portrait entry={current} box={box} glow={phase === 'antes' ? 0.5 : Math.max(landed, fly < 1 ? 0.6 : 0)} />

      {fly < 0.5 && (
        <div
          style={{
            position: 'absolute',
            top: CARD.cy + CARD.size / 2 + 14 + bob,
            left: 0,
            width: WIDTH,
            textAlign: 'center',
            color: '#fff',
            fontSize: 48,
            fontWeight: 900,
            opacity: interpolate(fly, [0, 0.5], [1, 0]),
            WebkitTextStroke: '8px #000',
            paintOrder: 'stroke fill',
          }}
        >
          {current.character}
          {phase === 'antes' && <span style={{ color: '#FFD60A' }}> ?</span>}
        </div>
      )}
    </AbsoluteFill>
  )
}
