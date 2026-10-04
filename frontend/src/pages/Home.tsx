import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getUpcomingPosts } from '../services/api'
import type { Post } from '../types'
import { projectHome, projectStatus } from '../api/shorts'
import { ProjectCover } from '../components/flow'
import { useLibrary, useProjects, useStyles } from '../hooks/useShorts'
import './Home.css'

const WEEKDAY = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

function formatSlot(iso: string) {
  const d = new Date(iso)
  return `${WEEKDAY[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function Home() {
  const navigate = useNavigate()
  const { styles } = useStyles()
  const { projects, loading } = useProjects()
  const { images, byId } = useLibrary()
  const [theme, setTheme] = useState('')
  const [styleId, setStyleId] = useState('comentario-anime')
  const [upcoming, setUpcoming] = useState<Post[] | null>(null)

  useEffect(() => {
    getUpcomingPosts(3).then(setUpcoming).catch(() => setUpcoming([]))
  }, [])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    navigate(`/novo?tema=${encodeURIComponent(theme.trim())}&estilo=${styleId}`)
  }

  const characters = useMemo(() => {
    const count = new Map<string, number>()
    images.forEach(i => i.characters.forEach(c => count.set(c, (count.get(c) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4)
  }, [images])

  const unused = images.filter(i => i.usedIn.length === 0).length
  const stickerCount = images.filter(i => i.kind === 'figurinha').length

  return (
    <div className="page home">
      <h1 className="page-title">O que vamos criar hoje?</h1>

      <form className="panel home-quick" onSubmit={submit}>
        <input
          className="field"
          value={theme}
          onChange={e => setTheme(e.target.value)}
          placeholder="Tema do próximo vídeo. Ex.: Por que o Luffy nunca mata ninguém?"
        />
        <select className="field home-style" value={styleId} onChange={e => setStyleId(e.target.value)}>
          {styles.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button className="btn-y home-go" type="submit">Começar →</button>
      </form>

      <div className="home-section-head">
        <h2>Seus vídeos</h2>
        {projects.length > 0 && <Link to="/projetos" className="act">Ver todos →</Link>}
      </div>

      {!loading && projects.length === 0 ? (
        <p className="home-empty">Nenhum vídeo ainda. Escreva um tema acima e a IA faz o roteiro.</p>
      ) : (
        <div className="home-projects">
          {projects.slice(0, 4).map(p => {
            const st = projectStatus(p)
            return (
              <Link key={p.id} to={projectHome(p)} className="home-card">
                <ProjectCover project={p} images={byId} />
                <h3>{p.title}</h3>
                <span className={`status ${st.cls}`}>{st.text}</span>
              </Link>
            )
          })}
        </div>
      )}

      <div className="home-bottom">
        <Link to="/biblioteca" className="panel panel-pad home-lib">
          <h2 className="panel-title">Sua biblioteca</h2>
          <div className="home-lib-count">{images.length - stickerCount}</div>
          <p className="c-muted">
            imagens{images.length > 0 && ` · ${unused} nunca usadas`}
            {stickerCount > 0 && ` · ${stickerCount} figurinhas`}
          </p>
          {characters.length > 0 && (
            <p className="home-lib-chars">
              {characters.map(([c, n]) => (
                <span key={c}>{c} {n}</span>
              ))}
            </p>
          )}
          {images.length < 30 && (
            <p className="meta home-lib-tip">
              Quanto mais imagens, menos cenas ficam faltando. Importe prints e painéis dos animes que você comenta.
            </p>
          )}
        </Link>

        <section className="panel panel-pad home-upcoming">
          <h2 className="panel-title">Próximas publicações</h2>
          <div className="home-slots">
            {upcoming?.length === 0 && <p className="c-muted">Nada agendado.</p>}
            {upcoming?.map(post => (
              <div key={post.id} className="home-slot">
                <strong>{formatSlot(post.scheduledFor)}</strong>
                <span>{post.caption.split('\n')[0].slice(0, 60)}</span>
              </div>
            ))}
          </div>
          <Link to="/calendario" className="act">Abrir calendário →</Link>
        </section>
      </div>
    </div>
  )
}

export default Home
