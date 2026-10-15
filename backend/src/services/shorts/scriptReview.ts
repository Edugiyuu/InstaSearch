// Revisão do roteiro (ADR 0034): a Roteirista escreve, a Estrategista revisa, e sem aprovação vem uma
// versão nova, até 2 reescritas. Quem decide se aprovou é o código: o "approved" da revisora e a contagem
// de palavras (a IA não decide sozinha que "está bom"). Sem rede nem disco: quem escreve e quem revisa
// entram como funções (testado em scriptReview.test.ts).

import type { AiCredit, ScriptReview } from './types.js'

/** Até 2 reescritas: no máximo 3 versões e 3 revisões. */
export const MAX_REWRITES = 2
/** O roteiro pode passar um pouco do limite de palavras; mais que isso, o vídeo fica mais longo que o pedido. */
export const WORD_SLACK = 1.1

export const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length

/** O roteiro passou do limite de palavras (com a folga), ou null se cabe. */
export function wordProblem(narration: string, limit: number) {
  const n = countWords(narration)
  return n > Math.round(limit * WORD_SLACK) ? `O roteiro tem ${n} palavras e o limite é ${limit}: corte para caber na duração.` : null
}

export interface Verdict {
  approved: boolean
  problems: string[]
  message: string
  ai?: AiCredit
}

/**
 * Escreve, revisa e reescreve até aprovar ou acabarem as voltas. Sem aprovação, devolve a última versão
 * mesmo assim (ADR 0034, 4A): os problemas que sobraram aparecem na Revisão do projeto. `onChange` recebe
 * a revisão a cada passo, para o chat do debate acompanhar.
 */
export async function reviewLoop<S extends { narration: string; ai?: AiCredit }>(opts: {
  write: (revision?: { narration: string; problems: string[] }) => Promise<S>
  review: (script: S, version: number) => Promise<Verdict>
  maxWords: number
  onChange?: (review: ScriptReview) => unknown
}): Promise<{ script: S; review: ScriptReview }> {
  const review: ScriptReview = { status: 'revisando', steps: [] }
  const notify = async (changes: Partial<ScriptReview>) => {
    Object.assign(review, changes)
    await opts.onChange?.({ ...review, steps: [...review.steps] })
  }
  try {
    let revision: { narration: string; problems: string[] } | undefined
    for (let version = 1; ; version++) {
      await notify({ thinking: 'roteiro' })
      const script = await opts.write(revision)
      review.steps.push({ kind: 'roteiro', version, text: script.narration, ai: script.ai, at: new Date().toISOString() })

      await notify({ thinking: 'revisao' })
      const verdict = await opts.review(script, version)
      const tooLong = wordProblem(script.narration, opts.maxWords)
      const problems = tooLong ? [...verdict.problems, tooLong] : verdict.problems
      const approved = verdict.approved && !tooLong
      review.steps.push({ kind: 'revisao', version, text: verdict.message, approved, problems, ai: verdict.ai, at: new Date().toISOString() })

      if (approved || version > MAX_REWRITES) {
        await notify({ status: approved ? 'aprovado' : 'reprovado', thinking: undefined })
        return { script, review }
      }
      // reprovou sem dizer o quê: a fala dela vira o pedido
      revision = { narration: script.narration, problems: problems.length ? problems : [verdict.message] }
    }
  } catch (error) {
    await notify({ status: 'erro', thinking: undefined }).catch(() => undefined)
    throw error
  }
}

/** O que fica no projeto: se aprovou, em quantas versões e o que sobrou para o criador ver. */
export function reviewSummary(review: ScriptReview) {
  const last = [...review.steps].reverse().find(s => s.kind === 'revisao')
  return {
    approved: review.status === 'aprovado',
    versions: review.steps.filter(s => s.kind === 'roteiro').length,
    problems: review.status === 'aprovado' ? [] : (last?.problems ?? []),
  }
}
