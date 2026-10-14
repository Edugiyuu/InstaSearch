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

export async function getIdea(id: string) {
  checkId(id)
  const idea = await storage.findById(id)
  if (!idea) throw new AppError('Ideia não encontrada', 404, 'NOT_FOUND')
  return idea
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

/**
 * A ideia cujo projeto foi apagado sai de "Viraram vídeo" e vira descartada: some da tela, mas a IA
 * continua lendo o tema (com o motivo) e não sugere o mesmo de novo. Confere todas: roda depois de
 * apagar um projeto e ao subir o servidor (pega as que ficaram de antes).
 */
export async function discardIdeasWithoutProject() {
  const alive = new Set((await listProjects()).map(p => p.id))
  const orphans = (await storage.findAll()).filter(i => i.status === 'feita' && i.projectId && !alive.has(i.projectId))
  const now = new Date().toISOString()
  for (const idea of orphans) {
    await storage.save({ ...idea, status: 'descartada', discardReason: 'o vídeo foi apagado', projectId: undefined, updatedAt: now })
  }
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
  await createIdeas(input)
  return listIdeas()
}

/** A pesquisa do debate (ADR 0028): o que acontece nas obras do canal e o que está viralizando no nicho. */
const RESEARCH_DEBATE = `${RESEARCH} Pesquise também o que está viralizando AGORA no nicho do canal (o mesmo tipo de conteúdo dos vídeos dele, por exemplo anime, desenho, games e cultura geek), mesmo fora das obras que o canal já tratou: trends de fãs, memes, versões alternativas de personagens (como a "Malfoid", a versão mulher do Draco Malfoy), polêmicas e estreias de que o público está falando. E o que os fãs estão discutindo sobre personagens mulheres: disputas de quem é a mais bonita ou a melhor, enquetes de popularidade, designs novos, cosplays e fanarts que viralizaram.`

/**
 * As candidatas do debate das IAs (ADR 0027 e 0028): um brainstorm próprio, sem tema, que não grava nada
 * nem mexe no lote de ideias novas da tela (só a vencedora do debate entra no banco). Pede mais ideias do
 * que o debate usa, cada uma com a obra, a personagem e se está em alta: o código filtra depois (variety.ts).
 * - `channel`: os títulos dos vídeos que o criador fez à mão: dizem as obras e o nicho do canal;
 * - `done`: todos os títulos já feitos (à mão e sozinho), para não repetir o assunto;
 * - `recent`: os mais recentes, com obra e "em alta", para variar;
 * - `avoid`: as ideias que o filtro tirou numa tentativa anterior ou que caíram numa rodada anterior do debate, com o motivo.
 */
export async function brainstormCandidates(
  input: { channel: string[]; done: string[]; recent: string; avoid?: { theme: string; reason: string }[] },
  count: number,
) {
  const list = (titles: string[]) => titles.map(t => `- ${t}`).join('\n')
  const note = [
    'Estas ideias vão ser debatidas por duas IAs, e a escolhida vira vídeo sozinha, sem o criador escolher o tema: traga ideias fortes e diferentes entre si.',
    input.channel.length ? `Os vídeos que o criador fez (dizem as obras e o nicho do canal; o público veio por eles):\n${list(input.channel)}` : '',
    input.done.length ? `Assuntos que já viraram vídeo (não repita o assunto, mesmo com outro título):\n${list(input.done)}` : '',
    input.recent ? `Os últimos vídeos, do mais novo para o mais velho:\n${input.recent}` : '',
    input.avoid?.length
      ? `Estas ideias já foram recusadas, pela regra de variedade, pelas IAs do debate ou pelo criador (não traga nenhuma delas nem parecidas):\n${input.avoid.map(a => `- ${a.theme} (${a.reason})`).join('\n')}`
      : '',
    `Regras de variedade (o app confere e descarta o que não cumprir):
- Cada ideia é de uma obra diferente.
- Não use a personagem principal de nenhum dos 3 últimos vídeos, nem uma obra que já tem 2 dos 4 últimos.
- A maioria das ideias é do que está em alta agora, mas pelo menos 2 são atemporais: uma análise, comparação ou curiosidade que não depende da notícia da semana.
- "Em alta" é o TEMA, não a obra: só marque "alta" se o tema fala de algo que aconteceu nas últimas semanas (um episódio, capítulo, anúncio, design ou trend novo) e a pesquisa confirmou. Teste: se o tema funcionaria igual há um ano, ele é "atemporal", mesmo que a obra esteja em evidência (o passado do Gaara é atemporal, mesmo com Naruto voltando).
- Fora isso, fique nas obras que o canal já fala. A exceção é UMA ideia de aposta ("bet": true): algo que está bombando agora no mesmo nicho do canal, mesmo numa obra que ele nunca tratou (uma trend de fãs, um meme, uma versão alternativa de personagem). Só se a pesquisa confirmou que está bombando, e nunca de outro nicho (nada de culinária num canal de anime).`,
    `Regras de apelo (os temas de antes saíam com cara de notícia, e o criador quer temas com "tchan"):
- Cada tema é uma OPINIÃO FORTE que toma um lado e divide o público, do tipo que dá vontade de comentar para discordar: "A Hinata é a personagem mais desperdiçada de Naruto", "A Nami pós-time-skip é o melhor design de One Piece, e não é por acaso". Nada com cara de notícia ou de resenha: "o episódio X dividiu os fãs", "a recepção de Y no Japão", "a adaptação de Z está boa?". Uma novidade pode ser o gatilho, mas o tema é a opinião sobre ela, não a notícia.
- Pelo menos metade das ideias tem fanservice, de preferência com uma personagem mulher em destaque: beleza, design, visual novo, cenas marcantes dela, disputa de quem é a mais bonita ou a melhor, ship, versão alternativa. Sempre junto de uma opinião forte, nunca só "olha como ela é bonita". Só personagens adultas; nada sexual explícito.
- O "hook" provoca: abre com a opinião ou com uma pergunta que a pessoa quer responder, nunca com o resumo de um fato.`,
  ]
    .filter(Boolean)
    .join('\n\n')
  return createIdeas({ note }, { count, keepBatch: true, save: false, variety: true })
}

/**
 * Pede as ideias à IA e grava. `note`: instrução do próprio app (não do criador).
 * Por padrão, o lote novo substitui as ideias "novas"; `keepBatch` deixa o lote da tela como está.
 */
async function createIdeas(
  input: { seed?: string; request?: string; note?: string },
  opts: { count?: number; keepBatch?: boolean; status?: IdeaStatus; save?: boolean; variety?: boolean } = {},
): Promise<Idea[]> {
  const seed = input.seed?.trim().slice(0, 300) || undefined
  const request = input.request?.trim().slice(0, 300) || undefined
  const count = opts.count ?? BATCH_SIZE

  const [metrics, projects, styles, tones, ideas] = await Promise.all([listMetrics(), listProjects(), listStyles(), listTones(), listIdeas()])
  const refs = buildRefs(metrics.videos, projects)
  const styleName = (id: string) => styles.find(s => s.id === id)?.name ?? id
  const toneName = (p: ShortProject) => tones.find(t => t.id === p.toneId)?.name ?? p.tone
  const measuredCount = metrics.measured.instagram + metrics.measured.youtube

  // ajustar o lote só faz sentido quando ele vai ser trocado
  const current = opts.keepBatch ? [] : ideas.filter(i => i.status === 'nova').sort((a, b) => a.position - b.position)
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

${input.note ?? ''}

Sugira ${count === 1 ? 'a melhor ideia de vídeo (uma só)' : `${count} ideias de vídeo`}. Regras:
- Cada ideia tem um porquê concreto ligado aos dados: cite em "videos" as etiquetas dos vídeos cujo desempenho a sustenta, em "comments" as dos comentários que a pedem, e em "web" o que a pesquisa encontrou. Só cite o que sustenta a ideia de verdade. Se a ideia vem só da pesquisa, diga isso no "why".
${
  opts.variety
    ? '- Aprenda com o que foi acima da mediana, mas repita o FORMATO que deu certo (o tipo de pergunta, o tom, o recorte) com outra obra ou personagem, nunca o mesmo assunto. Pelo menos uma ideia atende um pedido dos comentários, se houver.'
    : count === 1
    ? '- Prefira o que os números, os comentários ou a pesquisa sustentam, respeitando o que foi pedido acima sobre o assunto.'
    : '- Misture: ideias que repetem o que foi acima da mediana (mesmo assunto, personagem ou formato), pelo menos uma que atende um pedido dos comentários (se houver) e pelo menos uma atual, do que está acontecendo agora.'
}
- Evite o que ficou abaixo da mediana, a não ser que haja um motivo claro para tentar de outro jeito; nesse caso, diga qual.
- "theme" é escrito como o criador escreveria no campo "Sobre o que é o vídeo?": uma pergunta ou afirmação específica (ex.: "Por que o Luffy nunca mata ninguém em One Piece?"). Nada genérico.
- "hook" é a primeira frase falada do vídeo, com até 15 palavras.
- "duration": 15, 20, 30 ou 40 (segundos).
- "work": o nome oficial completo da obra (ex.: "One-Punch Man", nunca "OPM"); "character": a personagem principal do tema (nome e sobrenome, se tiver), ou vazio se não houver uma; "trend": "alta" se o tema depende do que está acontecendo agora, ou "atemporal".${opts.variety ? '\n- "bet": true só na ideia de aposta; nas outras, false.' : ''}
- "why": 2 ou 3 frases, citando os números quando houver ("o vídeo do Gojo foi 2,4× a mediana"). No "why", chame os vídeos pelo título e os comentários pelo texto: o criador não vê as etiquetas [V1] e [C1], que servem só para "videos" e "comments".

Responda só com JSON:
{ "ideas": [ { "theme": "...", "hook": "...", "styleId": "...", "toneId": "...", "duration": 30, "why": "...", "videos": ["V1"], "comments": ["C2"], "web": "o que a pesquisa encontrou, ou vazio", "work": "...", "character": "...", "trend": "alta"${opts.variety ? ', "bet": false' : ''} } ] }`

  const { data, ai } = await askJsonMeta<{ ideas?: RawIdea[] }>(prompt, { research: true, researchNote: opts.variety ? RESEARCH_DEBATE : RESEARCH })
  const cleaned = cleanIdeas(Array.isArray(data.ideas) ? data.ideas : [], refs, {
    styleIds: styles.map(s => s.id),
    toneIds: tones.map(t => t.id),
    defaultStyle: styles.some(s => s.id === 'comentario-anime') ? 'comentario-anime' : styles[0]?.id,
    defaultTone: tones.some(t => t.id === 'polemico') ? 'polemico' : tones[0]?.id,
  }).slice(0, opts.count ?? MAX_IDEAS)
  if (cleaned.length === 0) throw new AppError('A IA não devolveu nenhuma ideia. Tente de novo.', 502, 'AI_EMPTY')

  // o lote novo substitui as ideias "novas" que o usuário não guardou nem descartou (com keepBatch, nenhuma)
  await Promise.all(current.map(i => storage.delete(i.id)))
  const batchId = nanoid(8)
  const now = new Date().toISOString()
  const made: Idea[] = cleaned.map((idea, i) => ({
    ...idea,
    id: `idea_${nanoid(10)}`,
    status: opts.status ?? 'nova',
    batchId,
    position: i + 1,
    seed,
    request,
    ai,
    createdAt: now,
    updatedAt: now,
  }))
  // save: false → só para o debate (ADR 0027); só a vencedora entra no banco (storeIdea)
  if (opts.save === false) return made
  return Promise.all(made.map(idea => storage.save(idea)))
}

/** Grava uma ideia que veio de fora do brainstorm comum (a vencedora do debate). */
export const storeIdea = (idea: Idea) => storage.save({ ...idea, updatedAt: new Date().toISOString() })
