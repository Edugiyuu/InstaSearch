import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Debate, MAX_TURNS, Speaker, SPEAKER_FOCUS, SPEAKER_NAME } from '../api/ideas'
import { Spinner } from './flow'
import './DebateChat.css'

const STATUS: Record<Debate['status'], string> = {
  brainstorm: 'Gerando 4 ideias nas obras do canal…',
  debatendo: 'Debatendo',
  resumindo: 'As duas aceitaram; escrevendo o porquê…',
  acordo: 'Acordo',
  'sem-acordo': 'Sem acordo',
  erro: 'Parou',
}

/**
 * O debate das IAs como um chat (ADR 0027): os temas em cima, as falas uma a uma (a Estrategista à
 * esquerda, a Roteirista à direita), com o voto de cada uma, e no fim o tema aceito e o porquê.
 */
export function DebateChat({ debate, creating }: { debate: Debate; /** o vídeo do debate ainda está na fila */ creating: boolean }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [debate.messages.length, debate.thinking])

  const votesFor = (n: number) => {
    const last = (s: Speaker) => [...debate.messages].reverse().find(m => m.speaker === s)?.vote
    return (['estrategista', 'roteirista'] as Speaker[]).filter(s => last(s) === n)
  }

  return (
    <div className="dc">
      <div className="dc-head">
        <strong>🗣️ Debate das IAs</strong>
        <span className={`dc-status ${debate.status}`}>{STATUS[debate.status]}</span>
        {debate.messages.length > 0 && (
          <span className="meta">
            fala {debate.messages.length} de no máximo {MAX_TURNS}
          </span>
        )}
      </div>

      {debate.ideas.length > 0 && (
        <ol className="dc-topics">
          {debate.ideas.map((idea, i) => {
            const n = i + 1
            const voters = votesFor(n)
            return (
              <li key={idea.id} className={debate.chosen === n ? 'chosen' : ''}>
                <span className="dc-n">{n}</span>
                <span className="dc-topic">
                  {idea.theme}
                  <span className="meta">“{idea.hook}”</span>
                </span>
                {voters.map(s => (
                  <span key={s} className={`dc-voter ${s}`} title={`${SPEAKER_NAME[s]} aceita este tema`}>
                    ✓ {SPEAKER_NAME[s]}
                  </span>
                ))}
              </li>
            )
          })}
        </ol>
      )}

      <div className="dc-chat">
        {debate.status === 'brainstorm' && (
          <p className="dc-note">
            <Spinner /> Pesquisando o que está acontecendo nas obras do canal e gerando os temas…
          </p>
        )}
        {debate.messages.map((m, i) => (
          <div key={i} className={`dc-msg ${m.speaker}`}>
            <span className="dc-who">
              {SPEAKER_NAME[m.speaker]} <span className="meta">· {SPEAKER_FOCUS[m.speaker]}</span>
            </span>
            <p>{m.text}</p>
            <span className="dc-vote">{m.vote ? `aceita o tema ${m.vote}` : 'ainda não aceita nenhum'}</span>
          </div>
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
      {debate.status === 'sem-acordo' && (
        <p className="dc-result fail">
          As duas não chegaram a um acordo em {MAX_TURNS} falas, então nenhum vídeo foi criado. Dá para debater de novo ou usar o “🤖 Criar sozinho” de uma ideia.
        </p>
      )}
      {debate.status === 'erro' && <p className="form-error">O debate parou: {debate.error}</p>}
    </div>
  )
}
