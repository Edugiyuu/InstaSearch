import { useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { audioUrl, Beat, errorMessage, shortsApi } from '../api/shorts'
import { WhyTopic } from '../components/WhyTopic'
import { ScriptReviewNote } from '../components/ScriptReviewNote'
import { AiBadge, copyText, SearchList, Spinner, useToast } from '../components/flow'
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

/**
 * Roteiro em modo foco (ADR 0038): tela cheia, o texto como um documento, as ações da cena só
 * no hover ou no foco e a voz numa barra fixa embaixo.
 */
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
  const [saved, setSaved] = useState(true)

  if (loading) return <div className="page"><Spinner /></div>
  if (!project) return <div className="page"><p className="form-error">{error}</p></div>

  const saveBeats = async (beats: Beat[]) => {
    setProject({ ...project, beats })
    try {
      setProject(await shortsApi.updateProject(project.id, { beats }))
      setSaved(true)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const editBeat = (beatId: string, changes: Partial<Beat>) => {
    setSaved(false)
    setProject({ ...project, beats: project.beats.map(b => (b.id === beatId ? { ...b, ...changes } : b)) })
  }

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

  const copyNarration = async () => toast.show((await copyText(project.narration)) ? 'Narração copiada' : 'Não deu para copiar')

  const words = project.narration.split(/\s+/).filter(Boolean).length
  const lastReply = project.history[project.history.length - 1]
  const built = project.status !== 'roteiro'
  const auto = project.autopilot

  return (
    <div className="sc-focus">
      <header className="sc-top">
        <Link to="/" className="sc-exit">✕ Sair do foco</Link>
        <span className="sc-top-title">Roteiro · {project.title}</span>
        <span className="sc-saved">{saved ? 'salvo ✓' : 'editando…'}</span>
      </header>

      <main className="sc-doc">
        <h1 className="sc-title">{project.title}</h1>
        <p className="sc-meta">
          {project.beats.length} cenas · ~{Math.round(words / 2.6)}s de fala · clique no texto para editar
        </p>

        {auto?.stage === 'pronto' && !project.audioFile && (
          // ADR 0026: o resto foi feito sozinho; a voz é a parte do usuário
          <p className="sc-auto">🤖 Criado sozinho: o roteiro, a montagem e as imagens estão prontos. Só falta a sua voz.</p>
        )}

        {/* o "como a IA escreveu" fica recolhido: quem quer conferir abre */}
        {(project.ai?.script || auto?.why || auto?.review) && (
          <details className="sc-how">
            <summary>Como a IA escreveu</summary>
            <div className="sc-how-body">
              {project.ai?.script && (
                <div className="sc-credits">
                  <AiBadge label="Roteiro" ai={project.ai.script} />
                  {lastReply?.ai && <AiBadge label="Última mudança" ai={lastReply.ai} />}
                </div>
              )}
              <SearchList ai={project.ai?.script} />
              {auto?.why && <WhyTopic autopilot={auto} />}
              {auto?.review && <ScriptReviewNote autopilot={auto} />}
            </div>
          </details>
        )}

        <ol className="sc-beats">
          {project.beats.map(b => (
            <li key={b.id} className="sc-beat">
              <div className="sc-beat-head">
                <input
                  className="sc-caption"
                  value={b.text}
                  onChange={e => editBeat(b.id, { text: e.target.value })}
                  onBlur={() => saveBeats(project.beats)}
                  aria-label="Legenda na tela"
                />
                <span className="sc-tools">
                  <span title="O que a montagem busca na web para esta cena">▣ {b.query}</span>
                  <button onClick={() => saveBeats(project.beats.filter(x => x.id !== b.id))}>✕ tirar</button>
                </span>
              </div>
              <textarea
                className="sc-say"
                value={b.say}
                rows={1}
                onChange={e => editBeat(b.id, { say: e.target.value })}
                onBlur={() => saveBeats(project.beats)}
                aria-label="Fala"
              />
            </li>
          ))}
        </ol>

        <div className="sc-ask">
          <span>✨</span>
          <input
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
      </main>

      {/* a voz numa barra fixa: é o que falta para montar */}
      <footer className="sc-voice">
        <div className="sc-voice-label">
          <strong>Voz</strong>
          <span>{project.audioFile ? 'Enviada.' : built ? 'O vídeo já foi montado: a voz acerta o tempo.' : 'Falta só isso para montar.'}</span>
        </div>

        {project.audioFile ? (
          <div className="sc-audio">
            <audio controls src={audioUrl(project)} />
            <span className="meta">
              {project.audioDuration ? `${project.audioDuration.toFixed(1)}s · ` : ''}
              <button className="act" onClick={() => audioInput.current?.click()}>Trocar áudio</button>
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
            {uploading ? <Spinner /> : <strong>⭱ Arraste o áudio ou clique (mp3, wav, m4a)</strong>}
          </div>
        )}
        <input ref={audioInput} type="file" accept="audio/*" hidden onChange={e => uploadAudio(e.target.files?.[0])} />

        <button className="btn-g" onClick={copyNarration} title="Para gravar no celular ou no ElevenLabs">⧉ Copiar texto</button>

        <span className="spacer" />
        {built ? (
          // já montado (à mão ou sozinho): a voz só ajusta o tempo, então o caminho é revisar;
          // montar de novo continua possível, mas escolhe outra vez as imagens que não foram travadas
          <>
            <button className="btn-o" onClick={() => navigate(`/projeto/${project.id}/montagem`)}>↻ Montar de novo</button>
            <button className="btn-y btn-lg" onClick={() => navigate(`/projeto/${project.id}`)}>Revisar o vídeo →</button>
          </>
        ) : (
          <button
            className="btn-y btn-lg"
            onClick={() => navigate(`/projeto/${project.id}/montagem`)}
            title={project.audioFile ? undefined : 'Dá para montar sem áudio e subir depois'}
          >
            {project.audioFile ? 'Montar →' : 'Montar sem voz →'}
          </button>
        )}
      </footer>
      {toast.node}
    </div>
  )
}

export default Script
