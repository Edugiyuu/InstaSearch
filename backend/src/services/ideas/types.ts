// Banco de ideias de vídeo (ADR 0021, escolhas 4B e 5B). Dados em data/ideas/.

import type { Platform } from '../insights/types.js'
import type { AiCredit } from '../shorts/types.js'

/** nova = do último brainstorm, ainda sem decisão; feita = virou projeto. */
export type IdeaStatus = 'nova' | 'guardada' | 'descartada' | 'feita'

/** O que sustenta a ideia, sempre ligado a um dado real (nunca um link inventado pela IA). */
export interface IdeaEvidence {
  kind: 'video' | 'comentario' | 'web'
  /** Título do vídeo, texto do comentário ou o que a pesquisa achou. */
  text: string
  url?: string
  platform?: Platform
  /** Vídeo: quantas vezes a mediana do canal. */
  ratio?: number
}

export interface Idea {
  id: string
  /** Escrito como no campo "Sobre o que é o vídeo?" do Novo vídeo. */
  theme: string
  /** A primeira frase falada. */
  hook: string
  styleId: string
  toneId: string
  duration: number
  /** Por que a IA acha que vai funcionar, em 2 ou 3 frases. */
  why: string
  evidence: IdeaEvidence[]
  status: IdeaStatus
  /** Por que o usuário descartou ("já fiz", "não curto"); entra nos próximos brainstorms. */
  discardReason?: string
  /** O projeto criado a partir da ideia. */
  projectId?: string
  /** As ideias de um mesmo brainstorm. */
  batchId: string
  /** Posição no lote (1, 2, 3…): o número que o usuário vê e cita no ajuste ("junta a 2 com a 5"). */
  position: number
  /** A semente ("quero falar do Gojo") ou o ajuste ("mais polêmicas") que gerou o lote. */
  seed?: string
  request?: string
  ai?: AiCredit
  createdAt: string
  updatedAt: string
}

// ── Debate das IAs (ADR 0027) ─────────────────────────────

/** As duas IAs do debate, com olhares diferentes. */
export type Speaker = 'estrategista' | 'roteirista'

export interface DebateMessage {
  speaker: Speaker
  /** A fala, como numa conversa. */
  text: string
  /** O tema (1, 2, 3…) que ela aceita para virar vídeo agora; null = ainda nenhum. */
  vote: number | null
  ai?: AiCredit
  at: string
}

/**
 * brainstorm → debatendo → resumindo → acordo (vira vídeo) ou sem-acordo (nenhum vídeo); erro em qualquer etapa.
 */
export type DebateStatus = 'brainstorm' | 'debatendo' | 'resumindo' | 'acordo' | 'sem-acordo' | 'erro'

export interface Debate {
  id: string
  status: DebateStatus
  /** Os temas em debate, na ordem em que as IAs os citam (1, 2, 3…). Não estão no banco de ideias. */
  ideas: Idea[]
  messages: DebateMessage[]
  /** Quem está escrevendo agora, para a tela mostrar "pensando…". */
  thinking?: Speaker
  /** O número do tema aceito pelas duas. */
  chosen?: number
  /** Por que as duas acharam o tema bom (o resumo do debate); vai para o projeto. */
  why?: string
  /** A vencedora, gravada no banco de ideias. */
  ideaId?: string
  projectId?: string
  error?: string
  createdAt: string
  updatedAt: string
}
