// Debate das IAs (ADR 0027): duas Sonnet 5.5 com olhares diferentes discutem os temas de um brainstorm
// próprio, criticando uma à outra, até as duas votarem no mesmo tema. O código confere o acordo pelos
// votos; a IA não decide sozinha que "chegaram a um acordo". Cada fala é gravada na hora, e a tela
// acompanha como um chat.

import { nanoid } from 'nanoid'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { FileStorage } from '../storage/FileStorage.js'
import { listMetrics } from '../insights/collect.js'
import { askJsonMeta } from '../shorts/llm.js'
import { listProjects } from '../shorts/projects.js'
import { listStyles } from '../shorts/styles.js'
import { listTones } from '../shorts/tones.js'
import type { ShortProject } from '../shorts/types.js'
import { buildRefs, commentLine, videoLine } from './clean.js'
import { brainstormCandidates, listIdeas, storeIdea } from './ideas.js'
import type { Debate, DebateMessage, Idea, Speaker } from './types.js'
import { pickCandidates, varietyLines, type RecentVideo } from './variety.js'

/** No máximo 6 falas, 3 de cada (ADR 0027, 2A). */
export const MAX_TURNS = 6
/** 4 temas: o debate cabe em poucas falas (ADR 0027, 3A). */
export const CANDIDATES = 4
/** O brainstorm traz mais do que o debate usa, porque o filtro de variedade tira algumas (ADR 0028). */
const BRAINSTORM = 6

const storage = new FileStorage<Debate>('debates')

const ROLES: Record<Speaker, { name: string; focus: string }> = {
  estrategista: {
    name: 'Estrategista',
    focus:
      'os números e o público do canal: o que ficou acima ou abaixo da mediana, o que os comentários pedem, se o assunto já foi feito, se o tema fala com quem já segue o canal e a variedade (repetir a obra ou a personagem dos últimos vídeos cansa o público, mesmo que tenha ido bem, e o canal precisa equilibrar temas em alta com atemporais)',
  },
  roteirista: {
    name: 'Roteirista',
    focus:
      'o vídeo em si: se o gancho prende nos 2 primeiros segundos, se o tema rende o vídeo inteiro com provas concretas, se dá polêmica para as pessoas comentarem e se dá para achar imagens boas',
  },
}
const other = (s: Speaker): Speaker => (s === 'estrategista' ? 'roteirista' : 'estrategista')

export const listDebates = async () => (await storage.findAll()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))

export async function getDebate(id: string) {
  if (!/^deb_[A-Za-z0-9_-]+$/.test(id)) throw new AppError('Debate não encontrado', 404, 'NOT_FOUND')
  const debate = await storage.findById(id)
  if (!debate) throw new AppError('Debate não encontrado', 404, 'NOT_FOUND')
  return debate
}

/** Começa um debate vazio, para a tela já ter o que mostrar enquanto o brainstorm roda. */
export async function createDebate() {
  const now = new Date().toISOString()
  return storage.save({ id: `deb_${nanoid(10)}`, status: 'brainstorm', ideas: [], messages: [], createdAt: now, updatedAt: now })
}

async function update(debate: Debate, changes: Partial<Debate>) {
  Object.assign(debate, changes, { updatedAt: new Date().toISOString() })
  return storage.save(debate)
}

/** O voto mais recente de cada uma: acordo quando as duas aceitam o mesmo tema. */
export function agreement(messages: DebateMessage[]) {
  const last = (s: Speaker) => [...messages].reverse().find(m => m.speaker === s)?.vote ?? null
  const a = last('estrategista')
  const b = last('roteirista')
  return a !== null && a === b ? a : null
}

/**
 * Roda o debate inteiro: brainstorm → falas alternadas → resumo. Devolve a ideia vencedora (já gravada
 * no banco, guardada) ou null sem acordo. Os erros ficam gravados no debate e sobem para a fila.
 */
export async function runDebate(debate: Debate): Promise<Idea | null> {
  try {
    const projects = await listProjects()
    const recent = await recentVideos(projects)
    const { ideas, rejected } = await candidates(projects, recent)
    await update(debate, { status: 'debatendo', ideas, rejected })
    const context = await channelContext(projects, recent)

    let speaker: Speaker = 'estrategista'
    for (let turn = 1; turn <= MAX_TURNS; turn++) {
      await update(debate, { thinking: speaker })
      const message = await speak(speaker, turn, debate, context)
      await update(debate, { messages: [...debate.messages, message], thinking: undefined })
      if (agreement(debate.messages) !== null) break
      speaker = other(speaker)
    }

    const chosen = agreement(debate.messages)
    if (chosen === null) {
      await update(debate, { status: 'sem-acordo', thinking: undefined })
      logger.info(`🗣️ Debate ${debate.id}: sem acordo em ${debate.messages.length} falas`)
      return null
    }

    await update(debate, { status: 'resumindo', chosen })
    const final = await summarize(debate, chosen)
    const base = debate.ideas[chosen - 1]
    const idea = await storeIdea({ ...base, theme: final.theme || base.theme, hook: final.hook || base.hook, why: final.why || base.why, status: 'guardada' })
    await update(debate, { status: 'acordo', why: idea.why, ideaId: idea.id })
    logger.info(`🗣️ Debate ${debate.id}: acordo no tema ${chosen} em ${debate.messages.length} falas`)
    return idea
  } catch (error: any) {
    await update(debate, { status: 'erro', thinking: undefined, error: String(error?.message ?? error).slice(0, 300) }).catch(() => undefined)
    throw error
  }
}

