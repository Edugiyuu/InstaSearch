/**
 * Efeitos que o usuário escolhe na cena (ADR 0037): movimento, transição, foco do zoom e destaque.
 *
 * A escolha fica em `beat.chosen`, por cima do que a IA fez (que continua guardado para o "Automático").
 * Funções puras, sem IA nem disco, para dar para testar: validar e aplicar uma escolha, e proteger as
 * escolhas do usuário das mudanças do chat que não falam delas.
 */
import { normalize } from './text.js'
import { CHOSEN_EFFECTS, MOTIONS, TRANSITIONS, type Beat, type ChosenEffects, type ChosenField } from './types.js'

/** Em quais cenas a escolha vale: só esta, todas, ou as que mostram o mesmo personagem. */
export type ChoiceScope = 'cena' | 'todas' | 'personagem'
export const CHOICE_SCOPES: ChoiceScope[] = ['cena', 'todas', 'personagem']

/** O valor serve para o campo? null (= automático) sempre serve. */
export function validChoice(field: ChosenField, value: unknown): boolean {
  if (value === null) return true
  switch (field) {
    case 'motion':
      return MOTIONS.includes(value as never)
    case 'transition':
      return TRANSITIONS.includes(value as never)
    case 'effect':
      return CHOSEN_EFFECTS.includes(value as never)
    case 'focus':
      // o nome de uma área da imagem ("rosto"), ou '' para a imagem inteira
      return typeof value === 'string' && value.length <= 40
  }
}

/** Os efeitos que valem no vídeo: os escolhidos pelo usuário, ou os da IA. */
export function effectiveBeat(beat: Beat): Beat {
  const c = beat.chosen
  if (!c) return beat
  return {
    ...beat,
    motion: c.motion ?? beat.motion,
    transition: c.transition ?? beat.transition,
    effect: c.effect ?? beat.effect,
    focus: c.focus !== undefined ? c.focus || undefined : beat.focus,
  }
}

/** Uma escolha nova ou o automático (null) num campo; tira o `chosen` vazio. */
function withChoice(beat: Beat, field: ChosenField, value: ChosenEffects[ChosenField] | null): Beat {
  const chosen: ChosenEffects = { ...beat.chosen }
  if (value === null) delete chosen[field]
  else (chosen as Record<ChosenField, unknown>)[field] = value
  const { chosen: _old, ...rest } = beat
  return Object.keys(chosen).length ? { ...rest, chosen } : rest
}

/**
 * Aplica a escolha na cena `beatId` e, conforme o `scope`, nas outras. A transição não vale na
 * primeira cena (não há corte antes dela).
 */
export function applyChoice(beats: Beat[], beatId: string, field: ChosenField, value: ChosenEffects[ChosenField] | null, scope: ChoiceScope = 'cena'): Beat[] {
  const target = beats.find(b => b.id === beatId)
  if (!target) return beats
  const names = new Set(target.characters.map(normalize))
  const inScope = (b: Beat) =>
    scope === 'todas' || b.id === beatId || (scope === 'personagem' && names.size > 0 && b.characters.some(c => names.has(normalize(c))))
  return beats.map((b, i) => (inScope(b) && !(field === 'transition' && i === 0) ? withChoice(b, field, value) : b))
}

/** Tira todas as escolhas da cena: volta ao que a IA fez. */
export function clearChoices(beats: Beat[], beatId: string): Beat[] {
  return beats.map(b => {
    if (b.id !== beatId || !b.chosen) return b
    const { chosen: _old, ...rest } = b
    return rest
  })
}

/** Palavras que dizem de qual efeito o pedido fala (sem acento, minúsculas). */
const MENTIONS: Record<ChosenField, RegExp> = {
  motion: /\b(moviment\w*|zoom|trem\w*|tremid\w*|chacoalh\w*|balanc\w*|parad[ao]s?|estatic\w*|deslis\w*|desliz\w*|pan|aproxim\w*|afast\w*|mexe\w*)\b/,
  transition: /\b(transic\w*|flash\w*|piscad\w*|corte\w*|branco|preto|entrada)\b/,
  focus: /\b(foco|focar|focad\w*|zoom|rosto|cara|mao|maos|olhos?|corpo|area)\b/,
  effect: /\b(seta\w*|x|xis|circul\w*|destaque\w*|marca\w*|aponta\w*)\b/,
}

/** De quais efeitos o pedido do chat fala ("tira o tremor da cena 3" → movimento). */
export function mentionedEffects(request: string): Set<ChosenField> {
  const text = normalize(request)
  return new Set((Object.keys(MENTIONS) as ChosenField[]).filter(f => MENTIONS[f].test(text)))
}

/** O valor de um campo como o vídeo mostra (o escolhido ou o da IA). */
const shown = (b: Beat, field: ChosenField) => (effectiveBeat(b)[field] ?? '') as string

/**
 * Protege as escolhas do usuário das mudanças do chat (ADR 0037, 3A). Para cada cena que já existia e
 * tem escolha, num campo escolhido:
 * - se o pedido cita essa cena (`cited`) e fala desse efeito (`mentioned`), a mudança da IA vale e
 *   continua sendo do usuário (a escolha passa a ser o valor novo);
 * - senão, a escolha fica como estava, e o valor da IA por baixo também.
 * Devolve as cenas e os números (na tela) das cenas em que algo foi mantido.
 */
export function protectChosen(before: Beat[], after: Beat[], cited: Set<string>, mentioned: Set<ChosenField>): { beats: Beat[]; kept: number[] } {
  const old = new Map(before.map((b, i) => [b.id, { beat: b, n: i + 1 }]))
  const kept = new Set<number>()
  const beats = after.map(b => {
    const prev = old.get(b.id)
    if (!prev?.beat.chosen) return b
    let next: Beat = { ...b, chosen: { ...prev.beat.chosen } }
    for (const field of Object.keys(prev.beat.chosen) as ChosenField[]) {
      // o chat vê (e devolve) o valor escolhido; o da IA, por baixo, volta como estava, para o "Automático"
      next = { ...next, [field]: prev.beat[field] }
      if (shown(b, field) === shown(prev.beat, field)) continue
      // o pedido é sobre isso: o valor novo vira a escolha; senão, a escolha fica
      if (cited.has(b.id) && mentioned.has(field)) next = withChoice(next, field, field === 'focus' ? b.focus ?? '' : (b[field] as never))
      else kept.add(prev.n)
    }
    return next
  })
  return { beats, kept: [...kept].sort((a, b) => a - b) }
}
