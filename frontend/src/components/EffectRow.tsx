import type { ReactNode } from 'react'
import type { Effect, Motion, Transition } from '../api/shorts'
import './EffectRow.css'

/** Nome e ícone de cada opção de efeito (ADR 0037). */
export interface EffectInfo {
  name: string
  glyph: string
}

export const MOTION_INFO: Record<Motion, EffectInfo> = {
  still: { name: 'Parado', glyph: '▢' },
  'zoom-in': { name: 'Zoom in', glyph: '⊕' },
  'zoom-out': { name: 'Zoom out', glyph: '⊖' },
  shake: { name: 'Tremer', glyph: '〰' },
  pan: { name: 'Deslizar', glyph: '↔' },
}

export const TRANSITION_INFO: Record<Transition, EffectInfo> = {
  cut: { name: 'Corte seco', glyph: '│' },
  flash: { name: 'Flash branco', glyph: '⚡' },
  'flash-black': { name: 'Flash preto', glyph: '◼' },
  shake: { name: 'Tremida', glyph: '〰' },
  zoom: { name: 'Zoom rápido', glyph: '⊕' },
}

export const EFFECT_INFO: Record<Effect, EffectInfo> = {
  none: { name: 'Nada', glyph: '∅' },
  circle: { name: 'Círculo', glyph: '◯' },
  arrow: { name: 'Seta', glyph: '➜' },
  cross: { name: 'X', glyph: '✕' },
  // a reação é a figurinha, que tem o botão dela; aqui só aparece como o que a IA fez
  emoji: { name: 'reação', glyph: '😮' },
}

export interface RowOption {
  value: string
  name: string
  glyph?: string
}

interface Props {
  label: string
  options: RowOption[]
  /** O que o usuário escolheu (undefined = Auto, o que a IA fez). */
  chosen?: string
  /** O que o Auto faz nesta cena, ex.: "zoom in". */
  autoText: string
  /** Prévia no player (ADR 0037, 4A): o valor sob o mouse; null = Auto; undefined = parou. */
  onTrial: (value: string | null | undefined) => void
  onPick: (value: string | null) => void
  /** Leva a escolha para todas as cenas; só aparece quando há escolha. */
  onAll: () => void
  /** Em vez das opções, um aviso (ex.: a primeira cena não tem transição). */
  disabledText?: string
  /** Pisca a linha (o ícone de transição da faixa leva até ela). */
  flash?: boolean
}

/**
 * Um efeito da cena com as opções à vista (ADR 0037, adendo): o Auto e as opções lado a lado.
 * Passar o mouse toca a cena com a opção no player; um clique aplica nesta cena.
 */
export function EffectRow({ label, options, chosen, autoText, onTrial, onPick, onAll, disabledText, flash }: Props) {
  return (
    <div className={`er ${flash ? 'flash' : ''}`} role="radiogroup" aria-label={label} onMouseLeave={() => onTrial(undefined)}>
      <span className="er-label">{label}</span>
      {disabledText ? (
        <span className="er-off">{disabledText}</span>
      ) : (
        <>
          <Chip on={chosen === undefined} onPick={() => onPick(null)} onHover={() => onTrial(null)}>
            ✨ Auto · {autoText}
          </Chip>
          {options.map(o => (
            <Chip key={o.value} on={chosen === o.value} onPick={() => onPick(o.value)} onHover={() => onTrial(o.value)}>
              {o.glyph && <span aria-hidden>{o.glyph} </span>}
              {o.name}
            </Chip>
          ))}
          {chosen !== undefined && (
            <button className="er-all" onClick={onAll} title="Usa esta escolha em todas as cenas">
              ⇉ usar em todas as cenas
            </button>
          )}
        </>
      )}
    </div>
  )
}

function Chip({ on, onPick, onHover, children }: { on: boolean; onPick: () => void; onHover: () => void; children: ReactNode }) {
  return (
    <button role="radio" aria-checked={on} className={`er-chip ${on ? 'on' : ''}`} onClick={onPick} onMouseEnter={onHover} onFocus={onHover}>
      {children}
    </button>
  )
}
