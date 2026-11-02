import { PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from 'react'
import { catchphraseFileUrl, MIN_TRIM_SECONDS, WHOLE_CLIP_SECONDS, type Catchphrase, type ClipTrim } from '../api/shorts'
import './ClipTrimmer.css'

/**
 * Durações prontas do trecho (as que couberem no clipe); a janela também estica pelas pontas, de 1 s até
 * o clipe inteiro — quem escolhe quantos segundos entram é o usuário (ADR 0039, adendo).
 */
const DURATIONS = [1.5, 2, 2.5, 3, 4, 5, 8]
/** Miniaturas na linha do tempo. */
const FRAMES = 12

const round = (n: number) => Math.round(n * 10) / 10
const secs = (n: number) => `${n.toFixed(1).replace('.', ',')} s`

/** Quadros do vídeo, tirados no navegador (o arquivo vem do mesmo endereço do app, então o canvas pode ler). */
function useFilmstrip(src: string, duration: number) {
  const [frames, setFrames] = useState<string[]>([])
  useEffect(() => {
    let alive = true
    const video = document.createElement('video')
    video.muted = true
    video.preload = 'auto'
    video.src = src
    const canvas = document.createElement('canvas')
    canvas.width = 72
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    const grab = async () => {
      const out: string[] = []
      for (let i = 0; i < FRAMES && alive; i++) {
        await new Promise<void>(resolve => {
          video.addEventListener('seeked', () => resolve(), { once: true })
          video.currentTime = ((i + 0.5) / FRAMES) * duration
        })
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height)
        out.push(canvas.toDataURL('image/jpeg', 0.6))
      }
      if (alive) setFrames(out)
    }
    video.addEventListener('loadeddata', () => void grab(), { once: true })
    return () => {
      alive = false
      video.removeAttribute('src')
      video.load()
    }
  }, [src, duration])
  return frames
}

/**
 * O recorte do clipe do meio (ADR 0039): o trecho que entra no vídeo, com o player tocando só ele em loop e
 * no volume escolhido. Abre ao subir um clipe com mais de 3 s, já com a sugestão (o trecho com mais movimento).
 * O trecho vai de 1 s até o clipe inteiro; passando de 3 s, a tela avisa que a voz espera o clipe acabar.
 */
