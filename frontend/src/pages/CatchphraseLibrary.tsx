import { RefObject, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import {
  afterButtonText,
  BUTTON_PRESETS,
  ButtonStyle,
  Catchphrase,
  catchphraseFileUrl,
  catchphraseHasSound,
  CatchphraseKind,
  CATCHPHRASE_KIND_LABEL,
  ClickStyle,
  Entrance,
  errorMessage,
  imageUrl,
  LibraryImage,
  shortsApi,
  SubscribePart,
  TextAnim,
  TextPosition,
} from '../api/shorts'
import { Segmented, Spinner, useToast } from '../components/flow'
import { useCatchphrases, useLibrary } from '../hooks/useShorts'
import { CatchphrasePreview } from '../video/ShortVideo'
import { catchphraseProps, FPS, HEIGHT, WIDTH } from '../video/timeline'

const seconds = (n: number) => `${n.toFixed(1).replace('.', ',')}s`

// As opções de personalização (ADR 0032), com os nomes que a tela mostra
// chaves com uma casa decimal: "2" e "3" pareceriam números inteiros, e o JavaScript as poria antes de "2.5"
const DURATIONS = { '2.0': '2 s', '2.5': '2,5 s', '3.0': '3 s', '4.0': '4 s', '5.0': '5 s', '6.0': '6 s' }
const ENTRANCES: Record<Entrance, string> = { pulo: 'Pulo', deslizar: 'Deslizar', zoom: 'Zoom', tremida: 'Tremida' }
const CLICKS: Record<ClickStyle, string> = { cursor: 'Cursor', dedo: 'Dedo', pulsar: 'Pulsar', nenhum: 'Sem clique' }
const PARTS: Record<SubscribePart, string> = { foto: 'Foto', nome: 'Nome', frase: 'Frase', botao: 'Botão' }
const TEXT_ANIMS: Record<TextAnim, string> = { pulo: 'Pulo', digitando: 'Digitando', tremer: 'Tremendo' }
const TEXT_POSITIONS: Record<TextPosition, string> = { cima: 'Em cima', meio: 'No meio', baixo: 'Embaixo' }

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
              <TimingFields c={selected} onChange={update} disabled={!!busy} />

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
      <AudioField c={c} input={audioInput} onFile={onFile} onChange={onChange} disabled={disabled} />

      <span className="label bdo-section">Texto na tela</span>
      <input
        className="field"
        value={c.text ?? ''}
        placeholder="Se ligaa!"
        maxLength={80}
        onChange={e => onChange(c, { text: e.target.value }, false)}
        onBlur={e => onChange(c, { text: e.target.value })}
      />
      {c.text && (
        <>
          <Segmented value={c.textAnim ?? 'pulo'} options={TEXT_ANIMS} onChange={textAnim => onChange(c, { textAnim })} disabled={disabled} />
          <Segmented value={c.textPosition ?? 'baixo'} options={TEXT_POSITIONS} onChange={textPosition => onChange(c, { textPosition })} disabled={disabled} />
        </>
      )}

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
  const audioInput = useRef<HTMLInputElement>(null)
  const shown = (part: SubscribePart) => c.show?.[part] !== false
  const style: ButtonStyle = c.buttonStyle ?? 'youtube'
  return (
    <>
      <span className="label bdo-section">Modelo do botão</span>
      <div className="bdo-presets">
        {(Object.keys(BUTTON_PRESETS) as ButtonStyle[]).map(key => (
          <button
            key={key}
            className={`bdo-preset ${key} ${style === key ? 'on' : ''}`}
            disabled={disabled}
            onClick={() => onChange(c, { buttonStyle: key, button: BUTTON_PRESETS[key].button, afterButton: BUTTON_PRESETS[key].afterButton })}
          >
            {BUTTON_PRESETS[key].label}
          </button>
        ))}
      </div>
      <div className="bdo-two">
        <label>
          <span className="label">Texto do botão</span>
          <input className="field" value={c.button ?? ''} placeholder="INSCREVA-SE" maxLength={24}
            onChange={e => onChange(c, { button: e.target.value }, false)} onBlur={e => onChange(c, { button: e.target.value })} />
        </label>
        <label>
          <span className="label">Depois do clique</span>
          <input className="field" value={c.afterButton ?? ''} placeholder={afterButtonText(c.button || 'INSCREVA-SE')} maxLength={24}
            onChange={e => onChange(c, { afterButton: e.target.value }, false)} onBlur={e => onChange(c, { afterButton: e.target.value })} />
        </label>
      </div>
      {!c.afterButton && <span className="meta">Vazio, o app escreve “{afterButtonText(c.button || 'INSCREVA-SE')}”.</span>}

      <span className="label bdo-section">O que aparece</span>
      <div className="bdo-parts">
        {(Object.keys(PARTS) as SubscribePart[]).map(part => (
          <label key={part} className="bdo-check">
            <input type="checkbox" checked={shown(part)} disabled={disabled} onChange={e => onChange(c, { show: { ...c.show, [part]: e.target.checked } })} />
            {PARTS[part]}
          </label>
        ))}
      </div>

      <span className="label bdo-section">Entrada</span>
      <Segmented value={c.entrance ?? 'pulo'} options={ENTRANCES} onChange={entrance => onChange(c, { entrance })} disabled={disabled} />
      <span className="label bdo-section">Clique</span>
      <Segmented value={c.click ?? 'cursor'} options={CLICKS} onChange={click => onChange(c, { click })} disabled={disabled || !shown('botao')} />
      {!shown('botao') && <span className="meta">Sem o botão, não há clique.</span>}

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

      <span className="label bdo-section">Sua fala</span>
      <AudioField c={c} input={audioInput} onFile={onFile} onChange={onChange} disabled={disabled} />
    </>
  )
}

