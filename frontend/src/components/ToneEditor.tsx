import { useEffect, useState } from 'react'
import { AiCredit, errorMessage, shortsApi, Tone } from '../api/shorts'
import { AiBadge, Spinner } from './flow'
import './ToneEditor.css'

interface Props {
  /** Tom a editar; sem ele, cria um novo. */
  tone?: Tone
  onSaved: (tone: Tone) => void
  onClose: () => void
}

/**
 * Criar ou editar um tom (ADR 0019). Dá para escrever à mão ou descrever para a IA, que sugere
 * nome, resumo e instrução; nada é salvo sem você revisar (ADR 0011).
 */
function ToneEditor({ tone, onSaved, onClose }: Props) {
  const [description, setDescription] = useState('')
  const [example, setExample] = useState('')
  const [name, setName] = useState(tone?.name ?? '')
  const [summary, setSummary] = useState(tone?.summary ?? '')
  const [guide, setGuide] = useState(tone?.guide ?? '')
  const [suggestedBy, setSuggestedBy] = useState<AiCredit | null>(null)
  const [busy, setBusy] = useState<'sugerindo' | 'salvando' | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const suggest = async () => {
    setBusy('sugerindo')
    setError(null)
    try {
      const out = await shortsApi.suggestTone(description, example || undefined)
      setName(out.name)
      setSummary(out.summary)
      setGuide(out.guide)
      setSuggestedBy(out.ai)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const save = async () => {
    setBusy('salvando')
    setError(null)
    try {
      // escrito pela IA só se a sugestão dela foi usada; editar depois continua valendo como dela
      const createdBy = suggestedBy ? 'ia' : (tone?.createdBy ?? 'usuario')
      onSaved(await shortsApi.saveTone({ ...tone, name, summary, guide, createdBy }))
    } catch (e) {
      setError(errorMessage(e))
      setBusy(null)
    }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal tone-editor" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        <h2 className="te-title">{tone ? `Editar “${tone.name}”` : 'Novo tom'}</h2>
        {tone?.builtIn && <p className="meta">Este tom vem com o app: salvar cria uma cópia sua, e o original continua igual.</p>}

        <section className="te-ai">
          <span className="label">✨ Descreva para a IA</span>
          <textarea
            className="field"
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Ex.: professor zoeiro que explica com comparações de futebol e termina com uma provocação"
          />
          <textarea
            className="field"
            rows={3}
            value={example}
            onChange={e => setExample(e.target.value)}
            placeholder="Opcional: cole um roteiro ou uma fala de que você gosta. A IA imita o jeito de falar, não o assunto."
          />
          <div className="te-ai-row">
            <button className="btn-g" onClick={suggest} disabled={!!busy || description.trim().length < 5}>
              {busy === 'sugerindo' ? <><Spinner /> Pensando no tom…</> : 'Sugerir tom'}
            </button>
            {suggestedBy && <AiBadge label="Sugerido por" ai={suggestedBy} compact />}
          </div>
        </section>

        <label className="label" htmlFor="te-name">Nome</label>
        <input id="te-name" className="field" value={name} onChange={e => setName(e.target.value)} maxLength={40} placeholder="Ex.: Professor zoeiro" />

        <label className="label" htmlFor="te-summary">Resumo (aparece no Novo vídeo)</label>
        <input id="te-summary" className="field" value={summary} onChange={e => setSummary(e.target.value)} maxLength={160} />

        <label className="label" htmlFor="te-guide">Como a IA deve falar</label>
        <textarea
          id="te-guide"
          className="field"
          rows={5}
          value={guide}
          onChange={e => setGuide(e.target.value)}
          maxLength={1200}
          placeholder="Como abrir, que palavras usar, tamanho das frases, como argumentar e como terminar."
        />

        {error && <p className="form-error">{error}</p>}
        <div className="te-actions">
          <button className="btn-o" onClick={onClose}>Cancelar</button>
          <button className="btn-y" onClick={save} disabled={!!busy || !name.trim() || !guide.trim()}>
            {busy === 'salvando' ? 'Salvando…' : 'Salvar na biblioteca'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ToneEditor
