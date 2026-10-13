/**
 * Variedade nos temas do debate (ADR 0028), sem rede nem disco (testado em variety.test.ts).
 *
 * A IA pode ignorar um "varie a obra"; aqui o código confere: tira as ideias cuja personagem acabou de
 * aparecer ou cuja obra já tem vídeos demais, fica com uma ideia por obra e sorteia a ordem.
 */

import type { Idea, Trend } from './types.js'

/** A personagem não volta enquanto estiver num destes últimos vídeos. */
export const CHARACTER_WINDOW = 3
/** A obra descansa quando já tem `WORK_LIMIT` dos últimos `WORK_WINDOW` vídeos. */
export const WORK_WINDOW = 4
export const WORK_LIMIT = 2

/** Um vídeo já feito, do mais novo para o mais velho. */
export interface RecentVideo {
  title: string
  theme?: string
  /** A obra (o `subject` do projeto, ADR 0024); os projetos antigos não têm. */
  work?: string
  trend?: Trend
}

export interface Rejected {
  theme: string
  reason: string
}

/** Sem acento, minúsculo, só letras e números separados por espaço. */
export function normalize(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** "One-Punch Man" = "One Punch Man"; "Jujutsu Kaisen Modulo" conta como "Jujutsu Kaisen". */
export function sameWork(a?: string, b?: string) {
  const x = normalize(a ?? '').replace(/ /g, '')
  const y = normalize(b ?? '').replace(/ /g, '')
  if (!x || !y) return false
  return x === y || x.includes(y) || y.includes(x)
}

/** A personagem aparece no texto se uma palavra do nome dela (com 4 letras ou mais) aparece. */
export function mentions(text: string, character?: string) {
  const words = new Set(normalize(text).split(' '))
  return normalize(character ?? '')
    .split(' ')
    .filter(w => w.length >= 4)
    .some(w => words.has(w))
}

/** Por que a ideia não pode entrar agora, ou null se pode. */
export function blockReason(idea: Pick<Idea, 'work' | 'character'>, recent: RecentVideo[]) {
  const byCharacter = recent.slice(0, CHARACTER_WINDOW).find(v => mentions(`${v.title} ${v.theme ?? ''}`, idea.character))
  if (byCharacter) return `${idea.character} está num dos ${CHARACTER_WINDOW} últimos vídeos ("${byCharacter.title}")`
  const sameWorkCount = recent.slice(0, WORK_WINDOW).filter(v => sameWork(v.work, idea.work)).length
  if (sameWorkCount >= WORK_LIMIT) return `${idea.work} já tem ${sameWorkCount} dos ${WORK_WINDOW} últimos vídeos`
  return null
}

/** Embaralha (Fisher–Yates). `random` é trocável para o teste. */
export function shuffle<T>(items: T[], random = Math.random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Escolhe as `count` candidatas do debate entre as que o brainstorm trouxe (na ordem dele):
 * 1. tira as bloqueadas pela personagem ou pela obra;
 * 2. fica com uma por obra, e no máximo uma aposta;
 * 3. se todas as escolhidas forem "em alta" e sobrar uma atemporal, ela entra no lugar da última;
 * 4. sorteia a ordem (contra o viés de posição).
 */
export function pickCandidates<T extends Pick<Idea, 'theme' | 'work' | 'character' | 'trend' | 'bet'>>(
  ideas: T[],
  recent: RecentVideo[],
  count: number,
  random = Math.random,
): { chosen: T[]; rejected: Rejected[] } {
  const rejected: Rejected[] = []
  const allowed: T[] = []
  for (const idea of ideas) {
    const reason =
      blockReason(idea, recent) ??
      (allowed.some(a => sameWork(a.work, idea.work)) ? `outra ideia já é de ${idea.work}` : null) ??
      (idea.bet && allowed.some(a => a.bet) ? 'já há uma aposta' : null)
    if (reason) rejected.push({ theme: idea.theme, reason })
    else allowed.push(idea)
  }

  const chosen = allowed.slice(0, count)
  const timeless = allowed.slice(count).find(i => i.trend === 'atemporal')
  if (chosen.length === count && timeless && chosen.every(i => i.trend !== 'atemporal')) chosen[count - 1] = timeless
  for (const idea of allowed) {
    if (!chosen.includes(idea)) rejected.push({ theme: idea.theme, reason: 'sobrou: o debate leva só ' + count })
  }
  return { chosen: shuffle(chosen, random), rejected }
}

/** A variedade dos últimos vídeos, para as duas IAs do debate pesarem (ADR 0028, D). */
export function varietyLines(recent: RecentVideo[], size = 6) {
  const last = recent.slice(0, size)
  if (!last.length) return ''
  const lines = last.map(v => `- ${v.title}${v.work ? ` · ${v.work}` : ''}${v.trend ? ` · ${v.trend === 'alta' ? 'em alta' : 'atemporal'}` : ''}`)
  const counts = new Map<string, number>()
  for (const v of last) if (v.work) counts.set(v.work, (counts.get(v.work) ?? 0) + 1)
  const repeated = [...counts].filter(([, n]) => n > 1).map(([w, n]) => `${n}× ${w}`)
  const hype = last.filter(v => v.trend === 'alta').length
  const known = last.filter(v => v.trend).length
  return [
    ...lines,
    repeated.length ? `Obras repetidas nos últimos ${last.length}: ${repeated.join(', ')}.` : '',
    known ? `${hype} de ${known} (dos que têm a marca) foram de tema em alta.` : '',
  ]
    .filter(Boolean)
    .join('\n')
}
