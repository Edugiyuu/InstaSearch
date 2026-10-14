import { useEffect, useState } from 'react'
import { errorMessage } from '../api/shorts'
import { Debate, debateActive, ideasApi } from '../api/ideas'

/**
 * Um debate das IAs (ADR 0027): consulta a cada 1 s enquanto ele roda, para as falas aparecerem uma a uma,
 * e a cada 0,3 s nos 5 s do veto (ADR 0030), para a contagem e o que vem depois dela não atrasarem.
 * `version`: muda quando o vídeo do debate avança na fila; aí busca de novo (o link do projeto chega depois do acordo).
 */
export function useDebate(id?: string, version?: string) {
  const [debate, setDebate] = useState<Debate | null>(null)
  const [error, setError] = useState<string | null>(null)
  // o parar só vale depois da fala em andamento: a tela avisa enquanto isso
  const [stopping, setStopping] = useState(false)

  // trocar de debate limpa a tela; uma versão nova só busca de novo
  useEffect(() => {
    setDebate(null)
    setError(null)
    setStopping(false)
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
        if (debateActive(fresh)) timer = setTimeout(load, fresh.status === 'aguardando' ? 300 : 1000)
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

  const act = async (call: (id: string) => Promise<unknown>) => {
    if (!id) return false
    setError(null)
    try {
      await call(id)
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    }
  }

  return {
    debate,
    error,
    stopping,
    /** "Não gostei": tira o tema aceito, e as duas seguem debatendo. */
    veto: () => act(ideasApi.vetoDebate),
    /** Para o debate sem vídeo, depois da fala em andamento. */
    stop: async () => {
      setStopping(true)
      if (!(await act(ideasApi.stopDebate))) setStopping(false)
    },
  }
}
