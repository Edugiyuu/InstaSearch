import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUpcomingPosts } from '../services/api'
import type { Post } from '../types'
import { BoardColumn, boardStep, ShortProject, shortsApi } from '../api/shorts'
import { ProjectCover, Spinner } from '../components/flow'
import { useLibrary, useProjects } from '../hooks/useShorts'
import './Board.css'

// Painel (ADR 0038): um quadro com as etapas, no lugar do Início e dos Projetos.
// Sem a coluna Ideias, a pedido do usuário: as ideias ficam em Ideias e nos atalhos da paleta
const COLUMNS: { id: BoardColumn; label: string; color: string }[] = [
  { id: 'roteiro', label: 'Roteiro', color: 'var(--muted)' },
  { id: 'voz', label: 'Falta voz', color: 'var(--warning)' },
  { id: 'revisar', label: 'Revisar', color: 'var(--danger)' },
  { id: 'agendado', label: 'Agendado', color: 'var(--scheduled)' },
  { id: 'publicado', label: 'Publicado', color: 'var(--success)' },
]

/** Quantos publicados aparecem antes do "Ver mais". */
const PUBLISHED_SHOWN = 6

const WEEKDAY = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function formatSlot(iso: string) {
  const d = new Date(iso)
  return `${WEEKDAY[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Board() {
  const { projects, loading, error, reload } = useProjects()
  const { byId } = useLibrary()
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
            const items = byColumn.get(col.id) ?? []
            const shown = col.id === 'publicado' && !allPublished && !query ? items.slice(0, PUBLISHED_SHOWN) : items
            return (
              <section key={col.id} className="board-col">
                <h2 className="board-col-head">
                  <span className="board-dot" style={{ background: col.color }} />
                  {col.label}
                  <span className="board-count">{items.length}</span>
                </h2>

                <div className="board-list">
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

                  {items.length === 0 && <p className="board-empty">Nada aqui.</p>}
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
