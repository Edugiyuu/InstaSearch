import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as ideas from '../services/ideas/ideas.js'

// GET /api/ideas — o banco de ideias (ADR 0021)
export const listIdeas = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await ideas.listIdeas() })
})

// POST /api/ideas/brainstorm — { seed?, request? }: um lote novo, ou o lote atual ajustado
export const brainstorm = asyncHandler(async (req: Request, res: Response) => {
  const { seed, request } = req.body ?? {}
  res.json({ success: true, data: await ideas.brainstorm({ seed: typeof seed === 'string' ? seed : undefined, request: typeof request === 'string' ? request : undefined }) })
})

// PUT /api/ideas/:id — { status?, discardReason?, projectId? }
export const updateIdea = asyncHandler(async (req: Request, res: Response) => {
  const { status, discardReason, projectId } = req.body ?? {}
  const valid = ['nova', 'guardada', 'descartada', 'feita']
  res.json({
    success: true,
    data: await ideas.updateIdea(req.params.id, {
      status: valid.includes(status) ? status : undefined,
      discardReason: typeof discardReason === 'string' ? discardReason : undefined,
      projectId: typeof projectId === 'string' ? projectId : undefined,
    }),
  })
})

// DELETE /api/ideas/:id
export const deleteIdea = asyncHandler(async (req: Request, res: Response) => {
  await ideas.deleteIdea(req.params.id)
  res.json({ success: true })
})
