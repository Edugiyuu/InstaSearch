// Criação autônoma (ADR 0026): ideia → roteiro → montagem → imagens, parando em "falta gravar a voz".
// Sem ideia escolhida, a ideia sai do debate das IAs (ADR 0027).
// Nunca publica. Um vídeo por vez, numa fila em memória (como a do Whisper): o roteiro com pesquisa e a
// visão gastam cota de IA, e duas montagens juntas disputariam o limite.

import { nanoid } from 'nanoid'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { createDebate, linkProject, runDebate } from '../ideas/debate.js'
import { getIdea, updateIdea } from '../ideas/ideas.js'
import type { Idea } from '../ideas/types.js'
import { assemble, autoFillImages, createProject, getProject, listProjects, setAutopilot } from './projects.js'
import type { Autopilot } from './types.js'

/**
 * fila → ideia (a do cartão) ou debate (as IAs escolhem, ADR 0027) → roteiro → montagem → imagens → pronto.
 * Termina em erro, em sem-acordo quando o debate acaba sem as duas aceitarem um tema, ou em parado quando o
 * criador para o debate (nos dois, nenhum vídeo).
 */
export type JobStage = 'fila' | 'ideia' | 'debate' | 'roteiro' | 'montagem' | 'imagens' | 'pronto' | 'erro' | 'sem-acordo' | 'parado'

/** Um vídeo sendo criado; a tela Ideias acompanha por aqui. */
export interface AutopilotJob {
  id: string
  stage: JobStage
  /** A ideia escolhida pelo usuário; sem ela, as IAs debatem e escolhem (ADR 0027). */
  ideaId?: string
  /** O debate que escolheu a ideia; a tela mostra o chat. */
  debateId?: string
  /** O tema da ideia, depois o título do projeto. */
  title?: string
  projectId?: string
  error?: string
  startedAt: string
  updatedAt: string
}

const ACTIVE: JobStage[] = ['fila', 'ideia', 'debate', 'roteiro', 'montagem', 'imagens']
/** Quantos jobs terminados a tela ainda mostra (o resto fica no próprio projeto). */
const KEEP_DONE = 10

const jobs: AutopilotJob[] = []
let running = false

/** Do mais novo para o mais velho. */
export const listJobs = () => [...jobs].reverse()

/** Cria um vídeo sozinho: da ideia escolhida ou, sem ela, da próxima da fila (ou de um brainstorm). */
export async function startJob(ideaId?: string) {
  if (ideaId) {
    const idea = await getIdea(ideaId)
    if (idea.status === 'feita' || idea.status === 'descartada') throw new AppError('Essa ideia já virou vídeo ou foi descartada', 400, 'VALIDATION')
    if (jobs.some(j => j.ideaId === ideaId && ACTIVE.includes(j.stage))) throw new AppError('Esse vídeo já está sendo criado', 409, 'CONFLICT')
    return enqueue({ ideaId, title: idea.theme })
  }
  return enqueue({})
}

/** Segue um projeto que parou (erro ou servidor reiniciado) da etapa onde ficou. */
export async function continueJob(projectId: string) {
  const project = await getProject(projectId)
  if (!project.autopilot || project.autopilot.stage === 'pronto') throw new AppError('Esse projeto não está esperando a criação automática', 400, 'VALIDATION')
  if (jobs.some(j => j.projectId === projectId && ACTIVE.includes(j.stage))) throw new AppError('Esse vídeo já está sendo criado', 409, 'CONFLICT')
  return enqueue({ projectId, ideaId: project.autopilot.ideaId, title: project.title })
}

/** O projeto foi apagado: a fila esquece os jobs terminados dele (o que está rodando termina em erro sozinho). */
export function forgetProjectJobs(projectId: string) {
  for (const job of jobs.filter(j => j.projectId === projectId && !ACTIVE.includes(j.stage))) jobs.splice(jobs.indexOf(job), 1)
}

