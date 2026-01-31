import { useState, useEffect, useCallback } from 'react'
import { getPosts, getUpcomingPosts, updatePost, deletePost } from '../services/api'
import type { Post } from '../types'

export function usePosts() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async (filters?: { status?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getPosts(filters)
      setPosts(data.posts)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch posts')
      console.error('Posts error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchUpcoming = useCallback(async (limit?: number) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getUpcomingPosts(limit)
      setPosts(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch upcoming posts')
      console.error('Upcoming posts error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const editPost = async (id: string, updates: Partial<Post>) => {
    try {
      const updated = await updatePost(id, updates)
      setPosts(prev => prev.map(p => p.id === id ? updated : p))
      return updated
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to update post')
    }
  }

  const remove = async (id: string) => {
    try {
      await deletePost(id)
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to delete post')
    }
  }

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  return { 
    posts, 
    loading, 
    error, 
    editPost,
    remove,
    fetchUpcoming,
    refetch: fetchPosts 
  }
}
