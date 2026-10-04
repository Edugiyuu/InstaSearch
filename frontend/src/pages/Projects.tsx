import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { beatsNeedingImage, projectHome, projectStatus, ShortProject, shortsApi } from '../api/shorts'
import { ProjectCover, Spinner } from '../components/flow'
import { useLibrary, useProjects, useStyles } from '../hooks/useShorts'
import './Projects.css'

type Filter = 'todos' | 'roteiro' | 'imagens' | 'prontos' | 'salvos' | 'publicados'

const FILTERS: { id: Filter; label: string; test: (p: ShortProject) => boolean }[] = [
  { id: 'todos', label: 'Todos', test: () => true },
  { id: 'roteiro', label: 'No roteiro', test: p => p.status === 'roteiro' },
  { id: 'imagens', label: 'Faltam imagens', test: p => p.status === 'revisao' && beatsNeedingImage(p).length > 0 },
  { id: 'prontos', label: 'Prontos', test: p => p.status === 'revisao' && beatsNeedingImage(p).length === 0 },
  { id: 'salvos', label: 'Salvos', test: p => p.status === 'salvo' },
  { id: 'publicados', label: 'Publicados', test: p => p.status === 'publicado' || p.status === 'agendado' },
]

function Projects() {
  const { projects, loading, error, reload } = useProjects()
  const { byId } = useLibrary()
  const { styles } = useStyles()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('todos')

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const test = FILTERS.find(f => f.id === filter)!.test
    return projects.filter(p => test(p) && (!q || `${p.title} ${p.theme}`.toLowerCase().includes(q)))
  }, [projects, query, filter])

  const remove = async (p: ShortProject) => {
    if (!confirm(`Apagar “${p.title}”? As imagens continuam na biblioteca.`)) return
    await shortsApi.deleteProject(p.id)
    reload()
  }

  return (
    <div className="page projects">
      <div className="page-head">
        <h1 className="page-title">Projetos</h1>
        <input className="field pj-search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar pelo tema" />
        <span className="spacer" />
        <Link to="/novo" className="btn-y">+ Novo vídeo</Link>
      </div>

      <div className="filter-tabs">
        {FILTERS.map(f => (
          <button key={f.id} className={`filter-tab ${filter === f.id ? 'on' : ''}`} onClick={() => setFilter(f.id)}>
            {f.label} <span className="c-muted">{projects.filter(f.test).length}</span>
          </button>
        ))}
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <p className="c-muted">{projects.length ? 'Nada com esse filtro.' : 'Nenhum vídeo ainda.'}</p>
      ) : (
        <div className="pj-grid">
          {visible.map(p => {
            const st = projectStatus(p)
            return (
              <div key={p.id} className="pj-card">
                <Link to={projectHome(p)}>
                  <ProjectCover project={p} images={byId} />
                </Link>
                <Link to={projectHome(p)} className="pj-title">{p.title}</Link>
                <span className={`status ${st.cls}`}>{st.text}</span>
                <span className="meta">
                  {styles.find(s => s.id === p.styleId)?.name ?? p.styleId} · {Math.round(p.audioDuration || p.duration)}s ·{' '}
                  {new Date(p.updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                </span>
                <button className="pj-delete" onClick={() => remove(p)} title="Apagar">✕</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Projects
