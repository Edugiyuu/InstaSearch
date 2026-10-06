/**
 * Alinhamento do roteiro com a voz (ADR 0018).
 *
 * O Whisper diz *quando* cada palavra foi falada, mas erra a grafia ("Sucuna") e às vezes junta,
 * separa ou pula palavras. A legenda mostra o texto do roteiro; daqui sai o tempo de cada palavra
 * dele. É um alinhamento de sequências, como o de um `diff`: acha o maior conjunto de pares
 * (roteiro, ouvida) parecidos e na mesma ordem. As palavras sem par pegam o tempo pelas vizinhas.
 */
import type { TranscriptWord } from '../api/shorts'

export interface WordTime {
  start: number
  end: number
  /** false = sem par no que o Whisper ouviu; o tempo foi estimado pelas vizinhas. */
  matched: boolean
}

/** Minúsculas, sem acentos e sem pontuação: "Sukuna," = "sukuna". */
export const wordKey = (w: string) =>
  w.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]/gu, '')

/** Distância de edição: quantas letras trocar, pôr ou tirar para ir de a até b. */
function levenshtein(a: string, b: string) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = row
  }
  return prev[b.length]
}

/** 0 a 1: quão parecidas são duas palavras ("sukuna" e "sucuna" ≈ 0,83). */
export function similarity(a: string, b: string) {
  if (!a || !b) return 0
  if (a === b) return 1
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

/** Abaixo disso, duas palavras não são consideradas a mesma. */
const SAME_WORD = 0.6

/**
 * Tempo (em segundos) de cada palavra do roteiro. null quando nada bateu: aí o vídeo
 * continua com o tempo estimado, em vez de inventar uma sincronia.
 */
export function alignWords(script: string[], heard: TranscriptWord[]): WordTime[] | null {
  const a = script.map(wordKey)
  const b = heard.map(h => wordKey(h.text))
  const n = a.length
  const m = b.length
  if (!n || !m) return null

  // score[i][j]: melhor soma de semelhanças casando as i primeiras do roteiro com as j primeiras ouvidas
  const score = Array.from({ length: n + 1 }, () => new Float64Array(m + 1))
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const s = similarity(a[i - 1], b[j - 1])
      const pair = s >= SAME_WORD ? score[i - 1][j - 1] + s : -Infinity
      score[i][j] = Math.max(score[i - 1][j], score[i][j - 1], pair)
    }
  }

  // volta pelo caminho para saber qual ouvida ficou com cada palavra do roteiro
  const pairOf = new Array<number>(n).fill(-1)
  for (let i = n, j = m; i > 0 && j > 0; ) {
    const s = similarity(a[i - 1], b[j - 1])
    if (s >= SAME_WORD && score[i][j] === score[i - 1][j - 1] + s) {
      pairOf[i - 1] = j - 1
      i--
      j--
    } else if (score[i - 1][j] >= score[i][j - 1]) i--
    else j--
  }
  if (pairOf.every(p => p < 0)) return null

  const times: (WordTime | null)[] = pairOf.map(p => (p >= 0 ? { start: heard[p].start, end: heard[p].end, matched: true } : null))

  // trechos sem par: dividem o espaço entre as vizinhas com par, pelo tamanho de cada palavra
  for (let i = 0; i < n; ) {
    if (times[i]) {
      i++
      continue
    }
    let k = i
    while (k < n && !times[k]) k++
    const from = i > 0 ? times[i - 1]!.end : Math.max(0, (times[k]?.start ?? 0) - (k - i) * 0.3)
    const to = k < n ? times[k]!.start : Math.max(from, heard[m - 1].end)
    const weights = script.slice(i, k).map(w => wordKey(w).length + 1)
    const total = weights.reduce((x, y) => x + y, 0)
    let at = from
    for (let w = i; w < k; w++) {
      const span = ((to - from) * weights[w - i]) / total
      times[w] = { start: at, end: at + span, matched: false }
      at += span
    }
    i = k
  }

  // o DTW às vezes devolve um início antes da palavra anterior: garante a ordem
  const out = times as WordTime[]
  for (let i = 1; i < n; i++) if (out[i].start < out[i - 1].start) out[i] = { ...out[i], start: out[i - 1].start }
  return out
}
