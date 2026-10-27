import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { Idea, IdeaEvidence, IdeaStatus, MAX_ROUNDS, MAX_TURNS, newVideoLink, VETO_SECONDS } from '../api/ideas'
import { PLATFORM_LABEL } from '../api/insights'
import { JOB_STAGE_LABEL, jobActive } from '../api/shorts'
import { AiBadge, SearchList, Segmented, Spinner } from '../components/flow'
import { useIdeas } from '../hooks/useIdeas'
import { useAutopilot } from '../hooks/useAutopilot'
import { useDebate } from '../hooks/useDebate'
import { debateLive, DebateStage, debateSummary } from '../components/DebateChat'
import { useMetrics } from '../hooks/useInsights'
import { useStyles, useTones } from '../hooks/useShorts'
import './Ideas.css'

/** As prateleiras do banco de ideias (ADR 0038): uma por vez, em vez de quatro seções empilhadas. */
type Shelf = IdeaStatus
/** Quantas provas aparecem no cartão antes do "+ N provas". */
const EVIDENCE_SHOWN = 2

const decimal = (n: number, digits = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: digits })

type Metrics = ReturnType<typeof useMetrics>

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
  onAuto,
  creating,
}: {
  idea: Idea
  /** Número no lote, para pedir "junta a 2 com a 5". */
  number?: number
  styleName: string
  toneName: string
  onStatus: (status: IdeaStatus, reason?: string) => void
  onRemove: () => void
  /** Cria o vídeo sozinho a partir desta ideia (ADR 0026). */
  onAuto: () => void
  /** Esta ideia já está na fila da criação sozinha. */
  creating: boolean
}) {
  const [discarding, setDiscarding] = useState(false)
  const [reason, setReason] = useState('')
  const [allEvidence, setAllEvidence] = useState(false)
  const open = idea.status === 'nova' || idea.status === 'guardada'
  // as provas ficam no cartão (ADR 0021); as 2 primeiras à vista, o resto ao clicar
  const evidence = allEvidence ? idea.evidence : idea.evidence.slice(0, EVIDENCE_SHOWN)

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
          {evidence.map((e, i) => (
            <Evidence key={i} item={e} />
          ))}
          {evidence.length < idea.evidence.length && (
            <li>
              <button className="act" onClick={() => setAllEvidence(true)}>
                + {idea.evidence.length - evidence.length} {idea.evidence.length - evidence.length === 1 ? 'prova' : 'provas'}
              </button>
            </li>
          )}
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
          {open && (
            <button className="btn-o" onClick={onAuto} disabled={creating} title="Roteiro, montagem e imagens sozinho; para em “falta gravar a voz”">
              {creating ? '🤖 Criando…' : '🤖 Criar sozinho'}
            </button>
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

/**
 * Criar sozinho (ADR 0026) com o debate das IAs (ADR 0027): o botão faz duas IAs debaterem 4 temas de um
 * brainstorm próprio (até 3 rodadas, com 5 s para o veto depois do acordo; ADR 0030) e, com acordo, criar o vídeo.
 * Na tela, um cartão com o status; o debate abre num palco em tela cheia (ADR 0038, adendo), com o debate
 * escolhido (?debate=, que abre o palco direto) ou o mais recente da fila. Nunca publica.
 */
function AutoCreate({ autopilot }: { autopilot: ReturnType<typeof useAutopilot> }) {
  const { jobs, error, start, resume } = autopilot
  const [params, setParams] = useSearchParams()
  const shown = params.get('debate') ?? jobs.find(j => j.debateId)?.debateId
  // o vídeo do debate mostrado: cada etapa nova na fila busca o debate de novo (chega o link do projeto)
  const debateJob = jobs.find(j => j.debateId === shown)
  const { debate, error: debateError, stopping, veto, stop } = useDebate(shown ?? undefined, debateJob?.stage)
  // o link "Ver o debate" da Revisão e do Roteiro chega com ?debate= e já abre o palco
  const [stageOpen, setStageOpen] = useState(params.has('debate'))
  const showDebate = (id: string) => {
    setParams(p => ({ ...Object.fromEntries(p), debate: id }), { replace: true })
    setStageOpen(true)
  }
  const startDebate = (ideaId?: string) => {
    start(ideaId)
    if (!ideaId) setStageOpen(true)
  }
  const working = jobs.filter(jobActive).length

  const queue = (
    <>
      <span className="label">Fila dos vídeos</span>
      {jobs.length === 0 && <p className="meta">Nenhum vídeo criado sozinho ainda.</p>}
      <ul className="id-jobs">
        {jobs.map(job => (
          <li key={job.id} className={`id-job ${job.stage} ${job.debateId && job.debateId === shown ? 'on' : ''}`}>
            <span className="id-job-title">{job.title ?? (job.debateId ? 'Tema do debate' : 'Ideia')}</span>
            <span className={job.stage === 'erro' || job.stage === 'sem-acordo' || job.stage === 'parado' ? 'c-danger' : job.stage === 'pronto' ? 'c-success' : 'c-muted'}>
              {jobActive(job) && <Spinner />} {JOB_STAGE_LABEL[job.stage]}
              {job.error && `: ${job.error}`}
            </span>
            <span className="id-job-acts">
              {job.debateId && job.debateId !== shown && (
                <button className="act" onClick={() => showDebate(job.debateId!)}>Ver o debate</button>
              )}
              {(job.stage === 'sem-acordo' || job.stage === 'parado') && <button className="act" onClick={() => startDebate()}>Debater de novo</button>}
              {job.stage === 'erro' &&
                (job.projectId ? (
                  <button className="act" onClick={() => resume(job.projectId!)}>Continuar</button>
                ) : (
                  <button className="act" onClick={() => start(job.ideaId)}>Tentar de novo</button>
                ))}
              {job.projectId && (
                <Link to={job.stage === 'pronto' ? `/projeto/${job.projectId}/roteiro` : `/projeto/${job.projectId}`} className="act">
                  {job.stage === 'pronto' ? 'Gravar a voz →' : 'Abrir'}
                </Link>
              )}
            </span>
          </li>
        ))}
      </ul>
      <button className="btn-y" onClick={() => startDebate()}>🗣️ Debater e criar outro vídeo</button>
      <details className="id-auto-how" open={jobs.length === 0}>
        <summary>Como funciona</summary>
        <p className="meta">
          Duas IAs (a Estrategista, que olha os números do canal, e a Roteirista, que olha o gancho e o argumento) debatem 4 temas de um
          brainstorm delas, nas obras que o seu canal já fala, e criticam uma à outra até aceitarem o mesmo, em no máximo {MAX_TURNS}{' '}
          falas. Se nenhum dos 4 servir, vêm 4 novos, até {MAX_ROUNDS} rodadas. Quando as duas concordam, você tem {VETO_SECONDS} s para
          vetar o tema; elas seguem debatendo os outros. Com acordo, elas escrevem o roteiro, montam e procuram as imagens, e explicam por
          que o tema é bom. Para em “falta gravar a voz”: a voz é sua. Nunca publica.
        </p>
      </details>
    </>
  )

  return (
    <>
      {/* o cartão do debate: o status numa linha e a porta para o palco */}
      <section className={`panel id-debate ${debate && debateLive(debate) ? 'live' : ''}`}>
        <span className="ds-cast">
          <span className="ds-avatar estrategista">E</span>
          <span className="ds-avatar roteirista">R</span>
        </span>
        <div className="id-debate-text">
          <strong>
            Debate das IAs {debate && debateLive(debate) && <span className="ds-live">● ao vivo</span>}
          </strong>
          <span className="meta">
            {debate
              ? `Último: ${debateSummary(debate)}${debate.chosen && debate.ideas[debate.chosen - 1] ? ` · “${debate.ideas[debate.chosen - 1].theme}”` : ''}`
              : 'Duas IAs escolhem o tema com os dados do canal e criam o vídeo, até “falta gravar a voz”.'}
            {working > 0 && ` · ${working} ${working === 1 ? 'vídeo sendo criado' : 'vídeos sendo criados'}`}
          </span>
        </div>
        <span className="spacer" />
        {(debate || jobs.length > 0) && (
          <button className="btn-g" onClick={() => setStageOpen(true)}>Abrir o palco</button>
        )}
        <button className="btn-y" onClick={() => startDebate()}>🗣️ Debater e criar um vídeo</button>
      </section>
      {error && <p className="form-error">{error}</p>}

      {stageOpen && (
        <DebateStage
          debate={debate}
          error={debateError}
          creating={!!debateJob && jobActive(debateJob)}
          stopping={stopping}
          onVeto={veto}
          onStop={stop}
          onClose={() => setStageOpen(false)}
          side={queue}
        />
      )}
    </>
  )
}

/** Aba Ideias: brainstorm em lote, ajuste por pedido e o banco (ADR 0021, escolhas 4B e 5B). */
function Brainstorm({ metrics }: { metrics: Metrics }) {
  const { ideas, loading, thinking, error, brainstorm, setStatus, remove, reload } = useIdeas()
  // quando um vídeo criado sozinho termina, a ideia dele virou "feita"
  const autopilot = useAutopilot(reload)
  const creating = new Set(autopilot.jobs.filter(jobActive).map(j => j.ideaId))
  const { styles } = useStyles()
  const { tones } = useTones()
  const [seed, setSeed] = useState('')
  const [request, setRequest] = useState('')
  // a prateleira escolhida; null = a primeira que tem ideia
  const [shelf, setShelf] = useState<Shelf | null>(null)

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
      onAuto={() => autopilot.start(idea.id)}
      creating={creating.has(idea.id)}
    />
  )

  const shelves: Record<Shelf, Idea[]> = { nova: batch, guardada: kept, feita: done, descartada: discarded }
  const shelfNames: Record<Shelf, string> = { nova: 'Novas', guardada: 'Guardadas', feita: 'Viraram vídeo', descartada: 'Descartadas' }
  const shelfLabels = Object.fromEntries(
    (Object.keys(shelfNames) as Shelf[]).map(k => [k, `${shelfNames[k]} ${shelves[k].length}`]),
  ) as Record<Shelf, string>
  const active: Shelf = shelf ?? (Object.keys(shelves) as Shelf[]).find(k => shelves[k].length > 0) ?? 'nova'
  const list = shelves[active]

  return (
    <div className="id-layout">
      <div className="id-left">
        <AutoCreate autopilot={autopilot} />
        <div className="panel id-brainstorm">
          <div className="id-brainstorm-row">
            <input
              className="field"
              value={seed}
              onChange={e => setSeed(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !thinking && brainstorm({ seed }).then(ok => ok && setShelf('nova'))}
              placeholder="Sobre o quê? (opcional) Ex.: algo de Chainsaw Man, o episódio de domingo"
              disabled={thinking}
            />
            <button className="btn-y" onClick={() => brainstorm({ seed }).then(ok => ok && setShelf('nova'))} disabled={thinking}>
              {thinking ? 'Pensando…' : batch.length ? '✨ Gerar outras' : '✨ Gerar ideias'}
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

        <div className="id-shelf-bar">
          <Segmented value={active} options={shelfLabels} onChange={setShelf} />
          {active === 'nova' && batch.length > 0 && (
            <>
              {batch[0].seed && <span className="meta">sobre “{batch[0].seed}”</span>}
              {batch[0].request && <span className="meta">ajuste: “{batch[0].request}”</span>}
              <span className="spacer" />
              <AiBadge label="Ideias" ai={batch[0].ai} compact />
            </>
          )}
        </div>

        {error && <p className="form-error">{error}</p>}
        {loading && <Spinner />}

        {active === 'nova' && batch.length > 0 && <SearchList ai={batch[0].ai} />}
        <div className="id-ideas">{list.map(idea => card(idea, active === 'nova' ? idea.position : undefined))}</div>

        {active === 'nova' && batch.length > 0 && (
          <>
            <div className="id-adjust">
              <input
                className="field"
                value={request}
                onChange={e => setRequest(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && request.trim() && !thinking && brainstorm({ request, seed: batch[0].seed }).then(ok => ok && setRequest(''))}
                placeholder="✨ Peça um ajuste: mais polêmicas, só de Chainsaw Man, junta a 2 com a 5…"
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
          </>
        )}

        {!loading && !thinking && list.length === 0 && (
          <p className="c-muted">{ideas.length === 0 ? 'Nenhuma ideia ainda. Clique em “Gerar ideias”.' : `Nada em ${shelfNames[active]}.`}</p>
        )}
      </div>

    </div>
  )
}

function Ideas() {
  const metrics = useMetrics()
  const [params] = useSearchParams()

  // o desempenho virou a tela Números (ADR 0038); o link antigo leva para lá
  if (params.get('aba') === 'desempenho') return <Navigate to="/numeros" replace />

  return (
    <div className="page ideas">
      <div className="page-head">
        <div>
          <h1 className="page-title">Ideias</h1>
          <p className="page-sub">Próximos vídeos a partir do que funcionou nos seus: a IA sugere, você decide.</p>
        </div>
        <span className="spacer" />
        <Link to="/numeros" className="act">Ver os números →</Link>
      </div>

      {metrics.error && <p className="form-error">{metrics.error}</p>}
      <Brainstorm metrics={metrics} />
    </div>
  )
}

export default Ideas
