import { Request, Response } from 'express'
import { InstagramAuthService } from '../services/instagramAuthService.js'
import { logger } from '../utils/logger.js'

// Create service instance after env is loaded
const instagramAuthService = new InstagramAuthService()

/**
 * Get Instagram OAuth authorization URL
 */
export const getAuthUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default_user'
    
    const authUrl = instagramAuthService.getAuthorizationUrl({
      scope: ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'business_management'],
      state: userId
    })

    res.json({
      success: true,
      authUrl: authUrl,
      message: 'Redirect user to this URL to authorize'
    })
  } catch (error: any) {
    logger.error('Error generating auth URL:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate authorization URL'
    })
  }
}

/**
 * Handle OAuth callback from Instagram
 */
export const handleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error, error_description } = req.query

    if (error) {
      logger.error('Instagram OAuth error:', error_description || error)
      return res.redirect(`http://localhost:5173/settings?error=${error}&message=${error_description}`)
    }

    if (!code) {
      return res.status(400).json({
        success: false,
        error: 'Authorization code not provided'
      })
    }

    const userId = state as string || 'default_user'

    // Connect the account
    const account = await instagramAuthService.connectAccount(userId, code as string)

    // Redirect to frontend with success
    res.redirect(`http://localhost:5173/settings?connected=true&username=${account.username}`)
  } catch (error: any) {
    logger.error('Error handling OAuth callback:', error)
    res.redirect(`http://localhost:5173/settings?error=connection_failed&message=${encodeURIComponent(error.message)}`)
  }
}

/**
 * Get connected Instagram account
 */
export const getConnectedAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default_user'

    const account = await instagramAuthService.getConnectedAccount(userId)

    if (!account) {
      return res.json({
        success: true,
        connected: false,
        account: null
      })
    }

    // Don't send the access token to frontend
    const { accessToken, refreshToken, ...safeAccount } = account

    return res.json({
      success: true,
      connected: true,
      account: safeAccount
    })
  } catch (error: any) {
    logger.error('Error getting connected account:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get connected account'
    })
  }
}

/**
 * Disconnect Instagram account
 */
export const disconnectAccount = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default_user'

    const success = await instagramAuthService.disconnectAccount(userId)

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'No connected account found'
      })
    }

    return res.json({
      success: true,
      message: 'Instagram account disconnected successfully'
    })
  } catch (error: any) {
    logger.error('Error disconnecting account:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to disconnect account'
    })
  }
}

/**
 * Refresh Instagram account data
 */
export const refreshAccountData = async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string || 'default_user'

    const account = await instagramAuthService.getConnectedAccount(userId)

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'No connected account found'
      })
    }

    // Ensure token is valid and refresh if needed
    const validToken = await instagramAuthService.ensureValidToken(account)

    // Get updated profile info
    await instagramAuthService.getProfile(validToken)

    // Update account with new data
    const updatedAccount = await instagramAuthService.getConnectedAccount(userId)

    const { accessToken, refreshToken, ...safeAccount } = updatedAccount!

    return res.json({
      success: true,
      account: safeAccount,
      message: 'Account data refreshed successfully'
    })
  } catch (error: any) {
    logger.error('Error refreshing account data:', error)
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to refresh account data'
    })
  }
}
