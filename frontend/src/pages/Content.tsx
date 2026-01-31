import { useContent } from '../hooks/useContent'

function Content() {
  const { content, loading, error, approve, remove } = useContent()

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este conteúdo?')) return
    
    try {
      await remove(id)
    } catch (err: any) {
      alert(err.message)
    }
  }

  return (
    <div className="content">
      <div className="page-header">
        <div>
          <h1>Conteúdo</h1>
          <p className="page-subtitle">Ideias e scripts gerados pela IA</p>
        </div>
        <button className="btn btn-primary">+ Gerar Conteúdo</button>
      </div>

      {loading && <div className="loading">Carregando...</div>}
      {error && <div className="error">Erro: {error}</div>}

      {!loading && content.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-icon">✨</div>
          <div className="empty-state-title">Nenhum conteúdo gerado</div>
          <div className="empty-state-description">
            Gere ideias de conteúdo baseadas nas análises dos perfis
          </div>
        </div>
      )}

      <div className="content-list">
        {content.map((item) => (
          <div key={item.id} className="content-card card">
            <div className="content-header">
              <span className={`status-badge ${item.status}`}>{item.status}</span>
              <span className="content-score">Score: {item.score}/10</span>
            </div>

            <p className="content-caption">{item.caption}</p>

            <div className="content-hashtags">
              {item.hashtags.slice(0, 5).map((tag) => (
                <span key={tag} className="hashtag">#{tag}</span>
              ))}
            </div>

            <div className="content-meta">
              <span className="content-type">{item.type}</span>
              <span className="content-date">
                {new Date(item.createdAt).toLocaleDateString('pt-BR')}
              </span>
            </div>

            {item.status === 'draft' && (
              <div className="content-actions">
                <button 
                  onClick={() => handleApprove(item.id)}
                  className="btn btn-primary"
                >
                  Aprovar
                </button>
                <button 
                  onClick={() => handleDelete(item.id)}
                  className="btn btn-danger"
                >
                  Remover
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default Content
