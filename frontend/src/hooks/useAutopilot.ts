import { useCallback, useEffect, useRef, useState } from 'react'
import { AutopilotJob, errorMessage, jobActive, shortsApi } from '../api/shorts'

/**
 * Os vídeos sendo criados sozinhos (ADR 0026). Acompanha a fila a cada 3 s enquanto algum está
 * rodando; `onFinish` avisa quando um termina (a ideia virou "feita", o projeto apareceu).
 */
export function useAutopilot(onFinish?: () => void) {
  const [jobs, setJobs] = useState<AutopilotJob[]>([])
  const [error, setError] = useState<string | null>(null)
  // a lista anterior, para saber quem acabou de terminar (fora do setState, que o React pode rodar duas vezes)
  const last = useRef<AutopilotJob[]>([])
  const finish = useRef(onFinish)
  finish.current = onFinish

  const refresh = useCallback(async () => {
    try {
      const fresh = await shortsApi.autopilotJobs()
      const ended = last.current.some(b => jobActive(b) && fresh.some(f => f.id === b.id && !jobActive(f)))
      last.current = fresh
      setJobs(fresh)
      if (ended) finish.current?.()
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const running = jobs.some(jobActive)
  useEffect(() => {
    if (!running) return
    const t = setInterval(refresh, 3000)
    return () => clearInterval(t)
  }, [running, refresh])

  const act = useCallback(
    async (call: () => Promise<unknown>) => {
      setError(null)
      try {
        await call()
        await refresh()
      } catch (e) {
        setError(errorMessage(e))
      }
    },
    [refresh],
  )

  /** Sem ideia, o app escolhe (ou faz um brainstorm). */
  const start = useCallback((ideaId?: string) => act(() => shortsApi.startAutopilot(ideaId)), [act])
  /** Segue um projeto que parou, da etapa onde ficou. */
  const resume = useCallback((projectId: string) => act(() => shortsApi.continueAutopilot(projectId)), [act])

  return { jobs, running, error, start, resume }
}
