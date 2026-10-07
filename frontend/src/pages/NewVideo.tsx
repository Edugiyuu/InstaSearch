import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Idea, ideasApi } from '../api/ideas'
import { errorMessage, PACE_LABEL, shortsApi } from '../api/shorts'
import { Spinner, Stepper, StyleThumb } from '../components/flow'
import ToneEditor from '../components/ToneEditor'
import { useStyles, useTones } from '../hooks/useShorts'
import './NewVideo.css'

const DURATIONS = [15, 20, 30, 40]
/** Quantas ideias guardadas aparecem como atalho (ADR 0021). */
const IDEA_SHORTCUTS = 3

const durationParam = (value: string | null) => (DURATIONS.includes(Number(value)) ? Number(value) : 30)

function NewVideo() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { styles } = useStyles()
  const [theme, setTheme] = useState(params.get('tema') ?? '')
  const [styleId, setStyleId] = useState(params.get('estilo') ?? 'comentario-anime')
  const [duration, setDuration] = useState(durationParam(params.get('duracao')))
  // tons da biblioteca (ADR 0019); o "Polêmico" embutido é o padrão
  const { tones, setTones } = useTones()
  const [toneId, setToneId] = useState(params.get('tom') ?? 'polemico')
  // a ideia de onde o vídeo veio (tela Ideias): vira "feita" quando o projeto nasce
  const [ideaId, setIdeaId] = useState(params.get('ideia'))
  const [savedIdeas, setSavedIdeas] = useState<Idea[]>([])
  const [creatingTone, setCreatingTone] = useState(false)
  const [hasNarration, setHasNarration] = useState(false)
  const [narration, setNarration] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ideasApi
      .list()
      .then(list => setSavedIdeas(list.filter(i => i.status === 'guardada').slice(0, IDEA_SHORTCUTS)))
      .catch(() => setSavedIdeas([]))
  }, [])

  const pickIdea = (idea: Idea) => {
    setTheme(idea.theme)
    setStyleId(idea.styleId)
    setToneId(idea.toneId)
    setDuration(DURATIONS.includes(idea.duration) ? idea.duration : 30)
    setIdeaId(idea.id)
  }

  const canContinue = hasNarration ? narration.trim().split(/\s+/).length >= 8 : theme.trim().length > 3

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const project = await shortsApi.createProject({
        theme: theme.trim(),
        styleId,
        duration,
        toneId,
        narration: hasNarration ? narration : undefined,
      })
      // se a ideia não for marcada, o projeto continua valendo: não trava a criação
      if (ideaId) await ideasApi.update(ideaId, { status: 'feita', projectId: project.id }).catch(() => undefined)
      navigate(`/projeto/${project.id}/roteiro`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }

  return (
    <div className="page newvideo">
      <Stepper current={1} />
      <h1 className="page-title">Sobre o que é o vídeo?</h1>

      {savedIdeas.length > 0 && (
        <div className="nv-ideas">
          <span className="meta">Das suas ideias:</span>
          {savedIdeas.map(idea => (
            <button key={idea.id} className={`chip ${ideaId === idea.id ? 'on' : ''}`} onClick={() => pickIdea(idea)} title={idea.why}>
              {idea.theme}
            </button>
          ))}
        </div>
      )}

      <input
        className="field nv-theme"
        autoFocus
        value={theme}
        onChange={e => {
          setTheme(e.target.value)
          // escreveu outro tema: o vídeo já não é aquela ideia
          if (ideaId && e.target.value.trim() === '') setIdeaId(null)
        }}
        onKeyDown={e => e.key === 'Enter' && canContinue && !busy && generate()}
        placeholder="Ex.: Por que o Luffy nunca mata ninguém em One Piece?"
      />

      <span className="label">Estilo</span>
      <div className="nv-styles">
        {styles.map(s => (
          <button key={s.id} className={`nv-style ${styleId === s.id ? 'on' : ''}`} onClick={() => setStyleId(s.id)}>
            <StyleThumb style={s} size="sm" />
            <strong>{s.name}</strong>
            <span>{s.summary}</span>
          </button>
        ))}
      </div>

      <div className="nv-options">
        <div>
          <span className="label">Duração</span>
          <div className="chips">
            {DURATIONS.map(d => (
              <button key={d} className={`chip ${duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>
                {d}s
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Tom</span>
          <div className="chips">
            {tones.map(t => (
              <button key={t.id} className={`chip ${toneId === t.id ? 'on' : ''}`} onClick={() => setToneId(t.id)} title={t.summary}>
                {t.name}
              </button>
            ))}
            <button className="chip" onClick={() => setCreatingTone(true)} title="Escreva um tom ou peça para a IA criar; ele fica na biblioteca">
              + Novo tom
            </button>
          </div>
          <p className="meta nv-tone-hint">{tones.find(t => t.id === toneId)?.summary}</p>
          {creatingTone && (
            <ToneEditor
              onClose={() => setCreatingTone(false)}
              onSaved={t => {
                setTones(list => [...list, t])
                setToneId(t.id)
                setCreatingTone(false)
              }}
            />
          )}
        </div>
      </div>

      <label className="nv-has-narration">
        <input type="checkbox" checked={hasNarration} onChange={e => setHasNarration(e.target.checked)} />
        Já tenho o texto da narração
      </label>
      {hasNarration && (
        <textarea
          className="field nv-narration"
          rows={5}
          value={narration}
          onChange={e => setNarration(e.target.value)}
          placeholder="Cole aqui o que você vai falar. A IA só divide em cenas, sem mudar o texto."
        />
      )}

      {error && <p className="form-error">{error}</p>}

      <div className="nv-footer">
        {busy && (
          <span className="nv-busy">
            <Spinner /> Escrevendo o roteiro e dividindo em cenas ({PACE_LABEL[styles.find(s => s.id === styleId)?.pace ?? 'normal'].toLowerCase()})…
          </span>
        )}
        <button className="btn-y btn-lg" disabled={!canContinue || busy} onClick={generate}>
          {busy ? 'Gerando…' : hasNarration ? 'Dividir em cenas →' : 'Gerar roteiro →'}
        </button>
      </div>
    </div>
  )
}

export default NewVideo
