import { FileStorage } from './FileStorage.js'
import { Analysis } from '../../models/index.js'

export class AnalysisStorage extends FileStorage<Analysis> {
  constructor() {
    super('analyses')
  }

  async findByProfileIds(profileIds: string[]): Promise<Analysis[]> {
    const analyses = await this.findAll()
    return analyses.filter(a => 
      profileIds.every(id => a.profileIds.includes(id))
    )
  }

  async findByStatus(status: Analysis['status']): Promise<Analysis[]> {
    const analyses = await this.findAll()
    return analyses.filter(a => a.status === status)
  }

  async getCompleted(): Promise<Analysis[]> {
    return this.findByStatus('completed')
  }

  async getProcessing(): Promise<Analysis[]> {
    return this.findByStatus('processing')
  }

  async updateStatus(
    id: string, 
    status: Analysis['status'], 
    results?: Analysis['results'],
    error?: string
  ): Promise<Analysis | null> {
    const updates: Partial<Analysis> = { status }
    
    if (results) {
      updates.results = results
    }
    
    if (error) {
      updates.error = error
    }
    
    if (status === 'completed') {
      updates.completedAt = new Date().toISOString()
    }
    
    return this.update(id, updates)
  }

  async getLatestForProfile(profileId: string): Promise<Analysis | null> {
    const analyses = await this.findAll()
    const profileAnalyses = analyses
      .filter(a => a.profileIds.includes(profileId) && a.status === 'completed')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    
    return profileAnalyses[0] || null
  }

  async getStats(): Promise<{
    total: number
    completed: number
    processing: number
    failed: number
  }> {
    const analyses = await this.findAll()
    
    return {
      total: analyses.length,
      completed: analyses.filter(a => a.status === 'completed').length,
      processing: analyses.filter(a => a.status === 'processing').length,
      failed: analyses.filter(a => a.status === 'failed').length,
    }
  }
}
