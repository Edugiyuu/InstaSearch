import { Request, Response } from 'express'
import { asyncHandler } from '../middleware/errorHandler.js'
import * as youtube from '../services/youtubeService.js'

// GET /api/youtube/status
export const getStatus = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: await youtube.status() })
})

// GET /api/youtube/auth-url
export const getAuthUrl = asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: { url: youtube.authUrl() } })
})

// GET /api/youtube/callback (o Google redireciona para cá)
export const handleCallback = async (req: Request, res: Response) => {
  const { code, state, error } = req.query as Record<string, string | undefined>
  const back = (params: Record<string, string>) => res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/configuracoes?${new URLSearchParams(params)}`)
  if (error || !code || !state) return back({ youtube: 'erro', message: error || 'Conexão cancelada' })
  try {
    const account = await youtube.handleCallback(code, state)
    back({ youtube: 'ok', channel: account.channelTitle })
  } catch (e: any) {
    back({ youtube: 'erro', message: e.response?.data?.error_description || e.message })
  }
}

// DELETE /api/youtube/account
export const disconnect = asyncHandler(async (_req: Request, res: Response) => {
  await youtube.disconnect()
  res.json({ success: true })
})
