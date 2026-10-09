import { AiStatus, errorMessage, shortsApi, WhisperStatus, YouTubeStatus } from '../api/shorts'
import { FormEvent, ReactNode, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useInstagram } from '../hooks/useInstagram'
import api from '../services/api'
import './Settings.css'

interface AIHealth {
  status: 'healthy' | 'unhealthy'
  model: string
  provider: string
  dailyLimit?: number
}

function Card({
  title,
  preview,
  children,
  actions,
}: {
  title: string
  preview?: boolean
  children: ReactNode
  actions: ReactNode
}) {
  return (
    <section className="panel set-card">
      <h2>
        {title}
        {preview && <span className="set-preview" title="Este bloco ainda não lê o backend">prévia</span>}
      </h2>
      <dl className="kv set-kv">{children}</dl>
      <div className="act-row set-actions">{actions}</div>
    </section>
  )
}

function daysUntil(iso?: string) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

function Settings() {
  const { account, connected, loading, error, disconnectAccount, refreshAccount } = useInstagram()
  const [ai, setAi] = useState<AIHealth | null>(null)
  const [aiError, setAiError] = useState(false)
  const [testingAi, setTestingAi] = useState(false)
  const [tokenOpen, setTokenOpen] = useState(false)
  const [token, setToken] = useState('')
  const [tokenBusy, setTokenBusy] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const testAi = async () => {
    setTestingAi(true)
    try {
      const { data } = await api.get('/ai/health')
      setAi(data.data)
      setAiError(false)
    } catch {
      setAi(null)
      setAiError(true)
    } finally {
      setTestingAi(false)
    }
  }

  const [aiInfo, setAiInfo] = useState<AiStatus | null>(null)

  // status sem gastar chamada da IA; "Testar conexão" é que chama o Gemini
  useEffect(() => {
    shortsApi.aiStatus().then(setAiInfo).catch(() => setAiError(true))
  }, [])

  // Whisper (ADR 0018): estado real; enquanto baixa, atualiza o andamento
  const [whisper, setWhisper] = useState<WhisperStatus | null>(null)
  const whisperBusy = whisper?.state === 'baixando'
  useEffect(() => {
    shortsApi.whisperStatus().then(setWhisper).catch(() => undefined)
  }, [])
  useEffect(() => {
    if (!whisperBusy) return
    const t = setInterval(() => shortsApi.whisperStatus().then(setWhisper).catch(() => undefined), 2000)
    return () => clearInterval(t)
  }, [whisperBusy])
  const installWhisper = () => shortsApi.installWhisper().then(setWhisper).catch(e => setWhisper(w => w && { ...w, state: 'erro', error: errorMessage(e) }))

  // YouTube: o Google volta para /configuracoes?youtube=ok|erro depois da autorização
  const [params, setParams] = useSearchParams()
  const [yt, setYt] = useState<YouTubeStatus | null>(null)
  const [ytNote, setYtNote] = useState<string | null>(null)
  const [ytBusy, setYtBusy] = useState(false)

  useEffect(() => {
    shortsApi.youtubeStatus().then(setYt).catch(() => setYt({ configured: false, account: null }))
    const result = params.get('youtube')
    if (result) {
      setYtNote(result === 'ok' ? `Canal ${params.get('channel') ?? ''} conectado.` : `Não conectou: ${params.get('message') ?? 'erro'}`)
      setParams({}, { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const connectYouTube = async () => {
    setYtBusy(true)
    try {
      window.location.href = (await shortsApi.youtubeAuthUrl()).url
    } catch (e) {
      setYtNote(errorMessage(e))
      setYtBusy(false)
    }
  }

  const disconnectYouTube = async () => {
    if (!confirm('Desconectar o canal do YouTube?')) return
    setYtBusy(true)
    try {
      await shortsApi.youtubeDisconnect()
      setYt(await shortsApi.youtubeStatus())
    } finally {
      setYtBusy(false)
    }
  }

  const handleRefresh = async () => {
    setBusy(true)
    try {
      await refreshAccount()
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('Desconectar sua conta do Instagram?')) return
    setBusy(true)
    try {
      await disconnectAccount()
    } finally {
      setBusy(false)
    }
  }

  const handleToken = async (e: FormEvent) => {
    e.preventDefault()
    if (!token.trim()) {
      setTokenError('Cole o token de acesso')
      return
    }
    setTokenBusy(true)
    setTokenError(null)
    try {
      const { data } = await api.post('/instagram/connect-token', { accessToken: token.trim(), userId: 'default_user' })
      if (data.success) window.location.reload()
    } catch (err: any) {
      setTokenError(err.response?.data?.error || 'Falha ao conectar conta')
    } finally {
      setTokenBusy(false)
    }
  }

  const expiresIn = daysUntil(account?.expiresAt)

  return (
    <div className="page settings-page">
      <h1 className="page-title">Configurações</h1>
      <p className="page-sub">Tudo roda na sua máquina. Chaves ficam no backend/.env e nunca são enviadas ao navegador.</p>

      <div className="set-grid">
        <Card
          title="Instagram"
          actions={
            connected ? (
              <>
                <button className="act" onClick={handleRefresh} disabled={busy}>
                  ↻ Atualizar token
                </button>
                <button className="act" onClick={handleDisconnect} disabled={busy}>
                  ⏻ Desconectar
                </button>
                <a className="act" href="https://github.com/Edugiyuu/InstaSearch/blob/master/docs/INSTALACAO.md#conectar-o-instagram" target="_blank" rel="noreferrer">
                  ? Como gerar o token
                </a>
              </>
            ) : (
              <>
                <button className="act" onClick={() => setTokenOpen(true)}>
                  + Conectar com token
                </button>
                <a className="act" href="https://github.com/Edugiyuu/InstaSearch/blob/master/docs/INSTALACAO.md#conectar-o-instagram" target="_blank" rel="noreferrer">
                  ? Como gerar o token
                </a>
              </>
            )
          }
        >
          {loading ? (
            <>
              <dt>Status</dt>
              <dd>Carregando…</dd>
            </>
          ) : connected && account ? (
            <>
              <dt>Conta</dt>
              <dd>@{account.username}</dd>
              <dt>Status</dt>
              <dd>
                {account.status === 'connected' ? (
                  <span className="status c-success">Conectado</span>
                ) : account.status === 'expired' ? (
                  <span className="status c-warning">Token expirado</span>
                ) : (
                  <span className="status c-danger">Erro</span>
                )}
              </dd>
              <dt>Token</dt>
              <dd>{expiresIn !== null ? `Expira em ${expiresIn} dias` : account.tokenType}</dd>
              <dt>Permissões</dt>
              <dd>{account.scopes?.length ? account.scopes.join(' · ') : '—'}</dd>
              <dt>Seguidores</dt>
              <dd>{account.profile?.followersCount?.toLocaleString('pt-BR') ?? '—'}</dd>
            </>
          ) : (
            <>
              <dt>Status</dt>
              <dd>
                <span className="status c-muted">Desconectado</span>
              </dd>
              {error && (
                <>
                  <dt>Erro</dt>
                  <dd className="c-danger">{error}</dd>
                </>
              )}
            </>
          )}
        </Card>

        <Card
          title="YouTube"
          actions={
            <>
              {yt?.account ? (
                <>
                  {yt.account.needsReconnect && (
                    <button className="act" onClick={connectYouTube} disabled={ytBusy}>
                      ↻ Conectar de novo
                    </button>
                  )}
                  <button className="act" onClick={disconnectYouTube} disabled={ytBusy}>
                    ⏻ Desconectar
                  </button>
                </>
              ) : (
                <button className="act" onClick={connectYouTube} disabled={ytBusy || !yt?.configured}>
                  + Conectar canal
                </button>
              )}
              <a className="act" href="https://github.com/Edugiyuu/InstaSearch/blob/master/docs/INSTALACAO.md#conectar-o-youtube" target="_blank" rel="noreferrer">
                ? Como configurar
              </a>
            </>
          }
        >
          <dt>Status</dt>
          <dd>
            {!yt ? (
              'Carregando…'
            ) : yt.account ? (
              <span className="status c-success">Conectado</span>
            ) : yt.configured ? (
              <span className="status c-muted">Desconectado</span>
            ) : (
              <span className="status c-warning">Falta YOUTUBE_CLIENT_ID e YOUTUBE_CLIENT_SECRET no backend/.env</span>
            )}
          </dd>
          {yt?.account && (
            <>
              <dt>Canal</dt>
              <dd>{yt.account.channelTitle}</dd>
              {yt.account.needsReconnect && (
                <>
                  <dt>Métricas</dt>
                  <dd className="c-warning">Conecte de novo para o app ler a retenção e os compartilhamentos (permissão nova, usada na tela Ideias).</dd>
                </>
              )}
            </>
          )}
          {ytNote && (
            <>
              <dt>Aviso</dt>
              <dd>{ytNote}</dd>
            </>
          )}
        </Card>

        <Card
          title="Inteligência artificial"
          actions={
            <>
              <button className="act" onClick={testAi} disabled={testingAi}>
                {testingAi ? 'Testando…' : '✓ Testar conexão'}
              </button>
              <span className="meta">Chaves: GEMINI_API_KEY e ANTHROPIC_API_KEY no backend/.env</span>
            </>
          }
        >
          <dt>Gemini</dt>
          <dd>
            {!aiInfo ? (
              '…'
            ) : !aiInfo.gemini.configured ? (
              <span className="c-muted">sem chave (GEMINI_API_KEY)</span>
            ) : aiInfo.gemini.pausedUntil ? (
              <span className="status c-warning">
                cota esgotada até {new Date(aiInfo.gemini.pausedUntil).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            ) : (
              <span className="status c-success">{aiInfo.gemini.model}</span>
            )}
          </dd>
          <dt>Claude (reserva)</dt>
          <dd>
            {!aiInfo ? (
              '…'
            ) : aiInfo.claude.configured ? (
              <span className="status c-success">{aiInfo.claude.model}</span>
            ) : (
              <span className="c-muted">sem chave · coloque ANTHROPIC_API_KEY no backend/.env</span>
            )}
          </dd>
          <dt>Claude Code (seu plano)</dt>
          <dd>
            {!aiInfo ? (
              '…'
            ) : aiInfo.claudeCode.enabled ? (
              <span className="status c-success">ligado · {aiInfo.claudeCode.model}</span>
            ) : (
              <span className="c-muted">desligado · CLAUDE_CODE=on no backend/.env</span>
            )}
          </dd>
          <dt>Modo</dt>
          <dd>
            {aiInfo?.mode === 'claude' ? 'só Claude (API)' : aiInfo?.mode === 'claude-code' ? 'só Claude Code (seu plano)' : aiInfo?.mode === 'gemini' ? 'só Gemini' : 'Gemini primeiro; se cair ou acabar a cota, Claude'}
          </dd>
          <dt>Teste</dt>
          <dd>
            {aiError ? (
              <span className="status c-danger">Backend fora do ar</span>
            ) : !ai ? (
              <span className="c-muted">clique em “Testar conexão” (gasta 1 chamada do Gemini)</span>
            ) : ai.status === 'healthy' ? (
              <span className="status c-success">Gemini respondendo</span>
            ) : (
              <span className="status c-danger">Gemini sem resposta (cota ou chave)</span>
            )}
          </dd>
        </Card>

        <Card
          title="Transcrição da voz"
          actions={
            whisper?.state === 'pronto' ? (
              <span className="c-muted">Roda sozinho quando você envia a voz de um vídeo.</span>
            ) : (
              <button className="act" onClick={installWhisper} disabled={!whisper || whisperBusy}>
                ↓ Baixar o Whisper ({whisper?.sizeMb ?? 488} MB)
              </button>
            )
          }
        >
          <dt>Whisper</dt>
          <dd>
            {!whisper ? (
              '…'
            ) : whisper.state === 'pronto' ? (
              <span className="status c-success">{whisper.model} · pronto</span>
            ) : whisper.state === 'baixando' ? (
              <span className="status">baixando · {Math.round((whisper.progress ?? 0) * 100)}%</span>
            ) : whisper.state === 'erro' ? (
              <span className="status c-danger">o download falhou: {whisper.error}</span>
            ) : (
              <span className="c-muted">{whisper.model} · não instalado (baixa sozinho no primeiro áudio)</span>
            )}
          </dd>
          <dt>Idioma</dt>
          <dd>português (Brasil)</dd>
          <dt>Para quê</dt>
          <dd>legenda e cortes no tempo da sua voz; o texto continua o do roteiro</dd>
        </Card>

        <Card
          title="Voz"
          preview
          actions={
            <>
              <button className="act">+ Configurar ElevenLabs</button>
              <button className="act">↓ Instalar Piper</button>
            </>
          }
        >
          <dt>ElevenLabs (API)</dt>
          <dd>opcional · não configurada</dd>
          <dt>Piper (local)</dt>
          <dd>não instalado</dd>
          <dt>Padrão</dt>
          <dd>upload do seu áudio</dd>
        </Card>

        <Card
          title="Mídia e render"
          preview
          actions={
            <>
              <button className="act">▤ Abrir pasta da biblioteca</button>
              <button className="act">↻ Recatalogar tudo</button>
            </>
          }
        >
          <dt>Cloudinary</dt>
          <dd>CLOUDINARY_* no backend/.env</dd>
          <dt>Após publicar</dt>
          <dd>apagar vídeo do Cloudinary</dd>
          <dt>Render</dt>
          <dd>1080×1920 · 30fps · concorrência: auto</dd>
          <dt>Biblioteca</dt>
          <dd>backend/data/library</dd>
          <dt>Geração de imagem</dt>
          <dd>desligada</dd>
        </Card>

        <Card
          title="Sistema"
          preview
          actions={
            <>
              <button className="act">✓ Verificar instalação</button>
              <button className="act">↓ Exportar backup</button>
              <button className="act">▤ Ver logs</button>
            </>
          }
        >
          <dt>FFmpeg</dt>
          <dd>verificação entra com o M1</dd>
          <dt>Remotion / Chrome headless</dt>
          <dd>verificação entra com o M1</dd>
          <dt>Agendador</dt>
          <dd>publica só com o backend rodando</dd>
          <dt>Dados</dt>
          <dd>backend/data · backup: copiar a pasta</dd>
          <dt>Licença do Remotion</dt>
          <dd>gratuita para pessoas físicas e empresas com até 3 funcionários</dd>
        </Card>
      </div>

      {tokenOpen && (
        <div className="overlay" onClick={() => setTokenOpen(false)}>
          <form className="modal set-token" onClick={e => e.stopPropagation()} onSubmit={handleToken}>
            <button type="button" className="modal-close" onClick={() => setTokenOpen(false)}>
              ✕
            </button>
            <h2>Conectar Instagram</h2>
            <p className="meta">
              Cole o token de acesso de longa duração gerado no Graph API Explorer (veja docs/INSTALACAO.md, "Conectar o Instagram").
            </p>
            <textarea
              className="field"
              rows={4}
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="EAAG…"
              autoFocus
            />
            {tokenError && <p className="c-danger set-token-error">{tokenError}</p>}
            <div className="set-token-actions">
              <button type="button" className="btn-o" onClick={() => setTokenOpen(false)}>
                Cancelar
              </button>
              <button type="submit" className="btn-y" disabled={tokenBusy}>
                {tokenBusy ? 'Conectando…' : 'Conectar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default Settings
