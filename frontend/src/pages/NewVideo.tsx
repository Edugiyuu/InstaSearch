import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage, PACE_LABEL, shortsApi } from '../api/shorts'
import { Spinner, Stepper, StyleThumb } from '../components/flow'
import { useStyles } from '../hooks/useShorts'
import './NewVideo.css'

const DURATIONS = [15, 20, 30, 40]
// tons que seguram gente em vídeo curto; o backend tem a instrução completa de cada um (TONE_GUIDE)
const TONES = [
  { name: 'Polêmico', hint: 'Opinião forte que divide e faz a pessoa comentar' },
  { name: 'Curioso', hint: 'Fato que pouca gente sabe, um detalhe surpreendente por cena' },
  { name: 'Mistério', hint: 'Promete uma resposta no começo e só revela no final' },
  { name: 'Papo reto', hint: 'Fala direto com quem assiste, como um amigo, sem enrolação' },
]

function NewVideo() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { styles } = useStyles()
  const [theme, setTheme] = useState(params.get('tema') ?? '')
  const [styleId, setStyleId] = useState(params.get('estilo') ?? 'comentario-anime')
  const [duration, setDuration] = useState(30)
  const [tone, setTone] = useState('Polêmico')
  const [hasNarration, setHasNarration] = useState(false)
  const [narration, setNarration] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canContinue = hasNarration ? narration.trim().split(/\s+/).length >= 8 : theme.trim().length > 3

  const generate = async () => {
    setBusy(true)
    setError(null)
    try {
      const project = await shortsApi.createProject({
        theme: theme.trim(),
        styleId,
        duration,
        tone,
        narration: hasNarration ? narration : undefined,
      })
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

      <input
        className="field nv-theme"
        autoFocus
        value={theme}
        onChange={e => setTheme(e.target.value)}
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
            {TONES.map(t => (
              <button key={t.name} className={`chip ${tone === t.name ? 'on' : ''}`} onClick={() => setTone(t.name)} title={t.hint}>
                {t.name}
              </button>
            ))}
          </div>
          <p className="meta nv-tone-hint">{TONES.find(t => t.name === tone)?.hint}</p>
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
