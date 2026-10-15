import { Link } from 'react-router-dom'
import type { Autopilot } from '../api/shorts'
import './WhyTopic.css'

/**
 * O resultado da revisão do roteiro pelas IAs (ADR 0034). Sem aprovação, o vídeo seguiu com a última
 * versão, e os pontos que sobraram ficam aqui para o criador conferir antes de gravar a voz.
 */
export function ScriptReviewNote({ autopilot }: { autopilot: Autopilot }) {
  const review = autopilot.review
  if (!review) return null
  return (
    <div className={`why-topic script-review ${review.approved ? 'ok' : 'warn'}`}>
      <span className="label">📝 Revisão do roteiro</span>
      {review.approved ? (
        <p>A Estrategista aprovou o roteiro{review.versions > 1 ? ` na versão ${review.versions}` : ' de primeira'}.</p>
      ) : (
        <>
          <p>A Estrategista não aprovou nenhuma das {review.versions} versões. Confira antes de gravar:</p>
          {review.problems.length > 0 && (
            <ul>
              {review.problems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          )}
        </>
      )}
      {autopilot.debateId && (
        <Link to={`/ideias?debate=${autopilot.debateId}`} className="act">
          Ver a revisão no debate →
        </Link>
      )}
    </div>
  )
}
