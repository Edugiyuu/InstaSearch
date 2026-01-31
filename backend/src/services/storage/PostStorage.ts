import { FileStorage } from './FileStorage.js'
import { Post } from '../../models/index.js'

export class PostStorage extends FileStorage<Post> {
  constructor() {
    super('posts')
  }

  async findByContentId(contentId: string): Promise<Post | null> {
    const posts = await this.findAll()
    return posts.find(p => p.contentId === contentId) || null
  }

  async findByStatus(status: Post['status']): Promise<Post[]> {
    const posts = await this.findAll()
    return posts.filter(p => p.status === status)
  }

  async getScheduled(): Promise<Post[]> {
    return this.findByStatus('scheduled')
  }

  async getPublished(): Promise<Post[]> {
    return this.findByStatus('published')
  }

  async getFailed(): Promise<Post[]> {
    return this.findByStatus('failed')
  }

  async updateStatus(id: string, status: Post['status'], error?: string): Promise<Post | null> {
    const updates: Partial<Post> = { 
      status,
      lastUpdated: new Date().toISOString()
    }
    
    if (error) {
      updates.error = error
    }
    
    if (status === 'published') {
      updates.publishedAt = new Date().toISOString()
    }
    
    return this.update(id, updates)
  }

  async updateMetrics(id: string, metrics: Post['metrics']): Promise<Post | null> {
    return this.update(id, { 
      metrics,
      lastUpdated: new Date().toISOString()
    })
  }

  async getUpcomingScheduled(limit: number = 10): Promise<Post[]> {
    const posts = await this.getScheduled()
    const now = new Date()
    
    return posts
      .filter(p => p.scheduledFor && new Date(p.scheduledFor) > now)
      .sort((a, b) => {
        const dateA = new Date(a.scheduledFor!).getTime()
        const dateB = new Date(b.scheduledFor!).getTime()
        return dateA - dateB
      })
      .slice(0, limit)
  }

  async getTotalMetrics(): Promise<{
    totalLikes: number
    totalComments: number
    totalViews: number
    totalShares: number
    totalSaves: number
    avgEngagementRate: number
  }> {
    const posts = await this.getPublished()
    
    if (posts.length === 0) {
      return {
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
        totalShares: 0,
        totalSaves: 0,
        avgEngagementRate: 0,
      }
    }

    const sum = posts.reduce((acc, post) => {
      if (!post.metrics) return acc
      
      return {
        likes: acc.likes + post.metrics.likes,
        comments: acc.comments + post.metrics.comments,
        views: acc.views + post.metrics.views,
        shares: acc.shares + post.metrics.shares,
        saves: acc.saves + post.metrics.saves,
      }
    }, { likes: 0, comments: 0, views: 0, shares: 0, saves: 0 })

    const totalEngagement = sum.likes + sum.comments + sum.shares + sum.saves
    const totalViews = sum.views || 1
    const avgEngagementRate = (totalEngagement / totalViews) * 100

    return {
      totalLikes: sum.likes,
      totalComments: sum.comments,
      totalViews: sum.views,
      totalShares: sum.shares,
      totalSaves: sum.saves,
      avgEngagementRate: Math.round(avgEngagementRate * 100) / 100,
    }
  }

  async getStats(): Promise<{
    total: number
    scheduled: number
    published: number
    failed: number
  }> {
    const posts = await this.findAll()
    
    return {
      total: posts.length,
      scheduled: posts.filter(p => p.status === 'scheduled').length,
      published: posts.filter(p => p.status === 'published').length,
      failed: posts.filter(p => p.status === 'failed').length,
    }
  }
}
