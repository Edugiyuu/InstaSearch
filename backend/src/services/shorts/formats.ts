// Formatos de vídeo e a tier list em série (ADR 0036), sem rede nem disco (testado em formats.test.ts).
//
// Todo vídeo saía com a mesma estrutura (gancho → tese → provas → conclusão). Agora cada formato tem a sua,
// e o código não deixa repetir o formato dos últimos vídeos. A tier list ranqueia um personagem por
// vídeo, e o quadro sai dos próprios vídeos da série: apagar um vídeo ou trocar a fileira já muda o quadro.

import { TIER_RANKS, VIDEO_FORMATS, type Beat, type ShortProject, type TierEntry, type TierRank, type VideoFormat } from './types.js'

/**
 * A tier list está pronta (a cena, o quadro e a fileira na Revisão), mas desligada por enquanto, a pedido do
 * usuário (adendo ao ADR 0036): o brainstorm não a propõe, e o código barra se ela aparecer.
 */
export const TIER_LIST_ON = false

/** Os formatos que o brainstorm pode propor agora. */
export const ACTIVE_FORMATS = VIDEO_FORMATS.filter(f => f !== 'tierlist' || TIER_LIST_ON)

/** O formato não volta enquanto estiver num destes últimos vídeos (ADR 0036, 2A). */
export const FORMAT_WINDOW = 2

export const FORMAT_NAME: Record<VideoFormat, string> = {
  opiniao: 'opinião com provas',
  tierlist: 'tier list',
  versus: 'X contra Y',
  ese: 'E se…',
  mito: 'mito ou verdade',
  antesdepois: 'antes e depois',
}

/** O formato de um vídeo; os de antes do ADR 0036 eram todos opinião com provas. */
export const formatOf = (v: { format?: VideoFormat }) => v.format ?? 'opiniao'

export const isFormat = (v: unknown): v is VideoFormat => VIDEO_FORMATS.includes(v as VideoFormat)
export const isRank = (v: unknown): v is TierRank => TIER_RANKS.includes(v as TierRank)

/** Sem acento, minúsculo, só letras e números: "One-Punch Man: o melhor" = "one punch man o melhor". */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

export const sameSeries = (a?: string, b?: string) => !!a && !!b && norm(a) === norm(b)

/** O mesmo personagem: "Garou" = "Garou"; "Saitama" bate com "Saitama (One Punch Man)". */
export function sameCharacter(a?: string, b?: string) {
  const x = norm(a ?? '')
  const y = norm(b ?? '')
  return !!x && !!y && (x === y || x.split(' ').includes(y) || y.split(' ').includes(x))
}

/** As séries de tier list do canal, com quem já foi ranqueado, na ordem dos vídeos. */
export function tierSeries(projects: Pick<ShortProject, 'format' | 'tier' | 'createdAt'>[]) {
  const series: { series: string; entries: TierEntry[] }[] = []
  for (const p of [...projects].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    if (p.format !== 'tierlist' || !p.tier) continue
    const found = series.find(s => sameSeries(s.series, p.tier!.series))
    if (found) found.entries.push(p.tier)
    else series.push({ series: p.tier.series, entries: [p.tier] })
  }
  return series
}

/** O personagem já está no quadro da série (ADR 0036, 3A: a próxima parte é sempre de alguém novo). */
export function alreadyRanked(series: { series: string; entries: TierEntry[] }[], idea: { series?: string; character?: string }) {
  return series.find(s => sameSeries(s.series, idea.series))?.entries.find(e => sameCharacter(e.character, idea.character))
}

export interface TierBoard {
  series: string
  /** Quem já estava no quadro, dos vídeos anteriores da série. */
  previous: TierEntry[]
  /** O personagem deste vídeo. */
  current: TierEntry
  /** Que parte da série é este vídeo (1, 2, 3…). */
  part: number
}

/**
 * O quadro de um vídeo da tier list (ADR 0036, 3C): os vídeos da mesma série criados ANTES dele, mais ele.
 * Um vídeo antigo mostra o quadro de quando foi feito; apagar um vídeo tira o personagem dos seguintes.
 */
export function tierBoard(project: Pick<ShortProject, 'id' | 'format' | 'tier' | 'createdAt'>, projects: Pick<ShortProject, 'id' | 'format' | 'tier' | 'createdAt'>[]): TierBoard | undefined {
  if (project.format !== 'tierlist' || !project.tier) return undefined
  const previous = projects
    .filter(p => p.id !== project.id && p.format === 'tierlist' && p.tier && sameSeries(p.tier.series, project.tier!.series) && p.createdAt < project.createdAt)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map(p => p.tier!)
    // o mesmo personagem duas vezes (feito à mão): fica a fileira mais recente
    .filter((e, i, all) => !all.slice(i + 1).some(o => sameCharacter(o.character, e.character)) && !sameCharacter(e.character, project.tier!.character))
  return { series: project.tier.series, previous, current: project.tier, part: previous.length + 1 }
}

/**
 * A narração nunca diz a fileira (ADR 0036, 6): quem revela é a animação, e o usuário pode trocar a fileira
 * depois sem a voz ficar errada. "Classe B" de One Punch Man não conta: é a classe de herói, não a fileira.
 */
