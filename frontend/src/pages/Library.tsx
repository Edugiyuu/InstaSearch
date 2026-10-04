import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { errorMessage, imageUrl, LibraryImage, MediaKind, shortsApi } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useLibrary } from '../hooks/useShorts'
import SoundLibrary from './SoundLibrary'
import TagEditor from '../components/TagEditor'
import './Library.css'

const TABS = [
  { id: 'imagens', label: 'Imagens' },
  { id: 'figurinhas', label: 'Figurinhas' },
  { id: 'sfx', label: 'Efeitos sonoros' },
  { id: 'musica', label: 'Músicas' },
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
      {tab === 'imagens' && <ImageLibrary key="imagens" stickers={false} />}
      {tab === 'figurinhas' && <ImageLibrary key="figurinhas" stickers />}
      {tab === 'sfx' && <SoundLibrary key="sfx" kind="sfx" />}
      {tab === 'musica' && <SoundLibrary key="musica" kind="musica" />}
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

const usage = (img: LibraryImage) =>
  img.usedIn.length === 0 ? 'nunca usada' : `usada em ${img.usedIn.length} ${img.usedIn.length === 1 ? 'vídeo' : 'vídeos'}`

/** Imagens das cenas ou figurinhas (recortes com fundo transparente que entram no lugar dos emojis). */
function ImageLibrary({ stickers }: { stickers: boolean }) {
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

  const pool = useMemo(() => images.filter(i => (stickers ? i.kind === 'figurinha' : i.kind !== 'figurinha')), [images, stickers])

  const characters = useMemo(() => {
    const count = new Map<string, number>()
    pool.forEach(i => i.characters.forEach(c => count.set(c, (count.get(c) ?? 0) + 1)))
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [pool])

  const visible = pool.filter(
    i => (!found || found.has(i.id)) && (kind === 'all' || i.kind === kind) && (!character || i.characters.includes(character)),
  )
  const selected = pool.find(i => i.id === selectedId) ?? visible[0]

  const upload = async (files: File[]) => {
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
    if (!confirm(`Apagar “${img.name}” da biblioteca?`)) return
    await shortsApi.deleteImage(img.id)
    setImages(prev => prev.filter(i => i.id !== img.id))
    setSelectedId(null)
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
          placeholder={stickers ? 'Busque pela reação: “chocado”, “rindo”…' : 'Busque do jeito que você fala: “sukuna sorrindo no mangá”'}
        />
        <button className="btn-y" onClick={() => fileInput.current?.click()}>
          ⭱ {stickers ? 'Importar figurinhas' : 'Importar imagens'}
        </button>
        <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={e => upload(Array.from(e.target.files ?? []))} />
      </div>
      <p className="lib-hint">
        {stickers
          ? 'Figurinhas entram no vídeo no lugar dos emojis, escolhidas pela reação da cena. Use PNG com fundo transparente. A IA etiqueta a reação sozinha.'
          : 'A IA cataloga cada imagem sozinha: quem aparece, do que se trata e onde dar zoom. Também dá para arrastar ou colar (Ctrl+V) aqui.'}
      </p>

      <div className="lib-filters">
        {!stickers && <div className="chips">
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
            {visible.length} {stickers ? (visible.length === 1 ? 'figurinha' : 'figurinhas') : visible.length === 1 ? 'imagem' : 'imagens'}
            {character ? ` do ${character}` : ''}
          </h2>
          {error && <p className="form-error">{error}</p>}
          {loading ? (
            <Spinner />
          ) : pool.length === 0 && !uploading ? (
            <button className="lib-empty" onClick={() => fileInput.current?.click()}>
              <strong>{stickers ? 'Nenhuma figurinha ainda' : 'Sua biblioteca está vazia'}</strong>
              <span>
                {stickers
                  ? 'Importe figurinhas de reação (chocado, rindo, bravo, pensando…). Sem figurinhas, o vídeo usa emojis.'
                  : 'Importe as imagens que você usa nos vídeos (prints, painéis de mangá, memes). Quanto mais imagens, menos cenas ficam faltando.'}
              </span>
            </button>
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
                  </span>
                  <strong>{img.name}</strong>
                  <span>{usage(img)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <aside className="panel lib-detail">
            <div className={`lib-big ${stickers ? 'checker' : ''}`}>
              <img src={imageUrl(selected)} alt="" />
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
            {!selected.catalogued && (
              <button className="act" onClick={() => recatalog(selected)}>✨ Catalogar com a IA</button>
            )}

            {!stickers && (
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

export default Library
