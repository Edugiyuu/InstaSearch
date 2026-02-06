import { Request, Response } from 'express'
import { postStorage, contentStorage } from '../services/storage/index.js'
import { generatePostId } from '../utils/idGenerator.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import type { Post } from '../models/index.js'

// POST /api/posts/schedule - Agendar postagem
export const schedulePost = asyncHandler(async (req: Request, res: Response) => {
  const { contentId, scheduledFor, caption, media } = req.body

  if (!scheduledFor || !caption) {
    throw new AppError('Missing required fields', 400, 'VALIDATION_ERROR')
  }

  // Se contentId foi fornecido, validar que o conteúdo existe
  if (contentId) {
    const content = await contentStorage.findById(contentId)
    if (!content) {
      throw new AppError('Content not found', 404, 'CONTENT_NOT_FOUND')
    }
  }

  const post: Post = {
    id: generatePostId(),
    contentId,
    status: 'scheduled',
    caption,
    media,
    scheduledFor,
    lastUpdated: new Date().toISOString(),
  }

  await postStorage.save(post)

  // Atualizar status do conteúdo se fornecido
  if (contentId) {
    await contentStorage.schedule(contentId, scheduledFor)
  }

  res.status(201).json({
    success: true,
    data: post,
  })
})

// GET /api/posts - Listar postagens
export const getPosts = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.query

  let posts = await postStorage.findAll()

  if (status) {
    posts = posts.filter(p => p.status === status)
  }

  // Ordenar por data agendada ou publicada
  posts.sort((a, b) => {
    const dateA = a.publishedAt || a.scheduledFor || a.lastUpdated
    const dateB = b.publishedAt || b.scheduledFor || b.lastUpdated
    return new Date(dateB).getTime() - new Date(dateA).getTime()
  })

  res.json({
    success: true,
    data: {
      posts,
      total: posts.length,
    },
  })
})

// GET /api/posts/:id - Obter postagem por ID
export const getPostById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const post = await postStorage.findById(id)

  if (!post) {
    throw new AppError('Post not found', 404, 'POST_NOT_FOUND')
  }

  res.json({
    success: true,
    data: post,
  })
})

// GET /api/posts/:id/stats - Estatísticas da postagem
export const getPostStats = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const post = await postStorage.findById(id)

  if (!post) {
    throw new AppError('Post not found', 404, 'POST_NOT_FOUND')
  }

  if (!post.metrics) {
    throw new AppError('Post metrics not available', 404, 'METRICS_NOT_FOUND')
  }

  const engagement = post.metrics.likes + post.metrics.comments + 
                    post.metrics.shares + post.metrics.saves
  const engagementRate = post.metrics.views > 0 
    ? (engagement / post.metrics.views) * 100 
    : 0

  res.json({
    success: true,
    data: {
      id: post.id,
      metrics: post.metrics,
      performance: {
        engagement: {
          rate: Math.round(engagementRate * 100) / 100,
          total: engagement,
        },
      },
    },
  })
})

// PUT /api/posts/:id - Atualizar postagem agendada
export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const post = await postStorage.findById(id)
  if (!post) {
    throw new AppError('Post not found', 404, 'POST_NOT_FOUND')
  }

  if (post.status !== 'scheduled') {
    throw new AppError('Only scheduled posts can be updated', 400, 'POST_NOT_EDITABLE')
  }

  const updated = await postStorage.update(id, {
    ...updates,
    lastUpdated: new Date().toISOString(),
  })

  res.json({
    success: true,
    data: updated,
  })
})

// DELETE /api/posts/:id - Cancelar postagem agendada
export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const post = await postStorage.findById(id)
  if (!post) {
    throw new AppError('Post not found', 404, 'POST_NOT_FOUND')
  }

  if (post.status === 'published') {
    throw new AppError('Cannot delete published posts', 400, 'POST_PUBLISHED')
  }

  await postStorage.delete(id)

  // Atualizar status do conteúdo
  if (post.contentId) {
    await contentStorage.updateStatus(post.contentId, 'approved')
  }

  res.json({
    success: true,
    message: 'Post cancelled successfully',
  })
})

// GET /api/posts/upcoming - Próximas postagens agendadas
export const getUpcomingPosts = asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 10
  const posts = await postStorage.getUpcomingScheduled(limit)

  res.json({
    success: true,
    data: posts,
  })
})