function enqueue(fields: Partial<AutopilotJob>) {
  const now = new Date().toISOString()
  const job: AutopilotJob = { id: `job_${nanoid(8)}`, stage: 'fila', startedAt: now, updatedAt: now, ...fields }
  jobs.push(job)
  // esquece os mais velhos que já terminaram
  const done = jobs.filter(j => !ACTIVE.includes(j.stage))
  for (const old of done.slice(0, Math.max(0, done.length - KEEP_DONE))) jobs.splice(jobs.indexOf(old), 1)
  void next()
  return job
}

async function next() {
  if (running) return
  const job = jobs.find(j => j.stage === 'fila')
  if (!job) return
  running = true
  try {
    await run(job)
  } finally {
    running = false
    void next()
  }
}

const step = (job: AutopilotJob, stage: JobStage) => {
  job.stage = stage
  job.updatedAt = new Date().toISOString()
}

async function run(job: AutopilotJob) {
  try {
    if (!job.projectId) {
      let idea: Idea
      if (job.ideaId) {
        step(job, 'ideia')
        idea = await getIdea(job.ideaId)
      } else {
        step(job, 'debate')
        const debate = await createDebate()
        job.debateId = debate.id
        const won = await runDebate(debate)
        // sem acordo nas 3 rodadas, ou parado pelo criador: nenhum vídeo (ADR 0030); o chat mostra por quê
        if (!won) return step(job, debate.status === 'parado' ? 'parado' : 'sem-acordo')
        idea = won
      }
      job.ideaId = idea.id
      job.title = idea.theme

      step(job, 'roteiro')
      const project = await createProject({ theme: idea.theme, styleId: idea.styleId, toneId: idea.toneId, duration: idea.duration })
      job.projectId = project.id
      job.title = project.title
      await setAutopilot(project.id, {
        stage: 'montagem',
        ideaId: idea.id,
        startedAt: job.startedAt,
        // o porquê do debate fica no projeto ("Por que este tema")
        ...(job.debateId ? { debateId: job.debateId, why: idea.why } : {}),
      })
      if (job.debateId) await linkProject(job.debateId, project.id)
      // como no "Criar vídeo" à mão: a ideia vira "feita" e aponta para o projeto
      await updateIdea(idea.id, { status: 'feita', projectId: project.id })
    }

    const id = job.projectId
    let autopilot = (await getProject(id)).autopilot!
    const advance = async (stage: Autopilot['stage']) => {
      autopilot = { ...autopilot, stage, error: undefined }
      await setAutopilot(id, autopilot)
    }

    if (autopilot.stage === 'montagem') {
      step(job, 'montagem')
      await assemble(id, { images: false })
      await advance('imagens')
    }
    if (autopilot.stage === 'imagens') {
      step(job, 'imagens')
      // o que a web com visão não resolver fica no "Precisa de você" da Revisão (ADR 0026, 4A)
      await autoFillImages(id)
      await advance('pronto')
    }
    step(job, 'pronto')
    logger.info(`🤖 Vídeo criado sozinho: ${job.title} (${id}); falta a voz`)
  } catch (error: any) {
    job.error = String(error?.message ?? error).slice(0, 300)
    step(job, 'erro')
    logger.warn(`🤖 A criação automática parou (${job.title ?? 'sem ideia'}): ${job.error}`)
    if (job.projectId) {
      const project = await getProject(job.projectId).catch(() => null)
      if (project?.autopilot) await setAutopilot(job.projectId, { ...project.autopilot, error: job.error }).catch(() => undefined)
    }
  }
}

/** Ao subir o servidor: o que estava no meio parou junto, então vira "Continuar" no projeto. */
export async function markInterrupted() {
  for (const p of await listProjects()) {
    if (p.autopilot && p.autopilot.stage !== 'pronto' && !p.autopilot.error) {
      await setAutopilot(p.id, { ...p.autopilot, error: 'O servidor reiniciou no meio da criação.' })
    }
  }
}
