import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUpcomingPosts } from '../services/api'
import type { Post } from '../types'
import { BoardColumn, boardStep, ShortProject, shortsApi } from '../api/shorts'
import { newVideoLink } from '../api/ideas'
import { ProjectCover, Spinner } from '../components/flow'
import { useLibrary, useProjects } from '../hooks/useShorts'
import { useIdeas } from '../hooks/useIdeas'
import './Board.css'

// Painel (ADR 0038): um quadro com as etapas, no lugar do Início e dos Projetos
const COLUMNS: { id: BoardColumn | 'ideias'; label: string; color: string }[] = [
  { id: 'ideias', label: 'Ideias', color: 'var(--accent)' },
  { id: 'roteiro', label: 'Roteiro', color: 'var(--muted)' },
  { id: 'voz', label: 'Falta voz', color: 'var(--warning)' },
  { id: 'revisar', label: 'Revisar', color: 'var(--danger)' },
  { id: 'agendado', label: 'Agendado', color: 'var(--scheduled)' },
  { id: 'publicado', label: 'Publicado', color: 'var(--success)' },
]

/** Quantas ideias e quantos publicados aparecem antes do "ver todos". */
const IDEAS_SHOWN = 4
const PUBLISHED_SHOWN = 6

const WEEKDAY = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function formatSlot(iso: string) {
  const d = new Date(iso)
  return `${WEEKDAY[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Board() {
  const { projects, loading, error, reload } = useProjects()
  const { byId } = useLibrary()
  const { ideas } = useIdeas()
  const [query, setQuery] = useState('')
  const [upcoming, setUpcoming] = useState<Post | null>(null)
  const [allPublished, setAllPublished] = useState(false)

  useEffect(() => {
    getUpcomingPosts(1)
      .then(list => setUpcoming(list[0] ?? null))
      .catch(() => setUpcoming(null))
  }, [])

  // os projetos de cada coluna, já filtrados pela busca
  const byColumn = useMemo(() => {
    const q = query.trim().toLowerCase()
    const groups = new Map<BoardColumn, { project: ShortProject; step: ReturnType<typeof boardStep> }[]>()
    for (const project of projects) {
      if (q && !`${project.title} ${project.theme}`.toLowerCase().includes(q)) continue
      const step = boardStep(project)
      groups.set(step.column, [...(groups.get(step.column) ?? []), { project, step }])
    }
    return groups
  }, [projects, query])

  const openIdeas = ideas.filter(i => i.status === 'nova' || i.status === 'guardada')

  const remove = async (p: ShortProject) => {
    if (!confirm(`Apagar “${p.title}”? As imagens continuam na biblioteca.`)) return
    await shortsApi.deleteProject(p.id)
    reload()
  }

  return (
    <div className="page board">
      <div className="board-head">
        <h1 className="page-title">Painel</h1>
        {/* abre a paleta de novo vídeo (ADR 0038) */}
        <Link to="/novo" className="board-create">
          <span className="board-create-plus">+</span>
          <span className="board-create-text">Novo vídeo: escreva o tema</span>
          <kbd>Ctrl K</kbd>
        </Link>
        <input className="field board-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar vídeo" />
        <span className="spacer" />
        {upcoming && (
          <Link to="/calendario" className="board-next">
            <span>Próxima publicação</span>
            <strong>{formatSlot(upcoming.scheduledFor)}</strong>
          </Link>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <Spinner />
      ) : (
        <div className="board-cols">
          {COLUMNS.map(col => {
            const items = col.id === 'ideias' ? [] : byColumn.get(col.id) ?? []
            const count = col.id === 'ideias' ? openIdeas.length : items.length
            const shown = col.id === 'publicado' && !allPublished && !query ? items.slice(0, PUBLISHED_SHOWN) : items
            return (
              <section key={col.id} className="board-col">
                <h2 className="board-col-head">
                  <span className="board-dot" style={{ background: col.color }} />
                  {col.label}
                  <span className="board-count">{count}</span>
                </h2>

                <div className="board-list">
                  {col.id === 'ideias' && (
                    <>
                      {openIdeas.slice(0, IDEAS_SHOWN).map(idea => (
                        <div key={idea.id} className="board-card board-idea">
                          <strong>{idea.theme}</strong>
                          <span className="board-sub">{idea.why}</span>
                          <Link to={newVideoLink(idea)} className="btn-y board-act">Criar →</Link>
                        </div>
                      ))}
                      <Link to="/ideias" className="board-more">
                        {openIdeas.length ? `Ver todas as ideias →` : 'Gerar ideias →'}
                      </Link>
                    </>
                  )}

                  {shown.map(({ project: p, step }) => (
                    <div key={p.id} className="board-card">
                      <div className="board-card-top">
                        <Link to={step.action.to} className="board-cover">
                          <ProjectCover project={p} images={byId} />
                        </Link>
                        <div className="board-card-info">
                          <Link to={step.action.to} className="board-title">{p.title}</Link>
                          <span className={`board-sub ${step.cls}`}>{step.text}</span>
                        </div>
                        <button className="board-delete" onClick={() => remove(p)} title="Apagar">✕</button>
                      </div>
                      <Link to={step.action.to} className={`${step.action.primary ? 'btn-y' : 'btn-g'} board-act`}>
                        {step.action.label} →
                      </Link>
                    </div>
                  ))}

                  {col.id !== 'ideias' && items.length === 0 && <p className="board-empty">Nada aqui.</p>}
                  {shown.length < items.length && (
                    <button className="board-more" onClick={() => setAllPublished(true)}>
                      Ver mais {items.length - shown.length} →
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Board
