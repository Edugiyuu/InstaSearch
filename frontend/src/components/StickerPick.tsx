import { imageUrl, LibraryImage } from '../api/shorts'
import { ScenePick } from './ScenePick'
import './StickerPick.css'

/** 'auto' = a montagem escolhe; null = nenhuma; ou o id de uma figurinha. */
export type StickerChoice = 'auto' | null | string

interface Props {
  /** Figurinhas da biblioteca. */
  stickers: LibraryImage[]
  /** A figurinha que a cena mostra agora. */
  current?: LibraryImage
  /** A escolha foi feita na cena (senão, é o automático). */
  locked: boolean
  /** Do que o vídeo e a cena falam (obra, personagens): as figurinhas que combinam vêm primeiro. */
  context: string
  onChange: (choice: StickerChoice) => void
}

const words = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w.length >= 3)

/**
 * Pop-up "Figurinha" da cena (ADR 0022, 2C): o automático, nenhuma e as figurinhas da biblioteca,
 * cada uma com a miniatura. A escolhida aparece mesmo numa cena sem reação.
 */
export function StickerPick({ stickers, current, locked, context, onChange }: Props) {
  const wanted = new Set(words(context))
  const score = (s: LibraryImage) => words(`${s.name} ${s.characters.join(' ')} ${s.tags.join(' ')}`).filter(w => wanted.has(w)).length
  // estável: entre as que empatam, a ordem da biblioteca
  const sorted = stickers.map((s, i) => ({ s, i, n: score(s) })).sort((a, b) => b.n - a.n || a.i - b.i).map(x => x.s)

  const label = locked ? current?.name ?? 'Nenhuma' : `Auto · ${current?.name ?? 'nenhuma'}`
  const pick = (choice: StickerChoice, close: () => void) => {
    onChange(choice)
    close()
  }

  return (
    <ScenePick label={`😮 ${label}`} title="Figurinha desta cena" className="stk-pick">
      {close => (
        <div className="stk-grid" role="radiogroup" aria-label="Figurinha desta cena">
          <button role="radio" aria-checked={!locked} className={`stk-opt ${!locked ? 'on' : ''}`} onClick={() => pick('auto', close)}>
            <span className="stk-thumb checker">
              {!locked && current ? <img src={imageUrl(current)} alt="" /> : <span className="stk-icon">✨</span>}
            </span>
            <span>Automático{!locked ? ` (${current?.name ?? 'nenhuma'})` : ''}</span>
          </button>
          <button role="radio" aria-checked={locked && !current} className={`stk-opt ${locked && !current ? 'on' : ''}`} onClick={() => pick(null, close)}>
            <span className="stk-thumb">
              <span className="stk-icon">⊘</span>
            </span>
            <span>Nenhuma</span>
          </button>
          {sorted.map(s => {
            const on = locked && current?.id === s.id
            return (
              <button key={s.id} role="radio" aria-checked={on} className={`stk-opt ${on ? 'on' : ''}`} onClick={() => pick(s.id, close)} title={s.name}>
                <span className="stk-thumb checker">
                  <img src={imageUrl(s)} alt="" loading="lazy" />
                </span>
                <span className="stk-name">{s.name}</span>
              </button>
            )
          })}
        </div>
      )}
    </ScenePick>
  )
}
