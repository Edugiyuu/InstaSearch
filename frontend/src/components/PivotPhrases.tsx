import { useEffect, useRef, useState } from 'react'
import { errorMessage, shortsApi, type PivotConfig } from '../api/shorts'
import { Spinner } from './flow'
import './PivotPhrases.css'

/**
 * As frases da virada (ADR 0039): as do usuário, que o roteiro usa uma por vídeo como foram escritas, e as
 * sugestões da IA, que só entram na lista quando ele aprova ("+ usar"). Cada mudança já é salva.
 */
export function PivotPhrases({ config, onChange, onClose }: { config: PivotConfig; onChange: (c: PivotConfig) => void; onClose: () => void }) {
  const [draft, setDraft] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const save = async (phrases: string[]) => {
    setError(null)
    try {
      onChange(await shortsApi.updatePivotConfig({ phrases }))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const add = (phrase: string) => {
    const text = phrase.trim()
    if (!text) return
    void save([...config.phrases, text])
    setSuggestions(list => list.filter(s => s !== phrase))
  }

  // sem nenhuma frase ainda, as sugestões já vêm ao abrir: escolher é mais fácil que escrever do zero
  const autoSuggested = useRef(false)
  useEffect(() => {
    if (autoSuggested.current || config.phrases.length > 0) return
    autoSuggested.current = true
    void suggest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const suggest = async () => {
    setSuggesting(true)
    setError(null)
    try {
      setSuggestions((await shortsApi.suggestPivotPhrases()).phrases)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSuggesting(false)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pp" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        <h2>Frases da virada</h2>
        <p className="meta">
          O roteiro usa uma por vídeo, logo depois do gancho, antes de explicar. Funciona quando é curta (até uns 2 s falada), serve para
          qualquer tema e promete a explicação.
        </p>

        <span className="label">Suas frases · em rodízio, sem repetir a do último vídeo</span>
        <ul className="pp-list">
          {config.phrases.map(p => (
            <li key={p}>
              <span>{p}</span>
              <button className="pp-x" title="Tirar" onClick={() => save(config.phrases.filter(x => x !== p))}>✕</button>
            </li>
          ))}
          {config.phrases.length === 0 && <li className="pp-empty">Nenhuma ainda: sem frase, o roteiro não tem virada.</li>}
        </ul>
        <form
          className="pp-add"
          onSubmit={e => {
            e.preventDefault()
            add(draft)
            setDraft('')
          }}
        >
          <input className="field" value={draft} maxLength={80} placeholder="Escrever uma frase sua…" onChange={e => setDraft(e.target.value)} />
          <button className="btn-g" disabled={!draft.trim()}>Adicionar</button>
        </form>

        <div className="pp-suggest-row">
          <button className="btn-y" onClick={suggest} disabled={suggesting}>
            {suggesting ? <Spinner /> : '✨'} Sugerir 5 frases
          </button>
          <span className="meta">no tom do canal, sem repetir as de cima</span>
        </div>
        {suggestions.length > 0 && (
          <>
            <span className="label">Sugestões da IA · você escolhe</span>
            <ul className="pp-list pp-suggestions">
              {suggestions.map(s => (
                <li key={s}>
                  <span>{s}</span>
                  <button className="pp-use" onClick={() => add(s)}>+ usar</button>
                </li>
              ))}
            </ul>
          </>
        )}
        {error && <p className="form-error">{error}</p>}
        <p className="meta pp-foot">A frase entra no texto como foi escrita: é a sua marca. A IA só escolhe qual, e a revisão do roteiro confere que ela está lá.</p>
      </div>
    </div>
  )
}
