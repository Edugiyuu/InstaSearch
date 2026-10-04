import { Fragment, useEffect, useState } from 'react'
import type { ShortStyle } from '../api/shorts'
import { hueOf, imageUrl, LibraryImage, ShortProject } from '../api/shorts'

const STEPS = ['Tema e estilo', 'Roteiro e voz', 'Montagem', 'Revisão']

/** Stepper do fluxo de novo vídeo. `current` começa em 1. */
export function Stepper({ current }: { current: number }) {
  return (
    <div className="stepper">
      {STEPS.map((label, i) => {
        const n = i + 1
        const state = n < current ? 'done' : n === current ? 'current' : ''
        return (
          <Fragment key={label}>
            {i > 0 && <span className={`stepper-line ${n <= current ? 'done' : ''}`} />}
            <span className={`stepper-step ${state}`}>
              <span className="n">{n < current ? '✓' : n}</span>
              {label}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

/** Miniatura de um estilo: um "frame de Short" com o texto do gancho. */
export function StyleThumb({ style, size = 'md' }: { style: ShortStyle; size?: 'sm' | 'md' }) {
  const hue = hueOf(style.id)
  return (
    <span
      className={`style-thumb ${size}`}
      style={{ background: `linear-gradient(160deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 40% 12%))` }}
    >
      <span className={`style-thumb-cap ${style.caption === 'quadrinho' ? '' : 'clean'}`}>{style.hook}</span>
    </span>
  )
}

/** Capa do projeto: a primeira imagem que ele usa ou um degradê. */
export function ProjectCover({ project, images }: { project: ShortProject; images: Map<string, LibraryImage> }) {
  const first = project.beats.map(b => (b.imageId ? images.get(b.imageId) : undefined)).find(Boolean)
  const hue = hueOf(project.id)
  return (
    <span
      className="project-cover"
      style={{ background: `linear-gradient(160deg, hsl(${hue} 40% 30%), hsl(${(hue + 50) % 360} 35% 12%))` }}
    >
      {first && <img src={imageUrl(first)} alt="" loading="lazy" />}
      <span className="project-cover-cap">{project.beats[0]?.text ?? project.title}</span>
    </span>
  )
}

/** Mensagem curta no rodapé que some sozinha. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 2600)
    return () => clearTimeout(t)
  }, [message])

  const node = message ? <div className="toast">{message}</div> : null
  return { show: setMessage, node }
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Botão segmentado (Calmo | Normal | Rápido…). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T
  options: Record<T, string>
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="seg" role="radiogroup">
      {(Object.keys(options) as T[]).map(k => (
        <button key={k} role="radio" aria-checked={k === value} className={k === value ? 'on' : ''} onClick={() => onChange(k)} disabled={disabled}>
          {options[k]}
        </button>
      ))}
    </div>
  )
}

export function Spinner() {
  return <span className="spinner" aria-hidden />
}
