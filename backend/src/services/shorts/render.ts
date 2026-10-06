/**
 * Render do Short em MP4 com o Remotion.
 *
 * O navegador manda as mesmas props da prévia (timeline já calculada); o backend roda
 * frontend/scripts/render.mjs num processo separado (o Remotion e o React ficam no frontend)
 * e guarda o arquivo em data/short_projects/renders/. Um hash das props diz se o MP4
 * guardado ainda corresponde ao vídeo atual.
 */

import { spawn } from 'child_process'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { getProject, recordOutput, RENDERS_DIR } from './projects.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const FRONTEND_DIR = path.join(__dirname, '../../../../frontend')

export type RenderStage = 'bundle' | 'render' | 'done' | 'error'

export interface RenderJob {
  key: string
  stage: RenderStage
  /** 0 a 1 */
  progress: number
  error?: string
}

const jobs = new Map<string, RenderJob>()

/** Hash das props: muda quando qualquer coisa do vídeo muda (texto, imagem, tempo, som). */
export function renderKey(props: unknown) {
  return createHash('sha1').update(JSON.stringify(props)).digest('hex').slice(0, 12)
}

/** As URLs da prévia são relativas ("/api/..."); no render elas precisam apontar para este servidor. */
function absolutize(value: unknown, origin: string): unknown {
  if (typeof value === 'string') return value.startsWith('/api/') ? origin + value : value
  if (Array.isArray(value)) return value.map(v => absolutize(v, origin))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, absolutize(v, origin)]))
  }
  return value
}

/** Estado do render: o job em andamento ou o MP4 guardado, se ainda bate com as props. */
export async function renderStatus(projectId: string, key?: string): Promise<RenderJob | null> {
  const job = jobs.get(projectId)
  if (job && (!key || job.key === key)) return job
  const project = await getProject(projectId)
  if (project.render && (!key || project.render.key === key)) {
    const exists = await fs.access(path.join(RENDERS_DIR, project.render.file)).then(() => true, () => false)
    if (exists) return { key: project.render.key, stage: 'done', progress: 1 }
  }
  return null
}

/** Começa o render (ou devolve o que já existe para essas props). Não espera terminar. */
export async function startRender(projectId: string, props: Record<string, unknown>) {
  if (typeof props?.durationInFrames !== 'number' || !Array.isArray(props.beats)) {
    throw new AppError('Props do vídeo inválidas', 400, 'VALIDATION_ERROR')
  }
  const key = renderKey(props)
  // o job em andamento é conferido antes de qualquer await: dois pedidos juntos não abrem dois renders
  const running = jobs.get(projectId)
  if (running && running.key === key && running.stage !== 'error') return running
  const job: RenderJob = { key, stage: 'bundle', progress: 0 }
  jobs.set(projectId, job)

  const saved = await renderStatus(projectId, key)
  if (saved && saved.stage === 'done' && saved !== job) {
    jobs.delete(projectId)
    return saved
  }
  run(projectId, job, props).catch(error => {
    job.stage = 'error'
    job.error = String(error?.message ?? error)
    logger.error(`❌ Render ${projectId}: ${job.error}`)
  })
  return job
}

async function run(projectId: string, job: RenderJob, props: Record<string, unknown>) {
  const origin = `http://localhost:${process.env.PORT || 3000}`
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instasearch-render-'))
  const propsFile = path.join(tempDir, 'props.json')
  await fs.writeFile(propsFile, JSON.stringify(absolutize(props, origin)))
  await fs.mkdir(RENDERS_DIR, { recursive: true })
  const file = `${projectId}_${job.key}.mp4`
  const partial = path.join(RENDERS_DIR, `${file}.part.mp4`)
  const started = Date.now()
  logger.info(`🎬 Render do projeto ${projectId} começou`)

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['scripts/render.mjs', propsFile, partial], { cwd: FRONTEND_DIR, windowsHide: true })
      let error = ''
      let stderr = ''
      let buffer = ''
      child.stdout.on('data', chunk => {
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          try {
            const event = JSON.parse(line)
            if (event.stage) job.stage = event.stage
            if (typeof event.progress === 'number') job.progress = event.progress
            if (event.error) error = event.error
          } catch {
            // linha de log do Remotion, não é evento
          }
        }
      })
      child.stderr.on('data', d => (stderr += d))
      child.on('error', reject)
      child.on('close', code =>
        code === 0 ? resolve() : reject(new Error(error || stderr.trim().split('\n').pop() || `render saiu com código ${code}`)),
      )
    })

    await fs.rename(partial, path.join(RENDERS_DIR, file))
    const project = await getProject(projectId)
    if (project.render && project.render.file !== file) {
      await fs.unlink(path.join(RENDERS_DIR, project.render.file)).catch(() => undefined)
    }
    await recordOutput(projectId, { render: { file, key: job.key, at: new Date().toISOString() } })
    job.stage = 'done'
    job.progress = 1
    logger.info(`✅ Render do projeto ${projectId} pronto em ${((Date.now() - started) / 1000).toFixed(0)}s`)
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
    await fs.unlink(partial).catch(() => undefined)
    // o job pronto fica no projeto; só o erro precisa ficar na memória
    if (job.stage === 'done' && jobs.get(projectId) === job) jobs.delete(projectId)
  }
}

/** Caminho do MP4 atual do projeto, ou erro se ainda não foi renderizado. */
export async function renderedFile(projectId: string) {
  const project = await getProject(projectId)
  if (!project.render) throw new AppError('O vídeo ainda não foi gerado em MP4.', 409, 'NOT_RENDERED')
  const file = path.join(RENDERS_DIR, project.render.file)
  const exists = await fs.access(file).then(() => true, () => false)
  if (!exists) throw new AppError('O MP4 sumiu da pasta; gere de novo.', 409, 'NOT_RENDERED')
  return { project, file }
}
