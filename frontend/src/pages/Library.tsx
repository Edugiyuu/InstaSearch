import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { errorMessage, imageUrl, LibraryImage, mediaUrl, shortsApi } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useCatchphrases, useLibrary, useSounds, useStyles, useTones } from '../hooks/useShorts'
import SoundLibrary from './SoundLibrary'
import CatchphraseLibrary from './CatchphraseLibrary'
import ToneLibrary from './ToneLibrary'
import TagEditor from '../components/TagEditor'
import './Library.css'

// sem aba "Imagens": as imagens das cenas vêm só da web, a cada vídeo (ADR 0022, 1B)
const TABS = [
  { id: 'sfx', label: 'Efeitos sonoros' },
  { id: 'musica', label: 'Músicas' },
  { id: 'bordoes', label: 'Bordões' },
  { id: 'tons', label: 'Tons' },
  { id: 'videos', label: 'Vídeos' },
] as const

type Tab = (typeof TABS)[number]['id']

function Library() {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find(t => t.id === params.get('aba'))?.id as Tab | undefined

  // sem aba na URL: a porta de entrada (ADR 0038)
  if (!tab) return <LibraryHub />

  return (
    <div className="page library">
      <div className="page-head lib-head">
        <Link to="/biblioteca" className="back-link">
          ← Biblioteca
        </Link>
        <h1 className="page-title">Biblioteca</h1>
        <nav className="lib-tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setParams({ aba: t.id })}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'videos' && <VideoLibrary />}
      {tab === 'sfx' && <SoundLibrary key="sfx" kind="sfx" />}
      {tab === 'musica' && <SoundLibrary key="musica" kind="musica" />}
      {tab === 'bordoes' && <CatchphraseLibrary />}
      {tab === 'tons' && <ToneLibrary />}
    </div>
  )
}

