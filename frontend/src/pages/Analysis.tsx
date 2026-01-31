function Analysis() {
  return (
    <div className="analysis">
      <div className="page-header">
        <div>
          <h1>Análises</h1>
          <p className="page-subtitle">Resultados das análises dos perfis</p>
        </div>
        <button className="btn btn-primary">+ Nova Análise</button>
      </div>

      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Nenhuma análise realizada</div>
        <div className="empty-state-description">
          Adicione perfis e inicie uma análise para ver os insights
        </div>
      </div>
    </div>
  )
}

export default Analysis
