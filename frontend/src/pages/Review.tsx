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
  imageUrl,
  Pace,
  PACE_LABEL,
  ImagePicker,
  PICKER_LABEL,
  ShortProject,
  shortsApi,
  soundUrl,
} from '../api/shorts'
import { AiBadge, Segmented, Spinner, useToast } from '../components/flow'
import PublishModal from '../components/PublishModal'
import { useCatchphrases, useLibrary, useProject, useSounds, useStyles } from '../hooks/useShorts'
import { ShortPlayer, ShortPlayerHandle } from '../video/ShortPlayer'
import './Review.css'

/** "se ligaa · clipe pronto · 3,2s" na lista de bordões (sem repetir o tipo quando o nome já é ele) */
const catchphraseLabel = (c: Catchphrase) => {
  const kind = CATCHPHRASE_KIND_LABEL[c.kind].toLowerCase()
  return [c.name, c.name.toLowerCase() === kind ? null : kind, `${c.duration.toFixed(1).replace('.', ',')}s`].filter(Boolean).join(' · ')
}

const SUGGESTIONS = ['Gancho mais curto', 'Final mais polêmico', 'Mais setas e X', 'Tira uma cena do meio', 'Legenda menor']

function Review() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialBeat = Math.max(0, Number(params.get('cena') ?? 1) - 1)
  const { project, setProject, error, loading } = useProject(id)
  const { byId, reload: reloadLibrary } = useLibrary()
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

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ block: 'nearest' })
  }, [project?.history.length, working])

  const onBeatChange = useCallback((i: number) => setCurrent(i), [])

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

  const repickImages = (label: string) => run(label, async () => (await shortsApi.assemble(project.id)).project)

  const setPicker = (imagePicker: ImagePicker) =>
    run(imagePicker === 'ia' ? 'A IA escolhe as imagens' : 'Escolher imagens por palavras', async () => {
      await shortsApi.updateProject(project.id, { settings: { ...project.settings, imagePicker } })
      return (await shortsApi.assemble(project.id)).project
    })

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
  const beatSound = beat?.sfxId ? soundsById.get(beat.sfxId) : undefined

  // editor: o usuário escolhe o efeito sonoro da cena (fica travado; "auto" devolve para a montagem)
  const setSfx = async (value: string) => {
    if (!beat) return
    const sfxId = value === 'none' ? null : value
    const sound = sfxId && sfxId !== 'auto' ? soundsById.get(sfxId) : undefined
    try {
      setProject(await shortsApi.setBeatSfx(project.id, beat.id, sfxId))
      if (sound) playSound(sound.id)
    } catch (e) {
      toast.show(errorMessage(e))
    }
  }

  const playSound = (soundId?: string) => {
    const sound = soundId ? soundsById.get(soundId) : undefined
    if (!sound) return
    preview.current?.pause()
    preview.current = new Audio(soundUrl(sound))
    preview.current.play().catch(() => undefined)
  }

  return (
    <div className="review">
      <header className="rv-top">
        <Link to="/projetos" className="rv-back">← Projetos</Link>
        <strong className="rv-title">{project.title}</strong>
        <span className="meta">{style?.name ?? project.styleId} · {seconds}s</span>
        <span className="spacer" />
        <Link to={`/projeto/${project.id}/roteiro`} className="btn-o">Roteiro e voz</Link>
        {project.status === 'salvo' ? (
          <span className="rv-saved">✓ Salvo para depois</span>
        ) : (
          <button className="btn-g" onClick={saveForLater}>Salvar para depois</button>
        )}
        <button className="btn-y" onClick={() => setPublishing(true)}>Publicar →</button>
      </header>

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
            <p className="rv-now">
              <span className="c-muted">Cena {current + 1}/{project.beats.length}</span>
              <span className="rv-now-text">“{beat.say}”</span>
              <span className={beatImage ? 'c-muted' : 'c-danger'}>{beatImage ? beatImage.name : 'falta imagem'}</span>
              <button className="act rv-swap" onClick={() => navigate(`/projeto/${project.id}/imagens?cena=${beat.id}`)}>
                🖼 Trocar imagem
              </button>
            </p>
          )}
          {beat && (
            <div className="rv-sfx">
              <span className="rv-sfx-label">🔊 Efeito sonoro desta cena</span>
              {sfxList.length === 0 ? (
                <Link to="/biblioteca?aba=sfx" className="act">+ Adicionar efeitos à biblioteca</Link>
              ) : (
                <div className="rv-sfx-row">
                  <select
                    className="rv-sfx-pick"
                    value={beat.sfxLocked ? beat.sfxId ?? 'none' : 'auto'}
                    onChange={e => setSfx(e.target.value)}
                    aria-label="Efeito sonoro desta cena"
                  >
                    <option value="auto">Automático ({beat.sfxLocked ? 'a montagem escolhe' : beatSound?.name ?? 'sem som'})</option>
                    <option value="none">Sem som</option>
                    <optgroup label="Seus efeitos">
                      {sfxList.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </optgroup>
                  </select>
                  <button className="btn-g rv-sfx-play" onClick={() => playSound(beat.sfxId)} disabled={!beatSound} title="Ouvir o efeito">
                    ▶
                  </button>
                </div>
              )}
            </div>
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

          {(project.ai?.script || project.ai?.images) && (
            <div className="panel rv-card rv-credits">
              <span className="label">Quem fez</span>
              <AiBadge label="Roteiro" ai={project.ai?.script} />
              <AiBadge label="Imagens" ai={project.ai?.images} />
            </div>
          )}

          <div className="panel rv-card">
            <span className="label">Ajustes rápidos</span>
            <div className="rv-knob">
              <span>Quem escolhe as imagens</span>
              <Segmented value={project.settings.imagePicker ?? 'ia'} options={PICKER_LABEL} onChange={setPicker} disabled={!!working} />
              <button className="act rv-repick" onClick={() => repickImages('Escolher as imagens de novo')} disabled={!!working}>
                ↻ Escolher de novo {(project.settings.imagePicker ?? 'ia') === 'ia' ? 'com a IA' : ''}
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