/** O áudio do montado e do "se inscreve": enviar, ouvir, trocar ou tirar. Com áudio, o bordão dura o tempo dele. */
function AudioField({
  c,
  input,
  onFile,
  onChange,
  disabled,
}: {
  c: Catchphrase
  input: RefObject<HTMLInputElement>
  onFile: (f?: File) => void
  onChange: OnChange
  disabled: boolean
}) {
  return (
    <>
      {c.file && <audio controls src={catchphraseFileUrl(c.file)} className="bdo-audio" />}
      <div className="act-row">
        <button className="act" onClick={() => input.current?.click()} disabled={disabled}>
          ⭱ {c.file ? 'Trocar o áudio' : 'Enviar o áudio'}
        </button>
        {c.file && (
          <button className="act" onClick={() => onChange(c, { file: '' })} disabled={disabled}>
            Tirar o áudio
          </button>
        )}
      </div>
      {!c.file && <span className="meta">Sem áudio, o bordão fica mudo e dura o tempo escolhido embaixo.</span>}
      <input ref={input} type="file" accept="audio/*" hidden onChange={e => {
        onFile(e.target.files?.[0])
        e.target.value = ''
      }} />
    </>
  )
}

/** Tempo e som, em todos os bordões: a duração (sem áudio) e a música do vídeo por baixo (ADR 0032). */
function TimingFields({ c, onChange, disabled }: { c: Catchphrase; onChange: OnChange; disabled: boolean }) {
  const music = c.music ?? !catchphraseHasSound(c)
  return (
    <>
      {c.kind !== 'clipe' && !c.file && (
        <>
          <span className="label bdo-section">Duração</span>
          <Segmented
            value={(c.duration.toFixed(1) in DURATIONS ? c.duration.toFixed(1) : '2.5') as keyof typeof DURATIONS}
            options={DURATIONS}
            onChange={v => onChange(c, { duration: Number(v) })}
            disabled={disabled}
          />
        </>
      )}
      <label className="bdo-check bdo-section">
        <input type="checkbox" checked={music} disabled={disabled} onChange={e => onChange(c, { music: e.target.checked })} />
        Música do vídeo continua por baixo
      </label>
      {music && catchphraseHasSound(c) && <span className="meta">Ela fica baixinha, para não brigar com o som do bordão.</span>}
    </>
  )
}

export default CatchphraseLibrary
