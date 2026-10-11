import { Link } from 'react-router-dom'
import type { Autopilot } from '../api/shorts'
import './WhyTopic.css'

/** "Por que este tema": a explicação das duas IAs que escolheram o tema no debate (ADR 0027). */
export function WhyTopic({ autopilot }: { autopilot: Autopilot }) {
  return (
    <div className="why-topic">
      <span className="label">🗣️ Por que este tema</span>
      <p>{autopilot.why}</p>
      {autopilot.debateId && (
        <Link to={`/ideias?debate=${autopilot.debateId}`} className="act">
          Ver o debate das IAs →
        </Link>
      )}
    </div>
  )
}
