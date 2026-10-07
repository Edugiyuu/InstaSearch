import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCount, Platform, PLATFORM_LABEL, PlatformState, sharesPerThousand, VideoMetrics, watchedPercent } from '../api/insights'
import { Spinner } from '../components/flow'
import { useMetrics } from '../hooks/useInsights'
import './Ideas.css'

type Filter = 'todos' | Platform
type Sort = 'recentes' | 'melhores'

const BUCKET_LABEL = { 1: '1 dia', 7: '7 dias', 28: '28 dias' } as const

const days = (n: number) => (n < 1 ? 'menos de 1 dia' : `${Math.floor(n)} ${Math.floor(n) === 1 ? 'dia' : 'dias'}`)
const decimal = (n: number, digits = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits })

/** "2,4× a sua mediana", com a cor dizendo se foi bem ou mal. */
function RatioChip({ video }: { video: VideoMetrics }) {
  const c = video.comparison
  if (video.privacy === 'private') return <span className="id-ratio c-muted">privado: fica fora da comparação</span>
  if (!c.bucket) return <span className="id-ratio c-muted">ainda novo: a 1ª foto sai com 1 dia</span>
  if (c.ratio === undefined) {
    return (
      <span className="id-ratio c-muted" title={`Só ${c.peers} outro(s) vídeo(s) têm a foto de ${BUCKET_LABEL[c.bucket]}; a comparação começa com 3.`}>
        sem com quem comparar ainda
      </span>
    )
  }
  const cls = c.ratio >= 1.5 ? 'good' : c.ratio <= 0.67 ? 'bad' : ''
  return (
    <span
      className={`id-ratio ${cls}`}
      title={`Aos ${BUCKET_LABEL[c.bucket]}: ${formatCount(c.views ?? 0)} visualizações contra a mediana de ${formatCount(Math.round(c.median ?? 0))} dos últimos ${c.peers} vídeos.`}
    >
      {decimal(c.ratio)}× a sua mediana <span className="c-muted">(aos {BUCKET_LABEL[c.bucket]})</span>
    </span>
  )
}

function VideoRow({ video }: { video: VideoMetrics }) {
  const s = video.current
  const watched = watchedPercent(video)
  const spread = sharesPerThousand(s)
  const hidden = video.privacy && video.privacy !== 'public'
  const title = video.projectId ? (
    <Link to={`/projeto/${video.projectId}`}>{video.title}</Link>
  ) : (
    <a href={video.url} target="_blank" rel="noreferrer">{video.title}</a>
  )
  return (
    <div className="id-row">
      <a className="id-thumb" href={video.url} target="_blank" rel="noreferrer">
        {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>▶</span>}
      </a>
      <div className="id-main">
        <strong className="id-title">{title}</strong>
        <span className="meta">
          <span className={`id-platform ${video.platform}`}>{PLATFORM_LABEL[video.platform]}</span>
          <span className="meta-sep" />
          publicado há {days(s.ageDays)}
          {video.projectId && (
            <>
              <span className="meta-sep" />
              feito no app
            </>
          )}
          {hidden && (
            <>
              <span className="meta-sep" />
              <span className="c-warning">{video.privacy === 'private' ? 'privado' : 'não listado'}</span>
            </>
          )}
        </span>
        <RatioChip video={video} />
      </div>
      <dl className="id-numbers">
        <div>
          <dt>visualizações</dt>
          <dd>{formatCount(s.views)}</dd>
        </div>
        <div>
          <dt>assistido</dt>
          <dd title={s.avgWatchSec !== undefined ? `${decimal(s.avgWatchSec)} s em média` : undefined}>
            {watched !== undefined ? `${Math.round(watched)}%` : s.avgWatchSec !== undefined ? `${decimal(s.avgWatchSec)} s` : '—'}
          </dd>
        </div>
        <div>
          <dt title="compartilhamentos + salvamentos a cada 1.000 visualizações">compart. + salv. por mil</dt>
          <dd>{spread !== undefined ? decimal(spread) : '—'}</dd>
        </div>
        <div>
          <dt>curtidas</dt>
          <dd>{s.likes !== undefined ? formatCount(s.likes) : '—'}</dd>
        </div>
        <div>
          <dt>comentários</dt>
          <dd>{s.comments !== undefined ? formatCount(s.comments) : '—'}</dd>
        </div>
      </dl>
    </div>
  )
}

function PlatformCard({ platform, state, measured, fewData }: { platform: Platform; state: PlatformState; measured: number; fewData: number }) {
  return (
    <div className="panel id-platform-card">
      <span className="label">{PLATFORM_LABEL[platform]}</span>
      {!state.connected ? (
        <p className="meta">
          Não conectado. <Link to="/configuracoes" className="c-accent">Conectar em Configurações</Link>
        </p>
      ) : (
        <>
          <p>
            <strong>{state.videos}</strong> {platform === 'instagram' ? 'Reels' : 'Shorts'} acompanhados · <strong>{measured}</strong> com foto de 1, 7 ou 28 dias
          </p>
          {state.message && <p className={`meta ${state.ok ? '' : 'c-warning'}`}>{state.message}</p>}
          {state.ok && measured < fewData && (
            <p className="meta c-warning">Ainda é pouco para tirar padrão: com menos de {fewData} vídeos medidos, a mediana muda muito a cada vídeo novo.</p>
          )}
        </>
      )}
    </div>
  )
}

function Ideas() {
  const { overview, loading, refreshing, error, refresh } = useMetrics()
  const [filter, setFilter] = useState<Filter>('todos')
  const [sort, setSort] = useState<Sort>('recentes')

  const visible = useMemo(() => {
    const list = (overview?.videos ?? []).filter(v => filter === 'todos' || v.platform === filter)
    if (sort === 'melhores') return [...list].sort((a, b) => (b.comparison.ratio ?? -1) - (a.comparison.ratio ?? -1))
    return list
  }, [overview, filter, sort])

  const state = overview?.state
  const lastRun = state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null

  return (
    <div className="page ideas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ideias</h1>
          <p className="page-sub">O que funcionou nos seus vídeos. Cada um é comparado com a mediana dos seus últimos vídeos, na mesma idade.</p>
        </div>
        <span className="spacer" />
        <span className="meta id-last">{refreshing || overview?.collecting ? 'Coletando…' : lastRun ? `Última coleta: ${lastRun}` : 'Nenhuma coleta ainda'}</span>
        <button className="btn-o" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : '↻'} Atualizar métricas
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {loading ? (
        <Spinner />
      ) : overview && state ? (
        <>
          <div className="id-platforms">
            <PlatformCard platform="instagram" state={state.instagram} measured={overview.measured.instagram} fewData={overview.fewData} />
            <PlatformCard platform="youtube" state={state.youtube} measured={overview.measured.youtube} fewData={overview.fewData} />
          </div>

          <div className="id-toolbar">
            <div className="filter-tabs">
              {(['todos', 'instagram', 'youtube'] as Filter[]).map(f => (
                <button key={f} className={`filter-tab ${filter === f ? 'on' : ''}`} onClick={() => setFilter(f)}>
                  {f === 'todos' ? 'Todos' : PLATFORM_LABEL[f]}{' '}
                  <span className="c-muted">{overview.videos.filter(v => f === 'todos' || v.platform === f).length}</span>
                </button>
              ))}
            </div>
            <span className="spacer" />
            <div className="chips">
              <button className={`chip ${sort === 'recentes' ? 'on' : ''}`} onClick={() => setSort('recentes')}>Mais recentes</button>
              <button className={`chip ${sort === 'melhores' ? 'on' : ''}`} onClick={() => setSort('melhores')}>Melhores primeiro</button>
            </div>
          </div>

          {visible.length === 0 ? (
            <p className="c-muted">
              {overview.videos.length
                ? 'Nada com esse filtro.'
                : state.instagram.connected || state.youtube.connected
                  ? 'Nenhum vídeo medido ainda. Clique em "Atualizar métricas".'
                  : 'Conecte o Instagram ou o YouTube em Configurações para ver o desempenho dos seus vídeos.'}
            </p>
          ) : (
            <div className="id-list">
              {visible.map(v => (
                <VideoRow key={v.id} video={v} />
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}

export default Ideas
