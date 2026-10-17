// Banco de ideias de vídeo (ADR 0021, escolhas 4B e 5B). Dados em data/ideas/.

import type { Platform } from '../insights/types.js'
import type { AiCredit, ScriptReview, VideoFormat } from '../shorts/types.js'

/** nova = do último brainstorm, ainda sem decisão; feita = virou projeto. */
export type IdeaStatus = 'nova' | 'guardada' | 'descartada' | 'feita'

/** alta = do que está acontecendo agora; atemporal = não depende da semana (ADR 0028). */
export type Trend = 'alta' | 'atemporal'

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
  /** A obra (nome completo) e a personagem principal: o código confere a variedade com elas (ADR 0028). */
  work?: string
  character?: string
  trend?: Trend
  /** Aposta: algo bombando no nicho do canal, mesmo numa obra que o canal nunca tratou (ADR 0028). */
  bet?: boolean
  /** Volta: uma personagem de um vídeo acima da mediana, com um assunto novo (ADR 0033). */
  revisit?: boolean
  /** O formato do vídeo (ADR 0036); sem o campo, opinião com provas. */
  format?: VideoFormat
  /** Na tier list: a série (obra e critério); o personagem ranqueado é o `character`. */
  series?: string
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
/** Quem aparece no chat: as duas IAs, ou o criador quando veta o tema aceito (ADR 0030). */
export type Author = Speaker | 'criador'

export interface DebateMessage {
  speaker: Author
  /** A fala, como numa conversa. */
  text: string
  /** O tema (1, 2, 3…) que ela aceita para virar vídeo agora; null = ainda nenhum. */
  vote: number | null
  ai?: AiCredit
  at: string
}

/**
 * brainstorm → debatendo → aguardando (5 s para o veto) → resumindo → acordo (vira vídeo); sem-acordo depois
 * da última rodada, parado pelo botão (nenhum vídeo nos dois); erro em qualquer etapa.
 */
export type DebateStatus = 'brainstorm' | 'debatendo' | 'aguardando' | 'resumindo' | 'acordo' | 'sem-acordo' | 'parado' | 'erro'

/**
 * Como uma rodada terminou sem vídeo (ADR 0030): as duas recusaram os temas, as falas acabaram sem
 * acordo, ou o criador vetou todos.
 */
export type RoundEnd = 'recusados' | 'falas' | 'vetados'

/** Uma rodada que acabou sem vídeo: os temas, as falas e por que acabou. */
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
  /** A rodada atual (1, 2, 3); sem o campo, 1 (os debates de antes do ADR 0030). */
  round?: number
  /** As rodadas anteriores, que acabaram sem vídeo. */
  past?: DebateRound[]
  /** Os temas da rodada atual, na ordem em que as IAs os citam (1, 2, 3…). Não estão no banco de ideias. */
  ideas: Idea[]
  /** As ideias do brainstorm que ficaram fora do debate, com o motivo (ADR 0028). */
  rejected?: { theme: string; reason: string }[]
  messages: DebateMessage[]
  /** Os temas da rodada atual que o criador vetou nos 5 s depois do acordo. */
  vetoed?: number[]
  /** Em "aguardando": até quando dá para vetar o tema aceito. */
  vetoUntil?: string
  /** Quem está escrevendo agora, para a tela mostrar "pensando…". */
  thinking?: Speaker
  /** O número do tema aceito pelas duas. */
  chosen?: number
  /** Por que as duas acharam o tema bom (o resumo do debate); vai para o projeto. */
  why?: string
  /** A vencedora, gravada no banco de ideias. */
  ideaId?: string
  /** Depois do acordo: a Roteirista escreve o roteiro e a Estrategista revisa (ADR 0034). */
  review?: ScriptReview
  projectId?: string
  error?: string
  createdAt: string
  updatedAt: string
}
