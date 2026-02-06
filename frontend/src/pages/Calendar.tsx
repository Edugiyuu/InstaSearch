import { useEffect, useState } from 'react'
import { usePosts } from '../hooks/usePosts'
import { useContent } from '../hooks/useContent'
import ScheduleModal, { ScheduleData } from '../components/ScheduleModal'
import './Calendar.css'

type ViewMode = 'calendar' | 'list'

interface CalendarDay {
  date: Date
  isCurrentMonth: boolean
  isToday: boolean
  posts: any[]
}

function Calendar() {
  const { posts, loading, error, fetchUpcoming, schedulePost, deletePost, updatePost } = usePosts()
  const { content: contentList, fetchContent } = useContent()
  const [viewMode, setViewMode] = useState<ViewMode>('calendar')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedPost, setSelectedPost] = useState<any>(null)
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null)

  useEffect(() => {
    fetchUpcoming(50)
    fetchContent()
    fetchSchedulerStatus()
  }, [])

  const fetchSchedulerStatus = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/scheduler/status')
      const data = await response.json()
      if (data.success) {
        setSchedulerStatus(data.data)
      }
    } catch (err) {
      console.error('Erro ao buscar status do scheduler:', err)
    }
  }

  const handleSchedule = async (data: ScheduleData) => {
    try {
      await schedulePost(data)
      await fetchUpcoming(50)
      await fetchSchedulerStatus()
    } catch (err) {
      throw err
    }
  }

  const handlePublishNow = async (postId: string) => {
    if (!confirm('Deseja publicar este post agora?')) return

    try {
      const response = await fetch(`http://localhost:3000/api/scheduler/publish/${postId}`, {
        method: 'POST',
      })
      const data = await response.json()
      
      if (data.success) {
        alert('Post publicado com sucesso!')
        await fetchUpcoming(50)
      } else {
        alert('Erro ao publicar post')
      }
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro ao publicar post')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (!confirm('Deseja mesmo cancelar este agendamento?')) return

    try {
      await deletePost(postId)
      await fetchUpcoming(50)
      await fetchSchedulerStatus()
    } catch (err) {
      alert('Erro ao cancelar agendamento')
    }
  }

  // Gerar dias do calendário
  const generateCalendarDays = (): CalendarDay[] => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay()) // Começa no domingo
    
    const days: CalendarDay[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    for (let i = 0; i < 42; i++) { // 6 semanas
      const date = new Date(startDate)
      date.setDate(startDate.getDate() + i)
      
      const dayPosts = posts.filter(post => {
        const postDate = new Date(post.scheduledFor || post.publishedAt)
        return postDate.toDateString() === date.toDateString()
      })
      
      days.push({
        date,
        isCurrentMonth: date.getMonth() === month,
        isToday: date.toDateString() === today.toDateString(),
        posts: dayPosts,
      })
    }
    
    return days
  }

  const groupByDate = (posts: any[]) => {
    const groups: Record<string, any[]> = {}
    posts.forEach(post => {
      const date = new Date(post.scheduledFor || post.publishedAt).toLocaleDateString('pt-BR')
      if (!groups[date]) groups[date] = []
      groups[date].push(post)
    })
    return groups
  }

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  const calendarDays = viewMode === 'calendar' ? generateCalendarDays() : []
  const groupedPosts = viewMode === 'list' ? groupByDate(posts) : {}

  return (
    <div className="calendar">
      <div className="page-header">
        <div>
          <h1>📅 Calendário</h1>
          <p className="page-subtitle">Gerencie suas postagens agendadas</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          + Agendar Postagem
        </button>
      </div>

      {schedulerStatus && (
        <div className="scheduler-status">
          <div className="scheduler-info">
            <div className={`scheduler-indicator ${schedulerStatus.running ? '' : 'offline'}`}></div>
            <div>
              <div className="scheduler-text">
                <strong>Scheduler:</strong> {schedulerStatus.running ? 'Ativo' : 'Inativo'}
              </div>
              {schedulerStatus.upcomingPosts > 0 && (
                <div className="scheduler-text">
                  {schedulerStatus.upcomingPosts} post(s) agendado(s)
                </div>
              )}
            </div>
          </div>
          <button className="btn-sm btn-secondary-sm" onClick={fetchSchedulerStatus}>
            Atualizar
          </button>
        </div>
      )}

      {loading && <div className="loading">⏳ Carregando...</div>}
      {error && <div className="error">❌ Erro: {error}</div>}

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">Nenhuma postagem encontrada</div>
          <div className="empty-state-description">
            Agende suas postagens para publicação automática.<br />
            <span style={{ fontSize: '0.9rem', color: '#666' }}>
              💡 Dica: Posts agendados para o passado são publicados automaticamente!
            </span>
          </div>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            + Agendar Primeira Postagem
          </button>
        </div>
      )}

      {!loading && posts.length > 0 && (
        <>
          <div className="calendar-controls">
            <div className="view-toggle">
              <button
                className={viewMode === 'calendar' ? 'active' : ''}
                onClick={() => setViewMode('calendar')}
              >
                📅 Calendário
              </button>
              <button
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
              >
                📋 Lista
              </button>
            </div>

            {viewMode === 'calendar' && (
              <div className="month-navigation">
                <button onClick={goToPreviousMonth}>‹</button>
                <span>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
                <button onClick={goToNextMonth}>›</button>
                <button onClick={goToToday} style={{ marginLeft: '1rem' }}>Hoje</button>
              </div>
            )}
          </div>

          {viewMode === 'calendar' && (
            <div className="calendar-grid">
              <div className="calendar-weekdays">
                {weekdays.map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days">
                {calendarDays.map((day, index) => (
                  <div
                    key={index}
                    className={`calendar-day ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}`}
                    onClick={() => {
                      if (day.posts.length > 0) {
                        // Mostrar detalhes do primeiro post
                        setSelectedPost(day.posts[0])
                      }
                    }}
                  >
                    <div className="day-number">{day.date.getDate()}</div>
                    <div className="day-posts">
                      {day.posts.slice(0, 3).map(post => (
                        <div
                          key={post.id}
                          className={`day-post-item ${post.status}`}
                          title={post.caption}
                        >
                          <div className="post-time">
                            {new Date(post.scheduledFor || post.publishedAt).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      ))}
                      {day.posts.length > 3 && (
                        <div className="day-post-item" style={{ fontSize: '0.7rem' }}>
                          +{day.posts.length - 3} mais
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="calendar-list">
              {Object.entries(groupedPosts).map(([date, datePosts]) => (
                <div key={date} className="calendar-day-list">
                  <h3 className="day-header">{date}</h3>
                  <div className="day-posts-list">
                    {datePosts.map((post) => (
                      <div key={post.id} className="calendar-post">
                        <div className="post-time-large">
                          {new Date(post.scheduledFor || post.publishedAt).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="post-content">
                          <p className="post-caption">
                            {post.caption.substring(0, 150)}
                            {post.caption.length > 150 && '...'}
                          </p>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span className={`status-badge ${post.status}`}>
                              {post.status === 'scheduled' && '⏰ Agendado'}
                              {post.status === 'published' && '✅ Publicado'}
                              {post.status === 'failed' && '❌ Falhou'}
                            </span>
                            {post.status === 'scheduled' && (
                              <div className="post-actions">
                                <button
                                  className="btn-sm btn-primary-sm"
                                  onClick={() => handlePublishNow(post.id)}
                                >
                                  🚀 Publicar Agora
                                </button>
                                <button
                                  className="btn-sm btn-danger-sm"
                                  onClick={() => handleDeletePost(post.id)}
                                >
                                  🗑️ Cancelar
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSchedule={handleSchedule}
        contentList={contentList.filter(c => c.status === 'approved')}
      />
    </div>
  )
}

export default Calendar
