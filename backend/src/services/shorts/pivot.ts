/**
 * A virada (ADR 0039): o roteiro escreve uma das frases do usuário no fim do gancho, e a montagem põe
 * nessa cena um clipe do meio (Biblioteca → Bordões), com a voz por cima e o som do clipe baixinho.
 * As frases e a ordem do rodízio ficam em data/bordoes_virada/config.json.
 */

import { FileStorage } from '../storage/FileStorage.js'
import { PIVOT_ORDERS, type Beat, type Catchphrase, type CatchphraseRole, type PivotConfig, type ShortProject } from './types.js'

const storage = new FileStorage<PivotConfig>('bordoes_virada')

const DEFAULT_CONFIG: PivotConfig = { id: 'config', enabled: true, phrases: [], order: 'descanso', rest: 2 }
const MAX_PHRASES = 20
const MAX_PHRASE_LENGTH = 80

/** Volume do som do clipe do meio por baixo da voz, quando o usuário não escolheu. */
export const DEFAULT_PIVOT_VOLUME = 0.2

/** Clipe até este tamanho entra inteiro; maior, entra só o trecho (o recorte). */
export const WHOLE_CLIP_SECONDS = 3

/** Duração do trecho sugerido no recorte. */
export const DEFAULT_TRIM_SECONDS = 2

export async function getPivotConfig(): Promise<PivotConfig> {
  return { ...DEFAULT_CONFIG, ...(await storage.findById('config')) }
}

/** Muda a configuração; o que chegar inválido é ignorado. Frases repetidas (sem contar acento e pontuação) saem. */
export async function updatePivotConfig(changes: Partial<PivotConfig>) {
  const config = await getPivotConfig()
  if (typeof changes.enabled === 'boolean') config.enabled = changes.enabled
  if (Array.isArray(changes.phrases)) {
    const seen = new Set<string>()
    config.phrases = changes.phrases
      .map(p => String(p).trim().slice(0, MAX_PHRASE_LENGTH))
      .filter(p => p && !seen.has(normalizePhrase(p)) && seen.add(normalizePhrase(p)))
      .slice(0, MAX_PHRASES)
  }
  if (PIVOT_ORDERS.includes(changes.order as PivotConfig['order'])) config.order = changes.order!
  if (typeof changes.rest === 'number' && Number.isFinite(changes.rest)) config.rest = Math.min(10, Math.max(1, Math.round(changes.rest)))
  return storage.save(config)
}

/** Para comparar frases: sem caixa, acento e pontuação. */
export const normalizePhrase = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/**
 * Onde o bordão entra. Bordões de antes do ADR 0039 não têm o campo: o padrão de abertura abre, o de
 * final e o "se inscreve" fecham, e o resto (clipe, montado) abre, como era o uso deles.
 */
export function catchphraseRole(c: Pick<Catchphrase, 'role' | 'defaultIntro' | 'defaultOutro' | 'kind'>): CatchphraseRole {
  if (c.role) return c.role
  if (c.defaultIntro) return 'abertura'
  return c.defaultOutro || c.kind === 'inscreva' ? 'final' : 'abertura'
}

/** O que a virada usou em cada vídeo, do mais novo para o mais velho (só os vídeos que tiveram virada). */
export function pivotHistory(projects: Pick<ShortProject, 'id' | 'beats' | 'createdAt'>[], exceptId?: string) {
  return [...projects]
    .filter(p => p.id !== exceptId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => p.beats.find(b => b.pivot)?.pivot)
    .filter(p => !!p)
    .map(p => ({ phrase: p!.phrase, clipId: typeof p!.clipId === 'string' ? p!.clipId : undefined }))
}
export type PivotHistory = ReturnType<typeof pivotHistory>

/** Há quantos vídeos com virada o item saiu (0 = no último); nunca saiu = Infinity. */
function lastUse<T>(history: T[], same: (h: T) => boolean) {
  const i = history.findIndex(same)
  return i < 0 ? Infinity : i
}

/** A frase da vez: a que está há mais tempo sem sair (a nunca usada primeiro; empate, a ordem da lista). */
export function pickPhrase(phrases: string[], history: PivotHistory) {
  let best: string | undefined
  let bestRest = -1
  for (const phrase of phrases) {
    const rest = lastUse(history, h => normalizePhrase(h.phrase) === normalizePhrase(phrase))
    if (rest > bestRest) {
      best = phrase
      bestRest = rest
    }
  }
  return best
}

/** Movimento da cena que vem logo depois da virada, quando a IA a deixou parada (ADR 0039, adendo). */
const AFTER_PIVOT_MOTION = 'zoom-in' as const

/**
 * Marca a cena da virada: a primeira batida que fala a frase inteira. A frase precisa estar como foi
 * escrita (sem contar caixa, acento e pontuação); se a IA mudou ou não escreveu, nenhuma cena é marcada
 * e o vídeo sai sem virada. Batidas que já eram a virada e não falam mais a frase deixam de ser.
 *
 * A cena seguinte não fica parada: depois da dança, uma imagem imóvel parece o vídeo travado.
 * O que o usuário escolheu na cena (`chosen`) continua valendo.
 */
export function markPivot(beats: Beat[], phrase?: string): Beat[] {
  const wanted = phrase ? normalizePhrase(phrase) : ''
  const at = wanted ? beats.findIndex(b => normalizePhrase(b.say).includes(wanted)) : -1
  return beats.map((b, i) => {
    // a cena nova da virada fica parada: o clipe já se mexe (o usuário pode escolher outro movimento)
    if (i === at) return b.pivot && normalizePhrase(b.pivot.phrase) === wanted ? b : { ...b, pivot: { phrase: phrase! }, motion: 'still' as const }
    if (i === at + 1 && at >= 0 && b.motion === 'still') return { ...b, motion: AFTER_PIVOT_MOTION }
    return b.pivot ? { ...b, pivot: undefined } : b
  })
}

/** Os clipes que podem entrar na virada, na ordem em que foram enviados. */
export function pivotPool(clips: Catchphrase[]) {
  return clips
    .filter(c => c.kind === 'clipe' && c.file && catchphraseRole(c) === 'meio' && c.inRotation !== false)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

/**
 * O clipe da virada, pela ordem que o usuário escolheu:
 * - descanso: um dos que não saíram nos últimos `rest` vídeos, sorteado (se todos saíram há pouco,
 *   o que descansou mais);
 * - aleatório: qualquer um menos o do último vídeo;
 * - sequência: o seguinte ao do último vídeo, na ordem de envio.
 */
export function pickPivotClip(clips: Catchphrase[], history: PivotHistory, config: Pick<PivotConfig, 'order' | 'rest'>, random = Math.random) {
  const pool = pivotPool(clips)
  if (pool.length === 0) return undefined
  const last = history.find(h => h.clipId)?.clipId
  const used = history.filter(h => h.clipId)
  if (config.order === 'sequencia') {
    const i = pool.findIndex(c => c.id === last)
    return pool[(i + 1) % pool.length].id
  }
  if (config.order === 'aleatorio') {
    const options = pool.length > 1 ? pool.filter(c => c.id !== last) : pool
    return options[Math.floor(random() * options.length)].id
  }
  const rest = (clip: Catchphrase) => lastUse(used, h => h.clipId === clip.id)
  const rested = pool.filter(c => rest(c) >= config.rest)
  if (rested.length) return rested[Math.floor(random() * rested.length)].id
  return pool.reduce((a, b) => (rest(b) > rest(a) ? b : a)).id
}
