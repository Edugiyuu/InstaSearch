import { FileStorage } from './FileStorage.js'

export interface InstagramAccount {
  id: string
  userId: string
  username: string
  accountId: string
  accessToken: string
  tokenType: 'user' | 'page'
  expiresAt?: string
  refreshToken?: string
  scopes: string[]
  profile?: {
    name: string
    profilePictureUrl?: string
    followersCount?: number
    followsCount?: number
    mediaCount?: number
  }
  status: 'connected' | 'expired' | 'error'
  connectedAt: string
  lastRefreshed?: string
  error?: string
}

export class InstagramAccountStorage extends FileStorage<InstagramAccount> {
  constructor() {
    super('instagram_accounts')
  }

  async getByUserId(userId: string): Promise<InstagramAccount | null> {
    const accounts = await this.findAll()
    return accounts.find((acc: InstagramAccount) => acc.userId === userId) || null
  }

  async getByUsername(username: string): Promise<InstagramAccount | null> {
    const accounts = await this.findAll()
    return accounts.find((acc: InstagramAccount) => acc.username === username) || null
  }

  async updateToken(id: string, token: string, expiresAt?: string): Promise<InstagramAccount | null> {
    const account = await this.findById(id)
    if (!account) return null

    account.accessToken = token
    account.expiresAt = expiresAt
    account.lastRefreshed = new Date().toISOString()
    account.status = 'connected'

    return this.save(account)
  }

  async disconnect(id: string): Promise<boolean> {
    try {
      const account = await this.findById(id)
      if (!account) return false
      await this.delete(id)
      return true
    } catch {
      return false
    }
  }
}
