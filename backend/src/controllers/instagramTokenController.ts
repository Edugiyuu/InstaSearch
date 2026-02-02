import { Request, Response } from 'express'
import { logger } from '../utils/logger.js'
import axios from 'axios'
import { InstagramAccountStorage } from '../services/storage/InstagramAccountStorage.js'
import { generateId } from '../utils/idGenerator.js'

const storage = new InstagramAccountStorage()

/**
 * Connect Instagram account using manual token
 */
export const connectWithToken = async (req: Request, res: Response) => {
  try {
    const { accessToken, userId = 'default_user' } = req.body

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        error: 'Access token is required'
      })
    }

    logger.info('Connecting Instagram account with manual token...')

    // 1. Buscar páginas do usuário
    const pageResponse = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token: accessToken }
    })

    if (!pageResponse.data.data || pageResponse.data.data.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No Facebook Pages found. You need a Facebook Page to connect Instagram.'
      })
    }

    const page = pageResponse.data.data[0]

    // 2. Buscar Instagram Business Account vinculado
    const igResponse = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
      params: {
        fields: 'instagram_business_account',
        access_token: accessToken
      }
    })

    if (!igResponse.data.instagram_business_account) {
      return res.status(400).json({
        success: false,
        error: 'This Facebook Page does not have an Instagram Business Account linked.'
      })
    }

    const igAccountId = igResponse.data.instagram_business_account.id

    // 3. Buscar dados do perfil Instagram
    const profileResponse = await axios.get(`https://graph.facebook.com/v18.0/${igAccountId}`, {
      params: {
        fields: 'id,username,name,profile_picture_url,followers_count,follows_count,media_count',
        access_token: accessToken
      }
    })

    const profile = profileResponse.data

    // 4. Verificar se já existe conta conectada
    const existingAccount = await storage.getByUserId(userId)
    
    const accountData = {
      id: existingAccount?.id || generateId('igacc_'),
      userId: userId,
      username: profile.username,
      accountId: profile.id,
      accessToken: accessToken,
      tokenType: 'user' as const,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      scopes: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'],
      profile: {
        name: profile.name || profile.username,
        profilePictureUrl: profile.profile_picture_url,
        followersCount: profile.followers_count,
        followsCount: profile.follows_count,
        mediaCount: profile.media_count
      },
      status: 'connected' as const,
      connectedAt: existingAccount?.connectedAt || new Date().toISOString(),
      lastRefreshed: new Date().toISOString()
    }

    await storage.save(accountData)

    const { accessToken: _, ...safeAccount } = accountData

    logger.info(`Instagram account connected: ${profile.username}`)

    return res.json({
      success: true,
      account: safeAccount,
      message: 'Instagram account connected successfully!'
    })

  } catch (error: any) {
    logger.error('Error connecting with token:', error.response?.data || error.message)
    
    let errorMessage = 'Failed to connect Instagram account'
    
    if (error.response?.data?.error) {
      const fbError = error.response.data.error
      errorMessage = fbError.message || errorMessage
      
      if (fbError.code === 190) {
        errorMessage = 'Invalid or expired access token. Please generate a new one.'
      }
    }

    return res.status(400).json({
      success: false,
      error: errorMessage
    })
  }
}
