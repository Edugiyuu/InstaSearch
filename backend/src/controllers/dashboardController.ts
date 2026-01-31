import { Request, Response } from 'express'
import { 
  profileStorage, 
  contentStorage, 
  postStorage,
  analysisStorage 
} from '../services/storage/index.js'
import { asyncHandler } from '../middleware/errorHandler.js'

// GET /api/dashboard/overview - Visão geral do dashboard
export const getDashboardOverview = asyncHandler(async (req: Request, res: Response) => {
  const profileStats = await profileStorage.getStats()
  const contentStats = await contentStorage.getStats()
  const postStats = await postStorage.getStats()
  const analysisStats = await analysisStorage.getStats()
  const totalMetrics = await postStorage.getTotalMetrics()

  res.json({
    success: true,
    data: {
      profiles: {
        total: profileStats.total,
        active: profileStats.active,
        analyzing: profileStats.analyzing,
      },
      content: {
        total: contentStats.total,
        drafts: contentStats.drafts,
        scheduled: contentStats.scheduled,
        published: contentStats.published,
      },
      performance: {
        totalViews: totalMetrics.totalViews,
        totalLikes: totalMetrics.totalLikes,
        avgEngagementRate: totalMetrics.avgEngagementRate,
      },
      analyses: analysisStats,
    },
  })
})

// GET /api/health - Health check
export const healthCheck = asyncHandler(async (req: Request, res: Response) => {
  res.json({
    success: true,
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
})
