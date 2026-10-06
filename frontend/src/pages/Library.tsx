import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage, imageUrl, LibraryImage, MediaKind, mediaUrl, shortsApi } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useLibrary } from '../hooks/useShorts'
import SoundLibrary from './SoundLibrary'
import CatchphraseLibrary from './CatchphraseLibrary'
import TagEditor from '../components/TagEditor'
import './Library.css'

const TABS = [
  { id: 'imagens', label: 'Imagens' },
  { id: 'videos', label: 'Vídeos' },
  { id: 'figurinhas', label: 'Figurinhas' },
  { id: 'sfx', label: 'Efeitos sonoros' },
  { id: 'musica', label: 'Músicas' },
  { id: 'bordoes', label: 'Bordões' },
] as const

type Tab = (typeof TABS)[number]['id']

function Library() {
  const [params, setParams] = useSearchParams()
  const tab = (TABS.find(t => t.id === params.get('aba'))?.id ?? 'imagens') as Tab

  return (
    <div className="page library">
      <div className="page-head lib-head">
        <h1 className="page-title">Biblioteca</h1>
        <nav className="lib-tabs">
          {TABS.map(t => (
            <button key={t.id} className={tab === t.id ? 'on' : ''} onClick={() => setParams({ aba: t.id })}>
              {t.label}
            </button>
          ))}
        </nav>
      </div>
      {tab === 'imagens' && <ImageLibrary key="imagens" mode="imagens" />}
      {tab === 'videos' && <ImageLibrary key="videos" mode="videos" />}
      {tab === 'figurinhas' && <ImageLibrary key="figurinhas" mode="figurinhas" />}
      {tab === 'sfx' && <SoundLibrary key="sfx" kind="sfx" />}
      {tab === 'musica' && <SoundLibrary key="musica" kind="musica" />}
      {tab === 'bordoes' && <CatchphraseLibrary />}
    </div>
  )
}

const KINDS: { id: MediaKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'imagem', label: 'Imagens' },
  { id: 'meme', label: 'Memes' },
  { id: 'print', label: 'Prints' },
  { id: 'logo', label: 'Logos' },
]

type Mode = 'imagens' | 'videos' | 'figurinhas'

const inMode = (img: LibraryImage, mode: Mode) =>
  mode === 'figurinhas' ? img.kind === 'figurinha' : mode === 'videos' ? img.kind === 'cena' : !['figurinha', 'cena', 'video'].includes(img.kind)

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

/**
 * Imagens das cenas, cenas de vídeo (um episódio enviado vira várias cenas) ou figurinhas
 * (recortes com fundo transparente que entram no lugar dos emojis).
 */
