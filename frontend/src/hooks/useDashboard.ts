import { useState, useEffect } from 'react'
import { getDashboardOverview } from '../services/api'
import type { DashboardStats } from '../types'

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDashboardOverview()
      setStats(data)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard stats')
      console.error('Dashboard error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  return { stats, loading, error, refetch: fetchStats }
}
