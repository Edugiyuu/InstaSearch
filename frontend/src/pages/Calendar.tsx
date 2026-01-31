import { useEffect } from 'react'
import { usePosts } from '../hooks/usePosts'

function Calendar() {
  const { posts, loading, error, fetchUpcoming } = usePosts()

  useEffect(() => {
    fetchUpcoming(20)
  }, [fetchUpcoming])

  const groupByDate = (posts: any[]) => {
    const groups: Record<string, any[]> = {}
    posts.forEach(post => {
      const date = new Date(post.scheduledFor).toLocaleDateString('pt-BR')
      if (!groups[date]) groups[date] = []
      groups[date].push(post)
    })
    return groups
  }

  const grouped = groupByDate(posts)

  return (
    <div className="calendar">
      <div className="page-header">
        <div>
          <h1>Calendário</h1>
          <p className="page-subtitle">Gerencie suas postagens agendadas</p>
        </div>
        <button className="btn btn-primary">+ Agendar Postagem</button>
      </div>

      {loading && <div className="loading">Carregando...</div>}
      {error && <div className="error">Erro: {error}</div>}

      {!loading && posts.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-title">Nenhuma postagem agendada</div>
          <div className="empty-state-description">
            Agende suas postagens para publicação automática
          </div>
        </div>
      )}

      <div className="calendar-view">
        {Object.entries(grouped).map(([date, datePosts]) => (
          <div key={date} className="calendar-day card">
            <h3 className="day-header">{date}</h3>
            <div className="day-posts">
              {datePosts.map((post) => (
                <div key={post.id} className="calendar-post">
                  <div className="post-time">
                    {new Date(post.scheduledFor).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                  <div className="post-content">
                    <p className="post-caption">{post.caption.substring(0, 100)}...</p>
                    <span className={`status-badge ${post.status}`}>
                      {post.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Calendar
