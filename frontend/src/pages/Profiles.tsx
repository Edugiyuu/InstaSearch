import { useState } from 'react'
import { useProfiles } from '../hooks/useProfiles'
import './Profiles.css'

function Profiles() {
  const { profiles, loading, error, addProfile, removeProfile, refresh } = useProfiles()
  const [username, setUsername] = useState('')
  const [isAdding, setIsAdding] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return

    try {
      setIsAdding(true)
      await addProfile(username.trim())
      setUsername('')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`Remover perfil @${username}?`)) return
    
    try {
      await removeProfile(id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="profiles">
      <div className="page-header">
        <div>
          <h1>Perfis de Referência</h1>
          <p className="page-subtitle">Gerencie os perfis que você deseja analisar</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="add-profile-form">
        <input
          type="text"
          placeholder="Digite o username (@exemplo)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={isAdding}
        />
        <button type="submit" disabled={isAdding || !username.trim()} className="btn btn-primary">
          {isAdding ? 'Adicionando...' : '+ Adicionar Perfil'}
        </button>
      </form>

      {loading && <div className="loading">Carregando...</div>}
      {error && <div className="error">Erro: {error}</div>}

      {!loading && profiles.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">👥</div>
          <div className="empty-state-title">Nenhum perfil adicionado</div>
          <div className="empty-state-description">
            Adicione perfis do Instagram para começar a análise
          </div>
        </div>
      )}

      <div className="profiles-grid">
        {profiles.map((profile) => (
          <div key={profile.id} className="profile-card card">
            <div className="profile-header">
              <h3>@{profile.username}</h3>
              <span className={`status-badge ${profile.status}`}>
                {profile.status}
              </span>
            </div>
            
            <p className="profile-name">{profile.fullName}</p>
            
            <div className="profile-metrics">
              <div className="metric">
                <span className="metric-value">{profile.metrics.followers.toLocaleString()}</span>
                <span className="metric-label">Seguidores</span>
              </div>
              <div className="metric">
                <span className="metric-value">{profile.metrics.posts.toLocaleString()}</span>
                <span className="metric-label">Posts</span>
              </div>
            </div>

            {profile.tags.length > 0 && (
              <div className="profile-tags">
                {profile.tags.map((tag) => (
                  <span key={tag} className="tag">{tag}</span>
                ))}
              </div>
            )}

            <div className="profile-actions">
              <button 
                onClick={() => refresh(profile.id)}
                className="btn btn-secondary"
              >
                Atualizar
              </button>
              <button 
                onClick={() => handleDelete(profile.id, profile.username)}
                className="btn btn-danger"
              >
                Remover
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Profiles