/** Os vídeos feitos, do mais novo para o mais velho, com a obra e (nos criados sozinhos) o "em alta" da ideia. */
async function recentVideos(projects: ShortProject[]): Promise<RecentVideo[]> {
  const ideas = new Map((await listIdeas()).map(i => [i.id, i]))
  return [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => {
      const idea = p.autopilot?.ideaId ? ideas.get(p.autopilot.ideaId) : undefined
      return { title: p.title, theme: p.theme, work: p.subject || idea?.work, trend: idea?.trend }
    })
}

/**
 * Os temas do debate (ADR 0028): o brainstorm traz 6, o código tira os que repetem personagem ou obra
 * e fica com até 4, de obras diferentes, em ordem sorteada. Se sobrarem menos de 2, pede de novo uma
 * vez, dizendo o que foi recusado.
 */
async function candidates(projects: ShortProject[], recent: RecentVideo[]) {
  const input = {
    // só os feitos à mão dizem o nicho: um tema que a IA escolheu sozinha não vira "obra do canal"
    channel: projects.filter(p => !p.autopilot).map(p => p.title),
    done: projects.map(p => p.title),
    recent: varietyLines(recent),
  }
  let picked = pickCandidates(await brainstormCandidates(input, BRAINSTORM), recent, CANDIDATES)
  if (picked.chosen.length < 2) {
    logger.info(`🗣️ Só ${picked.chosen.length} tema(s) passaram na variedade; pedindo outro brainstorm`)
    const retry = pickCandidates(await brainstormCandidates({ ...input, avoid: picked.rejected }, BRAINSTORM), recent, CANDIDATES)
    picked = { chosen: retry.chosen, rejected: [...picked.rejected, ...retry.rejected] }
  }
  if (picked.chosen.length < 2) {
    throw new AppError('O brainstorm só trouxe temas repetidos (mesma obra ou personagem dos últimos vídeos). Tente de novo.', 502, 'AI_EMPTY')
  }
  return { ideas: picked.chosen, rejected: picked.rejected }
}

