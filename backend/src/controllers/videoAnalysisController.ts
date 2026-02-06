import { Request, Response } from 'express'
import { asyncHandler, AppError } from '../middleware/errorHandler.js'
import { VideoService } from '../services/videoService.js'
import { getAIService } from '../services/aiService.js'
import { logger } from '../utils/logger.js'
import path from 'path'
import fs from 'fs'

const videoService = new VideoService()

/**
 * POST /api/videos/analyze-for-caption
 * Analisa vídeo e gera legenda contextual baseada no conteúdo visual
 */
export const analyzeVideoForCaption = asyncHandler(async (req: Request, res: Response) => {
  const { filename, style = 'realistic' } = req.body

  if (!filename) {
    throw new AppError('Filename is required', 400, 'VALIDATION_ERROR')
  }

  logger.info(`🎬 Estilo selecionado: ${style}`)

  const tempDir = path.join(process.cwd(), 'data', 'videos', 'temp')
  const videoPath = path.join(tempDir, filename)

  if (!fs.existsSync(videoPath)) {
    throw new AppError('Video file not found', 404, 'VIDEO_NOT_FOUND')
  }

  logger.info(`🎬 Analisando vídeo para gerar legenda: ${filename}`)

  try {
    // Extrair frames do vídeo (primeiro, meio e último frame)
    const frames = await videoService.extractFrames(videoPath, 3)
    
    logger.info(`📸 ${frames.length} frames extraídos`)

    // Usar IA para analisar os frames e gerar legenda
    const aiService = getAIService()
    
    // Ler os frames como base64
    const frameImages = frames.map(framePath => {
      const imageBuffer = fs.readFileSync(framePath)
      return imageBuffer.toString('base64')
    })

    // Gerar legenda baseada nos frames E no estilo visual escolhido
    const caption = await aiService.generateCaptionFromVideo(frameImages, style)

    // Limpar frames temporários
    for (const framePath of frames) {
      if (fs.existsSync(framePath)) {
        fs.unlinkSync(framePath)
      }
    }

    logger.info(`✅ Legenda gerada com sucesso`)

    res.json({
      success: true,
      data: {
        caption,
        framesAnalyzed: frames.length
      }
    })

  } catch (error) {
    logger.error('Erro ao analisar vídeo:', error)
    throw new AppError(
      'Falha ao analisar vídeo. Tente gerar legenda genérica.',
      500,
      'VIDEO_ANALYSIS_ERROR'
    )
  }
})
