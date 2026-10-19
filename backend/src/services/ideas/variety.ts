/**
 * Variedade nos temas do debate (ADR 0028), sem rede nem disco (testado em variety.test.ts).
 *
 * A IA pode ignorar um "varie a obra"; aqui o código confere: tira as ideias cuja personagem acabou de
 * aparecer ou cuja obra já tem vídeos demais, fica com uma ideia por obra e sorteia a ordem. Uma das
 * ideias pode ser a volta de uma personagem que deu views, com as regras dela (ADR 0033).
 */

import { median } from '../insights/compare.js'
import type { VideoMetrics } from '../insights/types.js'
import { ACTIVE_FORMATS, alreadyRanked, FORMAT_NAME, FORMAT_WINDOW, formatOf, tierSeries } from '../shorts/formats.js'
import type { TierEntry, VideoFormat } from '../shorts/types.js'
import type { Idea, Trend } from './types.js'

/** A personagem não volta enquanto estiver num destes últimos vídeos. */
export const CHARACTER_WINDOW = 3
/** A obra descansa quando já tem `WORK_LIMIT` dos últimos `WORK_WINDOW` vídeos. */
export const WORK_WINDOW = 4
export const WORK_LIMIT = 2
/** Não sugar (ADR 0033): a personagem que já tem `REST_LIMIT` dos últimos `REST_WINDOW` vídeos descansa. */
export const REST_WINDOW = 8
export const REST_LIMIT = 3
/** Quem fica até 5% abaixo da mediana conta como acima: passa de raspão (ADR 0033). */
export const MEDIAN_MARGIN = 0.05

