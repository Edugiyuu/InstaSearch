import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  catchphraseFileUrl,
  catchphraseRole,
  DEFAULT_PIVOT_VOLUME,
  pivotTrim,
  shortsApi,
  WHOLE_CLIP_SECONDS,
  type Beat,
  type Catchphrase,
  type ShortProject,
} from '../api/shorts'
import { ClipTrimmer } from './ClipTrimmer'
import { ScenePick, ScenePickOption } from './ScenePick'

const secs = (n: number) => `${n.toFixed(1).replace('.', ',')} s`

/**
 * Revisão: a cena da virada (ADR 0039). Outro clipe do meio, "Sem virada aqui", o trecho e o som do clipe,
 * só neste vídeo. A prévia é o próprio player da Revisão, que já toca o clipe na cena.
 */
export function PivotScenePanel({
  project,
  beat,
  index,
  catchphrases,
  run,
  disabled,
}: {
  project: ShortProject
  beat: Beat & { pivot: NonNullable<Beat['pivot']> }
  index: number
  catchphrases: Catchphrase[]
  run: (label: string, action: () => Promise<ShortProject>) => void
  disabled: boolean
}) {
  const [trimming, setTrimming] = useState(false)
  const pool = catchphrases.filter(c => c.kind === 'clipe' && c.file && catchphraseRole(c) === 'meio')
  const clip = typeof beat.pivot.clipId === 'string' ? pool.find(c => c.id === beat.pivot.clipId) : undefined
  const trim = clip ? pivotTrim(clip, beat.pivot) : undefined
  const volume = beat.pivot.volume ?? clip?.volume ?? DEFAULT_PIVOT_VOLUME
  const [draftVolume, setDraftVolume] = useState<number | null>(null)
  const set = (label: string, changes: Parameters<typeof shortsApi.setBeatPivot>[2]) => run(label, () => shortsApi.setBeatPivot(project.id, beat.id, changes))

  const picker = (label: string) =>
    pool.length ? (
      <ScenePick label={label} title="Clipe da virada">
        {close => (
          <>
            {pool.map(c => (
              <ScenePickOption
                key={c.id}
                on={c.id === clip?.id}
                onClick={() => {
                  set(`Virada com ${c.name}`, { clipId: c.id })
                  close()
                }}
              >
                {c.name}
                {c.inRotation === false ? ' (fora do rodízio)' : ''}
              </ScenePickOption>
            ))}
            {clip && (
              <ScenePickOption
                on={false}
                onClick={() => {
                  set('Sem virada nesta cena', { clipId: null })
                  close()
                }}
              >
                ✕ Sem virada aqui
              </ScenePickOption>
            )}
          </>
        )}
      </ScenePick>
    ) : (
      <Link to="/biblioteca?aba=bordoes" className="sp-chip">+ Clipes do meio</Link>
    )

  return (
    <div className="rv-pivot">
      <div className="rv-fix-head">
        <strong>Virada · cena {index + 1}</strong>
        <span className="rv-fx-say">“{beat.pivot.phrase}”</span>
      </div>

      {clip && trim ? (
        <div className="rv-fix-rows">
          <span className="rv-fix-label">Clipe</span>
          <div className="rv-pivot-clip">
            <video src={`${catchphraseFileUrl(clip.file)}#t=${trim.start + 0.1}`} muted preload="metadata" />
            <div>
              <strong>{clip.name}</strong>
              <span className="meta">{beat.pivot.locked ? 'escolhido por você' : '✨ Auto · pelo rodízio'}</span>
              <div className="rv-pivot-acts">
                {picker('↻ Outro clipe')}
                <button className="sp-chip" disabled={disabled} onClick={() => set('Sem virada nesta cena', { clipId: null })}>
                  ✕ Sem virada aqui
                </button>
              </div>
            </div>
          </div>

          <span className="rv-fix-label">Trecho</span>
          <div className="rv-pivot-acts">
            <span className="rv-pivot-trim">
              {secs(trim.start)} a {secs(trim.start + trim.duration)}
              {beat.pivot.trim ? ' · só neste vídeo' : ''}
            </span>
            {clip.duration > WHOLE_CLIP_SECONDS && (
              <button className="sp-chip" disabled={disabled} onClick={() => setTrimming(true)}>✂ Recortar…</button>
            )}
            {beat.pivot.trim && (
              <button className="sp-chip" disabled={disabled} onClick={() => set('Trecho do clipe', { trim: null })}>↺ O do clipe</button>
            )}
          </div>

          <span className="rv-fix-label">Som do clipe</span>
          <label className="rv-vol" title="O som do clipe por baixo da voz, só neste vídeo">
            <span>{beat.pivot.volume !== undefined ? 'neste vídeo' : 'o do clipe'}</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round((draftVolume ?? volume) * 100)}
              onChange={e => setDraftVolume(e.target.valueAsNumber / 100)}
              onPointerUp={e => {
                setDraftVolume(null)
                set('Som do clipe', { volume: e.currentTarget.valueAsNumber / 100 })
              }}
              onKeyUp={e => {
                setDraftVolume(null)
                set('Som do clipe', { volume: e.currentTarget.valueAsNumber / 100 })
              }}
            />
            <output>{Math.round((draftVolume ?? volume) * 100)}%</output>
          </label>
          <p className="rv-fx-hint rv-pivot-wide">A voz continua por cima; o clipe toca baixinho por baixo (0% deixa mudo). Se o trecho for mais longo que a frase, a voz espera o clipe terminar e continua em seguida. Os clipes e as frases vêm da aba Bordões.</p>
        </div>
      ) : (
        <div className="rv-fix-rows">
          <p className="rv-fx-hint rv-pivot-wide">
            {beat.pivot.clipId === null
              ? 'Sem virada neste vídeo: a cena usa uma imagem, como as outras.'
              : 'Nenhum clipe do meio ainda: a cena fica com imagem. Envie as danças em Biblioteca → Bordões.'}
          </p>
          <div className="rv-pivot-acts rv-pivot-wide">{picker('Pôr um clipe')}</div>
        </div>
      )}

      {trimming && clip && trim && (
        <ClipTrimmer
          clip={clip}
          initial={trim}
          volume={volume}
          volumeNote="Só neste vídeo."
          saveLabel="Usar neste vídeo"
          onSave={result => {
            setTrimming(false)
            set('Trecho do clipe', result)
          }}
          onCancel={() => setTrimming(false)}
        />
      )}
    </div>
  )
}
