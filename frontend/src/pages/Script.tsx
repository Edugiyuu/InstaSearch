import { useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { audioUrl, Beat, errorMessage, shortsApi } from '../api/shorts'
import { AiBadge, copyText, Spinner, Stepper, useToast } from '../components/flow'
import { useProject } from '../hooks/useShorts'
import './Script.css'

/** Mede a duração de um áudio no navegador. */
function measureAudio(src: string) {
  return new Promise<number>(resolve => {
    const a = new Audio(src)
    a.onloadedmetadata = () => resolve(a.duration)
    a.onerror = () => resolve(0)
  })
}

function Script() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { project, setProject, error, loading } = useProject(id)
  const toast = useToast()
  const audioInput = useRef<HTMLInputElement>(null)
  const [request, setRequest] = useState('')
  const [adjusting, setAdjusting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  if (loading) return <div className="page"><Spinner /></div>
  if (!project) return <div className="page"><p className="form-error">{error}</p></div>

  const saveBeats = async (beats: Beat[]) => {
    setProject({ ...project, beats })
    try {
      setProject(await shortsApi.updateProject(project.id, { beats }))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const editBeat = (beatId: string, changes: Partial<Beat>) =>
    setProject({ ...project, beats: project.beats.map(b => (b.id === beatId ? { ...b, ...changes } : b)) })

  const askAdjust = async () => {
    if (!request.trim()) return
    setAdjusting(true)
    try {
      setProject(await shortsApi.adjust(project.id, request))
      setRequest('')
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setAdjusting(false)
    }
  }

  const uploadAudio = async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const updated = await shortsApi.uploadAudio(project.id, file)
      const seconds = await measureAudio(audioUrl(updated)!)
      setProject(seconds ? await shortsApi.updateProject(project.id, { audioDuration: seconds }) : updated)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setUploading(false)
    }
  }

  const words = project.narration.split(/\s+/).filter(Boolean).length
  const lastReply = project.history[project.history.length - 1]

  return (
    <div className="page script">
      <Stepper current={2} />
      <div className="page-head">
        <div>
          <h1 className="page-title">{project.title}</h1>
          <p className="page-sub">
            {project.beats.length} cenas · ~{Math.round(words / 2.6)}s de fala · edite o texto direto ou peça para a IA
          </p>
          {project.ai?.script && (
            <div className="sc-credits">
              <AiBadge label="Roteiro" ai={project.ai.script} />
              {lastReply?.ai && <AiBadge label="Última mudança" ai={lastReply.ai} />}
            </div>
          )}
        </div>
      </div>

      <div className="sc-body">
        <section>
          <div className="sc-ask">
            <span className="sc-ask-icon">✨</span>
            <input
              className="field"
              value={request}
              onChange={e => setRequest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && askAdjust()}
              placeholder="Peça uma mudança: “gancho mais polêmico”, “tira a parte do Kaido”…"
              disabled={adjusting}
            />
            <button className="btn-g" onClick={askAdjust} disabled={adjusting || !request.trim()}>
              {adjusting ? <Spinner /> : 'Mudar'}
            </button>
          </div>
          {lastReply && <p className="sc-reply">✓ {lastReply.reply}</p>}

          <ol className="sc-beats">
            {project.beats.map((b, i) => (
              <li key={b.id} className="sc-beat">
                <span className="sc-n">{i + 1}</span>
                <div className="sc-beat-main">
                  <input
                    className="sc-caption"
                    value={b.text}
                    onChange={e => editBeat(b.id, { text: e.target.value })}
                    onBlur={() => saveBeats(project.beats)}
                    aria-label="Legenda na tela"
                  />
                  <textarea
                    className="sc-say"
                    value={b.say}
                    rows={1}
                    onChange={e => editBeat(b.id, { say: e.target.value })}
                    onBlur={() => saveBeats(project.beats)}
                    aria-label="Fala"
                  />
                  <span className="sc-query">▣ {b.query}</span>
                </div>
                <button
                  className="sc-remove"
                  title="Tirar esta cena"
                  onClick={() => saveBeats(project.beats.filter(x => x.id !== b.id))}
                >
                  ✕
                </button>
              </li>
            ))}
          </ol>
        </section>

        <aside className="panel sc-voice">
          <h2 className="panel-title">Sua voz</h2>
          <p className="sc-voice-hint">Grave lendo o texto abaixo no celular ou no ElevenLabs e suba o áudio aqui.</p>

          <div className="sc-narration">{project.narration}</div>
          <button
            className="act"
            onClick={async () => toast.show((await copyText(project.narration)) ? 'Narração copiada' : 'Não deu para copiar')}
          >
            ⧉ Copiar narração
          </button>

          {project.audioFile ? (
            <div className="sc-audio">
              <audio controls src={audioUrl(project)} />
              <span className="meta">
                {project.audioDuration ? `${project.audioDuration.toFixed(1)}s` : ''}
                <button className="act" onClick={() => audioInput.current?.click()}>
                  Trocar áudio
                </button>
              </span>
            </div>
          ) : (
            <div
              className={`drop sc-drop ${dragOver ? 'over' : ''}`}
              onClick={() => audioInput.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                uploadAudio(e.dataTransfer.files[0])
              }}
            >
              {uploading ? (
                <Spinner />
              ) : (
                <>
                  <strong>⭱ Subir áudio</strong>
                  <span>mp3, wav ou m4a</span>
                </>
              )}
            </div>
          )}
          <input ref={audioInput} type="file" accept="audio/*" hidden onChange={e => uploadAudio(e.target.files?.[0])} />

          <button className="btn-y btn-lg sc-next" onClick={() => navigate(`/projeto/${project.id}/montagem`)}>
            Montar automaticamente →
          </button>
          {!project.audioFile && <p className="meta sc-next-note">Dá para montar sem áudio e subir depois.</p>}
        </aside>
      </div>
      {toast.node}
    </div>
  )
}

export default Script
