import { useEffect, useRef, useState } from 'react'
import { errorMessage, shortsApi, SoundItem, SoundKind, soundUrl } from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import TagEditor from '../components/TagEditor'
import { useSounds } from '../hooks/useShorts'

/** Tipos que a montagem procura no nome/etiquetas dos efeitos sonoros. */
const SFX_TYPES = [
  { id: 'whoosh', when: 'setas e cortes', words: ['whoosh', 'swoosh', 'swish', 'woosh'] },
  { id: 'boom', when: 'gancho e revelações', words: ['boom', 'explos', 'bass', 'impacto'] },
  { id: 'erro', when: 'X vermelho', words: ['erro', 'error', 'wrong', 'fail', 'buzz'] },
  { id: 'pop', when: 'figurinhas e emojis', words: ['pop', 'bolha', 'bubble', 'plop'] },
  { id: 'ding', when: 'círculos', words: ['ding', 'bell', 'sino', 'plim'] },
  { id: 'click', when: 'provas e prints', words: ['click', 'clique', 'camera', 'shutter'] },
  { id: 'risada', when: 'piadas', words: ['risada', 'laugh', 'rindo', 'haha'] },
  { id: 'suspense', when: 'suspense', words: ['suspense', 'riser', 'tens', 'drone'] },
]

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const haystack = (s: SoundItem) => normalize(`${s.name} ${s.tags.join(' ')}`)

const usage = (s: SoundItem) =>
  s.usedIn.length === 0 ? 'nunca usado' : `em ${s.usedIn.length} ${s.usedIn.length === 1 ? 'vídeo' : 'vídeos'}`

