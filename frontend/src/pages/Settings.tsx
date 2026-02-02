import { useState } from 'react'
import { useInstagram } from '../hooks/useInstagram'
import axios from 'axios'
import './Settings.css'

function Settings() {
  const { account, connected, loading, error, connectAccount, disconnectAccount, refreshAccount } = useInstagram()
  const [disconnecting, setDisconnecting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [token, setToken] = useState('')
  const [tokenLoading, setTokenLoading] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const handleDisconnect = async () => {
    if (!confirm('Tem certeza que deseja desconectar sua conta do Instagram?')) {
      return
    }

    setDisconnecting(true)
    try {
      await disconnectAccount()
    } catch (err) {
      console.error('Error disconnecting:', err)
    } finally {
      setDisconnecting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await refreshAccount()
    } catch (err) {
      console.error('Error refreshing:', err)
    } finally {
      setRefreshing(false)
    }
  }

  const handleConnectWithToken = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token.trim()) {
      setTokenError('Por favor, cole o token de acesso')
      return
    }

    setTokenLoading(true)
    setTokenError(null)

    try {
      const response = await axios.post('/api/instagram/connect-token', {
        accessToken: token.trim(),
        userId: 'default_user'
      })

      if (response.data.success) {
        setShowTokenModal(false)
        setToken('')
        // Recarregar a página para mostrar a conta conectada
        window.location.reload()
      }
    } catch (err: any) {
      console.error('Error connecting with token:', err)
      setTokenError(err.response?.data?.error || 'Falha ao conectar conta')
    } finally {
      setTokenLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0'
    return num.toLocaleString('pt-BR')
  }

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
          
          {error && (
            <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
              <strong>Erro:</strong> {error}
            </div>
          )}

          <div className="settings-section">
            {loading ? (
              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-label">Carregando...</div>
                </div>
              </div>
            ) : connected && account ? (
              <>
                <div className="instagram-account-info">
                  <div className="account-header">
                    {account.profile?.profilePictureUrl && (
                      <img 
                        src={account.profile.profilePictureUrl} 
                        alt={account.username}
                        className="account-avatar"
                      />
                    )}
                    <div>
                      <h3>@{account.username}</h3>
                      <p className="account-name">{account.profile?.name}</p>
                      <span className={`status-badge status-${account.status}`}>
                        {account.status === 'connected' ? '✓ Conectado' : 
                         account.status === 'expired' ? '⚠ Token Expirado' : 
                         '✗ Erro'}
                      </span>
                    </div>
                  </div>

                  <div className="account-stats">
                    <div className="stat">
                      <div className="stat-value">{formatNumber(account.profile?.followersCount)}</div>
                      <div className="stat-label">Seguidores</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{formatNumber(account.profile?.followsCount)}</div>
                      <div className="stat-label">Seguindo</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{formatNumber(account.profile?.mediaCount)}</div>
                      <div className="stat-label">Posts</div>
                    </div>
                  </div>

                  <div className="account-details">
                    <div className="detail-row">
                      <span className="detail-label">Conectado em:</span>
                      <span className="detail-value">{formatDate(account.connectedAt)}</span>
                    </div>
                    {account.lastRefreshed && (
                      <div className="detail-row">
                        <span className="detail-label">Última atualização:</span>
                        <span className="detail-value">{formatDate(account.lastRefreshed)}</span>
                      </div>
                    )}
                    {account.expiresAt && (
                      <div className="detail-row">
                        <span className="detail-label">Token expira em:</span>
                        <span className="detail-value">{formatDate(account.expiresAt)}</span>
                      </div>
                    )}
                  </div>

                  <div className="account-actions">
                    <button 
                      className="btn btn-secondary"
                      onClick={handleRefresh}
                      disabled={refreshing}
                    >
                      {refreshing ? 'Atualizando...' : '🔄 Atualizar Dados'}
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={handleDisconnect}
                      disabled={disconnecting}
                    >
                      {disconnecting ? 'Desconectando...' : '✗ Desconectar'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="settings-item">
                <div className="settings-item-info">
                  <div className="settings-item-label">Status da Conexão</div>
                  <div className="settings-item-description">
                    Conecte sua conta do Instagram para publicar conteúdo automaticamente
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary"
                    onClick={connectAccount}
                  >
                    📷 Conectar via OAuth
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setShowTokenModal(true)}
                  >
                    🔑 Conectar com Token
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal para adicionar token manualmente */}
        {showTokenModal && (
          <div className="modal-overlay" onClick={() => setShowTokenModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>🔑 Conectar com Token de Acesso</h2>
                <button className="modal-close" onClick={() => setShowTokenModal(false)}>✕</button>
              </div>

              <form onSubmit={handleConnectWithToken} className="modal-body">
                <div className="form-group">
                  <label htmlFor="token">Token de Acesso do Instagram</label>
                  <textarea
                    id="token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Cole aqui seu token de acesso..."
                    rows={6}
                    className="form-control"
                    disabled={tokenLoading}
                  />
                  <small className="form-hint">
                    Gere um token em: <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noopener noreferrer">Graph API Explorer</a>
                  </small>
                </div>

                {tokenError && (
                  <div className="alert alert-error">
                    <strong>Erro:</strong> {tokenError}
                  </div>
                )}

                <div className="alert alert-info">
                  <strong>📖 Como gerar o token:</strong>
                  <ol style={{ marginLeft: '1.5rem', marginTop: '0.5rem' }}>
                    <li>Acesse o Graph API Explorer</li>
                    <li>Selecione seu App</li>
                    <li>Clique em "Get Token" → "Get Page Access Token"</li>
                    <li>Selecione sua Página do Facebook</li>
                    <li>Marque as permissões do Instagram</li>
                    <li>Copie o token gerado</li>
                  </ol>
                </div>

                <div className="modal-actions">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowTokenModal(false)}
                    disabled={tokenLoading}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={tokenLoading || !token.trim()}
                  >
                    {tokenLoading ? 'Conectando...' : '✓ Conectar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

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
