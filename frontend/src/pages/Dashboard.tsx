import { useDashboard } from '../hooks/useDashboard'
import './Dashboard.css'

interface DashboardStats {
  profiles: {
    total: number
    active: number
    analyzing: number
  }
  content: {
    total: number
    drafts: number
    scheduled: number
    published: number
  }
  performance: {
    totalViews: number
    totalLikes: number
    avgEngagementRate: number
  }
}

function Dashboard() {
  const { stats, loading, error } = useDashboard()

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard">
        <p className="error">Erro: {error}</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <p className="dashboard-subtitle">Visão geral da sua conta</p>
      </div>

      <div className="dashboard-stats grid grid-cols-3">
        <div className="stat-card card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-label">Perfis Ativos</div>
            <div className="stat-value">{stats?.profiles.active || 0}</div>
            <div className="stat-change positive">Total: {stats?.profiles.total || 0}</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">✨</div>
          <div className="stat-content">
            <div className="stat-label">Conteúdo Gerado</div>
            <div className="stat-value">{stats?.content.total || 0}</div>
            <div className="stat-change positive">Rascunhos: {stats?.content.drafts || 0}</div>
          </div>
        </div>

        <div className="stat-card card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-label">Taxa de Engajamento</div>
            <div className="stat-value">
              {(stats?.performance.avgEngagementRate || 0).toFixed(1)}%
            </div>
            <div className="stat-change neutral">Média geral</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content grid grid-cols-2">
        <div className="card">
          <h2 className="card-title">Atividade Recente</h2>
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">Nenhuma atividade</div>
            <div className="empty-state-description">
              Comece adicionando perfis de referência para análise
            </div>
            <button className="btn btn-primary">Adicionar Perfil</button>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Performance</h2>
          <div className="performance-stats">
            <div className="performance-item">
              <span className="performance-label">Total de Visualizações</span>
              <span className="performance-value">
                {stats?.performance.totalViews.toLocaleString() || 0}
              </span>
            </div>
            <div className="performance-item">
              <span className="performance-label">Total de Likes</span>
              <span className="performance-value">
                {stats?.performance.totalLikes.toLocaleString() || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
