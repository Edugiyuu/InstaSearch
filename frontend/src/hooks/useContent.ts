import { useState, useEffect, useCallback } from 'react'
import { 
  getContent, 
  updateContent, 
  approveContent, 
  deleteContent 
} from '../services/api'
import type { Content } from '../types'

export function useContent() {
  const [content, setContent] = useState<Content[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchContent = useCallback(async (filters?: { 
    status?: string
    sortBy?: string 
  }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getContent(filters)
      setContent(data.content)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch content')
      console.error('Content error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const editContent = async (id: string, updates: Partial<Content>) => {
    try {
      const updated = await updateContent(id, updates)
      setContent(prev => prev.map(c => c.id === id ? updated : c))
      return updated
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to update content')
    }
  }

  const approve = async (id: string) => {
    try {
      await approveContent(id)
      await fetchContent()
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to approve content')
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteContent(id)
      setContent(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to delete content')
    }
  }

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  return { 
    content, 
    loading, 
    error, 
    editContent,
    approve,
    remove,
    refetch: fetchContent 
  }
}
