import axios from 'axios'
import type { 
  Profile, 
  Analysis, 
  Content, 
  Post, 
  DashboardStats,
  ApiResponse 
} from '../types'

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

// Health Check
export const healthCheck = async () => {
  const { data } = await api.get('/health')
  return data
}

// Dashboard
export const getDashboardOverview = async (): Promise<DashboardStats> => {
  const { data } = await api.get<ApiResponse<DashboardStats>>('/dashboard/overview')
  return data.data!
}

// Profiles
export const getProfiles = async (params?: { 
  status?: string
  tag?: string
  search?: string 
}): Promise<{ profiles: Profile[], total: number }> => {
  const { data } = await api.get<ApiResponse<{ profiles: Profile[], total: number }>>('/profiles', { params })
  return data.data!
}

export const getProfileById = async (id: string): Promise<Profile> => {
  const { data } = await api.get<ApiResponse<Profile>>(`/profiles/${id}`)
  return data.data!
}

export const createProfile = async (profile: { 
  username: string
  tags?: string[] 
}): Promise<Profile> => {
  const { data } = await api.post<ApiResponse<Profile>>('/profiles', profile)
  return data.data!
}

export const deleteProfile = async (id: string): Promise<void> => {
  await api.delete(`/profiles/${id}`)
}

export const refreshProfile = async (id: string): Promise<void> => {
  await api.post(`/profiles/${id}/refresh`)
}

export const getProfileStats = async () => {
  const { data } = await api.get('/profiles/stats')
  return data.data
}

// Analysis
export const startAnalysis = async (payload: { 
  profileIds: string[]
  type?: string 
}): Promise<Analysis> => {
  const { data } = await api.post<ApiResponse<Analysis>>('/analysis/start', payload)
  return data.data!
}

export const getAnalyses = async (params?: { 
  status?: string 
}): Promise<{ analyses: Analysis[], total: number }> => {
  const { data } = await api.get<ApiResponse<{ analyses: Analysis[], total: number }>>('/analysis', { params })
  return data.data!
}

export const getAnalysisById = async (id: string): Promise<Analysis> => {
  const { data } = await api.get<ApiResponse<Analysis>>(`/analysis/${id}`)
  return data.data!
}

export const getAnalysesByProfile = async (profileId: string): Promise<Analysis[]> => {
  const { data } = await api.get<ApiResponse<Analysis[]>>(`/analysis/profile/${profileId}`)
  return data.data!
}

export const getAnalysisStats = async () => {
  const { data } = await api.get('/analysis/stats')
  return data.data
}

// Content
export const generateContent = async (payload: { 
  analysisId: string
  count?: number 
}) => {
  const { data } = await api.post('/content/generate', payload)
  return data.data
}

export const getContent = async (params?: { 
  status?: string
  sortBy?: string 
}): Promise<{ content: Content[], total: number }> => {
  const { data } = await api.get<ApiResponse<{ content: Content[], total: number }>>('/content', { params })
  return data.data!
}

export const getContentById = async (id: string): Promise<Content> => {
  const { data } = await api.get<ApiResponse<Content>>(`/content/${id}`)
  return data.data!
}

export const updateContent = async (id: string, updates: Partial<Content>): Promise<Content> => {
  const { data } = await api.put<ApiResponse<Content>>(`/content/${id}`, updates)
  return data.data!
}

export const approveContent = async (id: string): Promise<void> => {
  await api.post(`/content/${id}/approve`)
}

export const deleteContent = async (id: string): Promise<void> => {
  await api.delete(`/content/${id}`)
}

export const getContentStats = async () => {
  const { data } = await api.get('/content/stats')
  return data.data
}

// Posts
export const schedulePost = async (payload: {
  contentId?: string
  scheduledFor: string
  caption: string
  media?: any
}): Promise<Post> => {
  const { data } = await api.post<ApiResponse<Post>>('/posts/schedule', payload)
  return data.data!
}

export const getPosts = async (params?: { 
  status?: string 
}): Promise<{ posts: Post[], total: number }> => {
  const { data } = await api.get<ApiResponse<{ posts: Post[], total: number }>>('/posts', { params })
  return data.data!
}

export const getPostById = async (id: string): Promise<Post> => {
  const { data } = await api.get<ApiResponse<Post>>(`/posts/${id}`)
  return data.data!
}

export const getPostStats = async (id: string) => {
  const { data } = await api.get(`/posts/${id}/stats`)
  return data.data
}

export const updatePost = async (id: string, updates: Partial<Post>): Promise<Post> => {
  const { data } = await api.put<ApiResponse<Post>>(`/posts/${id}`, updates)
  return data.data!
}

export const deletePost = async (id: string): Promise<void> => {
  await api.delete(`/posts/${id}`)
}

export const getUpcomingPosts = async (limit?: number): Promise<Post[]> => {
  const { data } = await api.get<ApiResponse<Post[]>>('/posts/upcoming', { 
    params: { limit } 
  })
  return data.data!
}

export default api
