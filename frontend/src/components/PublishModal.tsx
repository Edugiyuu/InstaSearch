import { useCallback, useEffect, useState } from 'react'
import api from '../services/api'
import { errorMessage, LibraryImage, ShortProject, shortsApi } from '../api/shorts'
import { useInstagram } from '../hooks/useInstagram'
import { copyText, ProjectCover, Spinner } from './flow'
import './PublishModal.css'

interface Props {
  project: ShortProject
  images: Map<string, LibraryImage>
  onClose: () => void
  onSaved: (p: ShortProject) => void
}

function PublishModal({ project, images, onClose, onSaved }: Props) {
  const { account } = useInstagram()
  const [caption, setCaption] = useState(project.postCaption ?? '')
  const [generating, setGenerating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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

        <div className="pub-render-note">
          <strong>O arquivo MP4 ainda não sai daqui.</strong> A prévia já é a composição final; o render para MP4
          (Remotion no backend) é o próximo passo. Quando ele existir, este botão publica no Instagram
          {account?.username ? ` (@${account.username})` : ''} ou agenda no calendário.
        </div>

        {message && <p className="pub-notice">{message}</p>}

        <div className="pub-footer">
          <button className="btn-o" onClick={onClose}>Fechar</button>
          {project.status !== 'salvo' && (
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
          <button className="btn-y" disabled title="Precisa do render em MP4">
            Publicar no Instagram →
          </button>
        </div>
      </div>
    </div>
  )
}

export default PublishModal
