/**
 * Brainstorm e banco de ideias (ADR 0021).
 *
 * A IA lê o desempenho dos vídeos, os comentários do público e as ideias já decididas, pesquisa
 * o que está acontecendo agora e sugere um lote. O usuário guarda, descarta (com motivo) ou pede
 * um ajuste ("mais polêmicas"), que troca o lote inteiro. Só sugere: o vídeo nasce no Novo vídeo,
 * depois que o usuário confere (ADR 0011).
 */

import { nanoid } from 'nanoid'
import { AppError } from '../../middleware/errorHandler.js'
import { FileStorage } from '../storage/FileStorage.js'
import { listMetrics } from '../insights/collect.js'
import { askJsonMeta, MAX_SEARCHES } from '../shorts/llm.js'
import { listProjects } from '../shorts/projects.js'
import { listStyles } from '../shorts/styles.js'
import { listTones } from '../shorts/tones.js'
import type { ShortProject } from '../shorts/types.js'
import { buildRefs, cleanIdeas, commentLine, MAX_IDEAS, videoLine, type RawIdea } from './clean.js'
import type { Idea, IdeaStatus } from './types.js'

const storage = new FileStorage<Idea>('ideas')

/** Ideias por lote: o bastante para escolher, pouco para ler numa olhada. */
const BATCH_SIZE = 6
/** Quantas ideias descartadas (as mais recentes) a IA lê para não repetir. */
const MAX_DISCARDED = 30

const RESEARCH = `Antes de sugerir, pesquise na web, com até ${MAX_SEARCHES} buscas curtas e diferentes entre si, o que está acontecendo AGORA nos assuntos do canal: episódios e capítulos recentes ou vazados, anúncios, estreias, polêmicas da semana e o que o público está discutindo. Use a pesquisa para trazer ideias atuais. Não invente acontecimentos que você não confirmou. Não coloque links nem fontes na resposta.`

/** O id vira nome de arquivo: só o formato que o app cria (nada de "../"). */
function checkId(id: string) {
  if (!/^idea_[A-Za-z0-9_-]+$/.test(id)) throw new AppError('Ideia não encontrada', 404, 'NOT_FOUND')
}