function ImageLibrary({ mode }: { mode: Mode }) {
  const stickers = mode === 'figurinhas'
  const videos = mode === 'videos'
  const navigate = useNavigate()
  const { images, setImages, loading, error } = useLibrary()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [found, setFound] = useState<Set<string> | null>(null)
  const [kind, setKind] = useState<MediaKind | 'all'>('all')
  const [character, setCharacter] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [uploading, setUploading] = useState(0)
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

  const pool = useMemo(() => images.filter(i => inMode(i, mode)), [images, mode])
  const videoList = useMemo(() => images.filter(i => i.kind === 'video'), [images])
  const processing = videoList.some(busy)
  const cataloguing = images.some(i => i.cataloguing)

  // enquanto um vídeo é dividido em cenas ou a IA cataloga imagens novas, atualiza a lista
  useEffect(() => {
    if (!(videos && processing) && !cataloguing) return
    const t = setInterval(() => {
      shortsApi.listImages().then(setImages).catch(() => undefined)
    }, 3000)
    return () => clearInterval(t)
  }, [videos, processing, cataloguing, setImages])

  const characters = useMemo(() => {
    const count = new Map<string, number>()
    pool.forEach(i => i.characters.forEach(c => count.set(c, (count.get(c) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [pool])

  const visible = pool.filter(
    i =>
      (!found || found.has(i.id)) &&
      (videos || kind === 'all' || i.kind === kind) &&
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

  const upload = async (files: File[]) => {
    if (videos) {
      const file = files.find(f => f.type.startsWith('video/') || /\.(mkv|avi|mov|m4v|webm|mp4)$/i.test(f.name))
      if (file) sendVideo(file)
      return
    }
    const list = files.filter(f => f.type.startsWith('image/'))
    if (!list.length) return
    setUploading(list.length)
    try {
      const saved = await shortsApi.uploadImages(list, stickers ? 'figurinha' : undefined)
      setImages(prev => [...saved, ...prev])
      setSelectedId(saved[0]?.id ?? null)
      toast.show(`${saved.length} ${saved.length === 1 ? 'imagem catalogada' : 'imagens catalogadas'}`)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setUploading(0)
    }
  }

  const importUrl = async (url: string) => {
    setUploading(1)
    try {
      const img = await shortsApi.importImageUrl(url)
      setImages(prev => [img, ...prev])
      setSelectedId(img.id)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setUploading(0)
    }
  }

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      const files = Array.from(e.clipboardData?.files ?? [])
      const text = e.clipboardData?.getData('text')?.trim()
      if (files.length) upload(files)
      else if (text && /^https?:\/\//.test(text)) importUrl(text)
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
          placeholder={
            stickers
              ? 'Busque pela reação: “chocado”, “rindo”…'
              : videos
                ? 'Busque a cena: “gojo tirando a venda”, “sukuna luta”'
                : 'Busque do jeito que você fala: “sukuna sorrindo no mangá”'
          }
        />
        {videos && (
          <input
            className="field lib-video-hint"
            value={hint}
            onChange={e => setHint(e.target.value)}
            placeholder="De qual anime e episódio? (ajuda a IA)"
          />
        )}
        <button className="btn-y" onClick={() => fileInput.current?.click()} disabled={!!sending}>
          ⭱ {stickers ? 'Importar figurinhas' : videos ? 'Importar vídeo' : 'Importar imagens'}
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={videos ? 'video/*,.mkv,.avi' : 'image/*'}
          multiple={!videos}
          hidden
          onChange={e => {
            upload(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
      </div>
      <p className="lib-hint">
        {stickers
          ? 'Figurinhas entram no vídeo no lugar dos emojis, escolhidas pela reação da cena. Use PNG com fundo transparente. A IA etiqueta a reação sozinha.'
          : videos
            ? 'Envie um episódio ou trecho do anime: ele é dividido em cenas nos cortes e a IA descreve cada uma (quem aparece, o que acontece). A montagem usa as cenas em movimento nas partes de ação. O som do episódio não entra no Short.'
            : 'A IA cataloga cada imagem sozinha: quem aparece, do que se trata e onde dar zoom. Também dá para arrastar ou colar (Ctrl+V) aqui.'}
      </p>

      {videos && (sending || videoList.length > 0) && (
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
        {mode === 'imagens' && <div className="chips">
          {KINDS.map(k => (
            <button key={k.id} className={`chip lib-kind ${kind === k.id ? 'on' : ''}`} onClick={() => setKind(k.id)}>
              {k.label}
            </button>
          ))}
        </div>}
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
            {stickers
              ? visible.length === 1 ? 'figurinha' : 'figurinhas'
              : videos
                ? visible.length === 1 ? 'cena' : 'cenas'
                : visible.length === 1 ? 'imagem' : 'imagens'}
            {character ? ` do ${character}` : ''}
          </h2>
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <Spinner />
          ) : pool.length === 0 && !uploading ? (
            videos && (sending || videoList.length > 0) ? (
              <p className="meta">As cenas aparecem aqui quando a divisão terminar.</p>
            ) : (
              <button className="lib-empty" onClick={() => fileInput.current?.click()}>
                <strong>{stickers ? 'Nenhuma figurinha ainda' : videos ? 'Nenhum vídeo ainda' : 'Sua biblioteca está vazia'}</strong>
                <span>
                  {stickers
                    ? 'Importe figurinhas de reação (chocado, rindo, bravo, pensando…). Sem figurinhas, o vídeo usa emojis.'
                    : videos
                      ? 'Importe episódios ou trechos (mp4, mkv, mov). Cada corte do episódio vira uma cena que pode entrar no Short, em movimento.'
                      : 'Importe as imagens que você usa nos vídeos (prints, painéis de mangá, memes). Quanto mais imagens, menos cenas ficam faltando.'}
                </span>
              </button>
            )
          ) : (
            <div className="lib-grid">
              {Array.from({ length: uploading }, (_, i) => (
                <div key={`up${i}`} className="lib-card lib-uploading">
                  <span className="lib-img"><Spinner /></span>
                  <strong>catalogando…</strong>
                </div>
              ))}
              {visible.map(img => (
                <button key={img.id} className={`lib-card ${selected?.id === img.id ? 'on' : ''}`} onClick={() => setSelectedId(img.id)}>
                  <span className={`lib-img ${stickers ? 'checker' : ''}`}>
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
            <div className={`lib-big ${stickers ? 'checker' : ''}`}>
              {selected.clip ? <ClipPreview img={selected} /> : <img src={imageUrl(selected)} alt="" />}
              {!stickers && selected.regions.map(r => (
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

            {mode === 'imagens' && (
              <button className="btn-y lib-use" onClick={() => navigate(`/novo?tema=${encodeURIComponent(selected.description || selected.name)}`)}>
              Usar em um vídeo
            </button>
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
