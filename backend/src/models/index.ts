export interface Profile {
  id: string
  username: string
  fullName: string
  bio: string
  profilePicUrl?: string
  isVerified: boolean
  category?: string
  metrics: {
    followers: number
    following: number
    posts: number
  }
  status: 'pending' | 'analyzing' | 'completed' | 'error'
  tags: string[]
  addedAt: string
  lastAnalyzed?: string
  error?: string
}

export interface Reel {
  id: string
  profileId: string
  instagramId: string
  url: string
  caption: string
  hashtags: string[]
  metrics: {
    likes: number
    comments: number
    views: number
    shares?: number
  }
  duration: number
  thumbnail?: string
  postedAt: string
  collectedAt: string
  musicName?: string
}

export interface Analysis {
  id: string
  profileIds: string[]
  type: 'profile' | 'trend' | 'engagement' | 'comprehensive'
  status: 'processing' | 'completed' | 'failed'
  results?: {
    themes: Array<{
      name: string
      frequency: number
      keywords: string[]
    }>
    contentTypes: Array<{
      type: string
      percentage: number
      avgEngagement: number
    }>
    engagementPatterns: {
      bestPostingTimes: Array<{
        day: string
        hour: number
        score: number
      }>
      optimalDuration: {
        min: number
        max: number
        unit: string
      }
      topHashtags: Array<{
        tag: string
        count: number
        avgEngagement: number
      }>
    }
    viralPatterns: Array<{
      pattern: string
      examples: string[]
      successRate: number
    }>
    insights: string[]
    recommendations: string[]
  }
  createdAt: string
  completedAt?: string
  error?: string
}

export interface Content {
  id: string
  analysisId: string
  idea: {
    title: string
    description: string
    hook: string
    targetAudience?: string
  }
  script: {
    hook: string
    body: string
    cta: string
    estimatedDuration: number
  }
  visualSuggestions: string[]
  hashtags: string[]
  musicSuggestions?: Array<{
    name: string
    reason: string
  }>
  status: 'draft' | 'approved' | 'scheduled' | 'published'
  score: number
  metadata?: {
    basedOnProfiles: string[]
    similarContent: string[]
  }
  createdAt: string
  scheduledFor?: string
}

export interface Post {
  id: string
  contentId: string
  instagramPostId?: string
  instagramUrl?: string
  status: 'scheduled' | 'published' | 'failed'
  caption: string
  media?: {
    type: 'reel' | 'post'
    videoUrl?: string
    imageUrl?: string
    thumbnailUrl?: string
  }
  metrics?: {
    likes: number
    comments: number
    views: number
    shares: number
    saves: number
    reach?: number
    impressions?: number
  }
  scheduledFor?: string
  publishedAt?: string
  lastUpdated: string
  error?: string
}

export interface User {
  id: string
  name: string
  email: string
  password: string
  createdAt: string
  settings?: {
    autoAnalyze: boolean
    notifyOnComplete: boolean
    defaultContentCount: number
  }
}
