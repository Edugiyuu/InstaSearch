import { ReactNode, RefObject, useEffect, useMemo, useRef, useState } from 'react'
import { Player } from '@remotion/player'
import {
  afterButtonText,
  BUTTON_PRESETS,
  ButtonStyle,
  Catchphrase,
  catchphraseFileUrl,
  catchphraseHasSound,
  CatchphraseKind,
  catchphraseRole,
  CatchphraseRole,
  CATCHPHRASE_KIND_LABEL,
  ClickStyle,
  ClipTrim,
  DEFAULT_PIVOT_VOLUME,
  Entrance,
  errorMessage,
  imageUrl,
  LibraryImage,
  PivotConfig,
  PivotOrder,
  pivotTrim,
  shortsApi,
  ShortProject,
  SubscribePart,
  TextAnim,
  TextPosition,
  WHOLE_CLIP_SECONDS,
} from '../api/shorts'
import { ClipTrimmer } from '../components/ClipTrimmer'
import { PivotPhrases } from '../components/PivotPhrases'
import { Segmented, Spinner, useToast } from '../components/flow'
import { useCatchphrases, useLibrary, useProjects } from '../hooks/useShorts'
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

/** Imagens e cenas que servem de fundo para o bordão montado (episódios inteiros, não). */
const usableBackground = (img: LibraryImage) => img.kind !== 'video'

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/**
 * Bordões (ADR 0016 e 0039): o que abre os vídeos, a virada no meio e o que fecha. Aqui eles são criados,
 * cada um numa faixa; na revisão, cada vídeo escolhe a abertura e o final, e a montagem põe o clipe do meio.
 */