/** Efeitos sonoros ou músicas. A montagem escolhe sozinha a partir do nome e das etiquetas. */
function SoundLibrary({ kind }: { kind: SoundKind }) {
  const { sounds, setSounds, loading, error } = useSounds()
  const toast = useToast()
  const fileInput = useRef<HTMLInputElement>(null)
  const player = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => () => player.current?.pause(), [])

  const isSfx = kind === 'sfx'
  const pool = sounds.filter(s => s.kind === kind)
  const words = normalize(query).split(/\s+/).filter(Boolean)
  const visible = pool.filter(s => words.every(w => haystack(s).includes(w)))

  const play = (s: SoundItem) => {
    player.current?.pause()
    if (playing === s.id) {
      setPlaying(null)
      return
    }
    const audio = new Audio(soundUrl(s))
    audio.onended = () => setPlaying(null)
    audio.play().catch(() => toast.show('Não deu para tocar esse arquivo no navegador'))
    player.current = audio
    setPlaying(s.id)
  }

  const upload = async (files: File[]) => {
    const list = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|m4a|ogg|aac|flac|webm|opus)$/i.test(f.name))
    if (!list.length) return
    setBusy(`Salvando ${list.length} ${list.length === 1 ? 'arquivo' : 'arquivos'}…`)
    try {
      const saved = await shortsApi.uploadSounds(list, kind)
      setSounds(prev => [...saved, ...prev])
      toast.show(`${saved.length} ${isSfx ? 'efeitos' : 'músicas'} na biblioteca`)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const importLink = async () => {
    if (!/^https?:\/\//.test(link.trim())) return
    setBusy('Baixando o áudio do link…')
    try {
      const s = await shortsApi.importSoundUrl(link.trim(), kind)
      setSounds(prev => [s, ...prev])
      setLink('')
      toast.show(`“${s.name}” na biblioteca`)
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const update = async (s: SoundItem, changes: Partial<SoundItem>, persist = true) => {
    setSounds(prev => prev.map(x => (x.id === s.id ? { ...x, ...changes } : x)))
    if (!persist) return
    try {
      await shortsApi.updateSound(s.id, changes)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const remove = async (s: SoundItem) => {
    if (!confirm(`Apagar “${s.name}”?`)) return
    await shortsApi.deleteSound(s.id)
    setSounds(prev => prev.filter(x => x.id !== s.id))
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
        <input className="field lib-search" value={query} onChange={e => setQuery(e.target.value)} placeholder={isSfx ? 'Buscar: whoosh, boom, pop…' : 'Buscar: tensa, phonk, calma…'} />
        <button className="btn-y" onClick={() => fileInput.current?.click()}>
          ⭱ {isSfx ? 'Importar efeitos' : 'Importar músicas'}
        </button>
        <input ref={fileInput} type="file" accept="audio/*" multiple hidden onChange={e => upload(Array.from(e.target.files ?? []))} />
      </div>

      <div className="snd-link">
        <input
          className="field"
          value={link}
          onChange={e => setLink(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && importLink()}
          placeholder="Ou cole o link de um Reel, TikTok ou Short para pegar o áudio"
          disabled={!!busy}
        />
        <button className="btn-g" onClick={importLink} disabled={!!busy || !/^https?:\/\//.test(link.trim())}>
          Pegar áudio
        </button>
      </div>
      <p className="lib-hint">
        {isSfx
          ? 'A montagem coloca os efeitos sozinha, pelo nome e pelas etiquetas: whoosh nas setas, erro nos X, pop nas figurinhas, boom no gancho.'
          : 'A montagem escolhe uma música que combina com o clima do estilo (tensa, animada, calma) e baixa o volume quando tem a sua voz. Na revisão dá para trocar.'}
        {!isSfx && ' Músicas com direitos autorais podem ser silenciadas pelo Instagram ou pelo YouTube.'}
      </p>

      {isSfx && (
        <div className="snd-types">
          {SFX_TYPES.map(t => {
            const count = pool.filter(s => t.words.some(w => haystack(s).includes(w))).length
            return (
              <button key={t.id} className={`snd-type ${count ? 'ok' : ''}`} onClick={() => setQuery(t.id)} title={`Usado em: ${t.when}`}>
                <strong>{count ? '✓' : '+'} {t.id}</strong>
                <span>{t.when}</span>
              </button>
            )
          })}
        </div>
      )}

      {busy && (
        <p className="snd-busy">
          <Spinner /> {busy}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <Spinner />
      ) : pool.length === 0 ? (
        <button className="lib-empty" onClick={() => fileInput.current?.click()}>
          <strong>{isSfx ? 'Nenhum efeito sonoro ainda' : 'Nenhuma música ainda'}</strong>
          <span>
            {isSfx
              ? 'Importe seus efeitos (mp3, wav). Dê nomes como “whoosh_01.mp3” ou “boom grave.wav”, ou deixe a IA etiquetar.'
              : 'Importe arquivos ou cole o link de um Reel, TikTok ou Short com o áudio que você quer usar.'}
          </span>
        </button>
      ) : (
        <ul className="snd-list">
          {visible.map(s => (
            <li key={s.id} className={`snd-row ${playing === s.id ? 'on' : ''}`}>
              <button className="snd-play" onClick={() => play(s)} aria-label={playing === s.id ? 'Pausar' : 'Tocar'}>
                {playing === s.id ? '❚❚' : '▶'}
              </button>
              <div className="snd-main">
                <input
                  className="snd-name"
                  value={s.name}
                  onChange={e => update(s, { name: e.target.value }, false)}
                  onBlur={e => update(s, { name: e.target.value })}
                />
                <TagEditor label="" values={s.tags} onChange={tags => update(s, { tags })} />
              </div>
              <span className="meta snd-usage">
                {usage(s)}
                {s.source && s.source !== 'upload' && (
                  <a href={s.source} target="_blank" rel="noreferrer" className="act">
                    link ↗
                  </a>
                )}
              </span>
              <button className="snd-delete" onClick={() => remove(s)} aria-label="Apagar">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
      {toast.node}
    </div>
  )
}

export default SoundLibrary