export function ClipTrimmer({
  clip,
  initial,
  volume: initialVolume,
  suggested,
  step,
  saveLabel,
  volumeNote,
  onSave,
  onCancel,
}: {
  clip: Catchphrase
  initial: ClipTrim
  volume: number
  /** O trecho que o servidor sugeriu, para "voltar à sugestão". */
  suggested?: ClipTrim
  /** Na fila de envio: "1 de 3 clipes". */
  step?: string
  saveLabel: string
  /** Para quem vale o volume ("todos os vídeos com este clipe" ou "só este vídeo"). */
  volumeNote: string
  onSave: (result: { trim: ClipTrim; volume: number }) => void
  onCancel: () => void
}) {
  const src = catchphraseFileUrl(clip.file)!
  const total = clip.duration
  // o trecho pode ir até o clipe inteiro; o teto de 3 s saiu a pedido do usuário (ADR 0039, adendo)
  const longest = total
  const [trim, setTrim] = useState<ClipTrim>(initial)
  const [volume, setVolume] = useState(initialVolume)
  const video = useRef<HTMLVideoElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const drag = useRef<{ mode: 'move' | 'start' | 'end'; offset: number } | null>(null)
  const frames = useFilmstrip(src, total)

  // o player toca só o trecho, em loop: requestAnimationFrame confere o fim ~60 vezes por segundo
  useEffect(() => {
    const v = video.current
    if (!v) return
    v.currentTime = trim.start
    let raf = 0
    const tick = () => {
      if (v.currentTime >= trim.start + trim.duration || v.currentTime < trim.start - 0.05) v.currentTime = trim.start
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trim])

  useEffect(() => {
    const v = video.current
    if (!v) return
    v.volume = volume
    v.muted = volume === 0
    // com som, o navegador pode recusar tocar sozinho: aí toca mudo até o clique no vídeo
    v.play().catch(() => {
      v.muted = true
      void v.play()
    })
  }, [volume])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel])

  const at = (clientX: number) => {
    const box = track.current!.getBoundingClientRect()
    return Math.min(1, Math.max(0, (clientX - box.left) / box.width)) * total
  }

  const startDrag = (mode: 'move' | 'start' | 'end') => (e: ReactPointerEvent) => {
    e.stopPropagation()
    track.current!.setPointerCapture(e.pointerId)
    drag.current = { mode, offset: at(e.clientX) - trim.start }
  }

  /** Arrastar o meio move a janela; as pontas mudam a duração (de 1 s ao clipe inteiro). */
  const onMove = (e: ReactPointerEvent) => {
    const d = drag.current
    if (!d) return
    // o botão já foi solto (o pointerup pode não chegar aqui): o arrasto acabou
    if (e.buttons !== 1) {
      drag.current = null
      return
    }
    const t = at(e.clientX)
    const end = trim.start + trim.duration
    if (d.mode === 'move') {
      setTrim({ start: round(Math.min(Math.max(0, t - d.offset), total - trim.duration)), duration: trim.duration })
    } else if (d.mode === 'start') {
      const start = round(Math.min(Math.max(0, t, end - longest), end - MIN_TRIM_SECONDS))
      setTrim({ start, duration: round(end - start) })
    } else {
      const next = round(Math.max(Math.min(total, t, trim.start + longest), trim.start + MIN_TRIM_SECONDS))
      setTrim({ start: trim.start, duration: round(next - trim.start) })
    }
  }

  const setDuration = (duration: number) => {
    const d = Math.min(duration, longest)
    setTrim({ start: round(Math.min(trim.start, total - d)), duration: d })
  }

  const isSuggested = !!suggested && suggested.start === trim.start && suggested.duration === trim.duration
  // o clipe inteiro: a janela cobre tudo (a duração não bate exatamente com o total por causa dos décimos)
  const isWhole = trim.start === 0 && trim.duration >= Math.floor(total * 10) / 10

  return (
    <div className="overlay" onClick={onCancel}>
      <div className="modal ct" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true">
        <button className="modal-close" onClick={onCancel} aria-label="Fechar">✕</button>
        <div className="ct-head">
          <h2>Recortar · {clip.name}</h2>
          {step && <span className="ct-step">{step}</span>}
        </div>
        <p className="meta">
          {secs(total)} · escolha quantos segundos entram no vídeo, de {secs(MIN_TRIM_SECONDS)} ao clipe inteiro. Clipes de até{' '}
          {secs(WHOLE_CLIP_SECONDS)} entram inteiros, sem esta tela.
        </p>

        <div className="ct-body">
          <video
            ref={video}
            className="ct-player"
            src={src}
            playsInline
            onClick={e => {
              const v = e.currentTarget
              v.muted = volume === 0
              void v.play()
            }}
          />
          <div className="ct-side">
            <span className="label">Duração do trecho</span>
            <div className="ct-pills">
              {DURATIONS.filter(d => d < total).map(d => (
                <button key={d} className={`ct-pill ${trim.duration === d ? 'on' : ''}`} onClick={() => setDuration(d)}>
                  {secs(d)}
                </button>
              ))}
              <button className={`ct-pill ${isWhole ? 'on' : ''}`} onClick={() => setDuration(total)}>
                inteiro · {secs(total)}
              </button>
            </div>
            {trim.duration > WHOLE_CLIP_SECONDS && (
              <p className="ct-warn">
                ⏸ A voz só volta depois do clipe: a cena vai durar {secs(trim.duration)}, mesmo que a frase seja mais curta.
              </p>
            )}
            {suggested && (
              <div className="ct-suggest">
                <strong>✨ Sugestão: {secs(suggested.start)} a {secs(suggested.start + suggested.duration)}</strong>
                <span>O trecho em que o vídeo mais se mexe.{isSuggested ? ' Já está selecionado; é só ajustar se quiser.' : ''}</span>
                {!isSuggested && (
                  <button className="act" onClick={() => setTrim(suggested)}>
                    Voltar à sugestão
                  </button>
                )}
              </div>
            )}
            <span className="label">Som do clipe</span>
            <label className="ct-volume">
              <input type="range" min={0} max={100} step={5} value={Math.round(volume * 100)} onChange={e => setVolume(e.target.valueAsNumber / 100)} />
              <output>{Math.round(volume * 100)}%</output>
            </label>
            <span className="meta">Por baixo da voz; 0% deixa mudo. {volumeNote}</span>
          </div>
        </div>

        <p className="meta ct-hint">Arraste a janela para escolher o trecho; puxe as pontas para mudar a duração ({secs(MIN_TRIM_SECONDS)} ou mais).</p>
        <div className="ct-track" ref={track} onPointerMove={onMove} onPointerUp={() => (drag.current = null)} onPointerCancel={() => (drag.current = null)}>
          <div className="ct-frames">
            {frames.length ? frames.map((f, i) => <img key={i} src={f} alt="" draggable={false} />) : <span className="meta">Carregando os quadros…</span>}
          </div>
          <div
            className="ct-window"
            style={{ left: `${(trim.start / total) * 100}%`, width: `${(trim.duration / total) * 100}%` }}
            onPointerDown={startDrag('move')}
          >
            <span className="ct-handle start" onPointerDown={startDrag('start')} />
            <span className="ct-handle end" onPointerDown={startDrag('end')} />
          </div>
        </div>
        <div className="ct-times">
          <span>0 s</span>
          <strong>
            {secs(trim.start)} a {secs(trim.start + trim.duration)}
          </strong>
          <span>{secs(total)}</span>
        </div>

        <div className="ct-actions">
          <button className="btn-g" onClick={onCancel}>Cancelar</button>
          <button className="btn-y" onClick={() => onSave({ trim, volume })}>{saveLabel}</button>
        </div>
      </div>
    </div>
  )
}
