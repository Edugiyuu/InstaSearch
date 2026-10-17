import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Debate, debateStoppable, DebateMessage, Idea, MAX_ROUNDS, MAX_TURNS, RoundEnd, Speaker, SPEAKER_FOCUS, SPEAKER_NAME, VETO_SECONDS } from '../api/ideas'
import { FORMAT_NAME, type ScriptReview } from '../api/shorts'
import { Spinner } from './flow'
import './DebateChat.css'

const STATUS: Record<Debate['status'], string> = {
  brainstorm: 'Gerando os temas…',
  debatendo: 'Debatendo',
  aguardando: 'Acordo: dá para vetar',
  resumindo: 'As duas aceitaram; escrevendo o porquê…',
  acordo: 'Acordo',
  'sem-acordo': 'Sem acordo',
  parado: 'Parado',
  erro: 'Parou',
}

/** Por que uma rodada acabou sem vídeo (ADR 0030). */
const ROUND_END: Record<RoundEnd, string> = {
  recusados: 'as duas recusaram os temas',
  falas: `as ${MAX_TURNS} falas acabaram sem acordo`,
  vetados: 'você vetou os temas aceitos',
}

/** Os temas de uma rodada, com quem aceita cada um no momento (o voto mais recente) e os vetados. */
function Topics({ ideas, messages, chosen, vetoed = [] }: { ideas: Idea[]; messages: DebateMessage[]; chosen?: number; vetoed?: number[] }) {
  const votesFor = (n: number) => {
    const last = (s: Speaker) => [...messages].reverse().find(m => m.speaker === s)?.vote
    return (['estrategista', 'roteirista'] as Speaker[]).filter(s => last(s) === n)
  }
  return (
    <ol className="dc-topics">
      {ideas.map((idea, i) => {
        const n = i + 1
        const out = vetoed.includes(n)
        return (
          <li key={idea.id} className={out ? 'vetoed' : chosen === n ? 'chosen' : ''}>
            <span className="dc-n">{n}</span>
            <span className="dc-topic">
              {idea.theme}
              <span className="meta">“{idea.hook}”</span>
              <span className="dc-tags">
                {idea.work && <span className="dc-tag">{idea.work}</span>}
                {idea.trend && <span className={`dc-tag ${idea.trend}`}>{idea.trend === 'alta' ? '🔥 em alta' : '🕰️ atemporal'}</span>}
                {idea.bet && (
                  <span className="dc-tag bet" title="Algo bombando no nicho do canal, numa obra que ele ainda não tratou">
                    🎲 aposta
                  </span>
                )}
                {idea.format && idea.format !== 'opiniao' && (
                  <span className="dc-tag format" title={idea.format === 'tierlist' ? `Série "${idea.series}": este vídeo ranqueia ${idea.character}` : 'O formato do vídeo'}>
                    {idea.format === 'tierlist' ? '🏆' : '🎬'} {FORMAT_NAME[idea.format]}
                  </span>
                )}
                {idea.revisit && (
                  <span className="dc-tag revisit" title={`${idea.character ?? 'A personagem'} já deu views no canal; agora com um assunto novo`}>
                    🔁 volta
                  </span>
                )}
              </span>
            </span>
            {out ? (
              <span className="dc-voter vetoed">✋ você vetou</span>
            ) : (
              votesFor(n).map(s => (
                <span key={s} className={`dc-voter ${s}`} title={`${SPEAKER_NAME[s]} aceita este tema`}>
                  ✓ {SPEAKER_NAME[s]}
                </span>
              ))
            )}
          </li>
        )
      })}
    </ol>
  )
}

function Message({ m }: { m: DebateMessage }) {
  if (m.speaker === 'criador') return <p className="dc-veto-note">✋ Você {m.text}. As duas seguem debatendo os outros.</p>
  return (
    <div className={`dc-msg ${m.speaker}`}>
      <span className="dc-who">
        {SPEAKER_NAME[m.speaker]} <span className="meta">· {SPEAKER_FOCUS[m.speaker]}</span>
      </span>
      <p>{m.text}</p>
      <span className="dc-vote">{m.vote ? `aceita o tema ${m.vote}` : 'ainda não aceita nenhum'}</span>
    </div>
  )
}

const REVIEW_STATUS: Record<ScriptReview['status'], string> = {
  revisando: 'Revisando',
  aprovado: 'Aprovado',
  reprovado: 'Não aprovado',
  erro: 'Parou',
}