export function tierLetterProblem(narration: string) {
  // a letra em maiúscula: "tier A", "rank S", "B-tier"; "A tier list de…" e "ele nota a diferença" não contam
  const found = narration.match(/\b(?:[Tt]ier|TIER|[Rr]ank|RANK|[Ff]ileira)\s+[SABCD]\b|\b[SABCD][- ]?(?:[Tt]ier|TIER)\b(?!\s*[Ll]ist)/)
  return found ? `A narração diz a fileira ("${found[0]}"): a letra só aparece no quadro, para dar para trocar depois. Aponte para o quadro ("o lugar dele é aqui").` : null
}

/**
 * As cenas da tier list, se o roteiro não marcou (ou marcou errado): a primeira mostra o quadro, a
 * revelação é a que aponta ("aqui", "esse", "pra cá") ou a penúltima, e a última volta ao quadro.
 */
export function ensureTierScenes(beats: Beat[]): Beat[] {
  if (beats.length < 3) return beats
  let reveal = beats.findIndex(b => b.tier === 'revelacao')
  if (reveal < 1) {
    // a última é a pergunta depois da revelação ("concorda com esse lugar?")
    const pointing = beats.map((b, i) => ({ b, i })).filter(({ b, i }) => i > 0 && i < beats.length - 1 && POINTING.test(b.say))
    reveal = pointing.length ? pointing[pointing.length - 1].i : beats.length - 2
  }
  return beats.map((b, i) => {
    const tier = i === 0 ? 'quadro' : i === reveal ? 'revelacao' : i > reveal ? 'quadro' : undefined
    // a cena do quadro não tem imagem para buscar; o som de impacto marca a revelação
    return { ...b, tier, ...(i === reveal && !b.sfx ? { sfx: 'impacto' } : {}) }
  })
}

/** As palavras que apontam para o quadro na revelação. */
export const POINTING = /\b(aqui|esse|essa|pra c[aá]|para c[aá]|c[aá])\b/i

/** O formato e a estrutura que o pedido do roteiro manda seguir. */
export function formatStructure(format: VideoFormat, tier?: { series: string; character: string; part: number; previous: TierEntry[] }) {
  switch (format) {
    case 'tierlist':
      return `Formato: TIER LIST, parte ${tier?.part ?? 1} da série "${tier?.series ?? ''}". Este vídeo ranqueia UM personagem: ${tier?.character ?? ''}.${
        tier?.previous.length ? ` Já estão no quadro: ${tier.previous.map(e => `${e.character} (${e.rank})`).join(', ')}.` : ' É o primeiro da série: o quadro começa vazio.'
      }
- Batida 1 (abertura): a série e o personagem da vez ("Tier list de One Punch Man, parte ${tier?.part ?? 1}: o ${tier?.character ?? 'personagem'}"). Ela mostra o quadro: use "tier": "quadro".
- Depois, o motivo: 2 provas concretas de por que ele merece a posição que você escolheu, com as imagens de sempre.
- Penúltima batida (a revelação): aponte para o quadro SEM DIZER A LETRA ("e pra mim, o lugar do ${tier?.character ?? 'personagem'} é aqui", "o veredito é esse", "então ele vai pra cá"). Use "tier": "revelacao" e "sfx": "impacto"; a animação põe o personagem na fileira nessa palavra.
- Última batida: uma pergunta sobre a fileira que acabou de aparecer ("Concorda?", "Ele merecia mais?", "Exagerei?"). Use "tier": "quadro".
- NUNCA diga a fileira na narração ("tier A", "rank B", "fica no S"): a letra só aparece no quadro, e o criador pode trocá-la depois.
- Responda também "tierRank": a fileira que o argumento defende, uma de S, A, B, C, D.`
    case 'versus':
      return `Formato: X CONTRA Y. Gancho com a disputa → os dois lados, ponto a ponto (2 ou 3 pontos, alternando) → o vencedor, com o motivo decisivo → uma pergunta: "e você, fica com quem?".`
    case 'ese':
      return `Formato: E SE… Gancho com a premissa ("e se X tivesse feito Y?") → o que mudaria na história, em 2 consequências concretas, ligadas a fatos reais da obra → o desfecho mais provável → uma pergunta ao público.`
    case 'mito':
      return `Formato: MITO OU VERDADE. Gancho com o que todo mundo acha → 2 ou 3 crenças comuns sobre o tema, cada uma derrubada (ou confirmada) por uma prova concreta → a conclusão → "qual dessas você achava?".`
    case 'antesdepois':
      return `Formato: ANTES E DEPOIS. Gancho com a mudança → como era (com uma prova concreta) → o que mudou e quando (episódio, capítulo, arco) → se ficou melhor ou pior, com uma opinião forte → uma pergunta ao público.`
    default:
      return 'Estrutura de argumento: gancho → a tese em uma frase → 2 provas concretas (um acontecimento, o capítulo ou episódio, um número ou uma fala; uma 3ª só se couber no limite de palavras), cada uma com a sua batida → conclusão que responde ao gancho → chamada para comentar.'
  }
}
