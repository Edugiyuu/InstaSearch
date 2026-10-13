import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  beatsNeedingImage,
  CAPTION_LABEL,
  CaptionMode,
  Catchphrase,
  CATCHPHRASE_KIND_LABEL,
  EFFECTS_LABEL,
  EffectsLevel,
  errorMessage,
  FramingChoice,
  imageUrl,
  Pace,
  PACE_LABEL,
  ShortProject,
  shortsApi,
  soundUrl,
  StickerLevel,
  STICKERS_LABEL,
} from '../api/shorts'
import { AiBadge, SearchList, Segmented, Spinner, useToast } from '../components/flow'
import PublishModal from '../components/PublishModal'
import { useCatchphrases, useLibrary, useProject, useSounds, useStyles } from '../hooks/useShorts'
import { ShortPlayer, ShortPlayerHandle } from '../video/ShortPlayer'
import { DEFAULT_SFX_VOLUME, sfxVolume, voiceTiming } from '../video/timeline'
import { ScenePick, ScenePickOption } from '../components/ScenePick'
import { BackdropPick } from '../components/BackdropPick'
import { WhyTopic } from '../components/WhyTopic'
import { StickerChoice, StickerPick } from '../components/StickerPick'
import './Review.css'

/** "se ligaa · clipe pronto · 3,2s" na lista de bordões (sem repetir o tipo quando o nome já é ele) */
const catchphraseLabel = (c: Catchphrase) => {
  const kind = CATCHPHRASE_KIND_LABEL[c.kind].toLowerCase()
  return [c.name, c.name.toLowerCase() === kind ? null : kind, `${c.duration.toFixed(1).replace('.', ',')}s`].filter(Boolean).join(' · ')
}

/**
 * A legenda está no tempo da voz? (ADR 0018) Diz a verdade sobre o tempo usado no vídeo:
 * sincronizado, sincronizando ou estimado, e quantas palavras não bateram com o roteiro.
 */
function VoiceSync({ project, onSync }: { project: ShortProject; onSync: () => void }) {
  if (!project.audioFile) return null
  const t = project.transcript?.audioFile === project.audioFile ? project.transcript : undefined
  const retry = (label: string) => <button className="act" onClick={onSync}>{label}</button>

  if (t?.status === 'pendente' || t?.status === 'transcrevendo') {
    const pct = t.progress ? ` · ${Math.round(t.progress * 100)}%` : ''
    return (
      <li>
        <Spinner /> {t.stage === 'baixando' ? `Baixando o Whisper (só na primeira vez)${pct}` : 'Sincronizando a legenda com a sua voz…'}
      </li>
    )
  }
  if (t?.status === 'erro') return <li>Legenda com tempo estimado: a sincronia falhou ({t.error}) · {retry('tentar de novo')}</li>
  if (t?.status === 'pronto') {
    const voice = voiceTiming(project)
    if (!voice) return <li>A voz não bateu com o roteiro; legenda com tempo estimado · {retry('sincronizar de novo')}</li>
    const missing = voice.total - voice.matched
    return (
      <li>
        Legenda no tempo da voz <span className="c-success">✓</span>
        {missing > 0 && <span className="c-muted"> · {missing} {missing === 1 ? 'palavra não bateu' : 'palavras não bateram'} com o roteiro (tempo estimado)</span>}
      </li>
    )
  }
  return <li>Legenda com tempo estimado · {retry('sincronizar com a voz')}</li>
}

/** O pedido ao chat quando o ajuste "Figurinhas" muda a quantidade de reações (Nenhuma não precisa da IA). */
const STICKERS_REQUEST: Record<Exclude<StickerLevel, 'nenhuma'>, string> = {
  muitas:
    'Figurinhas "Muitas": ponha uma reação (effect emoji, com "sticker") em cerca de 1 a cada 3 cenas, nos momentos de emoção, nas cenas sem efeito. Não tire setas nem X e não mude a narração.',
  poucas:
    'Figurinhas "Poucas": deixe a reação (effect emoji) só nos 2 ou 3 momentos mais fortes; nas outras, use effect "none". Não mexa nas setas e X nem na narração.',
}

