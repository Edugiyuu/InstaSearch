import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import {
  errorMessage,
  LibraryImage,
  RenderJob,
  ShortProject,
  shortsApi,
  SoundItem,
  videoDownloadUrl,
  YouTubePrivacy,
  YouTubeStatus,
} from '../api/shorts'
import { useInstagram } from '../hooks/useInstagram'
import { useCatchphrases } from '../hooks/useShorts'
import { shortVideoProps } from '../video/timeline'
import { copyText, ProjectCover, Segmented, Spinner } from './flow'
import './PublishModal.css'

interface Props {
  project: ShortProject
  images: Map<string, LibraryImage>
  sounds?: Map<string, SoundItem>
  onClose: () => void
  onSaved: (p: ShortProject) => void
}

const PRIVACY_LABEL: Record<YouTubePrivacy, string> = { public: 'Público', unlisted: 'Não listado', private: 'Privado' }

const STAGE_LABEL: Record<RenderJob['stage'], string> = {
  bundle: 'Preparando o render (só demora na primeira vez)…',
  render: 'Gerando o MP4…',
  done: 'MP4 pronto',
  error: 'O render falhou',
}

function PublishModal({ project, images, sounds, onClose, onSaved }: Props) {
  const { account } = useInstagram()
  const [caption, setCaption] = useState(project.postCaption ?? '')
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [job, setJob] = useState<RenderJob | null>(null)
  const [youtube, setYoutube] = useState<YouTubeStatus | null>(null)
  const [ytTitle, setYtTitle] = useState(project.title)
  const [privacy, setPrivacy] = useState<YouTubePrivacy>('public')
  const [sending, setSending] = useState<{ instagram?: boolean; youtube?: boolean }>({})

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    shortsApi.youtubeStatus().then(setYoutube, () => setYoutube({ configured: false, account: null }))
  }, [])

  // ── MP4: começa sozinho ao abrir e acompanha o andamento ──

  const { byId: catchphrases, loaded: catchphrasesLoaded } = useCatchphrases()
  const renderProps = useMemo(() => {
    const { props, durationInFrames } = shortVideoProps(project, images, sounds, catchphrases)
    return { ...props, durationInFrames }
  }, [project, images, sounds, catchphrases])

  const startRender = useCallback(async () => {
    setMessage(null)
    try {
      setJob(await shortsApi.startRender(project.id, renderProps))
    } catch (e) {
      setJob({ key: '', stage: 'error', progress: 0, error: errorMessage(e) })
    }
  }, [project.id, renderProps])

  // só uma vez ao abrir (mudanças aqui, como legenda e publicações, não mudam o vídeo),
  // mas, com abertura ou final, espera os bordões carregarem para o MP4 sair com eles
  const started = useRef(false)
  const propsReady = (!project.settings.intro && !project.settings.outro) || catchphrasesLoaded
  useEffect(() => {
    if (started.current || !propsReady) return
    started.current = true
    startRender()
  }, [propsReady, startRender])

  const rendering = !!job && (job.stage === 'bundle' || job.stage === 'render')
  useEffect(() => {
    if (!job || !rendering) return
    const timer = setInterval(async () => {
      try {
        const next = await shortsApi.getRender(project.id, job.key)
        if (!next) return
        setJob(next)
        if (next.stage === 'done') onSaved(await shortsApi.getProject(project.id))
      } catch {
        // tenta de novo no próximo intervalo
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [job, rendering, project.id, onSaved])

  const ready = job?.stage === 'done'

  // ── Legenda ──

  const generate = useCallback(async () => {
    setGenerating(true)
    setMessage(null)
    try {
      const { data } = await api.post('/ai/generate-caption', {
        contentIdea: `Short vertical "${project.title}". Narração: ${project.narration}`,
        tone: 'casual',
        includeHashtags: true,
      })
      const result = data.data
      const tags = Array.isArray(result?.hashtags) ? result.hashtags.join(' ') : ''
      const text = tags ? `${result.caption}\n\n${tags}` : result.caption
      setCaption(text)
      onSaved(await shortsApi.updateProject(project.id, { postCaption: text }))
    } catch (e) {
      setMessage(`Não deu para gerar a legenda: ${errorMessage(e)}`)
    } finally {
      setGenerating(false)
    }
  }, [project.id, project.title, project.narration, onSaved])

  // primeira vez: a legenda já vem pronta
  useEffect(() => {
    if (!project.postCaption) generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    try {
      onSaved(await shortsApi.updateProject(project.id, { postCaption: caption }))
    } catch (e) {
      setMessage(errorMessage(e))
    }
  }

  // ── Publicar ──

  const publishInstagram = async () => {
    setSending(s => ({ ...s, instagram: true }))
    setMessage(null)
    try {
      onSaved(await shortsApi.publishInstagram(project.id, caption))
      setMessage('Publicado no Instagram.')
    } catch (e) {
      setMessage(`Instagram: ${errorMessage(e)}`)
    } finally {
      setSending(s => ({ ...s, instagram: false }))
    }
  }

  const publishYouTube = async () => {
    setSending(s => ({ ...s, youtube: true }))
    setMessage(null)
    try {
      onSaved(await shortsApi.publishYouTube(project.id, { title: ytTitle, description: caption, privacy }))
      setMessage('Enviado ao YouTube.')
    } catch (e) {
      setMessage(`YouTube: ${errorMessage(e)}`)
    } finally {
      setSending(s => ({ ...s, youtube: false }))
    }
  }

  const ig = project.published?.instagram
  const yt = project.published?.youtube

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pub" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">✕</button>
        <h2 className="pub-title">Publicar</h2>

        <div className="pub-top">
          <ProjectCover project={project} images={images} />
          <div className="pub-right">
            <div className="pub-caption-head">
              <span className="label">Legenda do post</span>
              <span className="act-row">
                <button className="act" onClick={async () => setMessage((await copyText(caption)) ? 'Legenda copiada.' : 'Não deu para copiar.')}>
                  ⧉ Copiar
                </button>
                <button className="act" onClick={generate} disabled={generating}>
                  {generating ? 'Gerando…' : '↻ Gerar outra'}
                </button>
              </span>
            </div>
            {generating && !caption ? (
              <div className="pub-caption pub-loading"><Spinner /> Escrevendo a legenda…</div>
            ) : (
              <textarea className="field pub-caption" value={caption} onChange={e => setCaption(e.target.value)} onBlur={save} rows={9} />
            )}
          </div>
        </div>

        {/* MP4 */}
        <div className={`pub-render ${job?.stage ?? ''}`}>
          <div className="pub-render-head">
            <span>
              {!job ? <><Spinner /> Verificando o MP4…</> : rendering ? <><Spinner /> {STAGE_LABEL[job.stage]}</> : STAGE_LABEL[job.stage]}
            </span>
            {rendering && job?.stage === 'render' && <span className="pub-pct">{Math.round(job.progress * 100)}%</span>}
            {ready && (
              <a className="btn-o pub-download" href={videoDownloadUrl(project.id, job!.key)} download>
                ⬇ Baixar MP4
              </a>
            )}
            {job?.stage === 'error' && <button className="act" onClick={startRender}>↻ Tentar de novo</button>}
          </div>
          {rendering && (
            <div className="pub-bar"><div style={{ width: `${Math.max(3, (job?.progress ?? 0) * 100)}%` }} /></div>
          )}
          {job?.stage === 'error' && job.error && <p className="pub-error">{job.error}</p>}
        </div>

        {/* Destinos */}
        <div className="pub-dest">
          <section className="pub-card">
            <header>
              <strong>Instagram</strong>
              <span className="pub-who">{account?.username ? `@${account.username}` : 'não conectado'}</span>
            </header>
            {!account ? (
              <p className="pub-hint">Conecte a conta em <Link to="/configuracoes">Configurações</Link>.</p>
            ) : (
              <p className="pub-hint">Reels com a legenda acima.</p>
            )}
            {ig && (
              <p className="pub-done">✓ Publicado {ig.url ? <a href={ig.url} target="_blank" rel="noreferrer">ver post ↗</a> : ''}</p>
            )}
            <button className="btn-y" disabled={!ready || !account || !caption.trim() || sending.instagram} onClick={publishInstagram}>
              {sending.instagram ? <><Spinner /> Publicando…</> : ig ? 'Publicar de novo' : 'Publicar no Instagram'}
            </button>
          </section>

          <section className="pub-card">
            <header>
              <strong>YouTube Shorts</strong>
              <span className="pub-who">{youtube?.account ? youtube.account.channelTitle : 'não conectado'}</span>
            </header>
            {!youtube?.account ? (
              <p className="pub-hint">Conecte o canal em <Link to="/configuracoes">Configurações</Link>.</p>
            ) : (
              <>
                <label className="label" htmlFor="yt-title">Título</label>
                <input id="yt-title" className="field" value={ytTitle} maxLength={100} onChange={e => setYtTitle(e.target.value)} />
                <Segmented value={privacy} options={PRIVACY_LABEL} onChange={setPrivacy} />
                <p className="pub-hint">A legenda acima vira a descrição; as hashtags viram tags.</p>
              </>
            )}
            {yt && (
              <p className="pub-done">✓ Enviado <a href={yt.url} target="_blank" rel="noreferrer">ver no YouTube ↗</a></p>
            )}
            <button className="btn-y" disabled={!ready || !youtube?.account || !ytTitle.trim() || sending.youtube} onClick={publishYouTube}>
              {sending.youtube ? <><Spinner /> Enviando…</> : yt ? 'Enviar de novo' : 'Enviar ao YouTube'}
            </button>
          </section>
        </div>

        {message && <p className="pub-notice">{message}</p>}

        <div className="pub-footer">
          <button className="btn-o" onClick={onClose}>Fechar</button>
          {project.status !== 'salvo' && project.status !== 'publicado' && (
            <button
              className="btn-g"
              onClick={async () => {
                try {
                  onSaved(await shortsApi.updateProject(project.id, { status: 'salvo', postCaption: caption }))
                  onClose()
                } catch (e) {
                  setMessage(errorMessage(e))
                }
              }}
            >
              Salvar para depois
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublishModal
