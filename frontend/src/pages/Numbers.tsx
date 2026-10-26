import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatCount, Platform, PLATFORM_LABEL, PlatformState, sharesPerThousand, VideoMetrics, watchedPercent } from '../api/insights'
import { Spinner } from '../components/flow'
import { useMetrics } from '../hooks/useInsights'
import './Numbers.css'

type Filter = 'todos' | Platform
type Sort = 'recentes' | 'melhores'

const BUCKET_LABEL = { 1: '1 dia', 7: '7 dias', 28: '28 dias' } as const
/** Na barra, a mediana fica em 1/MAX_RATIO da largura; acima disso a barra só enche. */
const MAX_RATIO = 2.5
/** Quantos vídeos aparecem em "O que funcionou". */
const TOP_SHOWN = 3

const days = (n: number) => (n < 1 ? 'menos de 1 dia' : `${Math.floor(n)} ${Math.floor(n) === 1 ? 'dia' : 'dias'}`)
const decimal = (n: number, digits = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits })

function median(values: number[]) {
  if (!values.length) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** "2,4× a sua mediana", com a cor dizendo se foi bem ou mal. */
function RatioChip({ video }: { video: VideoMetrics }) {
  const c = video.comparison
  if (video.privacy === 'private') return <span className="nb-ratio c-muted">privado: fica fora da comparação</span>
  if (!c.bucket) return <span className="nb-ratio c-muted">ainda novo: a 1ª foto sai com 1 dia</span>
  if (c.ratio === undefined) {
    return (
      <span className="nb-ratio c-muted" title={`Só ${c.peers} outro(s) vídeo(s) têm a foto de ${BUCKET_LABEL[c.bucket]}; a comparação começa com 3.`}>
        sem com quem comparar ainda
      </span>
    )
  }
  const cls = c.ratio >= 1.5 ? 'good' : c.ratio <= 0.67 ? 'bad' : ''
  return (
    <span
      className={`nb-ratio ${cls}`}
      title={`Aos ${BUCKET_LABEL[c.bucket]}: ${formatCount(c.views ?? 0)} visualizações contra a mediana de ${formatCount(Math.round(c.median ?? 0))} dos últimos ${c.peers} vídeos.`}
    >
      {decimal(c.ratio)}× a sua mediana <span className="c-muted">(aos {BUCKET_LABEL[c.bucket]})</span>
    </span>
  )
}

/** A barra do vídeo contra a mediana (o risco); só aparece quando há com quem comparar. */
function RatioBar({ ratio }: { ratio?: number }) {
  if (ratio === undefined) return <span className="nb-bar empty" />
  const fill = Math.min(1, ratio / MAX_RATIO) * 100
  return (
    <span className="nb-bar" title={`${decimal(ratio)}× a sua mediana`}>
      <span className={`nb-bar-fill ${ratio >= 1 ? 'up' : 'down'}`} style={{ width: `${fill}%` }} />
      <span className="nb-bar-median" style={{ left: `${100 / MAX_RATIO}%` }} />
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
    <div className="nb-row">
      <a className="nb-thumb" href={video.url} target="_blank" rel="noreferrer">
        {video.thumbnail ? <img src={video.thumbnail} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>▶</span>}
      </a>
      <div className="nb-main">
        <strong className="nb-title">{title}</strong>
        <span className="meta">
          <span className={`nb-platform ${video.platform}`}>{PLATFORM_LABEL[video.platform]}</span>
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
        <div className="nb-compare">
          <RatioBar ratio={video.privacy === 'private' ? undefined : video.comparison.ratio} />
          <RatioChip video={video} />
        </div>
      </div>
      <dl className="nb-numbers">
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
    <div className="panel nb-platform-card">
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

/**
 * Números (ADR 0038): o desempenho em tela própria. Cada vídeo é comparado com a mediana dos seus
 * últimos vídeos na mesma idade (ADR 0021); no topo, os totais que saem desses mesmos dados.
 */
function Numbers() {
  const { overview, loading, refreshing, refresh, error } = useMetrics()
  const [filter, setFilter] = useState<Filter>('todos')
  const [sort, setSort] = useState<Sort>('recentes')

  const visible = useMemo(() => {
    const list = (overview?.videos ?? []).filter(v => filter === 'todos' || v.platform === filter)
    if (sort === 'melhores') return [...list].sort((a, b) => (b.comparison.ratio ?? -1) - (a.comparison.ratio ?? -1))
    return list
  }, [overview, filter, sort])

  // os totais saem dos vídeos públicos (os privados ficam fora da comparação)
  const totals = useMemo(() => {
    const pub = (overview?.videos ?? []).filter(v => v.privacy !== 'private')
    const watched = pub.map(watchedPercent).filter((n): n is number => n !== undefined)
    const compared = pub.filter(v => v.comparison.ratio !== undefined)
    return {
      count: pub.length,
      views: median(pub.map(v => v.current.views)),
      watched: watched.length ? watched.reduce((a, b) => a + b, 0) / watched.length : undefined,
      above: compared.filter(v => (v.comparison.ratio ?? 0) >= 1).length,
      compared: compared.length,
      top: [...compared].sort((a, b) => (b.comparison.ratio ?? 0) - (a.comparison.ratio ?? 0)).slice(0, TOP_SHOWN),
    }
  }, [overview])

  const state = overview?.state
  const lastRun = state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null

  return (
    <div className="page numbers">
      <div className="page-head">
        <div>
          <h1 className="page-title">Números</h1>
          <p className="page-sub">Cada vídeo contra a mediana dos seus últimos vídeos, na mesma idade (1, 7 ou 28 dias).</p>
        </div>
        <span className="spacer" />
        <span className="meta nb-last">{refreshing || overview?.collecting ? 'Coletando…' : lastRun ? `Última coleta: ${lastRun}` : 'Nenhuma coleta ainda'}</span>
        <button className="btn-o" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : '↻'} Atualizar métricas
        </button>
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <Spinner />}

      {overview && state && (
        <>
          <div className="nb-kpis">
            <div className="panel nb-kpi">
              <strong>{totals.count}</strong>
              <span>vídeos acompanhados</span>
            </div>
            <div className="panel nb-kpi">
              <strong>{totals.views !== undefined ? formatCount(Math.round(totals.views)) : '—'}</strong>
              <span>mediana das visualizações hoje</span>
            </div>
            <div className="panel nb-kpi">
              <strong>{totals.watched !== undefined ? `${Math.round(totals.watched)}%` : '—'}</strong>
              <span>assistido, em média</span>
            </div>
            <div className="panel nb-kpi">
              <strong>{totals.compared ? `${totals.above} de ${totals.compared}` : '—'}</strong>
              <span>acima da sua mediana</span>
            </div>
          </div>

          <div className="nb-layout">
            <section className="nb-left">
              <div className="nb-toolbar">
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
                <div className="nb-list">
                  {visible.map(v => (
                    <VideoRow key={v.id} video={v} />
                  ))}
                </div>
              )}
            </section>

            <aside className="nb-right">
              <PlatformCard platform="instagram" state={state.instagram} measured={overview.measured.instagram} fewData={overview.fewData} />
              <PlatformCard platform="youtube" state={state.youtube} measured={overview.measured.youtube} fewData={overview.fewData} />

              {totals.top.length > 0 && (
                <div className="panel nb-top">
                  <span className="label">O que funcionou</span>
                  {totals.top.map(v => (
                    <div key={v.id} className="nb-top-row">
                      {v.projectId ? <Link to={`/projeto/${v.projectId}`}>{v.title}</Link> : <a href={v.url} target="_blank" rel="noreferrer">{v.title}</a>}
                      <strong className={(v.comparison.ratio ?? 0) >= 1.5 ? 'c-success' : ''}>{decimal(v.comparison.ratio ?? 0)}×</strong>
                    </div>
                  ))}
                  <Link to="/ideias" className="btn-g">Gerar ideias a partir disso →</Link>
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  )
}

export default Numbers
