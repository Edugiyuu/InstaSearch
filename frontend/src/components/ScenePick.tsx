import { ReactNode, useEffect, useRef, useState } from 'react'
import './ScenePick.css'

interface Props {
  /** O que o botão mostra: o valor atual da cena (ex.: "🔊 whoosh"). */
  label: ReactNode
  title?: string
  className?: string
  /** Conteúdo do menu; recebe `close` para fechar depois de escolher. */
  children: (close: () => void) => ReactNode
}

/**
 * Botão da linha de controles da cena que abre um menu pequeno ali mesmo (ADR 0022, 3B).
 * Fecha ao escolher, ao clicar fora ou com Esc.
 */
export function ScenePick({ label, title, className, children }: Props) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className={`sp ${className ?? ''}`} ref={box}>
      <button className={`sp-chip ${open ? 'on' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open} aria-haspopup="menu" title={title}>
        <span className="sp-label">{label}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div className="sp-pop" role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

/** Uma opção do menu; `on` marca a escolhida. `extra` fica à direita (ex.: ▶ para ouvir). */
export function ScenePickOption({ on, onClick, children, extra }: { on: boolean; onClick: () => void; children: ReactNode; extra?: ReactNode }) {
  return (
    <div className={`sp-opt ${on ? 'on' : ''}`}>
      <button role="menuitemradio" aria-checked={on} onClick={onClick}>
        <span className="sp-check" aria-hidden>{on ? '✓' : ''}</span>
        {children}
      </button>
      {extra}
    </div>
  )
}
