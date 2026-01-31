import { Request, Response } from 'express'
import { profileStorage, reelStorage } from '../services/storage/index.js'
import { generateProfileId } from '../utils/idGenerator.js'
import { AppError, asyncHandler } from '../middleware/errorHandler.js'
import type { Profile } from '../models/index.js'

// GET /api/profiles - Listar todos os perfis
export const getProfiles = asyncHandler(async (req: Request, res: Response) => {
  const { status, tag, search } = req.query

  let profiles = await profileStorage.findAll()

  // Filtros
  if (status) {
    profiles = profiles.filter(p => p.status === status)
  }

  if (tag) {
    profiles = profiles.filter(p => p.tags.includes(tag as string))
  }

  if (search) {
    const searchTerm = (search as string).toLowerCase()
    profiles = profiles.filter(p =>
      p.username.toLowerCase().includes(searchTerm) ||
      p.fullName.toLowerCase().includes(searchTerm) ||
      p.bio.toLowerCase().includes(searchTerm)
    )
  }

  // Ordenar por data (mais recente primeiro)
  profiles.sort((a, b) => 
    new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
  )

  res.json({
    success: true,
    data: {
      profiles,
      total: profiles.length,
    },
  })
})

// GET /api/profiles/:id - Obter perfil por ID
export const getProfileById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const profile = await profileStorage.findById(id)

  if (!profile) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  // Buscar reels do perfil
  const reels = await reelStorage.findByProfileId(id)
  const reelMetrics = await reelStorage.getAverageMetrics(id)

  res.json({
    success: true,
    data: {
      ...profile,
      reels: {
        count: reels.length,
        ...reelMetrics,
      },
    },
  })
})

// POST /api/profiles - Adicionar novo perfil
export const createProfile = asyncHandler(async (req: Request, res: Response) => {
  const { username, tags = [] } = req.body

  if (!username) {
    throw new AppError('Username is required', 400, 'VALIDATION_ERROR')
  }

  // Verificar se já existe
  const existing = await profileStorage.findByUsername(username)
  if (existing) {
    throw new AppError('Profile already exists', 409, 'PROFILE_EXISTS')
  }

  const profile: Profile = {
    id: generateProfileId(),
    username,
    fullName: username, // Será atualizado pelo scraper
    bio: '',
    isVerified: false,
    metrics: {
      followers: 0,
      following: 0,
      posts: 0,
    },
    status: 'pending',
    tags,
    addedAt: new Date().toISOString(),
  }

  await profileStorage.save(profile)

  res.status(201).json({
    success: true,
    data: profile,
  })
})

// DELETE /api/profiles/:id - Remover perfil
export const deleteProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const exists = await profileStorage.exists(id)
  if (!exists) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  await profileStorage.delete(id)

  // TODO: Deletar também reels associados

  res.json({
    success: true,
    message: 'Profile deleted successfully',
  })
})

// POST /api/profiles/:id/refresh - Forçar nova análise
export const refreshProfile = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const profile = await profileStorage.findById(id)
  if (!profile) {
    throw new AppError('Profile not found', 404, 'PROFILE_NOT_FOUND')
  }

  await profileStorage.updateStatus(id, 'pending')

  res.json({
    success: true,
    data: {
      id,
      status: 'pending',
      message: 'Analysis will start shortly',
    },
  })
})

// GET /api/profiles/stats - Estatísticas gerais
export const getProfileStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await profileStorage.getStats()

  res.json({
    success: true,
    data: stats,
  })
})
