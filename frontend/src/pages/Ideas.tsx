import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Idea, IdeaEvidence, IdeaStatus, newVideoLink } from '../api/ideas'
import { formatCount, Platform, PLATFORM_LABEL, PlatformState, sharesPerThousand, VideoMetrics, watchedPercent } from '../api/insights'
import { AiBadge, SearchList, Segmented, Spinner } from '../components/flow'
import { useIdeas } from '../hooks/useIdeas'
import { useMetrics } from '../hooks/useInsights'
import { useStyles, useTones } from '../hooks/useShorts'
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

type Metrics = ReturnType<typeof useMetrics>

/** Aba Desempenho: cada vídeo publicado, comparado com a mediana dos últimos (ADR 0021). */
function Performance({ metrics }: { metrics: Metrics }) {
  const { overview, loading, refreshing, refresh } = metrics
  const [filter, setFilter] = useState<Filter>('todos')
  const [sort, setSort] = useState<Sort>('recentes')

  const visible = useMemo(() => {
    const list = (overview?.videos ?? []).filter(v => filter === 'todos' || v.platform === filter)
    if (sort === 'melhores') return [...list].sort((a, b) => (b.comparison.ratio ?? -1) - (a.comparison.ratio ?? -1))
    return list
  }, [overview, filter, sort])

  const state = overview?.state
  const lastRun = state?.lastRunAt ? new Date(state.lastRunAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : null

  if (loading) return <Spinner />
  if (!overview || !state) return null
  return (
    <>
      <div className="id-toolbar">
        <p className="meta">Cada vídeo é comparado com a mediana dos seus últimos vídeos, na mesma idade (1, 7 ou 28 dias).</p>
        <span className="spacer" />
        <span className="meta id-last">{refreshing || overview.collecting ? 'Coletando…' : lastRun ? `Última coleta: ${lastRun}` : 'Nenhuma coleta ainda'}</span>
        <button className="btn-o" onClick={refresh} disabled={refreshing}>
          {refreshing ? <Spinner /> : '↻'} Atualizar métricas
        </button>
      </div>

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
  )
}

const DISCARD_REASONS = ['Já fiz', 'Não curto', 'Fora do nicho', 'Genérica demais']

function Evidence({ item }: { item: IdeaEvidence }) {
  const icon = item.kind === 'video' ? '▶' : item.kind === 'comentario' ? '💬' : '🔎'
  const body =
    item.kind === 'video' ? (
      <>
        {item.platform && <span className={`id-platform ${item.platform}`}>{PLATFORM_LABEL[item.platform]}</span>} “{item.text}”
        {item.ratio !== undefined && <strong className={item.ratio >= 1.5 ? 'c-success' : item.ratio <= 0.67 ? 'c-danger' : ''}> · {decimal(item.ratio)}× a mediana</strong>}
      </>
    ) : item.kind === 'comentario' ? (
      <>comentário: “{item.text}”</>
    ) : (
      <>na web: {item.text}</>
    )
  return (
    <li>
      <span className="id-ev-icon">{icon}</span>
      {item.url ? (
        <a href={item.url} target="_blank" rel="noreferrer">{body}</a>
      ) : (
        <span>{body}</span>
      )}
    </li>
  )
}

function IdeaCard({
  idea,
  number,
  styleName,
  toneName,
  onStatus,
  onRemove,
}: {
  idea: Idea
  /** Número no lote, para pedir "junta a 2 com a 5". */
  number?: number
  styleName: string
  toneName: string
  onStatus: (status: IdeaStatus, reason?: string) => void
  onRemove: () => void
}) {
  const [discarding, setDiscarding] = useState(false)
  const [reason, setReason] = useState('')
  const open = idea.status === 'nova' || idea.status === 'guardada'

  return (
    <div className={`panel id-idea ${idea.status}`}>
      <div className="id-idea-head">
        {number !== undefined && <span className="id-idea-n">{number}</span>}
        <strong className="id-idea-theme">{idea.theme}</strong>
      </div>
      {idea.hook && <p className="id-idea-hook">“{idea.hook}”</p>}
      <p className="meta">
        {styleName}
        <span className="meta-sep" />
        {toneName}
        <span className="meta-sep" />
        {idea.duration}s
      </p>
      {idea.why && <p className="id-idea-why">{idea.why}</p>}
      {idea.evidence.length > 0 ? (
        <ul className="id-evidence">
          {idea.evidence.map((e, i) => (
            <Evidence key={i} item={e} />
          ))}
        </ul>
      ) : (
        <p className="meta">Sem um vídeo ou comentário seu por trás: veio só da pesquisa e do seu pedido.</p>
      )}
      {idea.status === 'descartada' && idea.discardReason && <p className="meta">Descartada: {idea.discardReason}</p>}

      {discarding ? (
        <div className="id-discard">
          <span className="meta">Por quê? A IA lê o motivo e evita ideias parecidas.</span>
          <div className="chips">
            {DISCARD_REASONS.map(r => (
              <button key={r} className={`chip ${reason === r ? 'on' : ''}`} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
          <input className="field" value={reason} onChange={e => setReason(e.target.value)} placeholder="Ou escreva o motivo (opcional)" />
          <div className="act-row">
            <button className="btn-o" onClick={() => onStatus('descartada', reason)}>Descartar</button>
            <button className="act" onClick={() => setDiscarding(false)}>Cancelar</button>
          </div>
        </div>
      ) : (
        <div className="act-row">
          {open && (
            <Link to={newVideoLink(idea)} className="btn-y">
              Criar vídeo →
            </Link>
          )}
          {idea.status === 'nova' && (
            <button className="btn-o" onClick={() => onStatus('guardada')}>
              Guardar
            </button>
          )}
          {open && (
            <button className="act" onClick={() => setDiscarding(true)}>
              Descartar
            </button>
          )}
          {idea.status === 'feita' && idea.projectId && (
            <Link to={`/projeto/${idea.projectId}`} className="btn-o">
              Abrir o projeto
            </Link>
          )}
          {idea.status === 'descartada' && (
            <>
              <button className="act" onClick={() => onStatus('guardada')}>Guardar de novo</button>
              <button className="act" onClick={onRemove}>Apagar</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/** Aba Ideias: brainstorm em lote, ajuste por pedido e o banco (ADR 0021, escolhas 4B e 5B). */
function Brainstorm({ metrics }: { metrics: Metrics }) {
  const { ideas, loading, thinking, error, brainstorm, setStatus, remove } = useIdeas()
  const { styles } = useStyles()
  const { tones } = useTones()
  const [seed, setSeed] = useState('')
  const [request, setRequest] = useState('')

  const batch = ideas.filter(i => i.status === 'nova').sort((a, b) => a.position - b.position)
  const kept = ideas.filter(i => i.status === 'guardada')
  const done = ideas.filter(i => i.status === 'feita')
  const discarded = ideas.filter(i => i.status === 'descartada')

  // o que a IA vai ler, para a pessoa saber de onde as ideias vêm
  const videos = (metrics.overview?.videos ?? []).filter(v => v.privacy !== 'private')
  const comments = videos.reduce((n, v) => n + (v.topComments?.length ?? 0), 0)
  const measured = (metrics.overview?.measured.instagram ?? 0) + (metrics.overview?.measured.youtube ?? 0)

  const card = (idea: Idea, number?: number) => (
    <IdeaCard
      key={idea.id}
      idea={idea}
      number={number}
      styleName={styles.find(s => s.id === idea.styleId)?.name ?? idea.styleId}
      toneName={tones.find(t => t.id === idea.toneId)?.name ?? idea.toneId}
      onStatus={(status, reason) => setStatus(idea.id, status, reason)}
      onRemove={() => remove(idea.id)}
    />
  )

  return (
    <>
      <div className="panel panel-pad id-brainstorm">
        <span className="label">Brainstorm</span>
        <div className="id-brainstorm-row">
          <input
            className="field"
            value={seed}
            onChange={e => setSeed(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !thinking && brainstorm({ seed })}
            placeholder="Sobre o quê? (opcional) Ex.: algo de Chainsaw Man, o episódio de domingo"
            disabled={thinking}
          />
          <button className="btn-y" onClick={() => brainstorm({ seed })} disabled={thinking}>
            {thinking ? 'Pensando…' : batch.length ? 'Gerar outras' : 'Gerar ideias'}
          </button>
        </div>
        <p className="meta">
          {videos.length
            ? `A IA lê ${videos.length} vídeo(s) seu(s) (${measured} já com foto de 1, 7 ou 28 dias), ${comments} comentário(s) do público e as ideias que você já guardou ou descartou, e pesquisa na web o que está acontecendo agora.`
            : 'Ainda não há métricas dos seus vídeos (veja a aba Desempenho): as ideias vêm só da pesquisa na web e do que você pedir.'}
        </p>
        {thinking && (
          <p className="id-thinking">
            <Spinner /> Olhando seus vídeos, lendo os comentários e pesquisando o que está acontecendo… (pode levar um minuto)
          </p>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}
      {loading && <Spinner />}

      {batch.length > 0 && (
        <section className="id-section">
          <div className="id-section-head">
            <h2>Ideias novas</h2>
            {batch[0].seed && <span className="meta">sobre “{batch[0].seed}”</span>}
            {batch[0].request && <span className="meta">ajuste: “{batch[0].request}”</span>}
            <span className="spacer" />
            <AiBadge label="Ideias" ai={batch[0].ai} compact />
          </div>
          <SearchList ai={batch[0].ai} />
          <div className="id-ideas">{batch.map(idea => card(idea, idea.position))}</div>
          <div className="id-adjust">
            <input
              className="field"
              value={request}
              onChange={e => setRequest(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && request.trim() && !thinking && brainstorm({ request, seed: batch[0].seed }).then(ok => ok && setRequest(''))}
              placeholder="Peça um ajuste: mais polêmicas, só de Chainsaw Man, junta a 2 com a 5…"
              disabled={thinking}
            />
            <button
              className="btn-o"
              disabled={thinking || !request.trim()}
              onClick={() => brainstorm({ request, seed: batch[0].seed }).then(ok => ok && setRequest(''))}
            >
              Ajustar
            </button>
          </div>
          <p className="meta">As ideias novas que você não guardar são trocadas no próximo brainstorm.</p>
        </section>
      )}

      {kept.length > 0 && (
        <section className="id-section">
          <div className="id-section-head">
            <h2>Guardadas</h2>
            <span className="c-muted">{kept.length}</span>
          </div>
          <div className="id-ideas">{kept.map(idea => card(idea))}</div>
        </section>
      )}

      {done.length > 0 && (
        <section className="id-section">
          <div className="id-section-head">
            <h2>Viraram vídeo</h2>
            <span className="c-muted">{done.length}</span>
          </div>
          <div className="id-ideas">{done.map(idea => card(idea))}</div>
        </section>
      )}

      {discarded.length > 0 && (
        <details className="id-section">
          <summary>
            Descartadas <span className="c-muted">{discarded.length}</span>
          </summary>
          <div className="id-ideas">{discarded.map(idea => card(idea))}</div>
        </details>
      )}

      {!loading && !thinking && ideas.length === 0 && <p className="c-muted">Nenhuma ideia ainda. Clique em “Gerar ideias”.</p>}
    </>
  )
}

type Tab = 'ideias' | 'desempenho'
const TABS: Record<Tab, string> = { ideias: 'Ideias', desempenho: 'Desempenho' }

function Ideas() {
  const metrics = useMetrics()
  const [params, setParams] = useSearchParams()
  const tab: Tab = params.get('aba') === 'desempenho' ? 'desempenho' : 'ideias'

  return (
    <div className="page ideas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ideias</h1>
          <p className="page-sub">Próximos vídeos a partir do que funcionou nos seus: a IA sugere, você decide.</p>
        </div>
        <span className="spacer" />
        <Segmented value={tab} options={TABS} onChange={t => setParams(t === 'ideias' ? {} : { aba: t }, { replace: true })} />
      </div>

      {metrics.error && <p className="form-error">{metrics.error}</p>}
      {tab === 'ideias' ? <Brainstorm metrics={metrics} /> : <Performance metrics={metrics} />}
    </div>
  )
}

export default Ideas
