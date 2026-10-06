/**
 * Edições do chat presas às cenas que o usuário citou (ADR 0017).
 *
 * As cenas têm o número que aparece na tela (a primeira é 1). Funções puras, sem IA nem disco,
 * para dar para testar: achar as cenas citadas no pedido, desfazer o que a IA mudou fora delas
 * e descrever o que de fato mudou.
 */
import { normalize } from './text.js'
import type { Beat } from './types.js'

const ORDINALS: Record<string, number> = {
  primeira: 1, segunda: 2, terceira: 3, quarta: 4, quinta: 5, sexta: 6, setima: 7, oitava: 8, nona: 9, decima: 10,
}

// sem "um/uma": "coloca na cena uma seta" não é a cena 1
const CARDINALS: Record<string, number> = {
  dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10,
  onze: 11, doze: 12, treze: 13, quatorze: 14, catorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18,
  dezenove: 19, vinte: 20,
}

const NUMBER = `\\d+|${Object.keys(CARDINALS).join('|')}`
const toNumber = (word: string) => (/^\d+$/.test(word) ? Number(word) : CARDINALS[word])

/**
 * Números das cenas citadas no pedido, em ordem: "cena 6", "cenas 3 e 4", "cenas 3 a 5",
 * "6ª cena", "sexta cena", "cena seis", "última cena" e "esta cena" (a aberta na prévia).
 * Só valem números de 1 até `count`.
 */
export function citedScenes(request: string, count: number, openScene?: number): number[] {
  const text = normalize(request)
  const found = new Set<number>()

  // "cena 6", "cena seis", "cenas 3, 4 e 5", "cenas 3 a 5", "cenas 3-5". Depois do primeiro número,
  // só algarismos: "na cena 6 e duas setas" não cita a cena 2
  const list = new RegExp(`\\bcenas?\\s+((?:${NUMBER})(?:\\s*(?:,|e|a|ate|-)\\s*\\d+)*)\\b`, 'g')
  for (const [, numbers] of text.matchAll(list)) {
    const parts = numbers.split(/\s*(,|\be\b|\ba\b|\bate\b|-)\s*/).filter(Boolean)
    for (let i = 0; i < parts.length; i += 2) {
      const n = toNumber(parts[i])
      const range = parts[i + 1] === 'a' || parts[i + 1] === 'ate' || parts[i + 1] === '-'
      const end = range ? toNumber(parts[i + 2]) : undefined
      if (end !== undefined && end > n) {
        for (let k = n; k <= end; k++) found.add(k)
        i += 2
      } else if (n) found.add(n)
    }
  }
  // "6ª cena", "6a cena", "6o cena"
  for (const [, n] of text.matchAll(/\b(\d+)\s*(?:ª|º|a|o)\s+cena\b/g)) found.add(Number(n))
  // "sexta cena"
  for (const [, word] of text.matchAll(new RegExp(`\\b(${Object.keys(ORDINALS).join('|')})\\s+cena\\b`, 'g'))) found.add(ORDINALS[word])
  if (/\bultima\s+cena\b/.test(text)) found.add(count)
  if (/\bpenultima\s+cena\b/.test(text)) found.add(count - 1)
  // "esta cena", "nessa cena", "desta cena", "cena atual"
  if (openScene && /\b[nd]?(?:esta|essa)\s+cena\b|\bcena\s+(?:atual|aberta)\b/.test(text)) found.add(openScene)

  return [...found].filter(n => n >= 1 && n <= count).sort((a, b) => a - b)
}

/** O que importa comparar numa batida (o resto é derivado ou interno). */
const visible = (b: Beat) =>
  JSON.stringify([b.say, b.text, b.query, b.characters, b.scene, b.effect, b.emoji, b.sticker, b.sfx, b.sfxId, b.motion, b.focus, b.imageId])

export const sameBeat = (a: Beat, b: Beat) => visible(a) === visible(b)

