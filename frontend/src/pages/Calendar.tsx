import { useEffect, useMemo, useState } from 'react'
import { usePosts } from '../hooks/usePosts'
import { useContent } from '../hooks/useContent'
import ScheduleModal, { ScheduleData } from '../components/ScheduleModal'
import api from '../services/api'
import type { Post } from '../types'
import './Calendar.css'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const SUGGESTED_HOUR = { h: 19, m: 30 }

interface SchedulerStatus {
  running: boolean
  nextScheduled: string | null
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function postTitle(post: Post) {
  return post.caption.split('\n')[0].slice(0, 30) || 'Sem legenda'
}

function postDate(post: Post) {
  return new Date(post.status === 'published' && post.publishedAt ? post.publishedAt : post.scheduledFor)
}

function Calendar() {
  const { posts, loading, error, schedulePost, deletePost, refetch } = usePosts()
  const { content: contentList, fetchContent } = useContent()
  const [month, setMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [view, setView] = useState<'mes' | 'lista'>('mes')
  const [scheduler, setScheduler] = useState<SchedulerStatus | null>(null)
  const [openPost, setOpenPost] = useState<Post | null>(null)
  const [scheduleFor, setScheduleFor] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const fetchScheduler = () =>
    api
      .get('/scheduler/status')
      .then(({ data }) => setScheduler(data.data))
      .catch(() => setScheduler(null))

  useEffect(() => {
    fetchScheduler()
    fetchContent()
  }, [])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days = useMemo(() => {
    const start = new Date(month)
    start.setDate(1 - ((month.getDay() + 6) % 7)) // segunda-feira
    const last = new Date(month.getFullYear(), month.getMonth() + 1, 0)
    const cells: Date[] = []
    for (let d = new Date(start); d <= last || cells.length % 7 !== 0; d.setDate(d.getDate() + 1)) {
      cells.push(new Date(d))
    }
    return cells
  }, [month])

  // Primeiro fim de semana livre a partir de hoje: é onde aparece o horário sugerido.
  const suggestedDay = useMemo(
    () =>
      days.find(
        d => d >= today && [0, 5, 6].includes(d.getDay()) && !posts.some(p => sameDay(postDate(p), d)),
      ),
    [days, posts],
  )

  const handleSchedule = async (data: ScheduleData) => {
    await schedulePost(data)
    await refetch()
    fetchScheduler()
  }

  const publishNow = async (post: Post) => {
    setBusy(true)
    try {
      await api.post(`/scheduler/publish/${post.id}`)
      await refetch()
      setOpenPost(null)
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Erro ao publicar')
    } finally {
      setBusy(false)
    }
  }

  const cancel = async (post: Post) => {
    if (!confirm('Cancelar este agendamento?')) return
    setBusy(true)
    try {
      await deletePost(post.id)
      setOpenPost(null)
      fetchScheduler()
    } finally {
      setBusy(false)
    }
  }

  const openScheduleAt = (day: Date) => {
    const d = new Date(day)
    d.setHours(SUGGESTED_HOUR.h, SUGGESTED_HOUR.m, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    setScheduleFor(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
  }

  // Memoizado: o ScheduleModal reaplica initialData sempre que a referência muda.
  const scheduleInitial = useMemo(() => (scheduleFor ? { scheduledFor: scheduleFor } : undefined), [scheduleFor])

  const next = scheduler?.nextScheduled ? new Date(scheduler.nextScheduled) : null
  const sortedPosts = [...posts].sort((a, b) => postDate(a).getTime() - postDate(b).getTime())

  const chip = (post: Post) => {
    const d = postDate(post)
    if (post.status === 'published') return <>✓ {postTitle(post)}</>
    if (post.status === 'failed') return <>✕ Falhou · repetir</>
    if (post.status === 'publishing') return <>⟳ Publicando…</>
    return (
      <>
        {hhmm(d)} · {postTitle(post)}
      </>
    )
  }

  return (
    <div className="page cal">
      <h1 className="page-title">Calendário</h1>

      <div className="cal-bar">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
        <h2>{month.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(' de ', ' ')}</h2>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        <span className="spacer" />
        {scheduler ? (
          <span className={`status ${scheduler.running ? 'c-success' : 'c-danger'}`}>
            {scheduler.running ? 'Agendador ativo' : 'Agendador parado'}
            {next && (
              <>
                <span className="meta-sep" />
                próximo: {next.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}{' '}
                {hhmm(next)}
              </>
            )}
          </span>
        ) : (
          <span className="status c-muted">Agendador indisponível</span>
        )}
        <span className="cal-views">
          <button className={view === 'mes' ? 'on' : ''} onClick={() => setView('mes')}>
            Mês
          </button>
          <span>|</span>
          <button className={view === 'lista' ? 'on' : ''} onClick={() => setView('lista')}>
            Lista
          </button>
        </span>
      </div>

      {error && <p className="cal-error">Não deu para carregar os posts: {error}</p>}

      {view === 'mes' ? (
        <div className="cal-grid">
          {WEEKDAYS.map(w => (
            <span key={w} className="cal-weekday">
              {w}
            </span>
          ))}
          {days.map(day => {
            const dayPosts = posts.filter(p => sameDay(postDate(p), day))
            const isToday = sameDay(day, today)
            const outside = day.getMonth() !== month.getMonth()
            return (
              <div
                key={day.toISOString()}
                className={`cal-day ${isToday ? 'today' : ''} ${outside ? 'outside' : ''}`}
                onDoubleClick={() => day >= today && openScheduleAt(day)}
              >
                <span className="cal-num">{day.getDate()}</span>
                {dayPosts.map(post => (
                  <button key={post.id} className={`cal-post ${post.status}`} onClick={() => setOpenPost(post)}>
                    {chip(post)}
                  </button>
                ))}
                {suggestedDay && sameDay(day, suggestedDay) && (
                  <button className="cal-post suggested" onClick={() => openScheduleAt(day)}>
                    19:30 · sugerido ✨
                  </button>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="cal-list">
          {loading && <p className="c-muted">Carregando…</p>}
          {!loading && sortedPosts.length === 0 && <p className="c-muted">Nenhum post ainda.</p>}
          {sortedPosts.map(post => (
            <button key={post.id} className="panel cal-list-row" onClick={() => setOpenPost(post)}>
              <strong>
                {postDate(post).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}{' '}
                {hhmm(postDate(post))}
              </strong>
              <span>{postTitle(post)}</span>
              <span className={`cal-post ${post.status}`}>{chip(post)}</span>
            </button>
          ))}
        </div>
      )}

      <div className="cal-legend">
        <span className="status c-scheduled">Agendado</span>
        <span className="status c-success">Publicado</span>
        <span className="status c-danger">Falhou</span>
        <span className="c-muted">○ Horário sugerido pelos seus insights</span>
        <span className="c-muted">⚠ O backend precisa estar rodando no horário agendado</span>
        <span className="c-muted">· Clique duas vezes num dia para agendar</span>
      </div>

      {openPost && (
        <div className="overlay" onClick={() => setOpenPost(null)}>
          <div className="modal cal-modal" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpenPost(null)}>
              ✕
            </button>
            <span className={`cal-post ${openPost.status}`}>{chip(openPost)}</span>
            <p className="meta cal-modal-date">
              {postDate(openPost).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
            </p>
            <pre className="cal-modal-caption">{openPost.caption}</pre>
            {openPost.error && <p className="cal-error">{openPost.error}</p>}
            {openPost.metrics && (
              <p className="meta">
                {openPost.metrics.views} plays · {openPost.metrics.likes} curtidas · {openPost.metrics.saves} salvos
              </p>
            )}
            <div className="cal-modal-actions">
              {openPost.status === 'scheduled' && (
                <button className="btn-g" disabled={busy} onClick={() => cancel(openPost)}>
                  Cancelar agendamento
                </button>
              )}
              {(openPost.status === 'scheduled' || openPost.status === 'failed') && (
                <button className="btn-y" disabled={busy} onClick={() => publishNow(openPost)}>
                  {openPost.status === 'failed' ? 'Tentar de novo' : 'Publicar agora'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <ScheduleModal
        isOpen={scheduleFor !== null}
        onClose={() => setScheduleFor(null)}
        onSchedule={handleSchedule}
        initialData={scheduleInitial}
        contentList={contentList.filter(c => c.status === 'approved')}
      />
    </div>
  )
}

export default Calendar
