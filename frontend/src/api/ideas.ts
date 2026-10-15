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
  /** A obra, a personagem principal e se o tema está em alta (ADR 0028). */
  work?: string
  character?: string
  trend?: 'alta' | 'atemporal'
  /** Aposta: algo bombando no nicho, numa obra que o canal nunca tratou. */
  bet?: boolean
  /** Volta: uma personagem de um vídeo acima da mediana, com um assunto novo (ADR 0033). */
  revisit?: boolean
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
/** As duas IAs, ou o criador quando veta o tema aceito (ADR 0030). */
export type Author = Speaker | 'criador'

export interface DebateMessage {
  speaker: Author
  text: string
  /** O tema (1, 2, 3…) que ela aceita agora; null = ainda nenhum. */
  vote: number | null
  ai?: AiCredit
  at: string
}

export type DebateStatus = 'brainstorm' | 'debatendo' | 'aguardando' | 'resumindo' | 'acordo' | 'sem-acordo' | 'parado' | 'erro'

/** Por que uma rodada acabou sem vídeo (ADR 0030). */
export type RoundEnd = 'recusados' | 'falas' | 'vetados'

/** Uma rodada anterior, que acabou sem vídeo. */
export interface DebateRound {
  ideas: Idea[]
  rejected?: { theme: string; reason: string }[]
  messages: DebateMessage[]
  vetoed?: number[]
  end: RoundEnd
}

export interface Debate {
  id: string
  status: DebateStatus
  /** A rodada atual; sem o campo, 1 (debates de antes do ADR 0030). */
  round?: number
  past?: DebateRound[]
  /** Os temas da rodada atual, na ordem em que as IAs os citam (1, 2, 3…). */
  ideas: Idea[]
  /** As ideias do brainstorm que o filtro de variedade tirou, com o motivo (ADR 0028). */
  rejected?: { theme: string; reason: string }[]
  messages: DebateMessage[]
  /** Os temas da rodada atual que o criador vetou. */
  vetoed?: number[]
  /** Em "aguardando": até quando dá para vetar o tema aceito. */
  vetoUntil?: string
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
/** No máximo 6 falas por rodada (ADR 0027, 2A) e 3 rodadas (ADR 0030); iguais aos do backend. */
export const MAX_TURNS = 6
export const MAX_ROUNDS = 3
/** Os segundos para vetar o tema aceito (ADR 0030); igual ao do backend. */
export const VETO_SECONDS = 5
export const debateActive = (d: Debate) => ['brainstorm', 'debatendo', 'aguardando', 'resumindo'].includes(d.status)
/** Ainda dá para parar: depois do acordo (resumindo), o vídeo já está a caminho. */
export const debateStoppable = (d: Debate) => ['brainstorm', 'debatendo', 'aguardando'].includes(d.status)

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data)

export const ideasApi = {
  list: () => data<Idea[]>(api.get('/ideas')),
  /** A IA pesquisa na web antes de responder: pode levar um minuto. */
  brainstorm: (input: { seed?: string; request?: string }) => data<Idea[]>(api.post('/ideas/brainstorm', input, { timeout: 240000 })),
  update: (id: string, changes: { status?: IdeaStatus; discardReason?: string; projectId?: string }) => data<Idea>(api.put(`/ideas/${id}`, changes)),
  remove: (id: string) => api.delete(`/ideas/${id}`),
  debates: () => data<Debate[]>(api.get('/ideas/debates')),
  debate: (id: string) => data<Debate>(api.get(`/ideas/debates/${id}`)),
  /** Nos 5 s depois do acordo: o criador não gostou do tema (ADR 0030). */
  vetoDebate: (id: string) => api.post(`/ideas/debates/${id}/veto`),
  stopDebate: (id: string) => api.post(`/ideas/debates/${id}/stop`),
}

/** O Novo vídeo já preenchido com a ideia (tema, estilo, tom e duração). */
export function newVideoLink(idea: Pick<Idea, 'id' | 'theme' | 'styleId' | 'toneId' | 'duration'>) {
  const params = new URLSearchParams({ tema: idea.theme, estilo: idea.styleId, tom: idea.toneId, duracao: String(idea.duration), ideia: idea.id })
  return `/novo?${params}`
}