/**
 * Aceita só as mudanças da IA nas cenas citadas (`cited` = ids); o resto volta como estava.
 * - batida que já existia e não foi citada: volta igual (e volta para a lista, se a IA tirou);
 * - batida citada: fica como a IA deixou (ou some, se a IA tirou);
 * - batida nova: só entra se encosta numa cena citada (logo antes, logo depois ou no lugar dela).
 * Devolve a lista final e se algo da IA foi desfeito.
 */
export function keepOnlyCited(before: Beat[], after: Beat[], cited: Set<string>): { beats: Beat[]; reverted: boolean } {
  const original = new Map(before.map((b, i) => [b.id, { beat: b, index: i }]))
  const isNew = (b: Beat) => !original.has(b.id)
  let reverted = false

  /** Uma batida nova encosta numa citada? Olha as batidas antigas entre a vizinha de antes e a de depois. */
  const touchesCited = (i: number) => {
    let prev = i - 1
    while (prev >= 0 && isNew(after[prev])) prev--
    let next = i + 1
    while (next < after.length && isNew(after[next])) next++
    const from = prev >= 0 ? original.get(after[prev].id)!.index : 0
    const to = next < after.length ? original.get(after[next].id)!.index : before.length - 1
    return before.slice(from, to + 1).some(b => cited.has(b.id))
  }

  const out: Beat[] = []
  after.forEach((b, i) => {
    if (isNew(b)) {
      if (touchesCited(i)) out.push(b)
      else reverted = true
      return
    }
    if (cited.has(b.id)) {
      out.push(b)
      return
    }
    const old = original.get(b.id)!.beat
    if (!sameBeat(old, b)) reverted = true
    out.push(old)
  })

  // não citadas que a IA tirou: voltam logo depois da batida que vinha antes delas
  before.forEach((b, i) => {
    if (cited.has(b.id) || out.some(o => o.id === b.id)) return
    reverted = true
    let at = 0
    for (let j = i - 1; j >= 0; j--) {
      const k = out.findIndex(o => o.id === before[j].id)
      if (k >= 0) {
        at = k + 1
        break
      }
    }
    out.splice(at, 0, b)
  })

  return { beats: out, reverted }
}

export interface BeatChanges {
  /** Números (de antes) das cenas que mudaram. */
  changed: number[]
  /** Números (de antes) das cenas que saíram. */
  removed: number[]
  /** Números (de depois) das cenas novas. */
  added: number[]
}

export function diffBeats(before: Beat[], after: Beat[]): BeatChanges {
  const now = new Map(after.map(b => [b.id, b]))
  const old = new Set(before.map(b => b.id))
  const changed: number[] = []
  const removed: number[] = []
  before.forEach((b, i) => {
    const a = now.get(b.id)
    if (!a) removed.push(i + 1)
    else if (!sameBeat(b, a)) changed.push(i + 1)
  })
  const added = after.flatMap((b, i) => (old.has(b.id) ? [] : [i + 1]))
  return { changed, removed, added }
}

export const hasChanges = (c: BeatChanges) => c.changed.length + c.removed.length + c.added.length > 0

/** "a cena 6", "as cenas 3 e 4", "5 cenas" (muitas). */
export function scenesText(numbers: number[]): string {
  if (numbers.length === 1) return `a cena ${numbers[0]}`
  if (numbers.length > 4) return `${numbers.length} cenas`
  return `as cenas ${numbers.slice(0, -1).join(', ')} e ${numbers[numbers.length - 1]}`
}

/** "Mudei a cena 6, tirei a cena 7 e criei a cena 8." — o que de fato mudou, sem depender do texto da IA. */
export function describeChanges(c: BeatChanges): string {
  const parts = [
    c.changed.length ? `mudei ${scenesText(c.changed)}` : '',
    c.removed.length ? `tirei ${scenesText(c.removed)}` : '',
    c.added.length ? `criei ${scenesText(c.added)}` : '',
  ].filter(Boolean)
  if (!parts.length) return ''
  const text = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} e ${parts[parts.length - 1]}`
  return `${text[0].toUpperCase()}${text.slice(1)}.`
}
