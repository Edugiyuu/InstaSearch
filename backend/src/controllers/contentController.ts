import { Request, Response } from 'express'
import { contentStorage, analysisStorage } from '../services/storage/index.js'
import { generateContentId } from '../utils/idGenerator.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'

// POST /api/content/generate - Gerar novo conteúdo
export const generateContent = asyncHandler(async (req: Request, res: Response) => {
  const { analysisId, count = 10 } = req.body

  if (!analysisId) {
    throw new AppError('Analysis ID is required', 400, 'VALIDATION_ERROR')
  }

  const analysis = await analysisStorage.findById(analysisId)
  if (!analysis) {
    throw new AppError('Analysis not found', 404, 'ANALYSIS_NOT_FOUND')
  }

  if (analysis.status !== 'completed') {
    throw new AppError('Analysis is not completed yet', 400, 'ANALYSIS_NOT_READY')
  }

  // TODO: Chamar serviço de IA para gerar conteúdo

  res.status(201).json({
    success: true,
    data: {
      jobId: generateContentId(),
      status: 'processing',
      estimatedTimeMinutes: 3,
    },
  })
})

// GET /api/content - Listar todo o conteúdo
export const getContent = asyncHandler(async (req: Request, res: Response) => {
  const { status, sortBy = 'createdAt' } = req.query

  let contents = await contentStorage.findAll()

  // Filtros
  if (status) {
    contents = contents.filter(c => c.status === status)
  }

  // Ordenação
  if (sortBy === 'score') {
    contents.sort((a, b) => b.score - a.score)
  } else if (sortBy === 'scheduledFor') {
    contents.sort((a, b) => {
      if (!a.scheduledFor) return 1
      if (!b.scheduledFor) return -1
      return new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
    })
  } else {
    contents.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }

  res.json({
    success: true,
    data: {
      content: contents,
      total: contents.length,
    },
  })
})

// GET /api/content/:id - Obter conteúdo por ID
export const getContentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const content = await contentStorage.findById(id)

  if (!content) {
    throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND')
  }

  res.json({
    success: true,
    data: content,
  })
})

// PUT /api/content/:id - Editar conteúdo
export const updateContent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const content = await contentStorage.findById(id)
  if (!content) {
    throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND')
  }

  const updated = await contentStorage.update(id, updates)

  res.json({
    success: true,
    data: updated,
  })
})

// POST /api/content/:id/approve - Aprovar conteúdo
export const approveContent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const content = await contentStorage.findById(id)
  if (!content) {
    throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND')
  }

  await contentStorage.approve(id)

  res.json({
    success: true,
    data: {
      id,
      status: 'approved',
    },
  })
})

// DELETE /api/content/:id - Deletar conteúdo
export const deleteContent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const exists = await contentStorage.exists(id)
  if (!exists) {
    throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND')
  }

  await contentStorage.delete(id)

  res.json({
    success: true,
    message: 'Content deleted successfully',
  })
})

// GET /api/content/stats - Estatísticas de conteúdo
export const getContentStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await contentStorage.getStats()

  res.json({
    success: true,
    data: stats,
  })
})
