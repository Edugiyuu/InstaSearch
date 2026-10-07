import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  beatsNeedingImage,
  errorMessage,
  imageUrl,
  LibraryImage,
  shortsApi,
  WEB_SOURCE_LABEL,
  WebImage,
  WebSearchResult,
  webThumbUrl,
} from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useLibrary, useProject } from '../hooks/useShorts'
import './ReplaceImage.css'

const googleImages = (q: string) => `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`

const FIRST_SUGGESTIONS = 10

/** 05: uma cena por vez — escolha uma sugestão da internet, cole, arraste ou use a biblioteca. */
function ReplaceImage() {
  const { id } = useParams()
  const [params] = useSearchParams()
  /** ?cena=<id da cena>: trocar a imagem de uma cena específica (vindo da revisão). */
  const only = params.get('cena')
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
  const [web, setWeb] = useState<WebSearchResult | null>(null)
  const [webLoading, setWebLoading] = useState(false)
  const [webError, setWebError] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [importing, setImporting] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [autoBusy, setAutoBusy] = useState(false)
  const webRun = useRef(0)

  // a fila é fixada ao abrir, para não pular cenas enquanto o usuário resolve.
  // Uma cena pedida pela revisão abre só ela; sem cena faltando imagem, todas ficam disponíveis para trocar.
  useEffect(() => {
    if (!project || queue !== null) return
    const needing = beatsNeedingImage(project).map(b => b.id)
    if (only && project.beats.some(b => b.id === only)) setQueue([only])
    else setQueue(needing.length ? needing : project.beats.map(b => b.id))
  }, [project, queue, only])

  const beat = useMemo(() => project?.beats.find(b => b.id === queue?.[step]), [project, queue, step])

  const searchWeb = async (q: string, characters: string[], tags: string[] = [], p = 1) => {
    if (!q.trim()) return
    const run = ++webRun.current
    setWebLoading(true)
    setWebError('')
    setShowAll(false)
    setPage(p)
    try {
      const found = await shortsApi.searchWebImages(q, { characters, tags, context: project?.title ?? '', page: p, projectId: project?.id })
      if (run === webRun.current) setWeb(found)
    } catch (e) {
      if (run === webRun.current) {
        setWeb(null)
        setWebError(errorMessage(e))
      }
    } finally {
      if (run === webRun.current) setWebLoading(false)
    }
  }

  // cada cena já abre com as sugestões buscadas
  useEffect(() => {
    if (!beat) return
    setQuery(beat.query)
    searchWeb(beat.query, beat.characters, beat.searchTags)
  }, [beat?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!query.trim()) return
    const t = setTimeout(() => {
      shortsApi
        .listImages(query)
        .then(async found => {
          const scenes = (list: LibraryImage[]) => list.filter(i => i.kind !== 'figurinha' && i.kind !== 'video')
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
      toast.show(
        img.cataloguing
          ? 'Imagem salva na biblioteca. A IA cataloga em segundo plano.'
          : img.catalogued
            ? `Imagem salva na biblioteca como “${img.name}”`
            : 'Imagem salva (sem catalogação da IA)',
      )
      return true
    } catch (e) {
      toast.show(errorMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const pickWeb = async (img: WebImage) => {
    if (busy) return
    setImporting(img.id)
    const ok = await addAndChoose(
      shortsApi.importImageUrl(img.url, {
        fallbackUrl: img.thumb !== img.url ? img.thumb : undefined,
        name: img.title,
        characters: img.characters,
        background: true,
      }),
    )
    setImporting(null)
    if (ok) next()
  }

  const addFiles = (files: File[]) => {
    const images = files.filter(f => f.type.startsWith('image/'))
    if (images.length) addAndChoose(shortsApi.uploadImages(images.slice(0, 1), undefined, true))
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
        addAndChoose(shortsApi.importImageUrl(text, { background: true }))
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  if (loading || queue === null) return <div className="page"><Spinner /></div>
  if (!project) return <div className="page"><p className="form-error">{error}</p></div>

  // volta para a revisão na cena que estava aberta
  const beatIndex = beat ? project.beats.findIndex(b => b.id === beat.id) : -1
  const back = `/projeto/${project.id}${beatIndex >= 0 ? `?cena=${beatIndex + 1}` : ''}`
  const missing = beatsNeedingImage(project).length
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
  function next() {
    if (isLast) navigate(back)
    else setStep(s => s + 1)
  }

  // texto editado à mão: personagens e etiquetas da cena podem não valer mais, o servidor tira do texto
  const runSearch = (p = 1) => {
    const same = query.trim() === beat.query.trim()
    searchWeb(query, same ? beat.characters : [], same ? beat.searchTags : [], p)
  }

  const autoFill = async () => {
    setAutoBusy(true)
    try {
      const out = await shortsApi.autoImages(project.id)
      setProject(out.project)
      setImages(await shortsApi.listImages())
      toast.show(
        out.added === out.total
          ? `Coloquei imagem em ${out.added} ${out.added === 1 ? 'cena' : 'cenas'}. Confira no vídeo.`
          : `Coloquei imagem em ${out.added} de ${out.total} cenas. As outras continuam aqui.`,
      )
      if (out.added === out.total) navigate(`/projeto/${project.id}`)
      else setQueue(beatsNeedingImage(out.project).map(b => b.id))
      setStep(0)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setAutoBusy(false)
    }
  }
  const suggestions = web?.images ?? []
  const visible = showAll ? suggestions : suggestions.slice(0, FIRST_SUGGESTIONS)

  return (
    <div className="replace">
      <header className="rv-top">
        <Link to={back} className="rv-back">← Voltar ao vídeo</Link>
        <span className="spacer" />
        <span className="ri-count">{queue.length === 1 ? `Cena ${beatIndex + 1} do vídeo` : `Cena ${step + 1} de ${queue.length}`}</span>
        <span className="ri-dots">
          {queue.map((q, i) => (
            <button key={q} className={i === step ? 'on' : i < step ? 'done' : ''} onClick={() => setStep(i)} aria-label={`Cena ${i + 1}`} />
          ))}
        </span>
        <span className="spacer" />
        {missing > 0 && (
          <button className="btn-g ri-auto" onClick={autoFill} disabled={autoBusy || busy} title="Busca na internet e coloca a melhor imagem em cada cena que falta">
            {autoBusy ? <><Spinner /> Colocando imagens…</> : `✨ Preencher ${missing > 1 ? `as ${missing} cenas` : 'a cena'} automaticamente`}
          </button>
        )}
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
            <div className="ri-web-head">
              <span className="label">Sugestões para esta cena</span>
              <span className="meta">Clique em uma para usar. Ela vai para a sua biblioteca.</span>
            </div>

            <form
              className="ri-search"
              onSubmit={e => {
                e.preventDefault()
                runSearch(1)
              }}
            >
              <input className="field" value={query} onChange={e => setQuery(e.target.value)} aria-label="O que procurar" />
              <button className="btn-y" type="submit" disabled={webLoading}>
                Buscar
              </button>
              <a className="btn-g" href={googleImages(query)} target="_blank" rel="noreferrer" title="Abrir no Google Imagens">
                Google ↗
              </a>
            </form>
            {beat.twist && (
              // o roteiro sugeriu um meme ou uma variação para esta cena (ADR 0020)
              <button
                className="act ri-twist"
                onClick={() => {
                  setQuery(beat.twist!.query)
                  searchWeb(beat.twist!.query, beat.characters, beat.twist!.tags ?? [])
                }}
              >
                {beat.twist.kind === 'meme' ? '😂 Buscar o meme' : '✨ Buscar a variação'}: “{beat.twist.query}”
              </button>
            )}

            {webLoading ? (
              <div className="ri-web">
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} className="ri-web-card skeleton" />
                ))}
              </div>
            ) : webError ? (
              <p className="form-error">{webError}</p>
            ) : suggestions.length === 0 ? (
              <div className="ri-web-empty">
                <strong>{page > 1 ? 'Acabaram as outras opções.' : `Não achei sugestões para “${query}”.`}</strong>
                <span>Escreva o nome do personagem (ex.: “Goku sorrindo”) e clique em Buscar, ou cole uma imagem abaixo.</span>
              </div>
            ) : (
              <>
                <div className="ri-web">
                  {visible.map(img => (
                    <button
                      key={img.id}
                      className={`ri-web-card ${importing === img.id ? 'loading' : ''}`}
                      onClick={() => pickWeb(img)}
                      disabled={busy}
                      title={`${img.title} · ${WEB_SOURCE_LABEL[img.source]}`}
                    >
                      <img
                        src={webThumbUrl(img)}
                        alt={img.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={e => {
                          // fora dos domínios do backend: tenta direto
                          if (e.currentTarget.src !== img.thumb) e.currentTarget.src = img.thumb
                        }}
                      />
                      <span className={`ri-web-src ${img.source}`}>{WEB_SOURCE_LABEL[img.source]}</span>
                      <span className="ri-web-name">{img.title}</span>
                      {importing === img.id ? (
                        <span className="ri-web-busy">
                          <Spinner />
                        </span>
                      ) : (
                        <span className="ri-web-use">Usar esta</span>
                      )}
                    </button>
                  ))}
                </div>
                <div className="ri-web-foot">
                  {suggestions.length > FIRST_SUGGESTIONS && (
                    <button className="btn-g" onClick={() => setShowAll(v => !v)}>
                      {showAll ? 'Mostrar menos' : `Ver mais ${suggestions.length - FIRST_SUGGESTIONS}`}
                    </button>
                  )}
                  <button className="btn-g" onClick={() => runSearch(page + 1)} title="Busca outras imagens para a mesma cena">
                    ↻ Outras opções
                  </button>
                  <span className="meta">
                    {web?.searched.join(' · ')}
                  </span>
                </div>
              </>
            )}

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
                else if (/^https?:\/\//.test(url)) addAndChoose(shortsApi.importImageUrl(url.trim(), { background: true }))
              }}
            >
              {busy && !importing ? (
                <>
                  <Spinner />
                  <strong>Salvando…</strong>
                </>
              ) : (
                <>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.8" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  <div>
                    <strong>Tem outra imagem? Cole aqui</strong>
                    <span>Ctrl+V · arraste · cole um link · ou clique</span>
                  </div>
                </>
              )}
            </div>
            <input ref={fileInput} type="file" accept="image/*" hidden onChange={e => addFiles(Array.from(e.target.files ?? []))} />
          </div>
        </div>

        <span className="label ri-lib-label">Ou escolha da sua biblioteca</span>
        {results.length === 0 ? (
          <p className="meta">Sua biblioteca ainda está vazia. As imagens que você escolher aqui ficam salvas para os próximos vídeos.</p>
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