/** Um vídeo já feito, do mais novo para o mais velho. */
export interface RecentVideo {
  title: string
  theme?: string
  /** A obra (o `subject` do projeto, ADR 0024); os projetos antigos não têm. */
  work?: string
  trend?: Trend
  /** Visualizações acima da mediana, com a margem (true), ou abaixo (false); sem valor = ainda não medido (ADR 0033). */
  above?: boolean
  /** O formato do vídeo (ADR 0036); sem o campo, opinião com provas. */
  format?: VideoFormat
  /** Na tier list: a série e quem o vídeo ranqueou. */
  tier?: TierEntry
  createdAt?: string
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

const isAbout = (v: RecentVideo, character?: string) => mentions(`${v.title} ${v.theme ?? ''}`, character)

/** A personagem já apareceu demais: descansa, mesmo sendo campeã (ADR 0033, "não sugar"). */
function restReason(character: string | undefined, recent: RecentVideo[]) {
  const count = recent.slice(0, REST_WINDOW).filter(v => isAbout(v, character)).length
  return count >= REST_LIMIT ? `${character} descansa: já tem ${count} dos ${REST_WINDOW} últimos vídeos` : null
}

/** Por que a ideia não pode entrar agora, ou null se pode. */
export function blockReason(idea: Pick<Idea, 'work' | 'character'>, recent: RecentVideo[]) {
  const byCharacter = recent.slice(0, CHARACTER_WINDOW).find(v => isAbout(v, idea.character))
  if (byCharacter) return `${idea.character} está num dos ${CHARACTER_WINDOW} últimos vídeos ("${byCharacter.title}")`
  const rest = restReason(idea.character, recent)
  if (rest) return rest
  const sameWorkCount = recent.slice(0, WORK_WINDOW).filter(v => sameWork(v.work, idea.work)).length
  if (sameWorkCount >= WORK_LIMIT) return `${idea.work} já tem ${sameWorkCount} dos ${WORK_WINDOW} últimos vídeos`
  return null
}

/**
 * Por que a volta (ADR 0033) não pode entrar, ou null se pode. Fica livre da janela de 3 vídeos e das
 * regras da obra, mas a personagem precisa ter um vídeo acima da mediana, não pode ser a do último vídeo
 * e descansa se já apareceu demais ou se o vídeo mais recente dela (dos medidos) ficou abaixo da mediana.
 */
export function revisitReason(idea: Pick<Idea, 'character'>, recent: RecentVideo[]) {
  const c = idea.character
  if (!c) return 'a volta precisa de uma personagem'
  if (recent[0] && isAbout(recent[0], c)) return `${c} é a do último vídeo ("${recent[0].title}")`
  const rest = restReason(c, recent)
  if (rest) return rest
  const measured = recent.filter(v => v.above !== undefined && isAbout(v, c))
  if (!measured.some(v => v.above)) return `${c} não tem vídeo acima da mediana de visualizações`
  if (!measured[0].above) return `${c} descansa: o vídeo mais recente dela ("${measured[0].title}") ficou abaixo da mediana`
  return null
}

type Measured = Pick<VideoMetrics, 'platform' | 'projectId' | 'privacy' | 'snapshots' | 'current'>

/**
 * Quais projetos ficaram acima da mediana de visualizações (ADR 0033), com a margem de raspão de 5%. A
 * mediana é a dos vídeos públicos da mesma plataforma com pelo menos uma foto fixa: um vídeo de poucas
 * horas ainda está juntando visualizações e marcaria a personagem como "abaixo" antes da hora. Um projeto
 * com dois registros na mesma plataforma (um post apagado e publicado de novo) conta uma vez, com o que
 * tem mais visualizações. Com Instagram e YouTube, basta ir bem num. Os vídeos sem projeto (feitos fora
 * do app) ficam de fora.
 */
export function aboveMedian(videos: Measured[]) {
  const best = new Map<string, Measured>()
  for (const v of videos) {
    if (!v.projectId || v.privacy === 'private' || v.snapshots.length === 0) continue
    const key = `${v.platform}:${v.projectId}`
    if ((best.get(key)?.current.views ?? -1) < v.current.views) best.set(key, v)
  }
  const list = [...best.values()]
  const mid = new Map(
    (['instagram', 'youtube'] as const).map(p => [p, median(list.filter(v => v.platform === p).map(v => v.current.views))]),
  )
  const result = new Map<string, boolean>()
  for (const v of list) {
    const above = v.current.views >= (mid.get(v.platform) ?? Infinity) * (1 - MEDIAN_MARGIN)
    result.set(v.projectId!, result.get(v.projectId!) || above)
  }
  return result
}

/** Os formatos ligados que não estão em nenhum dos 2 últimos vídeos: os únicos que passam no filtro (ADR 0036, 2A). */
export const freeFormats = (recent: RecentVideo[]) =>
  ACTIVE_FORMATS.filter(f => !recent.slice(0, FORMAT_WINDOW).some(v => formatOf(v) === f))

/**
 * O formato não repete o de um dos 2 últimos vídeos (ADR 0036, 2A); a tier list precisa da série e de um
 * personagem que ainda não está no quadro dela (3A).
 */
export function formatReason(idea: Pick<Idea, 'format' | 'series' | 'character'>, recent: RecentVideo[]) {
  const format = formatOf(idea)
  if (!ACTIVE_FORMATS.includes(format)) return `o formato "${FORMAT_NAME[format]}" está desligado por enquanto`
  const same = recent.slice(0, FORMAT_WINDOW).find(v => formatOf(v) === format)
  if (same) return `o formato "${FORMAT_NAME[format]}" foi o de um dos ${FORMAT_WINDOW} últimos vídeos ("${same.title}")`
  if (format !== 'tierlist') return null
  if (!idea.series || !idea.character) return 'a tier list precisa da série e do personagem da vez'
  const ranked = alreadyRanked(seriesOf(recent), idea)
  return ranked ? `${idea.character} já está no quadro de "${idea.series}" (fileira ${ranked.rank})` : null
}

/** As séries de tier list dos vídeos feitos (o mais velho primeiro), com quem já foi ranqueado. */
export const seriesOf = (recent: RecentVideo[]) =>
  tierSeries(recent.map((v, i) => ({ format: v.format, tier: v.tier, createdAt: v.createdAt ?? String(recent.length - i).padStart(6, '0') })))

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
 * 1. tira as bloqueadas pela personagem ou pela obra; a volta (`revisit`) segue as regras dela;
 * 2. fica com uma por obra, no máximo uma aposta e no máximo uma volta (que não conta na obra);
 * 3. a volta, se passou, sempre entra: é a vaga dela;
 * 4. se todas as escolhidas forem "em alta" e sobrar uma atemporal, ela entra no lugar da última;
 * 5. sorteia a ordem (contra o viés de posição).
 */
export function pickCandidates<T extends Pick<Idea, 'theme' | 'work' | 'character' | 'trend' | 'bet' | 'revisit' | 'format' | 'series'>>(
  ideas: T[],
  recent: RecentVideo[],
  count: number,
  random = Math.random,
): { chosen: T[]; rejected: Rejected[] } {
  const rejected: Rejected[] = []
  const allowed: T[] = []
  for (const idea of ideas) {
    const reason =
      formatReason(idea, recent) ??
      (idea.revisit
        ? (revisitReason(idea, recent) ?? (allowed.some(a => a.revisit) ? 'já há uma volta' : null))
        : (blockReason(idea, recent) ??
          (allowed.some(a => !a.revisit && sameWork(a.work, idea.work)) ? `outra ideia já é de ${idea.work}` : null) ??
          (idea.bet && allowed.some(a => a.bet) ? 'já há uma aposta' : null)))
    if (reason) rejected.push({ theme: idea.theme, reason })
    else allowed.push(idea)
  }
  // a volta vai na frente: não sobra nem é trocada pela atemporal (a ordem final é sorteada)
  allowed.sort((a, b) => Number(!!b.revisit) - Number(!!a.revisit))

  const chosen = allowed.slice(0, count)
  const timeless = allowed.slice(count).find(i => i.trend === 'atemporal')
  if (chosen.length === count && timeless && chosen.every(i => i.trend !== 'atemporal')) chosen[count - 1] = timeless
  for (const idea of allowed) {
    if (!chosen.includes(idea)) rejected.push({ theme: idea.theme, reason: 'sobrou: o debate leva só ' + count })
  }
  return { chosen: shuffle(chosen, random), rejected }
}

const aboveText = (v: RecentVideo) => (v.above === undefined ? '' : v.above ? ' · acima da mediana' : ' · abaixo da mediana')

/** A variedade dos últimos vídeos, para as duas IAs do debate pesarem (ADR 0028, D; e 0033, a mediana). */
export function varietyLines(recent: RecentVideo[], size = REST_WINDOW) {
  const last = recent.slice(0, size)
  if (!last.length) return ''
  const lines = last.map(
    v => `- ${v.title} · ${FORMAT_NAME[formatOf(v)]}${v.work ? ` · ${v.work}` : ''}${v.trend ? ` · ${v.trend === 'alta' ? 'em alta' : 'atemporal'}` : ''}${aboveText(v)}`,
  )
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
