import { FileStorage } from './FileStorage.js'
import { Reel } from '../../models/index.js'

export class ReelStorage extends FileStorage<Reel> {
  constructor() {
    super('reels')
  }

  async findByProfileId(profileId: string): Promise<Reel[]> {
    const reels = await this.findAll()
    return reels.filter(r => r.profileId === profileId)
  }

  async findByHashtag(hashtag: string): Promise<Reel[]> {
    const reels = await this.findAll()
    const normalizedTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`
    return reels.filter(r => r.hashtags.includes(normalizedTag))
  }

  async getTopPerforming(limit: number = 10): Promise<Reel[]> {
    const reels = await this.findAll()
    return reels
      .sort((a, b) => {
        const engagementA = a.metrics.likes + a.metrics.comments + (a.metrics.shares || 0)
        const engagementB = b.metrics.likes + b.metrics.comments + (b.metrics.shares || 0)
        return engagementB - engagementA
      })
      .slice(0, limit)
  }

  async getAverageMetrics(profileId?: string): Promise<{
    avgLikes: number
    avgComments: number
    avgViews: number
    avgDuration: number
  }> {
    let reels = await this.findAll()
    
    if (profileId) {
      reels = reels.filter(r => r.profileId === profileId)
    }

    if (reels.length === 0) {
      return { avgLikes: 0, avgComments: 0, avgViews: 0, avgDuration: 0 }
    }

    const sum = reels.reduce((acc, reel) => ({
      likes: acc.likes + reel.metrics.likes,
      comments: acc.comments + reel.metrics.comments,
      views: acc.views + reel.metrics.views,
      duration: acc.duration + reel.duration,
    }), { likes: 0, comments: 0, views: 0, duration: 0 })

    return {
      avgLikes: Math.round(sum.likes / reels.length),
      avgComments: Math.round(sum.comments / reels.length),
      avgViews: Math.round(sum.views / reels.length),
      avgDuration: Math.round(sum.duration / reels.length),
    }
  }

  async getMostUsedHashtags(limit: number = 20): Promise<Array<{ tag: string; count: number }>> {
    const reels = await this.findAll()
    const hashtagCount = new Map<string, number>()

    reels.forEach(reel => {
      reel.hashtags.forEach(tag => {
        hashtagCount.set(tag, (hashtagCount.get(tag) || 0) + 1)
      })
    })

    return Array.from(hashtagCount.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
  }
}
