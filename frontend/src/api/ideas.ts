// Banco de ideias (ADR 0021). Os tipos espelham backend/src/services/ideas/types.ts.
import api from '../services/api'
import type { Platform } from './insights'
import type { AiCredit } from './shorts'

export type IdeaStatus = 'nova' | 'guardada' | 'descartada' | 'feita'

export interface IdeaEvidence {
  kind: 'video' | 'comentario' | 'web'
  text: string
  url?: string
  platform?: Platform
  ratio?: number
}

export interface Idea {
  id: string
  theme: string
  hook: string
  styleId: string
  toneId: string
  duration: number
  why: string
  evidence: IdeaEvidence[]
  status: IdeaStatus
  discardReason?: string
  projectId?: string
  batchId: string
  /** Posição no lote: o número do cartão, o mesmo que a IA lê no ajuste. */
  position: number
  seed?: string
  request?: string
  ai?: AiCredit
  createdAt: string
  updatedAt: string
}

// ── Debate das IAs (ADR 0027) ──

export type Speaker = 'estrategista' | 'roteirista'

export interface DebateMessage {
  speaker: Speaker
  text: string
  /** O tema (1, 2, 3…) que ela aceita agora; null = ainda nenhum. */
  vote: number | null
  ai?: AiCredit
  at: string
}

export type DebateStatus = 'brainstorm' | 'debatendo' | 'resumindo' | 'acordo' | 'sem-acordo' | 'erro'

export interface Debate {
  id: string
  status: DebateStatus
  /** Os temas em debate, na ordem em que as IAs os citam (1, 2, 3…). */
  ideas: Idea[]
  messages: DebateMessage[]
  thinking?: Speaker
  chosen?: number
  why?: string
  ideaId?: string
  projectId?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export const SPEAKER_NAME: Record<Speaker, string> = { estrategista: 'Estrategista', roteirista: 'Roteirista' }
/** O que cada uma olha, para a tela explicar. */
export const SPEAKER_FOCUS: Record<Speaker, string> = {
  estrategista: 'números e público do canal',
  roteirista: 'gancho, argumento e imagens',
}
/** No máximo 6 falas (ADR 0027, 2A); igual ao MAX_TURNS do backend. */
export const MAX_TURNS = 6
export const debateActive = (d: Debate) => d.status === 'brainstorm' || d.status === 'debatendo' || d.status === 'resumindo'

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data)

export const ideasApi = {
  list: () => data<Idea[]>(api.get('/ideas')),
  /** A IA pesquisa na web antes de responder: pode levar um minuto. */
  brainstorm: (input: { seed?: string; request?: string }) => data<Idea[]>(api.post('/ideas/brainstorm', input, { timeout: 240000 })),
  update: (id: string, changes: { status?: IdeaStatus; discardReason?: string; projectId?: string }) => data<Idea>(api.put(`/ideas/${id}`, changes)),
  remove: (id: string) => api.delete(`/ideas/${id}`),
  debates: () => data<Debate[]>(api.get('/ideas/debates')),
  debate: (id: string) => data<Debate>(api.get(`/ideas/debates/${id}`)),
}

/** O Novo vídeo já preenchido com a ideia (tema, estilo, tom e duração). */
export function newVideoLink(idea: Pick<Idea, 'id' | 'theme' | 'styleId' | 'toneId' | 'duration'>) {
  const params = new URLSearchParams({ tema: idea.theme, estilo: idea.styleId, tom: idea.toneId, duracao: String(idea.duration), ideia: idea.id })
  return `/novo?${params}`
}