/** O que as duas sabem do canal: os vídeos com os números, os comentários, o que já foi feito e a variedade. */
async function channelContext(projects: ShortProject[], recent: RecentVideo[]) {

  const [metrics, styles, tones] = await Promise.all([listMetrics(), listStyles(), listTones()])
  const refs = buildRefs(metrics.videos, projects)
  const names = {
    style: (id: string) => styles.find(s => s.id === id)?.name ?? id,
    tone: (p: ShortProject) => tones.find(t => t.id === p.toneId)?.name ?? p.tone,
  }
  return [
    '## Os vídeos publicados do canal, com os números',
    refs.videos.length ? refs.videos.map(v => videoLine(v, names)).join('\n') : 'Nenhum vídeo medido ainda.',
    refs.comments.length ? `## Comentários do público\n${refs.comments.map(commentLine).join('\n')}` : '',
    `## Todos os vídeos já feitos (o assunto não pode repetir)\n${projects.map(p => `- ${p.title}`).join('\n')}`,
    recent.length ? `## A variedade dos últimos vídeos (do mais novo para o mais velho)\n${varietyLines(recent)}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
}

/** As marcas do tema para as IAs: obra, em alta ou atemporal, aposta. */
const tags = (i: Idea) => {
  const t = [i.work, i.trend === 'alta' ? 'em alta' : i.trend === 'atemporal' ? 'atemporal' : '', i.bet ? 'APOSTA: fora das obras do canal, mas do mesmo nicho e bombando agora' : '']
  const text = t.filter(Boolean).join(' · ')
  return text ? ` [${text}]` : ''
}

const ideaBlock = (ideas: Idea[]) =>
  ideas
    .map((i, n) => `${n + 1}. ${i.theme}${tags(i)}\n   gancho: "${i.hook}" · ${i.duration}s\n   quem deu a ideia defendeu: ${i.why}${i.evidence.length ? `\n   provas: ${i.evidence.map(e => e.text).join(' | ')}` : ''}`)
    .join('\n')

const transcript = (messages: DebateMessage[]) =>
  messages.map(m => `${ROLES[m.speaker].name}: ${m.text} (voto: ${m.vote ?? 'nenhum'})`).join('\n')

/** Uma fala: responde à outra, critica e vota. */
async function speak(speaker: Speaker, turn: number, debate: Debate, context: string): Promise<DebateMessage> {
  const me = ROLES[speaker]
  const you = ROLES[other(speaker)]
  const last = turn === MAX_TURNS
  const nearEnd = turn >= MAX_TURNS - 1

  const prompt = `Você é a ${me.name} de um canal de Shorts narrados em português do Brasil. Você debate com a ${you.name} qual destes temas vira o próximo vídeo do canal, que vai ser criado sozinho, sem o criador escolher. O seu foco é ${me.focus}. O foco dela é outro, e é por isso que vocês duas debatem.

${context}

## Os temas em debate
${ideaBlock(debate.ideas)}

## A conversa até agora
${debate.messages.length ? transcript(debate.messages) : '(ninguém falou ainda)'}

## Regras
- Esta é a fala ${turn} de no máximo ${MAX_TURNS}. O debate é curto de propósito: convirjam rápido e não repitam argumentos.
- ${
    debate.messages.length
      ? `Responda à última fala da ${you.name}: diga o que ela acertou e o que errou ou esqueceu. Concorde só quando o argumento for bom.`
      : 'Abra o debate: diga qual tema você defende e por quê, e o ponto fraco dos outros.'
  }
- Critique de verdade: um tema só passa se for bom o bastante para gerar comentários, compartilhamentos e retenção neste canal, com este público. Use os números e os comentários acima.
- Pese a variedade: o canal não deve repetir a obra dos últimos vídeos nem viver só de hype. Um tema marcado como APOSTA é de uma obra que o canal nunca tratou: aceite-o só se o assunto está mesmo bombando e combina com quem segue o canal.
- Fale como numa conversa, em 2 a 4 frases, sem listas e sem markdown. Cite os temas pelo número. Pode sugerir um ajuste num tema (outro gancho, outro recorte), desde que continue sendo o mesmo assunto.
- "vote": o número do tema que você aceita como bom o suficiente para virar vídeo agora, ou null se você ainda não aceita nenhum. O vídeo só é criado quando as duas votam no mesmo tema.${
    last
      ? `\n- ÚLTIMA FALA DO DEBATE: decida agora. Se a ${you.name} votou num tema bom o suficiente, aceite-o, mesmo que não seja o seu preferido. Votar null ou noutro tema encerra o debate sem vídeo.`
      : nearEnd
        ? '\n- Faltam poucas falas: comece a fechar e procure um tema que as duas aceitem.'
        : ''
  }

Responda só com JSON:
{ "message": "a sua fala", "vote": 2 }`

  const { data, ai } = await askJsonMeta<{ message?: string; vote?: unknown }>(prompt, { claudeOnly: true })
  const vote = Number(data.vote)
  return {
    speaker,
    text: String(data.message ?? '').trim().slice(0, 1200) || '(não respondeu)',
    vote: Number.isInteger(vote) && vote >= 1 && vote <= debate.ideas.length ? vote : null,
    ai,
    at: new Date().toISOString(),
  }
}

/** Depois do acordo: o tema como as duas o deixaram e por que elas o acharam bom. */
async function summarize(debate: Debate, chosen: number) {
  const idea = debate.ideas[chosen - 1]
  const prompt = `Duas IAs, a Estrategista e a Roteirista, debateram qual tema vira o próximo vídeo de um canal de Shorts em português do Brasil, e as duas aceitaram o tema ${chosen}.

## Os temas
${ideaBlock(debate.ideas)}

## O debate
${transcript(debate.messages)}

Escreva o resultado para o criador do canal:
- "theme": o tema ${chosen}, com os ajustes que as duas aceitaram no debate (se houver), escrito como uma pergunta ou afirmação específica. Continua sendo o mesmo assunto.
- "hook": a primeira frase falada do vídeo, com até 15 palavras (a do tema, ou a que elas combinaram).
- "why": 3 ou 4 frases dizendo por que as duas acharam esse tema bom e por que ele deve gerar engajamento, com os argumentos do debate e os números do canal que elas citaram. Chame os vídeos pelo título. Sem markdown.

Tema original: ${idea.theme}

Responda só com JSON:
{ "theme": "...", "hook": "...", "why": "..." }`
  const { data } = await askJsonMeta<{ theme?: string; hook?: string; why?: string }>(prompt, { claudeOnly: true })
  return {
    theme: String(data.theme ?? '').trim().slice(0, 200),
    hook: String(data.hook ?? '').trim().slice(0, 200),
    why: String(data.why ?? '').trim().slice(0, 1200),
  }
}

/** O vídeo criado a partir do debate (para a tela levar até ele). */
export async function linkProject(id: string, projectId: string) {
  const debate = await getDebate(id)
  return update(debate, { projectId })
}

/** Ao subir o servidor: um debate que estava rodando parou junto (a fila é em memória). */
export async function markInterruptedDebates() {
  for (const d of await storage.findAll()) {
    if (d.status === 'brainstorm' || d.status === 'debatendo' || d.status === 'resumindo') {
      await update(d, { status: 'erro', thinking: undefined, error: 'O servidor reiniciou no meio do debate.' })
    }
  }
}
