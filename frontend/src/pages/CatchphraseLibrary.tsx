import { useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import {
  Catchphrase,
  catchphraseFileUrl,
  CatchphraseKind,
  CATCHPHRASE_KIND_LABEL,
  errorMessage,
  imageUrl,
  LibraryImage,
  shortsApi,
} from '../api/shorts'
import { Spinner, useToast } from '../components/flow'
import { useCatchphrases, useLibrary } from '../hooks/useShorts'
import { CatchphrasePreview } from '../video/ShortVideo'
import { catchphraseProps, FPS, HEIGHT, WIDTH } from '../video/timeline'

const seconds = (n: number) => `${n.toFixed(1).replace('.', ',')}s`

/** Imagens e cenas que servem de fundo para o bordão montado (figurinhas e episódios inteiros, não). */
const usableBackground = (img: LibraryImage) => !['figurinha', 'video'].includes(img.kind)

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Bordões (ADR 0016): o que abre ou fecha os vídeos. Aqui eles são criados; na revisão,
 * cada vídeo escolhe qual bordão abre e qual fecha.
 */
function CatchphraseLibrary() {
  const { catchphrases, loaded, error, setCatchphrases } = useCatchphrases()
  const { images, byId: imagesById } = useLibrary()
  const toast = useToast()
  const clipInput = useRef<HTMLInputElement>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const selected = catchphrases.find(c => c.id === selectedId) ?? catchphrases[0]

  const replace = (next: Catchphrase) => setCatchphrases(list => list.map(c => (c.id === next.id ? next : c)))

  const work = async (label: string, task: () => Promise<void>) => {
    setBusy(label)
    try {
      await task()
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setBusy(null)
    }
  }

  const create = (kind: CatchphraseKind, file?: File) =>
    work(kind === 'clipe' ? 'Salvando o clipe…' : 'Criando o bordão…', async () => {
      const c = await shortsApi.createCatchphrase(kind, file)
      setCatchphrases(list => [c, ...list])
      setSelectedId(c.id)
    })

  /** Muda na tela na hora; persist = false enquanto digita (salva no blur). */
  const update = async (c: Catchphrase, changes: Partial<Catchphrase>, persist = true) => {
    replace({ ...c, ...changes })
    if (!persist) return
    try {
      replace(await shortsApi.updateCatchphrase(c.id, changes))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  /** Padrão de abertura/final: o backend desmarca o anterior, então a lista vem de novo. */
  const setDefault = (c: Catchphrase, key: 'defaultIntro' | 'defaultOutro', value: boolean) =>
    work('Salvando…', async () => {
      await shortsApi.updateCatchphrase(c.id, { [key]: value })
      setCatchphrases(await shortsApi.listCatchphrases())
    })

  const uploadFile = (c: Catchphrase, file?: File) => {
    if (!file) return
    work(c.kind === 'clipe' ? 'Salvando o clipe…' : 'Enviando…', async () => replace(await shortsApi.replaceCatchphraseFile(c.id, file)))
  }

  const remove = (c: Catchphrase) => {
    if (!confirm(`Apagar o bordão “${c.name}”? Os vídeos que usam ficam sem ele.`)) return
    work('Apagando…', async () => {
      await shortsApi.deleteCatchphrase(c.id)
      setCatchphrases(list => list.filter(x => x.id !== c.id))
      setSelectedId(null)
    })
  }

  return (
    <div className="lib-view">
      <div className="lib-toolbar">
        <button className="btn-y" onClick={() => clipInput.current?.click()} disabled={!!busy}>⭱ Clipe pronto</button>
        <button className="btn-g" onClick={() => create('montado')} disabled={!!busy}>+ Montado</button>
        <button className="btn-g" onClick={() => create('inscreva')} disabled={!!busy}>+ Se inscreve</button>
        <input
          ref={clipInput}
          type="file"
          accept="video/*"
          hidden
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) create('clipe', file)
            e.target.value = ''
          }}
        />
      </div>
      <p className="lib-hint">
        O bordão de abertura toca antes da narração, com o som dele; o do final entra depois da última cena.
        <strong> Clipe pronto</strong> é um vídeo seu já com o som (ex.: a dança com o “se ligaa”); <strong>montado</strong> junta
        uma imagem da biblioteca, um áudio seu e um texto; <strong>se inscreve</strong> mostra sua foto e o botão de inscrever.
        Em cada vídeo, troque na revisão → Ajustes rápidos.
      </p>

      {busy && (
        <p className="snd-busy">
          <Spinner /> {busy}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}

      {!loaded ? (
        <Spinner />
      ) : catchphrases.length === 0 ? (
        <button className="lib-empty" onClick={() => clipInput.current?.click()}>
          <strong>Nenhum bordão ainda</strong>
          <span>Envie o clipe da sua abertura (mp4, mov, webm) ou crie um bordão montado ou de “se inscreve” nos botões acima.</span>
        </button>
      ) : (
        <div className="lib-body">
          <section>
            <h2 className="lib-total">
              {catchphrases.length} {catchphrases.length === 1 ? 'bordão' : 'bordões'}
            </h2>
            <div className="lib-grid">
              {catchphrases.map(c => (
                <button key={c.id} className={`lib-card ${selected?.id === c.id ? 'on' : ''}`} onClick={() => setSelectedId(c.id)}>
                  <span className="lib-img">
                    <CatchphraseThumb c={c} images={imagesById} />
                    {(c.defaultIntro || c.defaultOutro) && (
                      <em className="bdo-badge">padrão {[c.defaultIntro && 'abertura', c.defaultOutro && 'final'].filter(Boolean).join(' + ')}</em>
                    )}
                  </span>
                  <strong>{c.name}</strong>
                  <span>{CATCHPHRASE_KIND_LABEL[c.kind]} · {seconds(c.duration)}</span>
                </button>
              ))}
            </div>
          </section>

          {selected && (
            <aside className="panel lib-detail" key={selected.id}>
              <CatchphrasePlayer c={selected} images={imagesById} />
              <input
                className="lib-name"
                value={selected.name}
                onChange={e => update(selected, { name: e.target.value }, false)}
                onBlur={e => update(selected, { name: e.target.value })}
              />
              <span className="meta">{CATCHPHRASE_KIND_LABEL[selected.kind]} · {seconds(selected.duration)}</span>

              {selected.kind === 'clipe' && <ClipFields c={selected} onFile={f => uploadFile(selected, f)} disabled={!!busy} />}
              {selected.kind === 'montado' && (
                <MountedFields c={selected} images={images} imagesById={imagesById} onChange={update} onFile={f => uploadFile(selected, f)} disabled={!!busy} />
              )}
              {selected.kind === 'inscreva' && (
                <SubscribeFields
                  c={selected}
                  onChange={update}
                  onFile={f => uploadFile(selected, f)}
                  onInstagram={() => work('Copiando do Instagram…', async () => replace(await shortsApi.catchphrasePhotoFromInstagram(selected.id)))}
                  disabled={!!busy}
                />
              )}

              <span className="label bdo-section">Vídeos novos</span>
              <label className="bdo-check">
                <input type="checkbox" checked={!!selected.defaultIntro} disabled={!!busy} onChange={e => setDefault(selected, 'defaultIntro', e.target.checked)} />
                Começam com este bordão
              </label>
              <label className="bdo-check">
                <input type="checkbox" checked={!!selected.defaultOutro} disabled={!!busy} onChange={e => setDefault(selected, 'defaultOutro', e.target.checked)} />
                Terminam com este bordão
              </label>

              <button className="btn-o lib-delete" onClick={() => remove(selected)} disabled={!!busy}>Apagar</button>
            </aside>
          )}
        </div>
      )}
      {toast.node}
    </div>
  )
}

/** Miniatura do card: o primeiro quadro do clipe, a imagem do montado ou a foto do "se inscreve". */
function CatchphraseThumb({ c, images }: { c: Catchphrase; images: Map<string, LibraryImage> }) {
  if (c.kind === 'clipe' && c.file) return <video src={`${catchphraseFileUrl(c.file)}#t=0.1`} muted preload="metadata" />
  if (c.kind === 'montado') {
    const img = c.imageId ? images.get(c.imageId) : undefined
    return img ? <img src={imageUrl(img)} alt="" loading="lazy" /> : <span className="bdo-icon">🎙️</span>
  }
  if (c.kind === 'inscreva') {
    return (
      <span className="bdo-avatar">
        {c.photoFile ? <img src={catchphraseFileUrl(c.photoFile)} alt="" /> : (c.channelName?.replace(/^@/, '')[0] ?? '?').toUpperCase()}
      </span>
    )
  }
  return <span className="bdo-icon">🎬</span>
}

/** Prévia de verdade: a mesma cena que entra no vídeo e no MP4. */
function CatchphrasePlayer({ c, images }: { c: Catchphrase; images: Map<string, LibraryImage> }) {
  const props = useMemo(() => catchphraseProps(c, images), [c, images])
  if (!props) return <div className="bdo-preview bdo-preview-empty">Envie o vídeo para ver a prévia</div>
  return (
    <Player
      component={CatchphrasePreview}
      inputProps={{ c: props }}
      durationInFrames={props.frames}
      fps={FPS}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      controls
      loop
      clickToPlay
      className="bdo-preview"
      style={{ width: '100%', aspectRatio: `${WIDTH} / ${HEIGHT}` }}
    />
  )
}

function ClipFields({ c, onFile, disabled }: { c: Catchphrase; onFile: (f?: File) => void; disabled: boolean }) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <>
      <button className="act" onClick={() => input.current?.click()} disabled={disabled}>
        ⭱ {c.file ? 'Trocar o vídeo' : 'Enviar o vídeo'}
      </button>
      <input ref={input} type="file" accept="video/*" hidden onChange={e => {
        onFile(e.target.files?.[0])
        e.target.value = ''
      }} />
    </>
  )
}