/**
 * Depois do acordo, a revisão do roteiro (ADR 0034): cada versão da Roteirista e a revisão da
 * Estrategista, que confere coesão, sentido e os fatos. Sem aprovação, o vídeo segue com os pontos na Revisão.
 */
function ReviewChat({ review }: { review: ScriptReview }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [review.steps.length, review.thinking])

  return (
    <div className="dc-review">
      <div className="dc-head">
        <strong>📝 Revisão do roteiro</strong>
        <span className={`dc-status ${review.status}`}>{REVIEW_STATUS[review.status]}</span>
      </div>
      <div className="dc-chat">
        {review.steps.map((s, i) =>
          s.kind === 'roteiro' ? (
            <div key={i} className="dc-msg roteirista">
              <span className="dc-who">
                Roteirista <span className="meta">· roteiro, versão {s.version}</span>
              </span>
              <p className="dc-script">{s.text}</p>
            </div>
          ) : (
            <div key={i} className="dc-msg estrategista">
              <span className="dc-who">
                Estrategista <span className="meta">· revisão da versão {s.version}</span>
              </span>
              <p>{s.text}</p>
              {!!s.problems?.length && (
                <ul className="dc-problems">
                  {s.problems.map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              )}
              <span className="dc-vote">{s.approved ? '✓ aprova o roteiro' : 'pede mudanças'}</span>
            </div>
          ),
        )}
        {review.thinking && (
          <div className={`dc-msg ${review.thinking === 'roteiro' ? 'roteirista' : 'estrategista'} typing`}>
            <span className="dc-who">{review.thinking === 'roteiro' ? 'Roteirista' : 'Estrategista'}</span>
            <p>
              <Spinner />{' '}
              {review.thinking === 'revisao'
                ? 'revisando e conferindo os fatos na web…'
                : review.steps.length
                  ? 'reescrevendo o roteiro com o que a Estrategista pediu…'
                  : 'escrevendo o roteiro (com pesquisa)…'}
            </p>
          </div>
        )}
        <div ref={end} />
      </div>
      {review.status === 'reprovado' && (
        <p className="dc-note">A Estrategista não aprovou nenhuma versão. O vídeo segue com a última, e os pontos que sobraram aparecem na Revisão do projeto.</p>
      )}
    </div>
  )
}

/**
 * Os 5 s depois do acordo (ADR 0030): a contagem vem do `vetoUntil` do servidor (o mesmo computador),
 * e não de quando a tela viu o acordo, para os 5 s serem os mesmos dos dois lados.
 */
function VetoBar({ debate, onVeto }: { debate: Debate; onVeto: () => void }) {
  const until = debate.vetoUntil ? Date.parse(debate.vetoUntil) : 0
  const [now, setNow] = useState(Date.now())
  const [sent, setSent] = useState(false)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 100)
    return () => clearInterval(t)
  }, [])
  const ms = Math.max(0, until - now)
  const seconds = Math.ceil(ms / 1000)
  return (
    <div className="dc-veto-bar">
      <div className="dc-veto-row">
        <strong>✓ As duas aceitaram o tema {debate.chosen}.</strong>
        <span className="meta">{sent ? 'Vetando…' : seconds > 0 ? `O vídeo começa em ${seconds} s.` : 'Começando…'}</span>
        <button
          className="btn-g"
          disabled={sent || ms === 0}
          onClick={() => {
            setSent(true)
            onVeto()
          }}
        >
          ✋ Não gostei, vetar
        </button>
      </div>
      <span className="dc-veto-time" style={{ width: `${(ms / (VETO_SECONDS * 1000)) * 100}%` }} />
    </div>
  )
}

/**
 * O debate das IAs como um chat (ADR 0027): os temas em cima, as falas uma a uma (a Estrategista à
 * esquerda, a Roteirista à direita), com o voto de cada uma, e no fim o tema aceito e o porquê. As
 * rodadas que acabaram sem vídeo ficam fechadas em cima; depois do acordo, 5 s para vetar (ADR 0030).
 */