function CatchphraseLibrary() {
  const { catchphrases, loaded, error, setCatchphrases } = useCatchphrases()
  const { images, byId: imagesById } = useLibrary()
  const { projects } = useProjects()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pivot, setPivot] = useState<PivotConfig | null>(null)
  const [phrasesOpen, setPhrasesOpen] = useState(false)
  /** Clipes do meio enviados agora, com mais de 3 s, esperando o recorte (um de cada vez). */
  const [trimQueue, setTrimQueue] = useState<string[]>([])
  const [trimTotal, setTrimTotal] = useState(0)
  const [trimming, setTrimming] = useState<string | null>(null)

  useEffect(() => {
    shortsApi.pivotConfig().then(setPivot, e => toast.show(errorMessage(e)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const selected = catchphrases.find(c => c.id === selectedId) ?? catchphrases[0]
  const lanes = useMemo(() => {
    const by: Record<CatchphraseRole, Catchphrase[]> = { abertura: [], meio: [], final: [] }
    for (const c of catchphrases) by[catchphraseRole(c)].push(c)
    by.meio.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    return by
  }, [catchphrases])
  const usage = useMemo(() => pivotUsage(projects), [projects])

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

  const create = (kind: CatchphraseKind, role?: CatchphraseRole) =>
    work('Criando o bordão…', async () => {
      const c = await shortsApi.createCatchphrase(kind, undefined, role)
      setCatchphrases(list => [c, ...list])
      setSelectedId(c.id)
    })

  /** Clipes de uma vez, na faixa: um por um para o servidor; os do meio com mais de 3 s vão para o recorte. */
  const uploadClips = (files: File[], role: CatchphraseRole) => {
    const videos = files.filter(f => f.type.startsWith('video/'))
    if (!videos.length) return
    work(videos.length > 1 ? `Salvando ${videos.length} clipes…` : 'Salvando o clipe…', async () => {
      const created: Catchphrase[] = []
      for (const [i, file] of videos.entries()) {
        setBusy(videos.length > 1 ? `Salvando o clipe ${i + 1} de ${videos.length}…` : 'Salvando o clipe…')
        try {
          const c = await shortsApi.createCatchphrase('clipe', file, role)
          created.push(c)
          setCatchphrases(list => [c, ...list])
        } catch (e) {
          toast.show(`${file.name}: ${errorMessage(e)}`)
        }
      }
      if (created.length) setSelectedId(created[created.length - 1].id)
      const toTrim = created.filter(c => role === 'meio' && c.duration > WHOLE_CLIP_SECONDS).map(c => c.id)
      setTrimQueue(toTrim)
      setTrimTotal(toTrim.length)
      // sem frase o roteiro não tem virada: as frases abrem depois do recorte
      if (role === 'meio' && created.length && pivot?.enabled && !pivot.phrases.length) setPhrasesOpen(true)
    })
  }

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

  const setPivotConfig = async (changes: Partial<PivotConfig>) => {
    if (pivot) setPivot({ ...pivot, ...changes })
    try {
      setPivot(await shortsApi.updatePivotConfig(changes))
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

  /** Outra faixa: a abertura e o final podem perder o padrão, então a lista vem de novo. */
  const setRole = (c: Catchphrase, role: CatchphraseRole) =>
    work('Mudando de faixa…', async () => {
      await shortsApi.updateCatchphrase(c.id, { role })
      setCatchphrases(await shortsApi.listCatchphrases())
    })

  const uploadFile = (c: Catchphrase, file?: File) => {
    if (!file) return
    work(c.kind === 'clipe' ? 'Salvando o clipe…' : 'Enviando…', async () => {
      const next = await shortsApi.replaceCatchphraseFile(c.id, file)
      replace(next)
      if (catchphraseRole(next) === 'meio' && next.duration > WHOLE_CLIP_SECONDS) setTrimming(next.id)
    })
  }

  const remove = (c: Catchphrase) => {
    if (!confirm(`Apagar o bordão “${c.name}”? Os vídeos que usam ficam sem ele.`)) return
    work('Apagando…', async () => {
      await shortsApi.deleteCatchphrase(c.id)
      setCatchphrases(list => list.filter(x => x.id !== c.id))
      setSelectedId(null)
    })
  }

  // o recorte aberto: o primeiro da fila de envio, ou o do botão "Recortar…"
  const trimId = trimQueue[0] ?? trimming
  const trimClip = trimId ? catchphrases.find(c => c.id === trimId) : undefined
  const closeTrim = () => {
    setTrimQueue([])
    setTrimming(null)
  }
  const saveTrim = (c: Catchphrase, result: { trim: ClipTrim; volume: number }) => {
    void update(c, result)
    if (trimQueue.length) setTrimQueue(q => q.slice(1))
    else setTrimming(null)
  }

  const card = (c: Catchphrase) => {
    const role = catchphraseRole(c)
    const use = role === 'meio' ? usageLabel(c, usage, pivot) : undefined
    return (
      <button key={c.id} className={`lib-card bdo-card ${selected?.id === c.id ? 'on' : ''} ${use?.resting ? 'resting' : ''}`} onClick={() => setSelectedId(c.id)}>
        <span className="lib-img">
          <CatchphraseThumb c={c} images={imagesById} />
          {(c.defaultIntro || c.defaultOutro) && <em className="bdo-badge">padrão</em>}
          {role === 'meio' && c.inRotation === false && <em className="bdo-badge off">fora</em>}
        </span>
        <strong>{c.name}</strong>
        <span className={use?.never ? 'bdo-never' : undefined}>{use ? use.text : `${CATCHPHRASE_KIND_LABEL[c.kind]} · ${seconds(c.duration)}`}</span>
      </button>
    )
  }

  return (
    <div className="lib-view">
      <div className="lib-toolbar">
        <button className="btn-g" onClick={() => create('montado', 'abertura')} disabled={!!busy}>+ Montado</button>
        <button className="btn-g" onClick={() => create('inscreva', 'final')} disabled={!!busy}>+ Se inscreve</button>
      </div>
      <p className="lib-hint">
        A <strong>abertura</strong> toca antes da voz, com o som dela; o <strong>meio</strong> entra na virada do roteiro, com a voz por cima e o
        clipe baixinho; o <strong>final</strong>, depois da última cena. Arraste vários clipes de uma vez para uma faixa; no meio, os com mais de
        3 s abrem o recorte.
      </p>

      {busy && (
        <p className="snd-busy">
          <Spinner /> {busy}
        </p>
      )}
      {error && <p className="form-error">{error}</p>}

      {!loaded ? (
        <Spinner />
      ) : (
        <div className="lib-body">
          <section className="bdo-lanes">
            <Lane
              title="Abertura"
              sub="toca antes da voz, com o som do clipe · um padrão para os vídeos novos"
              addLabel="Arraste um clipe aqui"
              onFiles={files => uploadClips(files, 'abertura')}
              disabled={!!busy}
            >
              {lanes.abertura.map(card)}
            </Lane>

            <Lane
              title="Meio · a virada"
              sub="entra no fim do gancho, com uma das suas frases; a voz continua por cima e o clipe toca baixinho"
              addLabel="Arraste vários clipes aqui"
              multiple
              onFiles={files => uploadClips(files, 'meio')}
              disabled={!!busy}
              extra={
                pivot && (
                  <div className="bdo-pivot-bar">
                    <button className="bdo-phrases" onClick={() => setPhrasesOpen(true)}>
                      Frases da virada · {pivot.phrases.length} ✎
                    </button>
                    <label className="bdo-order">
                      Ordem:
                      <select value={pivot.order} onChange={e => setPivotConfig({ order: e.target.value as PivotOrder })}>
                        <option value="descanso">sem repetir dos últimos</option>
                        <option value="aleatorio">aleatório</option>
                        <option value="sequencia">na sequência</option>
                      </select>
                      {pivot.order === 'descanso' && (
                        <select value={pivot.rest} onChange={e => setPivotConfig({ rest: Number(e.target.value) })} aria-label="Quantos vídeos">
                          {[1, 2, 3, 4, 5, 6].map(n => (
                            <option key={n} value={n}>
                              {n} {n === 1 ? 'vídeo' : 'vídeos'}
                            </option>
                          ))}
                        </select>
                      )}
                    </label>
                    <label className={`bdo-on ${pivot.enabled ? 'yes' : ''}`}>
                      <input type="checkbox" checked={pivot.enabled} onChange={e => setPivotConfig({ enabled: e.target.checked })} />
                      {pivot.enabled ? 'Ligado' : 'Desligado'}
                    </label>
                  </div>
                )
              }
            >
              {lanes.meio.map(card)}
            </Lane>
            {pivot?.enabled && pivot.phrases.length === 0 && (
              <p className="bdo-warn">
                Sem frase da virada, o roteiro não tem onde pôr o clipe e os vídeos saem sem ela.{' '}
                <button className="act" onClick={() => setPhrasesOpen(true)}>Escolher frases</button>
              </p>
            )}

            <Lane
              title="Final"
              sub="entra depois da última cena · um padrão para os vídeos novos"
              addLabel="Arraste um clipe aqui"
              onFiles={files => uploadClips(files, 'final')}
              disabled={!!busy}
            >
              {lanes.final.map(card)}
            </Lane>
          </section>

          {selected && (
            <aside className="panel lib-detail" key={selected.id}>
              {catchphraseRole(selected) === 'meio' ? <MiddlePreview c={selected} /> : <CatchphrasePlayer c={selected} images={imagesById} />}
              <input
                className="lib-name"
                value={selected.name}
                onChange={e => update(selected, { name: e.target.value }, false)}
                onBlur={e => update(selected, { name: e.target.value })}
              />
              <span className="meta">{CATCHPHRASE_KIND_LABEL[selected.kind]} · {seconds(selected.duration)}</span>

              <span className="label bdo-section">Faixa</span>
              {selected.kind === 'clipe' ? (
                <Segmented value={catchphraseRole(selected)} options={ROLES} onChange={role => setRole(selected, role)} disabled={!!busy} />
              ) : (
                // só clipe pronto entra no meio: o montado e o "se inscreve" têm texto e animação próprios
                <Segmented
                  value={catchphraseRole(selected) === 'final' ? 'final' : 'abertura'}
                  options={{ abertura: ROLES.abertura, final: ROLES.final }}
                  onChange={role => setRole(selected, role)}
                  disabled={!!busy}
                />
              )}

              {selected.kind === 'clipe' && <ClipFields c={selected} onFile={f => uploadFile(selected, f)} disabled={!!busy} />}
              {catchphraseRole(selected) === 'meio' ? (
                <MiddleFields c={selected} usage={usage} onChange={update} onTrim={() => setTrimming(selected.id)} disabled={!!busy} />
              ) : (
                <>
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
                  {catchphraseRole(selected) === 'abertura' ? (
                    <label className="bdo-check">
                      <input type="checkbox" checked={!!selected.defaultIntro} disabled={!!busy} onChange={e => setDefault(selected, 'defaultIntro', e.target.checked)} />
                      Começam com este bordão
                    </label>
                  ) : (
                    <label className="bdo-check">
                      <input type="checkbox" checked={!!selected.defaultOutro} disabled={!!busy} onChange={e => setDefault(selected, 'defaultOutro', e.target.checked)} />
                      Terminam com este bordão
                    </label>
                  )}
                </>
              )}

              <button className="btn-o lib-delete" onClick={() => remove(selected)} disabled={!!busy}>Apagar</button>
            </aside>
          )}
        </div>
      )}

      {trimClip?.file && (
        <ClipTrimmer
          key={trimClip.id}
          clip={trimClip}
          initial={pivotTrim(trimClip)}
          suggested={trimQueue.length ? trimClip.trim : undefined}
          volume={trimClip.volume ?? DEFAULT_PIVOT_VOLUME}
          volumeNote="Vale para todos os vídeos com este clipe."
          step={trimQueue.length && trimTotal > 1 ? `${trimTotal - trimQueue.length + 1} de ${trimTotal} clipes` : undefined}
          saveLabel={trimQueue.length > 1 ? 'Usar e ir ao próximo →' : 'Usar este trecho'}
          onSave={result => saveTrim(trimClip, result)}
          onCancel={closeTrim}
        />
      )}
      {phrasesOpen && pivot && !trimClip && <PivotPhrases config={pivot} onChange={setPivot} onClose={() => setPhrasesOpen(false)} />}
      {toast.node}
    </div>
  )
}

const ROLES: Record<CatchphraseRole, string> = { abertura: 'Abertura', meio: 'Meio', final: 'Final' }

/** Uma faixa de bordões, com o cartão que recebe clipes (clique ou arraste). */
function Lane({
  title,
  sub,
  addLabel,
  multiple,
  onFiles,
  disabled,
  extra,
  children,
}: {
  title: string
  sub: string
  addLabel: string
  multiple?: boolean
  onFiles: (files: File[]) => void
  disabled: boolean
  extra?: ReactNode
  children: ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)
  return (
    <div className="bdo-lane">
      <div className="bdo-lane-head">
        <div>
          <h2>{title}</h2>
          <span className="meta">{sub}</span>
        </div>
        {extra}
      </div>
      <div className="lib-grid bdo-grid">
        <button
          className={`bdo-add ${over ? 'over' : ''}`}
          disabled={disabled}
          onClick={() => input.current?.click()}
          onDragOver={e => {
            e.preventDefault()
            setOver(true)
          }}
          onDragLeave={() => setOver(false)}
          onDrop={e => {
            e.preventDefault()
            setOver(false)
            const files = [...e.dataTransfer.files]
            onFiles(multiple ? files : files.slice(0, 1))
          }}
        >
          <span>+</span>
          {addLabel}
        </button>
        {children}
      </div>
      <input
        ref={input}
        type="file"
        accept="video/*"
        multiple={multiple}
        hidden
        onChange={e => {
          onFiles([...(e.target.files ?? [])])
          e.target.value = ''
        }}
      />
    </div>
  )
}

/** Os clipes do meio que cada vídeo usou, do mais novo para o mais velho (só os vídeos com virada). */
function pivotUsage(projects: ShortProject[]) {
  return [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => ({ project: p, clipId: p.beats.find(b => b.pivot)?.pivot?.clipId }))
    .filter((u): u is { project: ShortProject; clipId: string } => typeof u.clipId === 'string')
}
type PivotUsage = ReturnType<typeof pivotUsage>

/** "há 3 vídeos", "nunca usado" ou "descansa" (saiu num dos últimos N vídeos, na ordem "sem repetir"). */
function usageLabel(c: Catchphrase, usage: PivotUsage, pivot: PivotConfig | null) {
  const i = usage.findIndex(u => u.clipId === c.id)
  if (i < 0) return { text: 'nunca usado', never: true, resting: false }
  const resting = pivot?.order === 'descanso' && i < pivot.rest
  const when = i === 0 ? 'último vídeo' : `há ${i + 1} vídeos`
  return { text: resting ? `${when} · descansa` : when, never: false, resting }
}

/** Prévia do clipe do meio: só o trecho que entra (fragmento #t do vídeo), no volume dele. */
function MiddlePreview({ c }: { c: Catchphrase }) {
  if (!c.file) return <div className="bdo-preview bdo-preview-empty">Envie o vídeo para ver a prévia</div>
  const t = pivotTrim(c)
  return (
    <video
      className="bdo-preview bdo-middle-preview"
      src={`${catchphraseFileUrl(c.file)}#t=${t.start},${t.start + t.duration}`}
      controls
      ref={v => {
        if (v) v.volume = c.volume ?? DEFAULT_PIVOT_VOLUME
      }}
    />
  )
}

/** O clipe do meio (ADR 0039): o trecho, o som por baixo da voz e o rodízio. */
function MiddleFields({ c, usage, onChange, onTrim, disabled }: { c: Catchphrase; usage: PivotUsage; onChange: OnChange; onTrim: () => void; disabled: boolean }) {
  const t = pivotTrim(c)
  const volume = c.volume ?? DEFAULT_PIVOT_VOLUME
  const used = usage.filter(u => u.clipId === c.id)
  return (
    <>
      <span className="label bdo-section">Trecho que entra</span>
      <span className="bdo-trim">
        {c.duration > WHOLE_CLIP_SECONDS ? `${seconds(t.start)} a ${seconds(t.start + t.duration)} (${seconds(t.duration)} de ${seconds(c.duration)})` : `o clipe inteiro (${seconds(c.duration)})`}
      </span>
      {c.duration > WHOLE_CLIP_SECONDS && (
        <button className="act" onClick={onTrim} disabled={disabled}>✂ Recortar…</button>
      )}

      <span className="label bdo-section">Som do clipe</span>
      <label className="rv-vol bdo-volume">
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={Math.round(volume * 100)}
          onChange={e => onChange(c, { volume: e.target.valueAsNumber / 100 }, false)}
          onPointerUp={e => onChange(c, { volume: e.currentTarget.valueAsNumber / 100 })}
          onKeyUp={e => onChange(c, { volume: e.currentTarget.valueAsNumber / 100 })}
        />
        <output>{Math.round(volume * 100)}%</output>
      </label>
      <span className="meta">Por baixo da voz, em todos os vídeos com este clipe; 0% deixa mudo.</span>

      <span className="label bdo-section">Rodízio</span>
      <label className="bdo-check">
        <input type="checkbox" checked={c.inRotation !== false} disabled={disabled} onChange={e => onChange(c, { inRotation: e.target.checked })} />
        Entra no rodízio do meio
      </label>
      <span className="meta">
        {used.length === 0
          ? 'Ainda não entrou em nenhum vídeo.'
          : `Usado em ${used.length} ${used.length === 1 ? 'vídeo' : 'vídeos'} · o último foi “${used[0].project.title}”.`}
      </span>
    </>
  )
}

/** Miniatura do card: o primeiro quadro do clipe, a imagem do montado ou a foto do "se inscreve". */
function CatchphraseThumb({ c, images }: { c: Catchphrase; images: Map<string, LibraryImage> }) {
  // no meio, o quadro do começo do trecho que entra
  if (c.kind === 'clipe' && c.file) return <video src={`${catchphraseFileUrl(c.file)}#t=${(catchphraseRole(c) === 'meio' ? pivotTrim(c).start : 0) + 0.1}`} muted preload="metadata" />
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
