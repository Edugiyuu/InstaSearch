import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../api/shorts'
import { insightsApi, MetricsOverview } from '../api/insights'

/** Métricas dos vídeos publicados (ADR 0021), com o botão de atualizar. */
export function useMetrics() {
  const [overview, setOverview] = useState<MetricsOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setOverview(await insightsApi.metrics())
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    setError(null)
    try {
      setOverview(await insightsApi.refresh())
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }, [])

  return { overview, loading, refreshing, error, refresh, reload }
}
