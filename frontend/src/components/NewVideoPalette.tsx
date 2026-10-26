import { KeyboardEvent, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Idea, ideasApi } from '../api/ideas'
import { errorMessage, PACE_LABEL, shortsApi } from '../api/shorts'
import { Spinner, StyleThumb } from './flow'
import ToneEditor from './ToneEditor'
import { useProjects, useStyles, useTones } from '../hooks/useShorts'
import { useIdeas } from '../hooks/useIdeas'
import './NewVideoPalette.css'

const DURATIONS = [15, 20, 30, 40]
/** Quantas ideias aparecem como atalho (ADR 0021). */
const IDEA_SHORTCUTS = 4

type Picker = 'estilo' | 'duracao' | 'tom' | null

/** O que chega pela URL (/novo?tema=…&estilo=…): Ideias, Estilos e o Início abrem a paleta já preenchida. */
export interface PaletteStart {
  tema?: string
  estilo?: string
  tom?: string
  duracao?: string
  ideia?: string
}

/**
 * Novo vídeo como paleta (ADR 0038): o tema, o estilo, a duração e o tom numa caixa só.
 * Enter escreve o roteiro; Shift Enter faz tudo sozinho (ADR 0026), que só existe a partir de uma ideia.
 */
function NewVideoPalette({ start, onClose }: { start: PaletteStart; onClose: () => void }) {
  const navigate = useNavigate()
  const { styles } = useStyles()
  const { tones, setTones } = useTones()
  const { ideas } = useIdeas()
  const { projects } = useProjects()
  const [theme, setTheme] = useState(start.tema ?? '')
  const [styleId, setStyleId] = useState(start.estilo ?? '')
  const [toneId, setToneId] = useState(start.tom ?? '')
  const [duration, setDuration] = useState(DURATIONS.includes(Number(start.duracao)) ? Number(start.duracao) : 0)
  // a ideia de onde o vídeo veio: vira "feita" quando o projeto nasce
  const [ideaId, setIdeaId] = useState(start.ideia ?? null)
  const [hasNarration, setHasNarration] = useState(false)
  const [narration, setNarration] = useState('')
  const [picker, setPicker] = useState<Picker>(null)
  const [creatingTone, setCreatingTone] = useState(false)
  const [busy, setBusy] = useState<'roteiro' | 'sozinho' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // sem nada na URL, o padrão é o do último vídeo; sem vídeos, o do app
  const last = projects.reduce<(typeof projects)[number] | undefined>((a, p) => (!a || p.createdAt > a.createdAt ? p : a), undefined)
  const style = styles.find(s => s.id === (styleId || last?.styleId)) ?? styles.find(s => s.id === 'comentario-anime') ?? styles[0]
  const tone = tones.find(t => t.id === (toneId || last?.toneId)) ?? tones.find(t => t.id === 'polemico') ?? tones[0]
  const seconds = duration || (last && DURATIONS.includes(last.duration) ? last.duration : 30)

  const shortcuts = ideas.filter(i => i.status === 'nova' || i.status === 'guardada').slice(0, IDEA_SHORTCUTS)
  const canWrite = hasNarration ? narration.trim().split(/\s+/).length >= 8 : theme.trim().length > 3

  useEffect(() => {
    input.current?.focus()
  }, [])

  // Esc fecha; com o editor de tom aberto, o Esc é dele
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && !creatingTone && !busy && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [creatingTone, busy, onClose])

  const pickIdea = (idea: Idea) => {
    setTheme(idea.theme)
    setStyleId(idea.styleId)
    setToneId(idea.toneId)
    setDuration(DURATIONS.includes(idea.duration) ? idea.duration : 30)
    setIdeaId(idea.id)
    setHasNarration(false)
    input.current?.focus()
  }

  const write = async () => {
    if (!canWrite || busy || !style || !tone) return
    setBusy('roteiro')
    setError(null)
    try {
      const project = await shortsApi.createProject({
        theme: theme.trim(),
        styleId: style.id,
        duration: seconds,
        toneId: tone.id,
        narration: hasNarration ? narration : undefined,
      })
      // se a ideia não for marcada, o projeto continua valendo: não trava a criação
      if (ideaId) await ideasApi.update(ideaId, { status: 'feita', projectId: project.id }).catch(() => undefined)
      navigate(`/projeto/${project.id}/roteiro`)
    } catch (e) {
      setError(errorMessage(e))
      setBusy(null)
    }
  }

  // o criar sozinho segue o estilo, o tom e a duração da própria ideia; o andamento fica em Ideias
  const alone = async () => {
    if (!ideaId || busy) return
    setBusy('sozinho')
    setError(null)
    try {
      await shortsApi.startAutopilot(ideaId)
      navigate('/ideias')
    } catch (e) {
      setError(errorMessage(e))
      setBusy(null)
    }
  }

  const onEnter = (e: KeyboardEvent) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (e.shiftKey) alone()
    else write()
  }

  const toggle = (p: Picker) => setPicker(cur => (cur === p ? null : p))

  return (
    <div className="overlay palette-overlay" onClick={() => !busy && !creatingTone && onClose()}>
      <div className="palette" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Novo vídeo">
        <div className="pl-top">
          {hasNarration ? (
            <textarea
              className="pl-narration"
              autoFocus
              rows={5}
              value={narration}
              onChange={e => setNarration(e.target.value)}
              placeholder="Cole aqui o que você vai falar. A IA só divide em cenas, sem mudar o texto."
            />
          ) : (
            <input
              ref={input}
              className="pl-theme"
              value={theme}
              onChange={e => {
                setTheme(e.target.value)
                // apagou o tema: o vídeo já não é aquela ideia
                if (ideaId && e.target.value.trim() === '') setIdeaId(null)
              }}
              onKeyDown={onEnter}
              placeholder="Sobre o que é o vídeo?"
            />
          )}
        </div>

        <div className="pl-section">
          <span className="label">Como vai ser</span>
          <div className="pl-tokens">
            <button className={`pl-token ${picker === 'estilo' ? 'on' : ''}`} onClick={() => toggle('estilo')}>
              <span>Estilo</span> {style?.name ?? '…'}
            </button>
            <button className={`pl-token ${picker === 'duracao' ? 'on' : ''}`} onClick={() => toggle('duracao')}>
              <span>Duração</span> {seconds}s
            </button>
            <button className={`pl-token ${picker === 'tom' ? 'on' : ''}`} onClick={() => toggle('tom')}>
              <span>Tom</span> {tone?.name ?? '…'}
            </button>
            <button className={`pl-token ${hasNarration ? 'on' : ''}`} onClick={() => setHasNarration(v => !v)}>
              <span>Texto</span> {hasNarration ? 'o meu' : 'a IA escreve'}
            </button>
          </div>

          {picker === 'estilo' && (
            <div className="pl-styles">
              {styles.map(s => (
                <button key={s.id} className={`pl-style ${style?.id === s.id ? 'on' : ''}`} onClick={() => { setStyleId(s.id); setPicker(null) }}>
                  <StyleThumb style={s} size="sm" />
                  <strong>{s.name}</strong>
                </button>
              ))}
            </div>
          )}
          {picker === 'duracao' && (
            <div className="chips pl-picker">
              {DURATIONS.map(d => (
                <button key={d} className={`chip ${seconds === d ? 'on' : ''}`} onClick={() => { setDuration(d); setPicker(null) }}>
                  {d}s
                </button>
              ))}
            </div>
          )}
          {picker === 'tom' && (
            <div className="pl-picker">
              <div className="chips">
                {tones.map(t => (
                  <button key={t.id} className={`chip ${tone?.id === t.id ? 'on' : ''}`} onClick={() => { setToneId(t.id); setPicker(null) }} title={t.summary}>
                    {t.name}
                  </button>
                ))}
                <button className="chip" onClick={() => setCreatingTone(true)} title="Escreva um tom ou peça para a IA criar; ele fica na biblioteca">
                  + Novo tom
                </button>
              </div>
              <p className="meta">{tone?.summary}</p>
            </div>
          )}
          {!picker && style && <p className="meta pl-hint">{style.summary}</p>}
        </div>

        {shortcuts.length > 0 && !hasNarration && (
          <div className="pl-section">
            <span className="label">Ou use uma ideia</span>
            {shortcuts.map(idea => (
              <button key={idea.id} className={`pl-idea ${ideaId === idea.id ? 'on' : ''}`} onClick={() => pickIdea(idea)} title={idea.why}>
                <span className="pl-idea-mark">◎</span>
                {idea.theme}
              </button>
            ))}
          </div>
        )}

        {error && <p className="form-error">{error}</p>}

        <div className="pl-actions">
          <button className="btn-y btn-lg" disabled={!canWrite || !!busy} onClick={write}>
            {busy === 'roteiro' ? <><Spinner /> Escrevendo ({PACE_LABEL[style?.pace ?? 'normal'].toLowerCase()})…</> : hasNarration ? 'Dividir em cenas (Enter)' : 'Escrever o roteiro (Enter)'}
          </button>
          <button
            className="btn-g btn-lg"
            disabled={!ideaId || !!busy}
            onClick={alone}
            title={ideaId ? 'Roteiro, montagem e imagens sozinho; para em “falta gravar a voz”' : 'Escolha uma ideia: o fazer sozinho parte de uma ideia'}
          >
            {busy === 'sozinho' ? <><Spinner /> Começando…</> : 'Fazer tudo sozinho (Shift Enter)'}
          </button>
        </div>
        <p className="meta pl-foot">
          {ideaId ? 'Sozinho = roteiro, montagem e imagens; para em “falta gravar a voz”.' : 'O fazer sozinho parte de uma ideia: escolha uma acima.'} Esc fecha.
        </p>
      </div>

      {creatingTone && (
        <ToneEditor
          onClose={() => setCreatingTone(false)}
          onSaved={t => {
            setTones(list => [...list, t])
            setToneId(t.id)
            setCreatingTone(false)
            setPicker(null)
          }}
        />
      )}
    </div>
  )
}

export default NewVideoPalette