const SUGGESTIONS = ['Gancho mais curto', 'Final mais polêmico', 'Mais setas e X', 'Tira uma cena do meio', 'Legenda menor']

/** Um controle de volume do pop-up do som, em %. Ao soltar, toca o efeito para ouvir como ficou. */
function VolumeRow({ label, title, value, max, onChange, onRelease }: {
  label: string
  title: string
  value: number
  /** em %, ex.: 200 */
  max: number
  onChange: (value: number) => void
  onRelease: (value: number) => void
}) {
  const release = (e: { currentTarget: HTMLInputElement }) => onRelease(e.currentTarget.valueAsNumber / 100)
  return (
    <label className="rv-vol" title={title}>
      <span>{label}</span>
      <input
        type="range"
        min={0}
        max={max}
        step={5}
        value={Math.round(value * 100)}
        onChange={e => onChange(e.target.valueAsNumber / 100)}
        onPointerUp={release}
        onKeyUp={release}
      />
      <output>{Math.round(value * 100)}%</output>
    </label>
  )
}

function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialBeat = Math.max(0, Number(params.get('cena') ?? 1) - 1)
  const { project, setProject, error, loading } = useProject(id)
  const { images, byId, reload: reloadLibrary } = useLibrary()
  const { sounds, byId: soundsById } = useSounds()
  const { catchphrases, byId: catchphraseById } = useCatchphrases()
  const { styles } = useStyles()
  const toast = useToast()
  const player = useRef<ShortPlayerHandle>(null)
  const preview = useRef<HTMLAudioElement | null>(null)
  const chatEnd = useRef<HTMLDivElement>(null)
  const [current, setCurrent] = useState(initialBeat)
  const [request, setRequest] = useState('')
  const [working, setWorking] = useState<string | null>(null)
  const [publishing, setPublishing] = useState(false)
  // saves que esperam o controle parar de mexer (um arraste do volume manda dezenas de valores)
  const pendingSaves = useRef(new Map<string, ReturnType<typeof setTimeout>>())

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [project?.history.length, working])

  const onBeatChange = useCallback((i: number) => setCurrent(i), [])

  // enquanto a voz é transcrita, acompanha o andamento; só o transcript muda, para não
  // desfazer o que o usuário estiver editando na tela
  const syncing = project?.transcript?.status === 'pendente' || project?.transcript?.status === 'transcrevendo'
  const projectId = project?.id
  useEffect(() => {
    if (!syncing || !projectId) return
    const t = setInterval(() => {
      shortsApi
        .getProject(projectId)
        .then(fresh => setProject(p => (p ? { ...p, transcript: fresh.transcript } : p)))
        .catch(() => undefined)
    }, 3000)
    return () => clearInterval(t)
  }, [syncing, projectId, setProject])

  if (loading) return <div className="page"><Spinner /></div>
  if (!project) return <div className="page"><p className="form-error">{error}</p></div>

  const run = async (label: string, action: () => Promise<ShortProject>) => {
    setWorking(label)
    try {
      setProject(await action())
    } catch (e) {
      toast.show(errorMessage(e))
    } finally {
      setWorking(null)
    }
  }

  const ask = (text: string) => {
    if (!text.trim() || working) return
    setRequest('')
    run(text, () => shortsApi.adjust(project.id, text, current + 1))
  }

  const setPace = (pace: Pace) =>
    run(`Ritmo ${PACE_LABEL[pace].toLowerCase()}`, async () => {
      await shortsApi.updateProject(project.id, { settings: { ...project.settings, pace } })
      const how = pace === 'calmo' || pace === 'normal' ? 'junte cenas vizinhas para ter menos cortes' : 'divida as falas em mais cenas curtas para ter mais cortes'
      return shortsApi.adjust(project.id, `Ritmo ${PACE_LABEL[pace]}: ${how}, sem mudar a narração.`)
    })

  const setEffects = (effects: EffectsLevel) =>
    run(`Efeitos: ${EFFECTS_LABEL[effects].toLowerCase()}`, async () => {
      await shortsApi.updateProject(project.id, { settings: { ...project.settings, effects } })
      return shortsApi.adjust(project.id, `Efeitos "${EFFECTS_LABEL[effects]}": ajuste a quantidade de setas, X, círculos e emojis, sem mudar a narração.`)
    })

  /**
   * Nenhuma: tira as figurinhas automáticas na hora, sem IA. Muitas: a IA põe reações em mais cenas.
   * Poucas: volta às reações que a IA já tinha posto; vindo de Muitas, a IA tira as que sobram.
   * Nos três, as figurinhas escolhidas na cena ficam.
   */
  const setStickers = (stickers: StickerLevel) => {
    const from = project.settings.stickers ?? 'poucas'
    run(`Figurinhas: ${STICKERS_LABEL[stickers].toLowerCase()}`, async () => {
      const saved = await shortsApi.updateProject(project.id, { settings: { stickers } })
      const askAI = stickers === 'muitas' || (stickers === 'poucas' && from === 'muitas')
      return askAI ? shortsApi.adjust(project.id, STICKERS_REQUEST[stickers as Exclude<StickerLevel, 'nenhuma'>]) : saved
    })
  }

  const repickImages = (label: string) => run(label, async () => (await shortsApi.assemble(project.id)).project)

  /** Abertura ou final: o id de um bordão da biblioteca, ou null para nenhum. */
  const setCatchphrase = (slot: 'intro' | 'outro', id: string | null) => {
    const settings = { ...project.settings, [slot]: id }
    setProject({ ...project, settings })
    shortsApi.updateProject(project.id, { settings }).catch(e => toast.show(errorMessage(e)))
  }

  const setCaption = (caption: CaptionMode) => {
    setProject({ ...project, settings: { ...project.settings, caption } })
    shortsApi.updateProject(project.id, { settings: { ...project.settings, caption } }).catch(e => toast.show(errorMessage(e)))
  }

  /** Segue a criação sozinha da etapa onde parou; o andamento aparece na tela Ideias. */
  const continueAutopilot = async () => {
    try {
      await shortsApi.continueAutopilot(project.id)
      setProject(p => (p?.autopilot ? { ...p, autopilot: { ...p.autopilot, error: undefined } } : p))
      toast.show('Continuando. Acompanhe na tela Ideias.')
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const saveForLater = async () => {
    try {
      setProject(await shortsApi.updateProject(project.id, { status: 'salvo' }))
      toast.show('Salvo em Projetos. Publique quando quiser.')
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const setMusic = (musicId: string | null) => {
    setProject({ ...project, musicId })
    shortsApi.updateProject(project.id, { musicId }).catch(e => toast.show(errorMessage(e)))
  }

  const music = sounds.filter(s => s.kind === 'musica')
  const hasSfx = sounds.some(s => s.kind === 'sfx')
  const sfxCount = project.beats.filter(b => b.sfxId).length
  const stickerCount = project.beats.filter(b => b.stickerId).length
  const pending = beatsNeedingImage(project)
  const missing = pending.filter(b => b.imageStatus === 'missing')
  const effects = project.beats.filter(b => b.effect !== 'none').length
  const seconds = Math.round(project.audioDuration || project.duration)
  const style = styles.find(s => s.id === project.styleId)
  const beat = project.beats[current]
  const beatImage = beat?.imageId ? byId.get(beat.imageId) : undefined
  const sfxList = sounds.filter(s => s.kind === 'sfx')
  const stickerList = images.filter(i => i.kind === 'figurinha')
  const beatSticker = beat?.stickerId ? byId.get(beat.stickerId) : undefined
  const beatSound = beat?.sfxId ? soundsById.get(beat.sfxId) : undefined

  // editor: o usuário escolhe o efeito sonoro da cena (fica travado; "auto" devolve para a montagem)
  const setSfx = async (value: string) => {
    if (!beat) return
    const sfxId = value === 'none' ? null : value
    const sound = sfxId && sfxId !== 'auto' ? soundsById.get(sfxId) : undefined
    try {
      setProject(await shortsApi.setBeatSfx(project.id, beat.id, sfxId))
      // som novo: o ajuste da cena volta a 100%, então toca no volume do vídeo
      if (sound) playSound(sound.id, videoSfxVolume)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  /** A figurinha da cena (ADR 0022, 2C): uma da biblioteca, nenhuma ou automático. */
  const setSticker = async (choice: StickerChoice) => {
    if (!beat) return
    try {
      setProject(await shortsApi.setBeatSticker(project.id, beat.id, choice))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  /** O fundo da cena: tela cheia, inteira, as molduras ou automático (ADR 0020 e 0022). */
  const setFraming = async (value: 'auto' | FramingChoice) => {
    if (!beat) return
    try {
      setProject(await shortsApi.setBeatFraming(project.id, beat.id, value === 'auto' ? null : value))
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  /** volume: 1 = o arquivo como é; o <audio> do navegador não passa de 1 (o vídeo amplifica, a prévia do ▶ não) */
  const playSound = (soundId?: string, volume = 1) => {
    const sound = soundId ? soundsById.get(soundId) : undefined
    if (!sound) return
    preview.current?.pause()
    preview.current = new Audio(soundUrl(sound))
    preview.current.volume = Math.min(1, Math.max(0, volume))
    preview.current.play().catch(() => undefined)
  }

  /** Guarda só depois que o controle para de mexer; a tela (e o player) já mudam na hora. */
  const saveSoon = (key: string, save: () => Promise<unknown>) => {
    clearTimeout(pendingSaves.current.get(key))
    pendingSaves.current.set(key, setTimeout(() => save().catch(e => toast.show(errorMessage(e))), 400))
  }

  /** Volume de todos os efeitos do vídeo (0 a 1). */
  const videoSfxVolume = project.settings.sfxVolume ?? DEFAULT_SFX_VOLUME
  const setVideoSfxVolume = (volume: number) => {
    setProject(p => (p ? { ...p, settings: { ...p.settings, sfxVolume: volume } } : p))
    saveSoon('video', () => shortsApi.updateProject(project.id, { settings: { sfxVolume: volume } }))
  }

  /** Ajuste da cena (0 a 2), que multiplica o volume do vídeo. */
  const setSceneSfxVolume = (beatId: string, volume: number) => {
    setProject(p => (p ? { ...p, beats: p.beats.map(b => (b.id === beatId ? { ...b, sfxVolume: volume } : b)) } : p))
    saveSoon(`cena ${beatId}`, () => shortsApi.setBeatSfxVolume(project.id, beatId, volume))
  }

  return (
    <div className="review">
      <header className="rv-top">
        <Link to="/projetos" className="rv-back">← Projetos</Link>
        <strong className="rv-title">{project.title}</strong>
        <span className="meta">{style?.name ?? project.styleId} · {seconds}s</span>
        {project.autopilot && <span className="meta" title="Roteiro, montagem e imagens feitos sozinhos (ADR 0026)">🤖 criado sozinho</span>}
        <span className="spacer" />
        <Link to={`/projeto/${project.id}/roteiro`} className="btn-o">Roteiro e voz</Link>
        {project.status === 'salvo' ? (
          <span className="rv-saved">✓ Salvo para depois</span>
        ) : (
          <button className="btn-g" onClick={saveForLater}>Salvar para depois</button>
        )}
        <button className="btn-y" onClick={() => setPublishing(true)}>Publicar →</button>
      </header>

      {project.autopilot && (project.autopilot.error || project.autopilot.stage !== 'pronto') && (
        // ADR 0026: criado sozinho, mas ainda criando ou parado no meio
        <p className="rv-auto">
          🤖 {project.autopilot.error ? `A criação sozinha parou: ${project.autopilot.error}` : 'Este vídeo ainda está sendo criado sozinho…'}
          {project.autopilot.error && (
            <button className="act" onClick={continueAutopilot}>Continuar</button>
          )}
          <Link to="/ideias" className="act">Acompanhar em Ideias</Link>
        </p>
      )}

      <div className="rv-body">
        <section className="rv-video">
          <div className="rv-player">
            <ShortPlayer ref={player} project={project} images={byId} sounds={soundsById} onBeatChange={onBeatChange} initialBeat={initialBeat} />
          </div>
          <div className="rv-strip" aria-label="Cenas">
            {project.beats.map((b, i) => (
              <button
                key={b.id}
                className={`rv-tick ${b.locked ? 'match' : b.imageStatus} ${i === current ? 'on' : ''} ${b.sfxId ? 'has-sfx' : ''}`}
                style={{ flexGrow: Math.max(2, b.say.split(/\s+/).length) }}
                title={`${i + 1}. ${b.text}${b.sfxId ? ` · 🔊 ${soundsById.get(b.sfxId)?.name ?? 'efeito'}` : ''}`}
                onClick={() => player.current?.seekToBeat(i)}
              />
            ))}
          </div>
          {beat && (
            // key: ao mudar de cena, os menus abertos fecham
            <div className="rv-scene" key={beat.id}>
              <button className="sp-chip" onClick={() => navigate(`/projeto/${project.id}/imagens?cena=${beat.id}`)} title="Trocar a imagem desta cena">
                🖼 Trocar
              </button>
              {beatImage && <BackdropPick scene={beat.scene} choice={beat.framing} image={beatImage} onChange={setFraming} />}
              {sfxList.length === 0 ? (
                <Link to="/biblioteca?aba=sfx" className="sp-chip">🔊 + Efeitos sonoros</Link>
              ) : (
                <>
                  <ScenePick
                    label={`🔊 ${beatSound?.name ?? 'sem som'}${beat.sfxId && (beat.sfxVolume ?? 1) !== 1 ? ` · ${Math.round((beat.sfxVolume ?? 1) * 100)}%` : ''}`}
                    title="Efeito sonoro desta cena e volume"
                    className="rv-sfx-pick"
                  >
                    {close => (
                      <>
                        <p className="sp-sep">Volume</p>
                        <VolumeRow
                          label="Todos os efeitos"
                          title="Volume de todos os efeitos sonoros do vídeo"
                          value={videoSfxVolume}
                          max={100}
                          onChange={setVideoSfxVolume}
                          onRelease={v => playSound(beat.sfxId, v * (beat.sfxVolume ?? 1))}
                        />
                        {beat.sfxId && (
                          <VolumeRow
                            label="Esta cena"
                            title="Mais alto ou mais baixo que os outros efeitos (100% = igual)"
                            value={beat.sfxVolume ?? 1}
                            max={200}
                            onChange={v => setSceneSfxVolume(beat.id, v)}
                            onRelease={v => playSound(beat.sfxId, videoSfxVolume * v)}
                          />
                        )}
                        <p className="sp-sep">Som desta cena</p>
                        <ScenePickOption on={!beat.sfxLocked} onClick={() => { setSfx('auto'); close() }}>
                          Automático ({beat.sfxLocked ? 'a montagem escolhe' : beatSound?.name ?? 'sem som'})
                        </ScenePickOption>
                        <ScenePickOption on={!!beat.sfxLocked && !beat.sfxId} onClick={() => { setSfx('none'); close() }}>
                          Sem som
                        </ScenePickOption>
                        <p className="sp-sep">Seus efeitos</p>
                        {sfxList.map(s => (
                          <ScenePickOption
                            key={s.id}
                            on={!!beat.sfxLocked && beat.sfxId === s.id}
                            onClick={() => { setSfx(s.id); close() }}
                            extra={<button className="btn-g rv-sfx-play" onClick={() => playSound(s.id, videoSfxVolume)} title={`Ouvir ${s.name}`}>▶</button>}
                          >
                            {s.name}
                          </ScenePickOption>
                        ))}
                      </>
                    )}
                  </ScenePick>
                  <button className="sp-chip" onClick={() => playSound(beat.sfxId, sfxVolume(project.settings, beat))} disabled={!beatSound} title="Ouvir o efeito desta cena">▶</button>
                </>
              )}
            </div>
          )}
          {beat && (
            // segunda linha, para a primeira não ficar apertada
            <div className="rv-scene rv-scene-2" key={`${beat.id}-figurinha`}>
              {stickerList.length === 0 ? (
                <Link to="/biblioteca?aba=figurinhas" className="sp-chip">😮 + Figurinhas</Link>
              ) : (
                <StickerPick
                  stickers={stickerList}
                  current={beatSticker}
                  locked={!!beat.stickerLocked}
                  context={`${project.subject ?? project.theme} ${beat.characters.join(' ')}`}
                  onChange={setSticker}
                />
              )}
            </div>
          )}
          {beat && (
            <p className="rv-now">
              <span className="c-muted">Cena {current + 1}/{project.beats.length}</span>
              <span className="rv-now-text">“{beat.say}”</span>
              <span className={beatImage ? 'c-muted' : 'c-danger'}>{beatImage ? beatImage.name : 'falta imagem'}</span>
            </p>
          )}
        </section>

        <section className="panel rv-chat">
          <h2 className="panel-title">✨ Peça um ajuste</h2>
          <div className="rv-messages">
            {project.history.length === 0 && !working && (
              <p className="rv-empty">Fale do jeito que quiser: “troca o final”, “mais rápido no começo”, “usa mais o rosto do Sukuna”.</p>
            )}
            {project.history.map(h => (
              <div key={h.id} className="rv-msg">
                <p className="rv-me">{h.request}</p>
                <p className="rv-ai">{h.reply}</p>
                <AiBadge ai={h.ai} compact />
              </div>
            ))}
            {working && (
              <div className="rv-msg">
                <p className="rv-me">{working}</p>
                <p className="rv-ai rv-typing"><Spinner /> mudando o vídeo…</p>
              </div>
            )}
            <div ref={chatEnd} />
          </div>

          <div className="rv-suggest">
            {SUGGESTIONS.map(s => (
              <button key={s} className="rv-chip" onClick={() => ask(s)} disabled={!!working}>{s}</button>
            ))}
          </div>
          <div className="rv-input">
            <input
              className="field"
              value={request}
              onChange={e => setRequest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && ask(request)}
              placeholder="O que você quer mudar?"
              disabled={!!working}
            />
            <button className="btn-y" onClick={() => ask(request)} disabled={!!working || !request.trim()}>Enviar</button>
          </div>
          <button className="act rv-undo" onClick={() => run('Desfazer', () => shortsApi.undo(project.id))} disabled={!!working || project.undo.length === 0}>
            ↶ Desfazer a última mudança
          </button>
        </section>

        <aside className="rv-side">
          <div className="panel rv-card">
            <span className="label">O que a IA montou</span>
            <ul className="rv-facts">
              <li><strong>{project.beats.length}</strong> cenas em {seconds}s</li>
              <li><strong>{project.beats.length - pending.length}</strong> com imagem certa</li>
              <li><strong>{effects}</strong> setas, X e reações{stickerCount > 0 && ` (${stickerCount} figurinhas)`}</li>
              <li>
                {hasSfx ? (
                  <><strong>{sfxCount}</strong> efeitos sonoros</>
                ) : (
                  <>Sem efeitos sonoros · <Link to="/biblioteca?aba=sfx" className="act">adicionar</Link></>
                )}
              </li>
              <li>
                {project.audioFile ? (
                  <>Sua voz <span className="c-success">✓</span></>
                ) : (
                  <>Sem voz ainda · <Link to={`/projeto/${project.id}/roteiro`} className="act">subir áudio</Link></>
                )}
              </li>
              <VoiceSync
                project={project}
                onSync={() =>
                  shortsApi
                    .transcribe(project.id)
                    .then(fresh => setProject(p => (p ? { ...p, transcript: fresh.transcript } : p)))
                    .catch(e => toast.show(errorMessage(e)))
                }
              />
            </ul>
          </div>

          <div className={`panel rv-card ${pending.length ? 'rv-need' : ''}`}>
            {pending.length ? (
              <>
                <span className="label c-danger">Precisa de você</span>
                <p className="rv-need-title">
                  {missing.length > 0 && `${missing.length} ${missing.length === 1 ? 'cena sem imagem' : 'cenas sem imagem'}`}
                  {missing.length > 0 && pending.length > missing.length && ' · '}
                  {pending.length > missing.length && `${pending.length - missing.length} com imagem parecida`}
                </p>
                <div className="rv-need-thumbs">
                  {pending.slice(0, 5).map(b => {
                    const img = b.imageId ? byId.get(b.imageId) : undefined
                    return (
                      <button key={b.id} onClick={() => player.current?.seekToBeat(project.beats.indexOf(b))} title={b.query}>
                        {img ? <img src={imageUrl(img)} alt="" /> : <span>?</span>}
                      </button>
                    )
                  })}
                </div>
                <button className="btn-y rv-need-btn" onClick={() => navigate(`/projeto/${project.id}/imagens`)}>
                  Escolher eu mesmo →
                </button>
                <button
                  className="btn-g rv-need-btn"
                  disabled={!!working}
                  title="Busca na internet e coloca a melhor imagem em cada cena que falta"
                  onClick={() =>
                    run('Buscando imagens na internet', async () => {
                      const out = await shortsApi.autoImages(project.id)
                      await reloadLibrary()
                      toast.show(`Coloquei imagem em ${out.added} de ${out.total} ${out.total === 1 ? 'cena' : 'cenas'}.`)
                      return out.project
                    })
                  }
                >
                  ✨ Preencher automaticamente
                </button>
              </>
            ) : (
              <p className="c-success rv-ok">✓ Todas as cenas têm imagem</p>
            )}
          </div>

          {project.autopilot?.why && (
            <div className="panel rv-card">
              <WhyTopic autopilot={project.autopilot} />
            </div>
          )}

          {(project.ai?.script || project.ai?.images) && (
            <div className="panel rv-card rv-credits">
              <span className="label">Quem fez</span>
              <AiBadge label="Roteiro" ai={project.ai?.script} />
              <AiBadge label="Imagens" ai={project.ai?.images} />
              <SearchList ai={project.ai?.script} />
            </div>
          )}

          <div className="panel rv-card">
            <span className="label">Ajustes rápidos</span>
            <div className="rv-knob">
              <span>Imagens</span>
              <button
                className="act rv-repick"
                onClick={() => repickImages('Buscando as imagens de novo na web')}
                disabled={!!working}
                title="Busca de novo na web as imagens que a montagem escolheu; as que você escolheu ficam"
              >
                ↻ Buscar de novo na web
              </button>
            </div>
            <div className="rv-knob">
              <span>Ritmo</span>
              <Segmented value={project.settings.pace} options={PACE_LABEL} onChange={setPace} disabled={!!working} />
            </div>
            <div className="rv-knob">
              <span>Efeitos</span>
              <Segmented value={project.settings.effects} options={EFFECTS_LABEL} onChange={setEffects} disabled={!!working} />
            </div>
            <div className="rv-knob">
              <span>Figurinhas</span>
              {stickerList.length ? (
                <Segmented value={project.settings.stickers ?? 'poucas'} options={STICKERS_LABEL} onChange={setStickers} disabled={!!working} />
              ) : (
                <Link to="/biblioteca?aba=figurinhas" className="act">+ Adicionar figurinhas à biblioteca</Link>
              )}
            </div>
            <div className="rv-knob">
              <span>Legenda</span>
              <Segmented value={project.settings.caption} options={CAPTION_LABEL} onChange={setCaption} />
            </div>
            {(['intro', 'outro'] as const).map(slot => (
              <div className="rv-knob" key={slot}>
                <span>{slot === 'intro' ? 'Bordão de abertura' : 'Bordão do final'}</span>
                {catchphrases.length ? (
                  <select
                    className="field rv-music"
                    // um bordão apagado da biblioteca aparece como "Nenhum" (a composição já o ignora)
                    value={catchphraseById.has(project.settings[slot] ?? '') ? project.settings[slot]! : ''}
                    onChange={e => setCatchphrase(slot, e.target.value || null)}
                  >
                    <option value="">Nenhum</option>
                    {catchphrases.map(c => (
                      <option key={c.id} value={c.id}>{catchphraseLabel(c)}</option>
                    ))}
                  </select>
                ) : (
                  <Link to="/biblioteca?aba=bordoes" className="act">+ Criar bordões na biblioteca</Link>
                )}
              </div>
            ))}
            <div className="rv-knob">
              <span>Música</span>
              {music.length ? (
                <select className="field rv-music" value={project.musicId ?? ''} onChange={e => setMusic(e.target.value || null)}>
                  <option value="">Sem música</option>
                  {music.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              ) : (
                <Link to="/biblioteca?aba=musica" className="act">+ Adicionar músicas à biblioteca</Link>
              )}
            </div>
          </div>
        </aside>
      </div>

      {publishing && <PublishModal project={project} images={byId} sounds={soundsById} onClose={() => setPublishing(false)} onSaved={setProject} />}
      {toast.node}
    </div>
  )
}

export default Review
