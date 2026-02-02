import axios from 'axios'
import { InstagramAccount, InstagramAccountStorage } from './storage/InstagramAccountStorage.js'
import { generateId } from '../utils/idGenerator.js'
import { logger } from '../utils/logger.js'

const storage = new InstagramAccountStorage()

export interface InstagramAuthConfig {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export interface AuthorizationUrlParams {
  scope: string[]
  state?: string
}

export class InstagramAuthService {
  private config: InstagramAuthConfig

  constructor(config?: InstagramAuthConfig) {
    this.config = config || {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || 'http://localhost:3000/api/instagram/callback'
    }
    
    // Debug log
    console.log('Instagram Auth Config:', {
      clientId: this.config.clientId,
      hasSecret: !!this.config.clientSecret,
      redirectUri: this.config.redirectUri
    })
  }

  /**
   * Generate Instagram OAuth authorization URL
   * Uses Instagram Graph API (Basic Display API was deprecated Dec 4, 2024)
   * Requires: Instagram Business/Creator account + Facebook Page
   */
  getAuthorizationUrl(params: AuthorizationUrlParams): string {
    const scope = params.scope.join(',')
    const state = params.state || generateId('state_')
    
    const baseUrl = 'https://api.instagram.com/oauth/authorize'
    const queryParams = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: scope,
      response_type: 'code',
      state: state
    })

    return `${baseUrl}?${queryParams.toString()}`
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string
    userId: string
    expiresIn?: number
  }> {
    try {
      const response = await axios.post('https://api.instagram.com/oauth/access_token', {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.config.redirectUri,
        code: code
      }, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })

      return {
        accessToken: response.data.access_token,
        userId: response.data.user_id,
        expiresIn: response.data.expires_in
      }
    } catch (error: any) {
      logger.error('Error exchanging code for token:', error.response?.data || error.message)
      throw new Error('Failed to exchange authorization code')
    }
  }

  /**
   * Get long-lived access token
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string
    tokenType: string
    expiresIn: number
  }> {
    try {
      const response = await axios.get('https://graph.instagram.com/access_token', {
        params: {
          grant_type: 'ig_exchange_token',
          client_secret: this.config.clientSecret,
          access_token: shortLivedToken
        }
      })

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: response.data.expires_in
      }
    } catch (error: any) {
      logger.error('Error getting long-lived token:', error.response?.data || error.message)
      throw new Error('Failed to get long-lived token')
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(token: string): Promise<{
    accessToken: string
    tokenType: string
    expiresIn: number
  }> {
    try {
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: token
        }
      })

      return {
        accessToken: response.data.access_token,
        tokenType: response.data.token_type || 'bearer',
        expiresIn: response.data.expires_in
      }
    } catch (error: any) {
      logger.error('Error refreshing token:', error.response?.data || error.message)
      throw new Error('Failed to refresh access token')
    }
  }

  /**
   * Get Instagram account profile
   */
  async getProfile(accessToken: string): Promise<{
    id: string
    username: string
    name?: string
    accountType?: string
    mediaCount?: number
    followersCount?: number
    followsCount?: number
    profilePictureUrl?: string
  }> {
    try {
      const response = await axios.get('https://graph.instagram.com/me', {
        params: {
          fields: 'id,username,name,account_type,media_count,followers_count,follows_count,profile_picture_url',
          access_token: accessToken
        }
      })

      return {
        id: response.data.id,
        username: response.data.username,
        name: response.data.name,
        accountType: response.data.account_type,
        mediaCount: response.data.media_count,
        followersCount: response.data.followers_count,
        followsCount: response.data.follows_count,
        profilePictureUrl: response.data.profile_picture_url
      }
    } catch (error: any) {
      logger.error('Error fetching profile:', error.response?.data || error.message)
      throw new Error('Failed to fetch Instagram profile')
    }
  }

  /**
   * Connect Instagram account
   */
  async connectAccount(userId: string, code: string): Promise<InstagramAccount> {
    try {
      // Exchange code for short-lived token
      const { accessToken: shortToken } = await this.exchangeCodeForToken(code)

      // Get long-lived token
      const { accessToken, expiresIn } = await this.getLongLivedToken(shortToken)

      // Get profile info
      const profile = await this.getProfile(accessToken)

      // Calculate expiration date (60 days for long-lived tokens)
      const expiresAt = new Date()
      expiresAt.setSeconds(expiresAt.getSeconds() + expiresIn)

      // Check if account already exists
      const existingAccount = await storage.getByUserId(userId)
      if (existingAccount) {
        // Update existing account
        existingAccount.accessToken = accessToken
        existingAccount.expiresAt = expiresAt.toISOString()
        existingAccount.username = profile.username
        existingAccount.accountId = profile.id
        existingAccount.profile = {
          name: profile.name || profile.username,
          profilePictureUrl: profile.profilePictureUrl,
          followersCount: profile.followersCount,
          followsCount: profile.followsCount,
          mediaCount: profile.mediaCount
        }
        existingAccount.status = 'connected'
        existingAccount.lastRefreshed = new Date().toISOString()

        const updated = await storage.save(existingAccount)

        logger.info(`Instagram account reconnected: ${profile.username}`)
        return updated
      }

      // Create new account
      const account: InstagramAccount = {
        id: generateId('igacc_'),
        userId: userId,
        username: profile.username,
        accountId: profile.id,
        accessToken: accessToken,
        tokenType: 'user',
        expiresAt: expiresAt.toISOString(),
        scopes: ['instagram_basic', 'instagram_content_publish'],
        profile: {
          name: profile.name || profile.username,
          profilePictureUrl: profile.profilePictureUrl,
          followersCount: profile.followersCount,
          followsCount: profile.followsCount,
          mediaCount: profile.mediaCount
        },
        status: 'connected',
        connectedAt: new Date().toISOString()
      }

      const saved = await storage.save(account)
      logger.info(`Instagram account connected: ${profile.username}`)
      return saved
    } catch (error: any) {
      logger.error('Error connecting Instagram account:', error.message)
      throw error
    }
  }

  /**
   * Get connected account for user
   */
  async getConnectedAccount(userId: string): Promise<InstagramAccount | null> {
    return storage.getByUserId(userId)
  }

  /**
   * Disconnect Instagram account
   */
  async disconnectAccount(userId: string): Promise<boolean> {
    const account = await storage.getByUserId(userId)
    if (!account) {
      return false
    }

    await storage.disconnect(account.id)
    logger.info(`Instagram account disconnected: ${account.username}`)
    return true
  }

  /**
   * Refresh token if needed
   */
  async ensureValidToken(account: InstagramAccount): Promise<string> {
    // Check if token is expired or about to expire (within 7 days)
    if (account.expiresAt) {
      const expiryDate = new Date(account.expiresAt)
      const now = new Date()
      const daysUntilExpiry = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)

      if (daysUntilExpiry < 7) {
        try {
          const { accessToken, expiresIn } = await this.refreshAccessToken(account.accessToken)
          
          const newExpiresAt = new Date()
          newExpiresAt.setSeconds(newExpiresAt.getSeconds() + expiresIn)

          await storage.updateToken(account.id, accessToken, newExpiresAt.toISOString())
          logger.info(`Token refreshed for account: ${account.username}`)
          
          return accessToken
        } catch (error) {
          logger.error(`Failed to refresh token for ${account.username}`)
          await storage.update(account.id, { ...account, status: 'expired' })
          throw new Error('Token expired and refresh failed')
        }
      }
    }

    return account.accessToken
  }
}
