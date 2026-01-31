// Types do Frontend (espelhando o backend)

export interface Profile {
  id: string
  username: string
  fullName: string
  bio: string
  profilePicture?: string
  isVerified: boolean
  metrics: {
    followers: number
    following: number
    posts: number
  }
  status: 'pending' | 'active' | 'analyzing' | 'error'
  tags: string[]
  addedAt: string
  lastAnalyzed?: string
  error?: string
}

export interface Reel {
  id: string
  profileId: string
  url: string
  caption: string
  hashtags: string[]
  metrics: {
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
  }
  postedAt: string
  scrapedAt: string
}

export interface Analysis {
  id: string
  profileIds: string[]
  type: 'quick' | 'comprehensive' | 'competitive'
  status: 'processing' | 'completed' | 'failed'
  results?: {
    commonThemes: string[]
    topHashtags: string[]
    avgEngagementRate: number
    bestPostingTimes: string[]
    contentPillars: string[]
    recommendations: string[]
  }
  error?: string
  createdAt: string
  completedAt?: string
}

export interface Content {
  id: string
  analysisId: string
  type: 'reel' | 'post' | 'story'
  caption: string
  hashtags: string[]
  hooks: string[]
  cta: string
  topics: string[]
  status: 'draft' | 'approved' | 'scheduled' | 'published'
  score: number
  feedback?: string
  createdAt: string
  scheduledFor?: string
}

export interface Post {
  id: string
  contentId: string
  status: 'scheduled' | 'publishing' | 'published' | 'failed'
  caption: string
  media?: {
    type: 'image' | 'video'
    url: string
  }
  scheduledFor: string
  publishedAt?: string
  instagramId?: string
  metrics?: {
    views: number
    likes: number
    comments: number
    shares: number
    saves: number
  }
  error?: string
  lastUpdated: string
}

export interface DashboardStats {
  profiles: {
    total: number
    active: number
    analyzing: number
  }
  content: {
    total: number
    drafts: number
    scheduled: number
    published: number
  }
  performance: {
    totalViews: number
    totalLikes: number
    avgEngagementRate: number
  }
  analyses: {
    total: number
    completed: number
    processing: number
    failed: number
  }
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
}
