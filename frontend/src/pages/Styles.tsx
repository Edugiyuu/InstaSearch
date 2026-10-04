import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CAPTION_LABEL,
  EFFECTS_LABEL,
  errorMessage,
  IMAGE_TYPE_LABEL,
  MUSIC_LABEL,
  PACE_LABEL,
  shortsApi,
  ShortStyle,
} from '../api/shorts'
import { Segmented, Spinner, StyleThumb, useToast } from '../components/flow'
import { useLibrary, useProjects, useStyles } from '../hooks/useShorts'
import { ShortPlayer } from '../video/ShortPlayer'
import './Styles.css'

function Styles() {
  const navigate = useNavigate()
  const { styles, setStyles, loading } = useStyles()
  const { projects } = useProjects()
  const { byId } = useLibrary()
  const toast = useToast()
  const [selectedId, setSelectedId] = useState('comentario-anime')
  const [draft, setDraft] = useState<ShortStyle | null>(null)
  const [saving, setSaving] = useState(false)

  const original = styles.find(s => s.id === selectedId) ?? styles[0]
  useEffect(() => {
    if (original) setDraft(original)
  }, [original])

  const dirty = !!draft && !!original && JSON.stringify(draft) !== JSON.stringify(original)

  // "Como fica": o vídeo mais recente com os ajustes deste estilo
  const sample = projects.find(p => p.beats.some(b => b.imageId)) ?? projects[0]
  const preview = useMemo(
    () => (sample && draft ? { ...sample, settings: { pace: draft.pace, effects: draft.effects, caption: draft.caption } } : null),
    [sample, draft],
  )

  if (loading || !draft) return <div className="page"><Spinner /></div>

  const set = (changes: Partial<ShortStyle>) => setDraft({ ...draft, ...changes })

  const save = async () => {
    setSaving(true)
    try {
      const saved = await shortsApi.saveStyle(draft)
      setStyles(prev => (prev.some(s => s.id === saved.id) ? prev.map(s => (s.id === saved.id ? saved : s)) : [...prev, saved]))
      setSelectedId(saved.id)
      toast.show(draft.builtIn ? `Salvo como “${saved.name}”` : 'Estilo salvo')
      return saved
    } catch (e) {
      toast.show(errorMessage(e))
      return null
    } finally {
      setSaving(false)
    }
  }

  const use = async () => {
    const style = dirty ? await save() : draft
    if (style) navigate(`/novo?estilo=${style.id}`)
  }

  const remove = async () => {
    if (!confirm(`Apagar o estilo “${draft.name}”?`)) return
    await shortsApi.deleteStyle(draft.id)
    setStyles(prev => prev.filter(s => s.id !== draft.id))
    setSelectedId('comentario-anime')
  }

  return (
    <div className="page styles-page">
      <div className="page-head">
        <h1 className="page-title">Estilos</h1>
      </div>

      <div className="st-gallery">
        {styles.map(s => (
          <button key={s.id} className={`st-card ${s.id === selectedId ? 'on' : ''}`} onClick={() => setSelectedId(s.id)}>
            <StyleThumb style={s.id === draft.id ? draft : s} />
            <strong>{s.name}</strong>
            <span>{s.builtIn ? s.summary : 'seu estilo'}</span>
          </button>
        ))}
      </div>

      <div className="st-body">
        <section className="panel st-form">
          <input className="st-name" value={draft.name} onChange={e => set({ name: e.target.value })} aria-label="Nome do estilo" />
          {draft.builtIn && <p className="meta">Vem com o app. Se você mudar algo, salvamos uma cópia sua.</p>}

          <Row label="Velocidade dos cortes">
            <Segmented value={draft.pace} options={PACE_LABEL} onChange={pace => set({ pace })} />
          </Row>
          <Row label="Setas, X e emojis">
            <Segmented value={draft.effects} options={EFFECTS_LABEL} onChange={effects => set({ effects })} />
          </Row>
          <Row label="Legenda">
            <Segmented value={draft.caption} options={CAPTION_LABEL} onChange={caption => set({ caption })} />
          </Row>
          <Row label="Música">
            <Segmented value={draft.music} options={MUSIC_LABEL} onChange={music => set({ music })} />
          </Row>
          <Row label="Tipo de imagem">
            <Segmented value={draft.imageType} options={IMAGE_TYPE_LABEL} onChange={imageType => set({ imageType })} />
          </Row>

          <label className="st-notes">
            <span>Algo mais para a IA saber?</span>
            <textarea
              className="field"
              rows={3}
              value={draft.notes}
              onChange={e => set({ notes: e.target.value })}
              placeholder="Ex.: sempre termine com uma pergunta; fale como se estivesse conversando com um amigo"
            />
          </label>

          <div className="st-actions">
            {!draft.builtIn && <button className="btn-o st-delete" onClick={remove}>Apagar estilo</button>}
            <span className="spacer" />
            {dirty && (
              <button className="btn-g" onClick={save} disabled={saving}>
                {draft.builtIn ? 'Salvar como meu' : 'Salvar'}
              </button>
            )}
          </div>
        </section>

        <aside className="st-preview">
          <span className="label">Como fica</span>
          {preview ? (
            <>
              <ShortPlayer project={preview} images={byId} autoPlay controls={false} />
              <p className="meta st-preview-note">com o vídeo “{preview.title}”</p>
            </>
          ) : (
            <StyleThumb style={draft} />
          )}
          <button className="btn-y btn-lg st-use" onClick={use} disabled={saving}>
            Usar no próximo vídeo
          </button>
        </aside>
      </div>
      {toast.node}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="st-row">
      <span>{label}</span>
      {children}
    </div>
  )
}

export default Styles
