// Debate das IAs (ADR 0027): duas Sonnet 5.5 com olhares diferentes discutem os temas de um brainstorm
// próprio, criticando uma à outra, até as duas votarem no mesmo tema. O código confere o acordo pelos
// votos; a IA não decide sozinha que "chegaram a um acordo". Cada fala é gravada na hora, e a tela
// acompanha como um chat. Sem acordo, vêm temas novos (até 3 rodadas), e o criador tem 5 s para vetar o
// tema aceito (ADR 0030).

import { nanoid } from 'nanoid'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { FileStorage } from '../storage/FileStorage.js'
import { listMetrics } from '../insights/collect.js'
import { askJsonMeta } from '../shorts/llm.js'
import { listProjects } from '../shorts/projects.js'
import { listStyles } from '../shorts/styles.js'
import { listTones } from '../shorts/tones.js'
import type { ScriptReview, ShortProject } from '../shorts/types.js'
import { buildRefs, commentLine, videoLine } from './clean.js'
import { brainstormCandidates, listIdeas, storeIdea } from './ideas.js'
import type { Debate, DebateMessage, DebateRound, Idea, RoundEnd, Speaker } from './types.js'
import { FORMAT_NAME } from '../shorts/formats.js'
import { aboveMedian, pickCandidates, seriesOf, varietyLines, type RecentVideo } from './variety.js'

/** No máximo 6 falas por rodada, 3 de cada (ADR 0027, 2A). */
export const MAX_TURNS = 6
/** Sem acordo, vêm temas novos, até 3 rodadas; depois, nenhum vídeo (ADR 0030). */
export const MAX_ROUNDS = 3
/** Depois do acordo, o criador tem 5 s para vetar o tema (ADR 0030). */
export const VETO_SECONDS = 5
/** 4 temas: o debate cabe em poucas falas (ADR 0027, 3A). */
export const CANDIDATES = 4
/** O brainstorm traz mais do que o debate usa, porque o filtro de variedade tira algumas (ADR 0028). */
const BRAINSTORM = 6

const storage = new FileStorage<Debate>('debates')

