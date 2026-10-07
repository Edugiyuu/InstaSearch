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
