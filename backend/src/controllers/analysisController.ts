import { Request, Response } from 'express'
import { analysisStorage, profileStorage } from '../services/storage/index.js'
import { generateAnalysisId } from '../utils/idGenerator.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import type { Analysis } from '../models/index.js'

// POST /api/analysis/start - Iniciar nova análise
export const startAnalysis = asyncHandler(async (req: Request, res: Response) => {
  const { profileIds, type = 'comprehensive' } = req.body

  if (!profileIds || !Array.isArray(profileIds) || profileIds.length === 0) {
    throw new AppError('Profile IDs are required', 400, 'VALIDATION_ERROR')
  }

  // Verificar se os perfis existem
  for (const profileId of profileIds) {
    const profile = await profileStorage.findById(profileId)
    if (!profile) {
      throw new AppError(`Profile ${profileId} not found`, 404, 'PROFILE_NOT_FOUND')
    }
  }

  const analysis: Analysis = {
    id: generateAnalysisId(),
    profileIds,
    type,
    status: 'processing',
    createdAt: new Date().toISOString(),
  }

  await analysisStorage.save(analysis)

  // TODO: Adicionar à fila de processamento

  res.status(201).json({
    success: true,
    data: {
      id: analysis.id,
      profileIds: analysis.profileIds,
      status: 'processing',
      estimatedTimeMinutes: 5,
      createdAt: analysis.createdAt,
    },
  })
})

// GET /api/analysis/:id - Obter análise por ID
export const getAnalysisById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const analysis = await analysisStorage.findById(id)

  if (!analysis) {
    throw new AppError('Analysis not found', 404, 'ANALYSIS_NOT_FOUND')
  }

  res.json({
    success: true,
    data: analysis,
  })
})

// GET /api/analysis - Listar todas as análises
export const getAnalyses = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query

  let analyses = await analysisStorage.findAll()

  if (status) {
    analyses = analyses.filter(a => a.status === status)
  }

  // Ordenar por data (mais recente primeiro)
  analyses.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  res.json({
    success: true,
    data: {
      analyses,
      total: analyses.length,
    },
  })
})

// GET /api/analysis/profile/:profileId - Análises de um perfil
export const getAnalysesByProfile = asyncHandler(async (req: Request, res: Response) => {
  const { profileId } = req.params

  const profile = await profileStorage.findById(profileId)
  if (!profile) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  const analyses = await analysisStorage.findAll()
  const profileAnalyses = analyses.filter(a => a.profileIds.includes(profileId))

  // Ordenar por data (mais recente primeiro)
  profileAnalyses.sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  res.json({
    success: true,
    data: profileAnalyses,
  })
})

// GET /api/analysis/stats - Estatísticas de análises
export const getAnalysisStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await analysisStorage.getStats()

  res.json({
    success: true,
    data: stats,
  })
})