export async function listIdeas(): Promise<Idea[]> {
  return (await storage.findAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function updateIdea(id: string, changes: { status?: IdeaStatus; discardReason?: string; projectId?: string }) {
  checkId(id)
  const idea = await storage.findById(id)
  if (!idea) throw new AppError('Ideia não encontrada', 404, 'NOT_FOUND')
  const status = changes.status ?? idea.status
  const updated: Idea = {
    ...idea,
    status,
    // o motivo só vale para a descartada; voltar a guardar limpa o motivo
    discardReason: status === 'descartada' ? (changes.discardReason ?? idea.discardReason)?.trim().slice(0, 200) || undefined : undefined,
    projectId: changes.projectId ?? idea.projectId,
    updatedAt: new Date().toISOString(),
  }
  return storage.save(updated)
}

export async function deleteIdea(id: string) {
  checkId(id)
  await storage.delete(id)
}

function section(title: string, lines: string[], empty?: string) {
  if (!lines.length) return empty ? `## ${title}\n${empty}` : ''
  return `## ${title}\n${lines.join('\n')}`
}

/**
 * Um lote novo de ideias. `seed`: sobre o que o usuário quer falar (opcional).
 * `request`: um ajuste no lote atual ("mais polêmicas", "junta a 2 com a 5"), que é trocado inteiro.
 */
export async function brainstorm(input: { seed?: string; request?: string }) {
  const seed = input.seed?.trim().slice(0, 300) || undefined
  const request = input.request?.trim().slice(0, 300) || undefined

  const [metrics, projects, styles, tones, ideas] = await Promise.all([listMetrics(), listProjects(), listStyles(), listTones(), listIdeas()])
  const refs = buildRefs(metrics.videos, projects)
  const styleName = (id: string) => styles.find(s => s.id === id)?.name ?? id
  const toneName = (p: ShortProject) => tones.find(t => t.id === p.toneId)?.name ?? p.tone
  const measuredCount = metrics.measured.instagram + metrics.measured.youtube

  const current = ideas.filter(i => i.status === 'nova').sort((a, b) => a.position - b.position)
  const kept = ideas.filter(i => i.status === 'guardada' || i.status === 'feita')
  const discarded = ideas.filter(i => i.status === 'descartada').slice(0, MAX_DISCARDED)

  const prompt = `Você ajuda um criador de Shorts narrados (anime, mangá, games, cultura pop) em português do Brasil a decidir os PRÓXIMOS vídeos do canal.

${section(
  'Vídeos publicados (do mais novo para o mais velho)',
  refs.videos.map(v => videoLine(v, { style: styleName, tone: toneName })),
  'Nenhum vídeo medido ainda. Baseie as ideias na pesquisa e no que o criador pediu, e diga isso no "why".',
)}
${refs.videos.length && measuredCount < metrics.fewData ? `Atenção: só ${measuredCount} vídeo(s) já têm foto de 1, 7 ou 28 dias. Trate os padrões como pistas, não como certeza.` : ''}

${section('Comentários do público (os mais curtidos)', refs.comments.map(commentLine))}

${section('Ideias que o criador já guardou ou já fez (não repita)', kept.map(i => `- ${i.theme}`))}

${section('Ideias que ele descartou, com o motivo (evite o mesmo tipo)', discarded.map(i => `- ${i.theme}${i.discardReason ? ` (motivo: ${i.discardReason})` : ''}`))}

## Estilos disponíveis (use o id)
${styles.map(s => `- ${s.id}: ${s.name} (${s.summary})`).join('\n')}

## Tons disponíveis (use o id)
${tones.map(t => `- ${t.id}: ${t.name} (${t.summary})`).join('\n')}

${seed ? `O criador quer falar sobre: "${seed}". Todas as ideias giram em torno disso.` : ''}
${
  request && current.length
    ? `As ideias atuais, numeradas:\n${current.map((i, n) => `${n + 1}. ${i.theme} (gancho: ${i.hook})`).join('\n')}\n\nO criador pediu este ajuste: "${request}". Devolva a lista nova inteira, com até ${BATCH_SIZE} ideias: mantenha, mude, junte ou troque ideias conforme o pedido.`
    : request
      ? `O criador pediu: "${request}".`
      : ''
}

Sugira ${BATCH_SIZE} ideias de vídeo. Regras:
- Cada ideia tem um porquê concreto ligado aos dados: cite em "videos" as etiquetas dos vídeos cujo desempenho a sustenta, em "comments" as dos comentários que a pedem, e em "web" o que a pesquisa encontrou. Só cite o que sustenta a ideia de verdade. Se a ideia vem só da pesquisa, diga isso no "why".
- Misture: ideias que repetem o que foi acima da mediana (mesmo assunto, personagem ou formato), pelo menos uma que atende um pedido dos comentários (se houver) e pelo menos uma atual, do que está acontecendo agora.
- Evite o que ficou abaixo da mediana, a não ser que haja um motivo claro para tentar de outro jeito; nesse caso, diga qual.
- "theme" é escrito como o criador escreveria no campo "Sobre o que é o vídeo?": uma pergunta ou afirmação específica (ex.: "Por que o Luffy nunca mata ninguém em One Piece?"). Nada genérico.
- "hook" é a primeira frase falada do vídeo, com até 15 palavras.
- "duration": 15, 20, 30 ou 40 (segundos).
- "why": 2 ou 3 frases, citando os números quando houver ("o vídeo do Gojo foi 2,4× a mediana"). No "why", chame os vídeos pelo título e os comentários pelo texto: o criador não vê as etiquetas [V1] e [C1], que servem só para "videos" e "comments".

Responda só com JSON:
{ "ideas": [ { "theme": "...", "hook": "...", "styleId": "...", "toneId": "...", "duration": 30, "why": "...", "videos": ["V1"], "comments": ["C2"], "web": "o que a pesquisa encontrou, ou vazio" } ] }`

  const { data, ai } = await askJsonMeta<{ ideas?: RawIdea[] }>(prompt, { research: true, researchNote: RESEARCH })
  const cleaned = cleanIdeas(Array.isArray(data.ideas) ? data.ideas : [], refs, {
    styleIds: styles.map(s => s.id),
    toneIds: tones.map(t => t.id),
    defaultStyle: styles.some(s => s.id === 'comentario-anime') ? 'comentario-anime' : styles[0]?.id,
    defaultTone: tones.some(t => t.id === 'polemico') ? 'polemico' : tones[0]?.id,
  }).slice(0, MAX_IDEAS)
  if (cleaned.length === 0) throw new AppError('A IA não devolveu nenhuma ideia. Tente de novo.', 502, 'AI_EMPTY')

  // o lote novo substitui as ideias "novas" que o usuário não guardou nem descartou
  await Promise.all(current.map(i => storage.delete(i.id)))
  const batchId = nanoid(8)
  const now = new Date().toISOString()
  for (const [i, idea] of cleaned.entries()) {
    await storage.save({ ...idea, id: `idea_${nanoid(10)}`, status: 'nova', batchId, position: i + 1, seed, request, ai, createdAt: now, updatedAt: now })
  }
  return listIdeas()
}
