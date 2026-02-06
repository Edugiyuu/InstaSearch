import { Request, Response } from 'express'
import { schedulerService } from '../services/schedulerService.js'
import { postStorage } from '../services/storage/index.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'

// GET /api/scheduler/status - Status do scheduler
export const getSchedulerStatus = asyncHandler(async (_req: Request, res: Response) => {
  const status = schedulerService.getStatus()
  
  // Busca próximos posts agendados
  const upcomingPosts = await postStorage.getUpcomingScheduled(5)
  
  res.json({
    success: true,
    data: {
      ...status,
      upcomingPosts: upcomingPosts.length,
      nextScheduled: upcomingPosts[0]?.scheduledFor || null,
    }
  })
})

// POST /api/scheduler/publish/:id - Publica um post agendado imediatamente
export const publishPostNow = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  const result = await schedulerService.publishNow(id)
  
  if (!result.success) {
    throw new AppError(result.error || 'Falha ao publicar post', 500, 'PUBLISH_FAILED')
  }
  
  res.json({
    success: true,
    message: 'Post publicado com sucesso',
    data: result.post
  })
})

// PUT /api/scheduler/reschedule/:id - Reagenda um post
export const reschedulePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { scheduledFor } = req.body
  
  if (!scheduledFor) {
    throw new AppError('scheduledFor é obrigatório', 400, 'VALIDATION_ERROR')
  }
  
  const post = await schedulerService.reschedulePost(id, scheduledFor)
  
  res.json({
    success: true,
    message: 'Post reagendado com sucesso',
    data: post
  })
})

// DELETE /api/scheduler/cancel/:id - Cancela um post agendado
export const cancelScheduledPost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  
  await schedulerService.cancelScheduledPost(id)
  
  res.json({
    success: true,
    message: 'Post cancelado com sucesso'
  })
})
