import { useState } from 'react'
import { errorMessage, shortsApi, Tone } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import ToneEditor from '../components/ToneEditor'
import { useTones } from '../hooks/useShorts'

const origin = (t: Tone) => (t.builtIn ? 'vem com o app' : t.createdBy === 'ia' ? 'sugerido pela IA' : 'escrito por você')

/**
 * Tons do roteiro (ADR 0019): como a narração fala e argumenta. Os embutidos não mudam
 * (editar cria uma cópia); os seus podem ser editados e apagados.
 */
function ToneLibrary() {
  const { tones, setTones, loaded, error } = useTones()
  const toast = useToast()
  // undefined = fechado; null = criando um novo
  const [editing, setEditing] = useState<Tone | null | undefined>(undefined)

  const saved = (tone: Tone) => {
    setTones(list => (list.some(t => t.id === tone.id) ? list.map(t => (t.id === tone.id ? tone : t)) : [...list, tone]))
    setEditing(undefined)
    toast.show(`Tom “${tone.name}” salvo na biblioteca`)
  }

  const remove = async (tone: Tone) => {
    if (!confirm(`Apagar o tom “${tone.name}”? Os vídeos que já usaram continuam com ele.`)) return
    try {
      await shortsApi.deleteTone(tone.id)
      setTones(list => list.filter(t => t.id !== tone.id))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  if (!loaded) return <Spinner />
  if (error) return <p className="form-error">{error}</p>

  return (
    <div className="tone-lib">
      <p className="lib-hint">
        O tom diz como a narração fala e argumenta. Ele é escolhido no Novo vídeo; cada vídeo guarda uma cópia, então mudar um tom aqui não
        muda os vídeos que já usaram.
      </p>
      <div className="tone-grid">
        {tones.map(t => (
          <article key={t.id} className="panel tone-card">
            <header>
              <strong>{t.name}</strong>
              <span className="meta">{origin(t)}</span>
            </header>
            <p className="tone-summary">{t.summary}</p>
            <p className="tone-guide">{t.guide}</p>
            <div className="act-row">
              <button className="act" onClick={() => setEditing(t)}>{t.builtIn ? 'Duplicar e editar' : 'Editar'}</button>
              {!t.builtIn && <button className="act" onClick={() => remove(t)}>Apagar</button>}
            </div>
          </article>
        ))}
        <button className="panel tone-card tone-new" onClick={() => setEditing(null)}>
          <strong>+ Novo tom</strong>
          <span className="meta">Escreva à mão ou descreva para a IA criar</span>
        </button>
      </div>
      {editing !== undefined && <ToneEditor tone={editing ?? undefined} onSaved={saved} onClose={() => setEditing(undefined)} />}
      {toast.node}
    </div>
  )
}

export default ToneLibrary
