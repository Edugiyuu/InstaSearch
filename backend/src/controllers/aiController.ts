import { Request, Response } from 'express'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { getAIService } from '../services/aiService.js'

// POST /api/ai/analyze-profile - Analisa perfil do Instagram conectado
export const analyzeInstagramProfile = asyncHandler(async (req: Request, res: Response) => {
  const { profileData } = req.body

  if (!profileData) {
    throw new AppError('Profile data is required', 400, 'VALIDATION_ERROR')
  }

  const aiService = getAIService()
  const analysis = await aiService.analyzeProfile(profileData)

  res.json({
    success: true,
    data: analysis,
  })
})

// POST /api/ai/generate-content - Gera sugestões de conteúdo
export const generateContentSuggestions = asyncHandler(async (req: Request, res: Response) => {
  const { profileAnalysis, count = 5 } = req.body

  if (!profileAnalysis) {
    throw new AppError('Profile analysis is required', 400, 'VALIDATION_ERROR')
  }

  const aiService = getAIService()
  const suggestions = await aiService.generateContentSuggestions(profileAnalysis, count)

  res.json({
    success: true,
    data: suggestions,
  })
})

// POST /api/ai/generate-caption - Gera caption para post
export const generateCaption = asyncHandler(async (req: Request, res: Response) => {
  const { contentIdea, tone = 'casual', includeHashtags = true } = req.body

  if (!contentIdea) {
    throw new AppError('Content idea is required', 400, 'VALIDATION_ERROR')
  }

  const aiService = getAIService()
  const caption = await aiService.generateCaption(contentIdea, tone, includeHashtags)

  res.json({
    success: true,
    data: caption,
  })
})

// POST /api/ai/analyze-hashtags - Analisa hashtags
export const analyzeHashtags = asyncHandler(async (req: Request, res: Response) => {
  const { hashtags } = req.body

  if (!hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
    throw new AppError('Hashtags array is required', 400, 'VALIDATION_ERROR')
  }

  const aiService = getAIService()
  const analysis = await aiService.analyzeHashtags(hashtags)

  res.json({
    success: true,
    data: analysis,
  })
})

// GET /api/ai/health - Verifica se AI service está funcionando
export const checkAIHealth = asyncHandler(async (req: Request, res: Response) => {
  const aiService = getAIService()
  const isHealthy = await aiService.healthCheck()

  res.json({
    success: true,
    data: {
      status: isHealthy ? 'healthy' : 'unhealthy',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      provider: 'Google Gemini',
      free: true,
      dailyLimit: 1500,
    },
  })
})
