import { useState } from 'react'

/** Etiquetas editáveis (chips com × e um campo para adicionar). Estilos em Library.css. */
export default function TagEditor({ label, values, onChange, accent }: { label: string; values: string[]; onChange: (v: string[]) => void; accent?: boolean }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (v && !values.includes(v)) onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="lib-tags">
      {label && <span className="label">{label}</span>}
      <div className="lib-tag-list">
        {values.map(v => (
          <span key={v} className={`lib-tag ${accent ? 'accent' : ''}`}>
            {v}
            <button onClick={() => onChange(values.filter(x => x !== v))} aria-label={`Tirar ${v}`}>×</button>
          </span>
        ))}
        <input
          className="lib-tag-add"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          onBlur={add}
          placeholder="+ adicionar"
        />
      </div>
    </div>
  )
}
