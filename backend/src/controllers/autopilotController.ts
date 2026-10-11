import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as autopilot from '../services/shorts/autopilot.js'

// GET /api/shorts/autopilot — os vídeos sendo criados sozinhos e os que terminaram há pouco (ADR 0026)
export const listJobs = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: autopilot.listJobs() })
})

// POST /api/shorts/autopilot — { ideaId? }: cria um vídeo sozinho; sem ideia, o app escolhe
export const startJob = asyncHandler(async (req: Request, res: Response) => {
  const ideaId = typeof req.body?.ideaId === 'string' && req.body.ideaId ? req.body.ideaId : undefined
  res.json({ success: true, data: await autopilot.startJob(ideaId) })
})

// POST /api/shorts/autopilot/:projectId/continue — segue da etapa onde parou
export const continueJob = asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: await autopilot.continueJob(req.params.projectId) })
})
