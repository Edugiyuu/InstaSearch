import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { aiName, AssemblyLogEntry, errorMessage, ShortProject, shortsApi } from '../api/shorts'
import { Spinner, Stepper } from '../components/flow'
import './Assembly.css'

const STATUS_ICON = { match: '✓', similar: '≈', missing: '✕' }

/** 04b: a montagem roda sozinha; a tela só mostra o que a IA está decidindo. */
function Assembly() {
  const { id } = useParams()
  const navigate = useNavigate()
  const started = useRef(false)
  const [project, setProject] = useState<ShortProject | null>(null)
  const [log, setLog] = useState<AssemblyLogEntry[]>([])
  const [shown, setShown] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id || started.current) return
    started.current = true
    shortsApi
      .assemble(id)
      .then(r => {
        setProject(r.project)
        setLog(r.log)
      })
      .catch(e => setError(errorMessage(e)))
  }, [id])

  // revela as decisões uma a uma, rápido
  useEffect(() => {
    if (shown >= log.length) return
    const t = setTimeout(() => setShown(s => s + 1), 140)
    return () => clearTimeout(t)
  }, [shown, log.length])

  const done = project !== null && shown >= log.length
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => navigate(`/projeto/${id}`, { replace: true }), 1600)
    return () => clearTimeout(t)
  }, [done, id, navigate])

  const decisions = log.filter(l => l.beatId !== 'ia')
  const pickedBy = log.find(l => l.beatId === 'ia')?.ai
  const scriptBy = project?.ai?.script
  const missing = decisions.filter(l => l.status === 'missing').length
  const similar = decisions.filter(l => l.status === 'similar').length
  const effects = project?.beats.filter(b => b.effect !== 'none').length ?? 0
  const pct = project ? Math.round(40 + (60 * shown) / Math.max(1, log.length)) : 20

  const steps = [
    { label: scriptBy ? `Roteiro dividido em cenas (${aiName(scriptBy)})` : 'Roteiro dividido em cenas', state: 'done' },
    {
      label: project
        ? `Imagens: ${decisions.length - missing - similar} certas, ${similar} parecidas, ${missing} faltando${pickedBy ? ` (escolhidas por ${aiName(pickedBy)})` : ''}`
        : 'Procurando imagens na sua biblioteca',
      state: done ? 'done' : 'doing',
    },
    { label: project ? `${effects} efeitos (setas, X, emojis) e legendas` : 'Efeitos e legendas', state: done ? 'done' : 'todo' },
    {
      label: project?.audioFile ? `Cortes no tempo da sua voz (${project.audioDuration?.toFixed(0) ?? '?'}s)` : 'Sem áudio: tempo estimado pela fala',
      state: done ? 'done' : 'todo',
    },
  ]

  return (
    <div className="page assembly">
      <Stepper current={3} />
      <h1 className="page-title">Montando o vídeo…</h1>
      <p className="page-sub">Você não precisa fazer nada aqui. Quando terminar, a revisão abre sozinha.</p>

      {error ? (
        <p className="form-error">{error}</p>
      ) : (
        <div className="as-body">
          <ul className="as-steps">
            {steps.map(s => (
              <li key={s.label} className={s.state}>
                <span className="as-dot">{s.state === 'done' ? '✓' : s.state === 'doing' ? <Spinner /> : ''}</span>
                {s.label}
              </li>
            ))}
            <li className="as-progress">
              <div className="bar">
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="meta">{pct}%</span>
            </li>
          </ul>

          <section className="panel as-log">
            <span className="label">O que a IA está decidindo</span>
            <ul>
              {log.slice(0, shown).map(l => (
                <li key={l.beatId} className={`as-${l.status}`}>
                  <span>{STATUS_ICON[l.status]}</span>
                  {l.message}
                </li>
              ))}
              {!project && <li className="c-muted">Lendo as cenas…</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  )
}

export default Assembly
