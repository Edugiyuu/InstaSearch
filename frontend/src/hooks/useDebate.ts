import { useEffect, useState } from 'react'
import { errorMessage } from '../api/shorts'
import { Debate, debateActive, ideasApi } from '../api/ideas'

/**
 * Um debate das IAs (ADR 0027): consulta a cada 2 s enquanto ele roda, para as falas aparecerem uma a uma.
 * `version`: muda quando o vídeo do debate avança na fila; aí busca de novo (o link do projeto chega depois do acordo).
 */
export function useDebate(id?: string, version?: string) {
  const [debate, setDebate] = useState<Debate | null>(null)
  const [error, setError] = useState<string | null>(null)

  // trocar de debate limpa a tela; uma versão nova só busca de novo
  useEffect(() => {
    setDebate(null)
    setError(null)
  }, [id])

  useEffect(() => {
    if (!id) return
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const load = async () => {
      try {
        const fresh = await ideasApi.debate(id)
        if (stop) return
        setDebate(fresh)
        if (debateActive(fresh)) timer = setTimeout(load, 2000)
      } catch (e) {
        if (!stop) setError(errorMessage(e))
      }
    }
    load()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [id, version])

  return { debate, error }
}
