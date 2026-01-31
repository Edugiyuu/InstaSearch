import { useState, useEffect, useCallback } from 'react'
import { getAnalyses, startAnalysis } from '../services/api'
import type { Analysis } from '../types'

export function useAnalysis() {
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalyses = useCallback(async (filters?: { status?: string }) => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAnalyses(filters)
      setAnalyses(data.analyses)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch analyses')
      console.error('Analysis error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const createAnalysis = async (profileIds: string[], type?: string) => {
    try {
      const newAnalysis = await startAnalysis({ profileIds, type })
      setAnalyses(prev => [newAnalysis, ...prev])
      return newAnalysis
    } catch (err: any) {
      throw new Error(err.response?.data?.error?.message || 'Failed to start analysis')
    }
  }

  useEffect(() => {
    fetchAnalyses()
  }, [fetchAnalyses])

  return { 
    analyses, 
    loading, 
    error, 
    createAnalysis,
    refetch: fetchAnalyses 
  }
}
