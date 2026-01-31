import { FileStorage } from './FileStorage.js'
import { Profile } from '../../models/index.js'

export class ProfileStorage extends FileStorage<Profile> {
  constructor() {
    super('profiles')
  }

  async findByUsername(username: string): Promise<Profile | null> {
    const profiles = await this.findAll()
    return profiles.find(p => p.username.toLowerCase() === username.toLowerCase()) || null
  }

  async findByStatus(status: Profile['status']): Promise<Profile[]> {
    const profiles = await this.findAll()
    return profiles.filter(p => p.status === status)
  }

  async findByTag(tag: string): Promise<Profile[]> {
    const profiles = await this.findAll()
    return profiles.filter(p => p.tags.includes(tag))
  }

  async getActive(): Promise<Profile[]> {
    return this.findByStatus('completed')
  }

  async updateStatus(id: string, status: Profile['status'], error?: string): Promise<Profile | null> {
    const updates: Partial<Profile> = { status }
    if (error) {
      updates.error = error
    }
    if (status === 'completed') {
      updates.lastAnalyzed = new Date().toISOString()
    }
    return this.update(id, updates)
  }

  async search(query: string): Promise<Profile[]> {
    const profiles = await this.findAll()
    const lowerQuery = query.toLowerCase()
    
    return profiles.filter(p => 
      p.username.toLowerCase().includes(lowerQuery) ||
      p.fullName.toLowerCase().includes(lowerQuery) ||
      p.bio.toLowerCase().includes(lowerQuery) ||
      p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    )
  }

  async getStats(): Promise<{
    total: number
    active: number
    analyzing: number
    pending: number
    error: number
  }> {
    const profiles = await this.findAll()
    
    return {
      total: profiles.length,
      active: profiles.filter(p => p.status === 'completed').length,
      analyzing: profiles.filter(p => p.status === 'analyzing').length,
      pending: profiles.filter(p => p.status === 'pending').length,
      error: profiles.filter(p => p.status === 'error').length,
    }
  }
}
