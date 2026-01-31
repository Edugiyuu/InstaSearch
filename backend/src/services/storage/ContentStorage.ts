import { FileStorage } from './FileStorage.js'
import { Content } from '../../models/index.js'

export class ContentStorage extends FileStorage<Content> {
  constructor() {
    super('content')
  }

  async findByAnalysisId(analysisId: string): Promise<Content[]> {
    const contents = await this.findAll()
    return contents.filter(c => c.analysisId === analysisId)
  }

  async findByStatus(status: Content['status']): Promise<Content[]> {
    const contents = await this.findAll()
    return contents.filter(c => c.status === status)
  }

  async getDrafts(): Promise<Content[]> {
    return this.findByStatus('draft')
  }

  async getApproved(): Promise<Content[]> {
    return this.findByStatus('approved')
  }

  async getScheduled(): Promise<Content[]> {
    return this.findByStatus('scheduled')
  }

  async getPublished(): Promise<Content[]> {
    return this.findByStatus('published')
  }

  async updateStatus(id: string, status: Content['status']): Promise<Content | null> {
    return this.update(id, { status })
  }

  async approve(id: string): Promise<Content | null> {
    return this.updateStatus(id, 'approved')
  }

  async schedule(id: string, scheduledFor: string): Promise<Content | null> {
    return this.update(id, { 
      status: 'scheduled',
      scheduledFor 
    })
  }

  async getTopScoring(limit: number = 10): Promise<Content[]> {
    const contents = await this.findAll()
    return contents
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
  }

  async searchByTopic(topic: string): Promise<Content[]> {
    const contents = await this.findAll()
    const lowerTopic = topic.toLowerCase()
    
    return contents.filter(c => 
      c.idea.title.toLowerCase().includes(lowerTopic) ||
      c.idea.description.toLowerCase().includes(lowerTopic) ||
      c.hashtags.some(tag => tag.toLowerCase().includes(lowerTopic))
    )
  }

  async getStats(): Promise<{
    total: number
    drafts: number
    approved: number
    scheduled: number
    published: number
    avgScore: number
  }> {
    const contents = await this.findAll()
    const avgScore = contents.length > 0
      ? contents.reduce((sum, c) => sum + c.score, 0) / contents.length
      : 0
    
    return {
      total: contents.length,
      drafts: contents.filter(c => c.status === 'draft').length,
      approved: contents.filter(c => c.status === 'approved').length,
      scheduled: contents.filter(c => c.status === 'scheduled').length,
      published: contents.filter(c => c.status === 'published').length,
      avgScore: Math.round(avgScore * 10) / 10,
    }
  }
}
