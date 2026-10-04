import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { beatsNeedingImage, errorMessage, imageUrl, LibraryImage, shortsApi } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useLibrary, useProject } from '../hooks/useShorts'
import './ReplaceImage.css'

const googleImages = (q: string) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`

/** 05: uma cena por vez — cole, arraste ou escolha da biblioteca. */
function ReplaceImage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { project, setProject, error, loading } = useProject(id)
  const { byId, setImages } = useLibrary()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [queue, setQueue] = useState<string[] | null>(null)
  const [step, setStep] = useState(0)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LibraryImage[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  // a fila é fixada ao abrir, para não pular cenas enquanto o usuário resolve
  useEffect(() => {
    if (project && queue === null) setQueue(beatsNeedingImage(project).map(b => b.id))
  }, [project, queue])

  const beat = useMemo(() => project?.beats.find(b => b.id === queue?.[step]), [project, queue, step])

  useEffect(() => {
    if (beat) setQuery(beat.query)
  }, [beat?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(() => {
      shortsApi
        .listImages(query)
        .then(async found => {
          const scenes = (list: LibraryImage[]) => list.filter(i => i.kind !== 'figurinha')
          setResults(scenes(found).length ? scenes(found) : scenes(await shortsApi.listImages()))
        })
        .catch(() => setResults([]))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const choose = async (imageId: string | null) => {
    if (!project || !beat) return
    setProject(await shortsApi.setBeatImage(project.id, beat.id, imageId))
  }

  const addAndChoose = async (work: Promise<LibraryImage | LibraryImage[]>) => {
    setBusy(true)
    try {
      const out = await work
      const img = Array.isArray(out) ? out[0] : out
      setImages(prev => [img, ...prev])
      await choose(img.id)
      toast.show(img.catalogued ? `Imagem salva na biblioteca como “${img.name}”` : 'Imagem salva (sem catalogação da IA)')
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const addFiles = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (images.length) addAndChoose(shortsApi.uploadImages(images.slice(0, 1)))
  }

  // Ctrl+V em qualquer lugar da tela: imagem copiada ou link
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) {
        e.preventDefault()
        addFiles(files)
        return
      }
      const text = e.clipboardData?.getData('text')?.trim()
      if (text && /^https?:\/\//.test(text)) {
        e.preventDefault()
        addAndChoose(shortsApi.importImageUrl(text))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  if (loading || queue === null) return <div className="page"><Spinner /></div>
  if (!project) return <div className="page"><p className="form-error">{error}</p></div>

  const back = `/projeto/${project.id}`
  if (queue.length === 0 || !beat) {
    return (
      <div className="page ri-done">
        <h1 className="page-title">✓ Todas as cenas têm imagem</h1>
        <Link to={back} className="btn-y btn-lg">Ver o vídeo →</Link>
      </div>
    )
  }

  const current = beat.imageId ? byId.get(beat.imageId) : undefined
  const isLast = step === queue.length - 1
  const next = () => (isLast ? navigate(back) : setStep(s => s + 1))

  return (
    <div className="replace">
      <header className="rv-top">
        <Link to={back} className="rv-back">← Voltar ao vídeo</Link>
        <span className="spacer" />
        <span className="ri-count">Cena {step + 1} de {queue.length}</span>
        <span className="ri-dots">
          {queue.map((q, i) => (
            <button key={q} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)} aria-label={`Cena ${i + 1}`} />
          ))}
        </span>
        <span className="spacer" />
      </header>

      <div className="ri-body">
        <h1 className="ri-title">Troque a imagem de “{beat.text}”</h1>
        <p className="ri-say">“{beat.say}”</p>

        <div className="ri-main">
          <div className="ri-now">
            <span className="label">Agora no vídeo</span>
            <div className={`ri-frame ${current ? '' : 'empty'}`}>
              {current ? <img src={imageUrl(current)} alt="" /> : <span>sem imagem</span>}
              <span className="ri-frame-cap">{beat.text}</span>
            </div>
            <span className="meta">
              {current ? (beat.locked ? `✓ ${current.name}` : `provisória: ${current.name}`) : 'falta imagem'}
            </span>
          </div>

          <div className="ri-new">
            <span className="label">Nova imagem</span>
            <div
              className={`ri-paste ${dragOver ? 'over' : ''}`}
              onClick={() => fileInput.current?.click()}
              onDragOver={e => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault()
                setDragOver(false)
                const url = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text')
                if (e.dataTransfer.files.length) addFiles(Array.from(e.dataTransfer.files))
                else if (/^https?:\/\//.test(url)) addAndChoose(shortsApi.importImageUrl(url.trim()))
              }}
            >
              {busy ? (
                <>
                  <Spinner />
                  <strong>Salvando e catalogando…</strong>
                </>
              ) : (
                <>
                  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.8" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <strong>Cole a imagem aqui</strong>
                  <span>Ctrl+V · arraste · cole um link · ou clique</span>
                </>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => addFiles(Array.from(e.target.files ?? []))} />

            <div className="ri-search">
              <input className="field" value={query} onChange={e => setQuery(e.target.value)} aria-label="Busca" />
              <a className="btn-y" href={googleImages(query)} target="_blank" rel="noreferrer">
                Procurar no Google ↗
              </a>
            </div>
          </div>
        </div>

        <span className="label ri-lib-label">Ou escolha da sua biblioteca</span>
        {results.length === 0 ? (
          <p className="meta">Sua biblioteca ainda está vazia. As imagens que você colar aqui ficam salvas para os próximos vídeos.</p>
        ) : (
          <div className="ri-lib">
            {results.slice(0, 14).map(img => (
              <button key={img.id} className={img.id === beat.imageId ? 'on' : ''} onClick={() => choose(img.id)} title={img.description}>
                <img src={imageUrl(img)} alt="" loading="lazy" />
                <span>{img.name}</span>
              </button>
            ))}
          </div>
        )}

        <div className="ri-footer">
          {current && !beat.locked && (
            <button className="btn-g" onClick={async () => { await choose(null); next() }}>
              Manter a parecida
            </button>
          )}
          {!current && <button className="btn-o" onClick={next}>Pular por enquanto</button>}
          <button className="btn-y btn-lg" onClick={next} disabled={busy}>
            {isLast ? 'Ver o vídeo →' : 'Próxima cena →'}
          </button>
        </div>
      </div>
      {toast.node}
    </div>
  )
}

export default ReplaceImage