type OnChange = (c: Catchphrase, changes: Partial<Catchphrase>, persist?: boolean) => void

function MountedFields({
  c,
  images,
  imagesById,
  onChange,
  onFile,
  disabled,
}: {
  c: Catchphrase
  images: LibraryImage[]
  imagesById: Map<string, LibraryImage>
  onChange: OnChange
  onFile: (f?: File) => void
  disabled: boolean
}) {
  const audioInput = useRef<HTMLInputElement>(null)
  const [picking, setPicking] = useState(false)
  const [query, setQuery] = useState('')
  const image = c.imageId ? imagesById.get(c.imageId) : undefined

  const words = normalize(query).split(/\s+/).filter(Boolean)
  const options = images
    .filter(usableBackground)
    .filter(i => words.every(w => normalize(`${i.name} ${i.tags.join(' ')} ${i.characters.join(' ')}`).includes(w)))
    .slice(0, 60)

  return (
    <>
      <span className="label bdo-section">Sua fala</span>
      {c.file && <audio controls src={catchphraseFileUrl(c.file)} className="bdo-audio" />}
      <button className="act" onClick={() => audioInput.current?.click()} disabled={disabled}>
        ⭱ {c.file ? 'Trocar o áudio' : 'Enviar o áudio'}
      </button>
      {!c.file && <span className="meta">Sem áudio, o bordão dura 2,5 s e fica mudo.</span>}
      <input ref={audioInput} type="file" accept="audio/*" hidden onChange={e => {
        onFile(e.target.files?.[0])
        e.target.value = ''
      }} />

      <span className="label bdo-section">Texto na tela</span>
      <input
        className="field"
        value={c.text ?? ''}
        placeholder="Se ligaa!"
        maxLength={80}
        onChange={e => onChange(c, { text: e.target.value }, false)}
        onBlur={e => onChange(c, { text: e.target.value })}
      />

      <span className="label bdo-section">Fundo</span>
      <div className="bdo-bg">
        {image ? <img src={imageUrl(image)} alt="" /> : <span className="meta">Sem imagem: usa a cena vizinha, desfocada.</span>}
        <button className="act" onClick={() => setPicking(!picking)}>{picking ? 'Fechar' : 'Escolher da biblioteca'}</button>
        {image && <button className="act" onClick={() => onChange(c, { imageId: '' })}>Tirar</button>}
      </div>
      {picking && (
        <div className="bdo-picker">
          <input className="field" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar: nome, personagem, etiqueta…" />
          <div className="bdo-picker-grid">
            {options.map(i => (
              <button
                key={i.id}
                className={i.id === c.imageId ? 'on' : ''}
                title={i.name}
                onClick={() => {
                  onChange(c, { imageId: i.id })
                  setPicking(false)
                }}
              >
                <img src={imageUrl(i)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          {options.length === 0 && <span className="meta">Nada na biblioteca com isso.</span>}
        </div>
      )}
    </>
  )
}

function SubscribeFields({
  c,
  onChange,
  onFile,
  onInstagram,
  disabled,
}: {
  c: Catchphrase
  onChange: OnChange
  onFile: (f?: File) => void
  onInstagram: () => void
  disabled: boolean
}) {
  const photoInput = useRef<HTMLInputElement>(null)
  return (
    <>
      <span className="label bdo-section">Foto</span>
      <div className="act-row">
        <button className="act" onClick={() => photoInput.current?.click()} disabled={disabled}>⭱ Enviar foto</button>
        <button className="act" onClick={onInstagram} disabled={disabled}>Usar a do Instagram</button>
      </div>
      <input ref={photoInput} type="file" accept="image/*" hidden onChange={e => {
        onFile(e.target.files?.[0])
        e.target.value = ''
      }} />

      <label className="label bdo-section" htmlFor="bdo-name">Nome</label>
      <input id="bdo-name" className="field" value={c.channelName ?? ''} placeholder="@seucanal" maxLength={40}
        onChange={e => onChange(c, { channelName: e.target.value }, false)} onBlur={e => onChange(c, { channelName: e.target.value })} />
      <label className="label bdo-section" htmlFor="bdo-text">Frase</label>
      <input id="bdo-text" className="field" value={c.text ?? ''} placeholder="Se inscreve pra mais!" maxLength={80}
        onChange={e => onChange(c, { text: e.target.value }, false)} onBlur={e => onChange(c, { text: e.target.value })} />
      <label className="label bdo-section" htmlFor="bdo-button">Texto do botão</label>
      <input id="bdo-button" className="field" value={c.button ?? ''} placeholder="INSCREVA-SE" maxLength={24}
        onChange={e => onChange(c, { button: e.target.value }, false)} onBlur={e => onChange(c, { button: e.target.value })} />
    </>
  )
}

export default CatchphraseLibrary