export function DebateChat({
  debate,
  creating,
  stopping,
  onVeto,
  onStop,
}: {
  debate: Debate
  /** o vídeo do debate ainda está na fila */
  creating: boolean
  /** o criador pediu para parar; vale depois da fala em andamento */
  stopping: boolean
  onVeto: () => void
  onStop: () => void
}) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [debate.messages.length, debate.thinking])

  const round = debate.round ?? 1
  const turns = debate.messages.filter(m => m.speaker !== 'criador').length

  return (
    <div className="dc">
      <div className="dc-head">
        <strong>🗣️ Debate das IAs</strong>
        <span className={`dc-status ${debate.status}`}>{STATUS[debate.status]}</span>
        <span className="meta">
          rodada {round} de {MAX_ROUNDS}
          {turns > 0 && ` · fala ${turns} de ${MAX_TURNS}`}
        </span>
        {debateStoppable(debate) && (
          <button className="act dc-stop" disabled={stopping} onClick={onStop} title="Para depois da fala em andamento, sem criar vídeo">
            {stopping ? 'Parando depois desta fala…' : '■ Parar debate'}
          </button>
        )}
      </div>

      {debate.past?.map((r, i) => (
        <details key={i} className="dc-past">
          <summary>
            Rodada {i + 1}: {ROUND_END[r.end]} <span className="meta">· {r.ideas.length} temas, {r.messages.filter(m => m.speaker !== 'criador').length} falas</span>
          </summary>
          <Topics ideas={r.ideas} messages={r.messages} vetoed={r.vetoed} />
          <div className="dc-chat">
            {r.messages.map((m, j) => (
              <Message key={j} m={m} />
            ))}
          </div>
        </details>
      ))}

      {debate.ideas.length > 0 && <Topics ideas={debate.ideas} messages={debate.messages} chosen={debate.chosen} vetoed={debate.vetoed} />}
      {!!debate.rejected?.length && (
        <details className="dc-rejected">
          <summary>
            {debate.rejected.length} ideia(s) do brainstorm ficaram fora pela variedade
          </summary>
          <ul>
            {debate.rejected.map((r, i) => (
              <li key={i}>
                {r.theme} <span className="meta">· {r.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <div className="dc-chat">
        {debate.status === 'brainstorm' && (
          <p className="dc-note">
            <Spinner />{' '}
            {round > 1
              ? `Nenhum tema da rodada ${round - 1} passou. Gerando temas novos, sem repetir os que caíram…`
              : 'Pesquisando o que está acontecendo nas obras do canal e no nicho, e gerando os temas…'}
          </p>
        )}
        {debate.messages.map((m, i) => (
          <Message key={i} m={m} />
        ))}
        {debate.thinking && (
          <div className={`dc-msg ${debate.thinking} typing`}>
            <span className="dc-who">{SPEAKER_NAME[debate.thinking]}</span>
            <p>
              <Spinner /> pensando…
            </p>
          </div>
        )}
        <div ref={end} />
      </div>

      {debate.status === 'aguardando' && <VetoBar key={`${round}-${debate.chosen}-${debate.vetoUntil}`} debate={debate} onVeto={onVeto} />}
      {debate.status === 'resumindo' && (
        <p className="dc-note">
          <Spinner /> As duas aceitaram o tema {debate.chosen}. Escrevendo por que ele é bom…
        </p>
      )}
      {debate.status === 'acordo' && (
        <div className="dc-result">
          <strong>✓ As duas aceitaram o tema {debate.chosen}</strong>
          {debate.why && <p>{debate.why}</p>}
          {debate.projectId ? (
            <Link to={`/projeto/${debate.projectId}/roteiro`} className="act">Abrir o vídeo →</Link>
          ) : (
            creating && (
              <span className="meta">
                <Spinner /> criando o vídeo: roteiro, montagem e imagens…
              </span>
            )
          )}
        </div>
      )}
      {debate.review && <ReviewChat review={debate.review} />}
      {debate.status === 'sem-acordo' && (
        <p className="dc-result fail">
          {debate.past?.length
            ? `As duas não chegaram a um acordo em ${round} rodadas de temas, então nenhum vídeo foi criado.`
            : `As duas não chegaram a um acordo em ${MAX_TURNS} falas, então nenhum vídeo foi criado.`}{' '}
          Dá para debater de novo ou usar o “🤖 Criar sozinho” de uma ideia.
        </p>
      )}
      {debate.status === 'parado' && <p className="dc-result fail">Você parou o debate, então nenhum vídeo foi criado.</p>}
      {debate.status === 'erro' && <p className="form-error">O debate parou: {debate.error}</p>}
    </div>
  )
}
