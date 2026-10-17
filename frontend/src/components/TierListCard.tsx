import { useState } from 'react'
import { TIER_RANKS, type ShortProject, type TierRank } from '../api/shorts'
import { Segmented } from './flow'

const RANK_LABEL = Object.fromEntries(TIER_RANKS.map(r => [r, r])) as Record<TierRank, string>

/**
 * A fileira do personagem da tier list (ADR 0036, 6). Trocar muda só o quadro, porque a narração nunca diz a
 * letra; se o argumento não combinar mais, antes da voz dá para reescrever pelo chat, e depois só avisa.
 */
export function TierListCard({
  project,
  disabled,
  onRank,
  onAdjust,
}: {
  project: ShortProject
  disabled: boolean
  onRank: (rank: TierRank) => void
  onAdjust: (request: string) => void
}) {
  const tier = project.tier
  // a fileira de antes da troca: só com ela o aviso faz sentido
  const [from, setFrom] = useState<TierRank | null>(null)
  if (!tier) return null
  const changed = from !== null && from !== tier.rank

  const pick = (rank: TierRank) => {
    if (rank === tier.rank) return
    setFrom(f => f ?? tier.rank)
    onRank(rank)
  }

  return (
    <div className="rv-tier">
      <span className="label">🏆 Tier list · {tier.series}</span>
      <div className="rv-knob">
        <span>Fileira de {tier.character}</span>
        <Segmented value={tier.rank} options={RANK_LABEL} onChange={pick} disabled={disabled} />
      </div>
      {changed &&
        (project.audioFile ? (
          <p className="meta">⚠️ O que você gravou defendia a fileira {from}. Se o argumento não combina mais com a {tier.rank}, regrave a voz.</p>
        ) : (
          <button
            className="act"
            disabled={disabled}
            onClick={() => {
              setFrom(null)
              onAdjust(
                `O ${tier.character} agora fica na fileira ${tier.rank}, e não na ${from}. Reescreva o argumento para defender essa fileira, sem dizer a letra na narração: a revelação continua apontando para o quadro ("o lugar dele é aqui").`,
              )
            }}
          >
            ↻ Ajustar o roteiro para a fileira {tier.rank}
          </button>
        ))}
    </div>
  )
}
