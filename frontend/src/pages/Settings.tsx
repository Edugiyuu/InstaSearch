import './Settings.css'

function Settings() {
  return (
    <div className="settings">
      <div className="page-header">
        <div>
          <h1>Configurações</h1>
          <p className="page-subtitle">Configure sua conta e preferências</p>
        </div>
      </div>

      <div className="settings-content">
        <div className="card">
          <h2 className="card-title">Conta Instagram</h2>
          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Status da Conexão</div>
                <div className="settings-item-description">
                  Conecte sua conta do Instagram
                </div>
              </div>
              <button className="btn btn-primary">Conectar Instagram</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">API OpenAI</h2>
          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Chave da API</div>
                <div className="settings-item-description">
                  Configure sua chave da API OpenAI
                </div>
              </div>
              <button className="btn btn-secondary">Configurar</button>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="card-title">Preferências</h2>
          <div className="settings-section">
            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Análise Automática</div>
                <div className="settings-item-description">
                  Analisar automaticamente novos perfis
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="settings-item">
              <div className="settings-item-info">
                <div className="settings-item-label">Notificações</div>
                <div className="settings-item-description">
                  Receber notificações quando análises forem concluídas
                </div>
              </div>
              <label className="toggle">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
