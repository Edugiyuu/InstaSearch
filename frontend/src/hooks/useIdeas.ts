import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../api/shorts'
import { Idea, ideasApi, IdeaStatus } from '../api/ideas'

/** Banco de ideias (ADR 0021): brainstorm, ajuste do lote, guardar e descartar. */
export function useIdeas() {
  const [ideas, setIdeas] = useState<Idea[]>([])
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ideasApi
      .list()
      .then(setIdeas)
      .catch(e => setError(errorMessage(e)))
      .finally(() => setLoading(false))
  }, [])

  const brainstorm = useCallback(async (input: { seed?: string; request?: string }) => {
    setThinking(true)
    setError(null)
    try {
      setIdeas(await ideasApi.brainstorm(input))
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setThinking(false)
    }
  }, [])

  const setStatus = useCallback(async (id: string, status: IdeaStatus, discardReason?: string) => {
    try {
      const updated = await ideasApi.update(id, { status, discardReason })
      setIdeas(list => list.map(i => (i.id === id ? updated : i)))
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      await ideasApi.remove(id)
      setIdeas(list => list.filter(i => i.id !== id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  return { ideas, loading, thinking, error, brainstorm, setStatus, remove }
}