const ROLES: Record<Speaker, { name: string; focus: string }> = {
  estrategista: {
    name: 'Estrategista',
    focus:
      'os números e o público do canal: o que ficou acima ou abaixo da mediana, o que os comentários pedem, se o assunto já foi feito, se o tema fala com quem já segue o canal e a variedade (voltar de vez em quando a uma personagem que deu views, com um ângulo novo, é bom; repetir o mesmo ângulo, ou a mesma personagem toda hora, cansa o público, e o canal precisa equilibrar temas em alta com atemporais)',
  },
  roteirista: {
    name: 'Roteirista',
    focus:
      'o vídeo em si: se o tema tem "tchan" (uma opinião forte que dá vontade de discordar, ou fanservice, de preferência com uma personagem mulher; tema com cara de notícia ou de resenha é fraco), se o gancho prende nos 2 primeiros segundos, se o tema rende o vídeo inteiro com provas concretas e se dá para achar imagens chamativas',
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

/**
 * O voto mais recente de cada uma: acordo quando as duas aceitam o mesmo tema. Um tema vetado pelo
 * criador não vale, mesmo que as duas continuem nele.
 */
export function agreement(messages: DebateMessage[], vetoed: number[] = []) {
  const last = (s: Speaker) => [...messages].reverse().find(m => m.speaker === s)?.vote ?? null
  const a = last('estrategista')
  const b = last('roteirista')
  return a !== null && a === b && !vetoed.includes(a) ? a : null
}

/** As duas falas mais recentes das IAs votaram "nenhum": os temas não servem, e vêm novos (ADR 0030). */
export function bothRefused(messages: DebateMessage[]) {
  const [a, b] = messages.filter(m => m.speaker !== 'criador').slice(-2)
  return !!a && !!b && a.speaker !== b.speaker && a.vote === null && b.vote === null
}

// O que a tela pede durante o debate: vetar o tema aceito ou parar tudo. Fica na memória, como a fila:
// o debate em andamento está no laço do runDebate, e gravar no arquivo por aqui brigaria com ele.
const vetoWaits = new Map<string, (vetoed: boolean) => void>()
const stopped = new Set<string>()

/** Espera os 5 s do veto: true se o criador vetou, false se o tempo passou (ou ele parou o debate). */
function waitVeto(id: string) {
  return new Promise<boolean>(resolve => {
    const done = (vetoed: boolean) => {
      clearTimeout(timer)
      vetoWaits.delete(id)
      resolve(vetoed)
    }
    const timer = setTimeout(() => done(false), VETO_SECONDS * 1000)
    vetoWaits.set(id, done)
  })
}

/** O criador não gostou do tema aceito: só vale dentro dos 5 s. */
export function vetoDebate(id: string) {
  const done = vetoWaits.get(id)
  // sem espera: os 5 s passaram, ou o tema já foi vetado (por outra aba, por exemplo)
  if (!done) throw new AppError('Não dá mais para vetar: o tempo acabou ou o tema já saiu do debate.', 409, 'TOO_LATE')
  done(true)
}

/** Para o debate depois da fala (ou do brainstorm) em andamento, sem vídeo. Depois do acordo, não para mais. */
export async function stopDebate(id: string) {
  const debate = await getDebate(id)
  if (!['brainstorm', 'debatendo', 'aguardando'].includes(debate.status)) {
    throw new AppError('O debate já terminou ou o vídeo já está sendo criado.', 409, 'TOO_LATE')
  }
  stopped.add(id)
  vetoWaits.get(id)?.(false)
}

/**
 * Roda o debate inteiro: até 3 rodadas de brainstorm → falas alternadas; com acordo, 5 s para o veto e o
 * resumo. Devolve a ideia vencedora (já gravada no banco, guardada) ou null sem acordo ou se o criador
 * parou. Os erros ficam gravados no debate e sobem para a fila.
 */
export async function runDebate(debate: Debate): Promise<Idea | null> {
  try {
    const projects = await listProjects()
    const recent = await recentVideos(projects)
    const context = await channelContext(projects, recent)

    for (let round = 1; round <= MAX_ROUNDS; round++) {
      const { ideas, rejected } = await candidates(projects, recent, refusedThemes(debate))
      if (stopped.has(debate.id)) return await halt(debate)
      await update(debate, { status: 'debatendo', round, ideas, rejected })

      const result = await debateRound(debate, context, round)
      if (result === 'parado') return await halt(debate)
      if (typeof result === 'number') return await conclude(debate, result)

      logger.info(`🗣️ Debate ${debate.id}: rodada ${round} sem vídeo (${result})`)
      if (round === MAX_ROUNDS) break
      // a rodada vai para o histórico, e a próxima começa com temas novos
      const past: DebateRound = { ideas: debate.ideas, rejected: debate.rejected, messages: debate.messages, vetoed: debate.vetoed, end: result }
      await update(debate, { status: 'brainstorm', past: [...(debate.past ?? []), past], ideas: [], rejected: undefined, messages: [], vetoed: undefined })
    }

    await update(debate, { status: 'sem-acordo', thinking: undefined })
    logger.info(`🗣️ Debate ${debate.id}: sem acordo em ${MAX_ROUNDS} rodadas`)
    return null
  } catch (error: any) {
    await update(debate, { status: 'erro', thinking: undefined, vetoUntil: undefined, error: String(error?.message ?? error).slice(0, 300) }).catch(() => undefined)
    throw error
  } finally {
    stopped.delete(debate.id)
  }
}

/**
 * Uma rodada: as duas falam, alternando, até aceitarem o mesmo tema e o criador não vetar (devolve o
 * número dele), até as duas recusarem todos, até as falas acabarem ou até o criador parar.
 */
async function debateRound(debate: Debate, context: string, round: number): Promise<number | RoundEnd | 'parado'> {
  let speaker: Speaker = 'estrategista'
  for (let turn = 1; turn <= MAX_TURNS; turn++) {
    await update(debate, { thinking: speaker })
    const message = await speak(speaker, turn, round, debate, context)
    await update(debate, { messages: [...debate.messages, message], thinking: undefined })
    if (stopped.has(debate.id)) return 'parado'

    const chosen = agreement(debate.messages, debate.vetoed)
    if (chosen !== null) {
      await update(debate, { status: 'aguardando', chosen, vetoUntil: new Date(Date.now() + VETO_SECONDS * 1000).toISOString() })
      const vetoed = await waitVeto(debate.id)
      if (stopped.has(debate.id)) return 'parado'
      if (!vetoed) return chosen

      // o tema sai, as duas ficam sabendo pelo chat e seguem debatendo os outros
      const note: DebateMessage = { speaker: 'criador', text: `vetou o tema ${chosen}`, vote: null, at: new Date().toISOString() }
      const all = [...(debate.vetoed ?? []), chosen]
      await update(debate, { status: 'debatendo', chosen: undefined, vetoUntil: undefined, vetoed: all, messages: [...debate.messages, note] })
      logger.info(`🗣️ Debate ${debate.id}: o criador vetou o tema ${chosen}`)
      if (all.length >= debate.ideas.length) return 'vetados'
    } else if (bothRefused(debate.messages)) {
      return 'recusados'
    }
    speaker = other(speaker)
  }
  return 'falas'
}

/** O tema passou do veto: o resumo do porquê e a ideia no banco. */
async function conclude(debate: Debate, chosen: number) {
  await update(debate, { status: 'resumindo', vetoUntil: undefined })
  const final = await summarize(debate, chosen)
  const base = debate.ideas[chosen - 1]
  const idea = await storeIdea({ ...base, theme: final.theme || base.theme, hook: final.hook || base.hook, why: final.why || base.why, status: 'guardada' })
  await update(debate, { status: 'acordo', why: idea.why, ideaId: idea.id })
  logger.info(`🗣️ Debate ${debate.id}: acordo no tema ${chosen} na rodada ${debate.round ?? 1}, fala ${debate.messages.length}`)
  return idea
}

async function halt(debate: Debate) {
  await update(debate, { status: 'parado', thinking: undefined, chosen: undefined, vetoUntil: undefined })
  logger.info(`🗣️ Debate ${debate.id}: parado pelo criador`)
  return null
}

/** Os temas das rodadas anteriores, com o motivo: nem o brainstorm nem as IAs devem voltar a eles. */
function refusedThemes(debate: Debate) {
  return (debate.past ?? []).flatMap(r =>
    r.ideas.map((i, n) => ({ theme: i.theme, reason: r.vetoed?.includes(n + 1) ? 'o criador vetou' : 'as IAs recusaram no debate' })),
  )
}

/**
 * Os vídeos feitos, do mais novo para o mais velho, com a obra, (nos criados sozinhos) o "em alta" da ideia
 * e, nos já medidos, se ficaram acima da mediana de visualizações (ADR 0033).
 */
async function recentVideos(projects: ShortProject[]): Promise<RecentVideo[]> {
  const [ideaList, metrics] = await Promise.all([listIdeas(), listMetrics()])
  const ideas = new Map(ideaList.map(i => [i.id, i]))
  const above = aboveMedian(metrics.videos)
  return [...projects]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map(p => {
      const idea = p.autopilot?.ideaId ? ideas.get(p.autopilot.ideaId) : undefined
      return {
        title: p.title,
        theme: p.theme,
        work: p.subject || idea?.work,
        trend: idea?.trend,
        above: above.get(p.id),
        format: p.format,
        tier: p.tier,
        createdAt: p.createdAt,
      }
    })
}

/**
 * Os temas do debate (ADR 0028): o brainstorm traz 6, o código tira os que repetem personagem ou obra
 * e fica com até 4, de obras diferentes, em ordem sorteada. Se sobrarem menos de 2, pede de novo uma
 * vez, dizendo o que foi recusado. `refused`: os temas das rodadas anteriores (ADR 0030).
 */
async function candidates(projects: ShortProject[], recent: RecentVideo[], refused: { theme: string; reason: string }[]) {
  const input = {
    // só os feitos à mão dizem o nicho: um tema que a IA escolheu sozinha não vira "obra do canal"
    channel: projects.filter(p => !p.autopilot).map(p => p.title),
    done: projects.map(p => p.title),
    recent: varietyLines(recent),
    // as personagens destes vídeos podem voltar, com assunto novo (ADR 0033)
    champions: recent.filter(v => v.above).map(v => v.title),
    // as tier lists do canal, para a próxima parte ranquear alguém novo (ADR 0036)
    series: seriesOf(recent).map(s => ({ series: s.series, ranked: s.entries.map(e => `${e.character} (${e.rank})`) })),
    avoid: refused,
  }
  let picked = pickCandidates(await brainstormCandidates(input, BRAINSTORM), recent, CANDIDATES)
  if (picked.chosen.length < 2) {
    logger.info(`🗣️ Só ${picked.chosen.length} tema(s) passaram na variedade; pedindo outro brainstorm`)
    const retry = pickCandidates(await brainstormCandidates({ ...input, avoid: [...refused, ...picked.rejected] }, BRAINSTORM), recent, CANDIDATES)
    picked = { chosen: retry.chosen, rejected: [...picked.rejected, ...retry.rejected] }
  }
  if (picked.chosen.length < 2) {
    throw new AppError('O brainstorm só trouxe temas repetidos (mesma obra, personagem ou formato dos últimos vídeos). Tente de novo.', 502, 'AI_EMPTY')
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

/** As marcas do tema para as IAs: obra, em alta ou atemporal, aposta, volta. */
const tags = (i: Idea) => {
  const t = [
    i.work,
    i.trend === 'alta' ? 'em alta' : i.trend === 'atemporal' ? 'atemporal' : '',
    i.bet ? 'APOSTA: fora das obras do canal, mas do mesmo nicho e bombando agora' : '',
    i.revisit ? `VOLTA: ${i.character ?? 'a personagem'} já deu views no canal, agora com um assunto novo` : '',
    i.format && i.format !== 'opiniao' ? `formato: ${FORMAT_NAME[i.format]}${i.format === 'tierlist' ? ` (série "${i.series}", ranqueia ${i.character})` : ''}` : '',
  ]
  const text = t.filter(Boolean).join(' · ')
  return text ? ` [${text}]` : ''
}

const ideaBlock = (ideas: Idea[]) =>
  ideas
    .map((i, n) => `${n + 1}. ${i.theme}${tags(i)}\n   gancho: "${i.hook}" · ${i.duration}s\n   quem deu a ideia defendeu: ${i.why}${i.evidence.length ? `\n   provas: ${i.evidence.map(e => e.text).join(' | ')}` : ''}`)
    .join('\n')

const transcript = (messages: DebateMessage[]) =>
  messages
    // o criador só aparece quando veta: "(O criador do canal vetou o tema 2: …)"
    .map(m => (m.speaker === 'criador' ? `(O criador do canal ${m.text}: ele não gostou desse tema.)` : `${ROLES[m.speaker].name}: ${m.text} (voto: ${m.vote ?? 'nenhum'})`))
    .join('\n')

/** Uma fala: responde à outra, critica e vota. */
async function speak(speaker: Speaker, turn: number, round: number, debate: Debate, context: string): Promise<DebateMessage> {
  const me = ROLES[speaker]
  const you = ROLES[other(speaker)]
  const last = turn === MAX_TURNS
  const nearEnd = turn >= MAX_TURNS - 1
  const finalRound = round === MAX_ROUNDS
  const vetoed = debate.vetoed ?? []
  const refused = refusedThemes(debate)

  const prompt = `Você é a ${me.name} de um canal de Shorts narrados em português do Brasil. Você debate com a ${you.name} qual destes temas vira o próximo vídeo do canal, que vai ser criado sozinho, sem o criador escolher. O seu foco é ${me.focus}. O foco dela é outro, e é por isso que vocês duas debatem.

${context}
${refused.length ? `\n## Temas que já caíram nas rodadas anteriores (não voltem a eles)\n${refused.map(r => `- ${r.theme} (${r.reason})`).join('\n')}\n` : ''}
## Os temas em debate
${ideaBlock(debate.ideas)}

## A conversa até agora
${debate.messages.length ? transcript(debate.messages) : '(ninguém falou ainda)'}

## Regras
- Esta é a fala ${turn} de no máximo ${MAX_TURNS} da rodada ${round} de no máximo ${MAX_ROUNDS}. O debate é curto de propósito: convirjam rápido e não repitam argumentos.${
    vetoed.length
      ? `\n- O criador do canal vetou o${vetoed.length > 1 ? 's temas' : ' tema'} ${vetoed.join(' e ')}: ele não gostou. Esse${vetoed.length > 1 ? 's estão' : ' está'} fora; não votem mais nele${vetoed.length > 1 ? 's' : ''} e procurem outro.`
      : ''
  }
- ${
    debate.messages.length
      ? `Responda à última fala da ${you.name}: diga o que ela acertou e o que errou ou esqueceu. Concorde só quando o argumento for bom.`
      : 'Abra o debate: diga qual tema você defende e por quê, e o ponto fraco dos outros.'
  }
- Critique de verdade: um tema só passa se for bom o bastante para gerar comentários, compartilhamentos e retenção neste canal, com este público. Use os números e os comentários acima.
- O criador quer temas com "tchan": opinião forte e polêmica, de preferência com fanservice de uma personagem mulher. Um tema com cara de notícia ou de resenha ("o episódio X dividiu os fãs") é fraco: recusem, ou ajustem para uma opinião forte sobre o mesmo assunto.
- Recusem o ângulo repetido: "ela é mais que o visual / o corpo / a beleza" o canal já fez demais, e um tema com o mesmo ângulo de um dos últimos vídeos cansa, mesmo com outra personagem.
- Desconfiem do "em alta": ele vale para o tema, não para a obra. Um tema que funcionaria igual há um ano não ganha pontos por ser do momento.
- Pese a variedade: o canal não deve repetir a obra dos últimos vídeos nem viver só de hype. Um tema marcado como APOSTA é de uma obra que o canal nunca tratou: aceite-o só se o assunto está mesmo bombando e combina com quem segue o canal. Um tema marcado como VOLTA traz de novo uma personagem que deu views no canal (o app já conferiu que ela não está cansada): aceite-o só se o assunto é mesmo novo, com outra pergunta ou outro recorte, e não um vídeo que o canal já fez com outro título.
- Fale como numa conversa, em 2 a 4 frases, sem listas e sem markdown. Cite os temas pelo número. Pode sugerir um ajuste num tema (outro gancho, outro recorte), desde que continue sendo o mesmo assunto.
- "vote": o número do tema que você aceita como bom o suficiente para virar vídeo agora, ou null se nenhum destes temas serve. O vídeo só é criado quando as duas votam no mesmo tema. Se as duas votarem null uma depois da outra, ${
    finalRound ? 'o debate acaba sem vídeo (esta é a última rodada)' : `estes temas são trocados por ${CANDIDATES} novos`
  }: vote null só quando nenhum tema serve de verdade, não para ganhar tempo.${
    last && finalRound
      ? `\n- ÚLTIMA FALA DO DEBATE: decida agora. Se a ${you.name} votou num tema bom o suficiente, aceite-o, mesmo que não seja o seu preferido. Votar null ou noutro tema encerra o debate sem vídeo.`
      : last
        ? `\n- ÚLTIMA FALA DESTA RODADA: decida agora. Se a ${you.name} votou num tema bom o suficiente, aceite-o; sem acordo, estes temas são trocados por ${CANDIDATES} novos.`
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
    vote: Number.isInteger(vote) && vote >= 1 && vote <= debate.ideas.length && !vetoed.includes(vote) ? vote : null,
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
- "why": 1 ou 2 frases curtas dizendo por que as duas acharam esse tema bom: o argumento principal do debate e o número do canal que mais pesou. Chame os vídeos pelo título. Sem markdown.

Tema original: ${idea.theme}

Responda só com JSON:
{ "theme": "...", "hook": "...", "why": "..." }`
  const { data } = await askJsonMeta<{ theme?: string; hook?: string; why?: string }>(prompt, { claudeOnly: true })
  return {
    theme: String(data.theme ?? '').trim().slice(0, 200),
    hook: String(data.hook ?? '').trim().slice(0, 200),
    why: String(data.why ?? '').trim().slice(0, 400),
  }
}

/** A revisão do roteiro depois do acordo (ADR 0034): a criação grava cada passo, e o chat acompanha. */
export async function saveReview(id: string, review: ScriptReview) {
  const debate = await getDebate(id)
  return update(debate, { review })
}

/** O vídeo criado a partir do debate (para a tela levar até ele). */
export async function linkProject(id: string, projectId: string) {
  const debate = await getDebate(id)
  return update(debate, { projectId })
}

/** Tira o link "Abrir o vídeo" dos debates cujo projeto foi apagado (depois de apagar e ao subir o servidor). */
export async function unlinkDeletedProjects() {
  const alive = new Set((await listProjects()).map(p => p.id))
  for (const d of await storage.findAll()) {
    if (d.projectId && !alive.has(d.projectId)) await update(d, { projectId: undefined })
  }
}

/** Ao subir o servidor: um debate que estava rodando parou junto (a fila é em memória). */
export async function markInterruptedDebates() {
  for (const d of await storage.findAll()) {
    if (d.status === 'brainstorm' || d.status === 'debatendo' || d.status === 'aguardando' || d.status === 'resumindo') {
      await update(d, { status: 'erro', thinking: undefined, vetoUntil: undefined, error: 'O servidor reiniciou no meio do debate.' })
    } else if (d.review?.status === 'revisando') {
      await update(d, { review: { ...d.review, status: 'erro', thinking: undefined } })
    }
  }
}
