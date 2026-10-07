import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as insights from '../services/insights/collect.js'

// GET /api/metrics — os vídeos publicados com os números e a comparação (ADR 0021)
export const listMetrics = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await insights.listMetrics() })
})

// POST /api/metrics/refresh — coleta agora (o botão "Atualizar métricas")
export const refreshMetrics = asyncHandler(async (_req: Request, res: Response) => {
  await insights.collectNow()
  res.json({ success: true, data: await insights.listMetrics() })
})