/** Porta de entrada: um cartão por coleção, com a contagem real (ou "…" enquanto carrega). */
function LibraryHub() {
  const { styles, loading: stylesLoading } = useStyles()
  const { tones, loaded: tonesLoaded } = useTones()
  const { images, loading: imagesLoading } = useLibrary()
  const { sounds, loading: soundsLoading } = useSounds()
  const { catchphrases, loaded: catchphrasesLoaded } = useCatchphrases()

  const count = (ready: boolean, n: number) => (ready ? String(n) : '…')
  const cards = [
    { to: '/estilos', icon: '✦', title: 'Estilos', text: 'Ritmo, efeitos, legenda e música de cada tipo de vídeo', n: count(!stylesLoading, styles.length) },
    { to: '/biblioteca?aba=tons', icon: '🎙', title: 'Tons', text: 'Como a IA fala no roteiro', n: count(tonesLoaded, tones.length) },
    { to: '/biblioteca?aba=sfx', icon: '🔊', title: 'Efeitos sonoros', text: 'Whoosh, vine boom… ou o áudio de um Reel', n: count(!soundsLoading, sounds.filter(s => s.kind === 'sfx').length) },
    { to: '/biblioteca?aba=musica', icon: '♪', title: 'Músicas', text: 'O fundo dos vídeos', n: count(!soundsLoading, sounds.filter(s => s.kind === 'musica').length) },
    { to: '/biblioteca?aba=bordoes', icon: '▶', title: 'Bordões', text: 'Abertura, a virada no meio e o final', n: count(catchphrasesLoaded, catchphrases.length) },
    { to: '/biblioteca?aba=videos', icon: '🎞', title: 'Vídeos', text: 'Episódios divididos em cenas, para usar na troca de imagem', n: count(!imagesLoading, images.filter(i => i.kind === 'video').length) },
  ]

  return (
    <div className="page library">
      <div className="page-head">
        <div>
          <h1 className="page-title">Biblioteca</h1>
          <p className="page-sub">Os ingredientes que a IA usa para montar.</p>
        </div>
      </div>
      <div className="lib-hub">
        {cards.map(c => (
          <Link key={c.to} to={c.to} className="lib-hub-card">
            <span className="lib-hub-icon">{c.icon}</span>
            <span className="lib-hub-count">{c.n}</span>
            <strong>{c.title}</strong>
            <span className="lib-hub-text">{c.text}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

const STAGE: Record<NonNullable<LibraryImage['processing']>['stage'], string> = {
  preparando: 'convertendo',
  cortes: 'achando os cortes',
  catalogando: 'a IA está vendo as cenas',
  pronto: 'pronto',
  erro: 'deu erro',
}

const busy = (v: LibraryImage) => !!v.processing && v.processing.stage !== 'pronto' && v.processing.stage !== 'erro'

const seconds = (n: number) => `${n.toFixed(1).replace('.', ',')}s`

const usage = (img: LibraryImage) =>
  img.usedIn.length === 0 ? 'nunca usada' : `usada em ${img.usedIn.length} ${img.usedIn.length === 1 ? 'vídeo' : 'vídeos'}`

/** Cenas de vídeo: um episódio enviado vira várias cenas. */
function VideoLibrary() {
  const { images, setImages, loading, error } = useLibrary()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Set<string> | null>(null)
  const [character, setCharacter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [videoId, setVideoId] = useState<string | null>(null)
  const [hint, setHint] = useState('')
  const [sending, setSending] = useState<{ name: string; progress: number } | null>(null)

  // busca no backend (linguagem natural) com um pequeno atraso
  useEffect(() => {
    if (!query.trim()) {
      setFound(null)
      return
    }
    const t = setTimeout(() => {
      shortsApi.listImages(query).then(r => setFound(new Set(r.map(i => i.id)))).catch(() => setFound(new Set()))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const pool = useMemo(() => images.filter(i => i.kind === 'cena'), [images])
  const videoList = useMemo(() => images.filter(i => i.kind === 'video'), [images])
  const processing = videoList.some(busy)
  const cataloguing = images.some(i => i.cataloguing)

  // enquanto um vídeo é dividido em cenas ou a IA cataloga imagens novas, atualiza a lista
  useEffect(() => {
    if (!processing && !cataloguing) return
    const t = setInterval(() => {
      shortsApi.listImages().then(setImages).catch(() => undefined)
    }, 3000)
    return () => clearInterval(t)
  }, [processing, cataloguing, setImages])

  const characters = useMemo(() => {
    const count = new Map<string, number>()
    pool.forEach(i => i.characters.forEach(c => count.set(c, (count.get(c) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [pool])

  const visible = pool.filter(
    i =>
      (!found || found.has(i.id)) &&
      (!character || i.characters.includes(character)) &&
      (!videoId || i.videoId === videoId),
  )
  const selected = pool.find(i => i.id === selectedId) ?? visible[0]

  const sendVideo = async (file: File) => {
    setSending({ name: file.name, progress: 0 })
    try {
      const video = await shortsApi.uploadVideo(file, hint, progress => setSending({ name: file.name, progress }))
      setImages(prev => [video, ...prev])
      setVideoId(video.id)
      toast.show('Vídeo enviado. A divisão em cenas continua sozinha; pode sair desta tela.')
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setSending(null)
    }
  }

  const upload = (files: File[]) => {
    const file = files.find(f => f.type.startsWith('video/') || /\.(mkv|avi|mov|m4v|webm|mp4)$/i.test(f.name))
    if (file) sendVideo(file)
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const files = Array.from(e.clipboardData?.files ?? [])
      if (files.length) upload(files)
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  })

  const update = async (img: LibraryImage, changes: Partial<LibraryImage>, persist = true) => {
    setImages(prev => prev.map(i => (i.id === img.id ? { ...i, ...changes } : i)))
    if (!persist) return
    try {
      await shortsApi.updateImage(img.id, changes)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const remove = async (img: LibraryImage) => {
    const what = img.kind === 'video' ? `o vídeo “${img.name}” e todas as cenas dele` : `“${img.name}”`
    if (!confirm(`Apagar ${what} da biblioteca?`)) return
    await shortsApi.deleteImage(img.id)
    setImages(prev => prev.filter(i => i.id !== img.id && i.videoId !== img.id))
    setSelectedId(null)
    if (videoId === img.id) setVideoId(null)
  }

  const reprocess = async (video: LibraryImage) => {
    try {
      const fresh = await shortsApi.reprocessVideo(video.id)
      setImages(prev => [fresh, ...prev.filter(i => i.id !== video.id && i.videoId !== video.id)])
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const recatalog = async (img: LibraryImage) => {
    try {
      const fresh = await shortsApi.recatalogImage(img.id)
      setImages(prev => prev.map(i => (i.id === img.id ? fresh : i)))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  return (
    <div
      className={`lib-view ${dragOver ? 'dragging' : ''}`}
      onDragOver={e => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={e => e.currentTarget === e.target && setDragOver(false)}
      onDrop={e => {
        e.preventDefault()
        setDragOver(false)
        upload(Array.from(e.dataTransfer.files))
      }}
    >
      <div className="lib-toolbar">
        <input
          className="field lib-search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Busque a cena: “gojo tirando a venda”, “sukuna luta”"
        />
        <input
            className="field lib-video-hint"
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="De qual anime e episódio? (ajuda a IA)"
          />
        <button className="btn-y" onClick={() => fileInput.current?.click()} disabled={!!sending}>
          ⭱ Importar vídeo
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="video/*,.mkv,.avi"
          hidden
          onChange={e => {
            upload(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>
      <p className="lib-hint">
        Envie um episódio ou trecho do anime: ele é dividido em cenas nos cortes e a IA descreve cada uma (quem aparece, o que acontece). Para usar uma cena, escolha na tela de troca de imagem da cena. O som do episódio não entra no Short.
      </p>

      {(sending || videoList.length > 0) && (
        <div className="lib-videos">
          {sending && (
            <div className="lib-video busy">
              <span className="lib-video-thumb"><Spinner /></span>
              <div>
                <strong>{sending.name}</strong>
                <span className="meta">enviando {Math.round(sending.progress * 100)}%</span>
                <span className="lib-bar"><i style={{ width: `${sending.progress * 100}%` }} /></span>
              </div>
            </div>
          )}
          {videoList.map(v => {
            const scenes = pool.filter(s => s.videoId === v.id).length
            const p = v.processing
            return (
              <div
                key={v.id}
                className={`lib-video ${videoId === v.id ? 'on' : ''} ${busy(v) ? 'busy' : ''}`}
                onClick={() => setVideoId(videoId === v.id ? null : v.id)}
              >
                <span className="lib-video-thumb">{v.thumb ? <img src={imageUrl(v)} alt="" /> : <Spinner />}</span>
                <div>
                  <strong title={v.name}>{v.name}</strong>
                  {p && busy(v) ? (
                    <>
                      <span className="meta">{STAGE[p.stage]} · {Math.round(p.progress * 100)}%</span>
                      <span className="lib-bar"><i style={{ width: `${p.progress * 100}%` }} /></span>
                    </>
                  ) : p?.stage === 'erro' ? (
                    <span className="meta lib-video-error" title={p.error}>{p.error ?? 'deu erro'}</span>
                  ) : (
                    <span className="meta">
                      {scenes} {scenes === 1 ? 'cena' : 'cenas'}
                      {v.duration ? ` · ${Math.round(v.duration / 60)} min` : ''}
                      {p?.error ? ` · ${p.error}` : ''}
                    </span>
                  )}
                  <span className="lib-video-actions" onClick={e => e.stopPropagation()}>
                    {p?.stage === 'erro' && <button className="act" onClick={() => reprocess(v)}>Tentar de novo</button>}
                    {!busy(v) && <button className="act" onClick={() => remove(v)}>Apagar</button>}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="lib-filters">
        {characters.length > 0 && (
          <div className="chips">
            <button className={`chip ${character === null ? 'on' : ''}`} onClick={() => setCharacter(null)}>Todos</button>
            {characters.map(([c, n]) => (
              <button key={c} className={`chip ${character === c ? 'on' : ''}`} onClick={() => setCharacter(c)}>
                {c} <span className="lib-count">{n}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lib-body">
        <section>
          <h2 className="lib-total">
            {visible.length}{' '}
            {visible.length === 1 ? 'cena' : 'cenas'}
            {character ? ` do ${character}` : ''}
          </h2>
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <Spinner />
          ) : pool.length === 0 ? (
            sending || videoList.length > 0 ? (
              <p className="meta">As cenas aparecem aqui quando a divisão terminar.</p>
            ) : (
              <button className="lib-empty" onClick={() => fileInput.current?.click()}>
                <strong>Nenhum vídeo ainda</strong>
                <span>
                  Importe episódios ou trechos (mp4, mkv, mov). Cada corte do episódio vira uma cena que pode entrar no Short, em movimento.
                </span>
              </button>
            )
          ) : (
            <div className="lib-grid">
              {visible.map(img => (
                <button key={img.id} className={`lib-card ${selected?.id === img.id ? 'on' : ''}`} onClick={() => setSelectedId(img.id)}>
                  <span className="lib-img">
                    <img src={imageUrl(img)} alt="" loading="lazy" />
                    {img.clip && <em className="lib-clip-len">▶ {seconds(img.clip.end - img.clip.start)}</em>}
                  </span>
                  <strong>{img.name}</strong>
                  <span>{img.cataloguing ? 'catalogando…' : usage(img)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <aside className="panel lib-detail">
            <div className="lib-big">
              {selected.clip ? <ClipPreview img={selected} /> : <img src={imageUrl(selected)} alt="" />}
              {selected.regions.map(r => (
                <span
                  key={r.label}
                  className="lib-region"
                  style={{ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` }}
                >
                  <em>{r.label}</em>
                </span>
              ))}
            </div>
            <input
              className="lib-name"
              value={selected.name}
              onChange={e => update(selected, { name: e.target.value }, false)}
              onBlur={e => update(selected, { name: e.target.value })}
            />
            <span className="meta">{usage(selected)}{selected.description ? ` · ${selected.description}` : ''}</span>

            <TagEditor label="Quem aparece" values={selected.characters} accent onChange={characters => update(selected, { characters })} />
            <TagEditor label="Do que se trata" values={selected.tags} onChange={tags => update(selected, { tags })} />

            {selected.regions.length > 0 && <p className="meta lib-zoom-hint">As caixas mostram onde o vídeo dá zoom.</p>}
            {selected.cataloguing ? (
              <p className="meta"><Spinner /> A IA está catalogando esta imagem…</p>
            ) : !selected.catalogued && (
              <button className="act" onClick={() => recatalog(selected)}>✨ Catalogar com a IA</button>
            )}

            <button className="btn-o lib-delete" onClick={() => remove(selected)}>Apagar</button>
          </aside>
        )}
      </div>
      {toast.node}
    </div>
  )
}

/** Toca o trecho da cena em repetição, sem som. */
function ClipPreview({ img }: { img: LibraryImage }) {
  const ref = useRef<HTMLVideoElement>(null)
  const clip = img.clip!
  useEffect(() => {
    const v = ref.current
    if (!v) return
    const restart = () => {
      v.currentTime = clip.start
      v.play().catch(() => undefined)
    }
    const loop = () => {
      if (v.currentTime >= clip.end || v.currentTime < clip.start - 0.5) restart()
    }
    if (v.readyState >= 1) restart()
    v.addEventListener('loadedmetadata', restart)
    v.addEventListener('timeupdate', loop)
    return () => {
      v.removeEventListener('loadedmetadata', restart)
      v.removeEventListener('timeupdate', loop)
    }
  }, [clip.start, clip.end])
  return <video ref={ref} src={mediaUrl(img)} poster={imageUrl(img)} muted playsInline preload="metadata" />
}

export default Library
