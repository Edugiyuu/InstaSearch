import { useEffect, useState } from 'react'
import { shortsApi, type ShortProject, type TierBoard } from '../api/shorts'

/**
 * O quadro da tier list do vídeo (ADR 0036): os vídeos da série feitos antes dele, mais ele. Vem do servidor,
 * que conhece todos os projetos; busca de novo quando a fileira muda. `board` é null quando o vídeo não é
 * tier list; `loaded` diz se já dá para usar (o render não pode começar sem o quadro).
 */
export function useTierBoard(project: Pick<ShortProject, 'id' | 'format' | 'tier'>) {
  const isTier = project.format === 'tierlist' && !!project.tier
  const key = `${project.id}|${project.tier?.rank ?? ''}|${project.tier?.portrait ?? ''}`
  const [state, setState] = useState<{ key: string; board: TierBoard | null } | null>(null)

  useEffect(() => {
    if (!isTier) return
    let stop = false
    shortsApi
      .tierBoard(project.id)
      .then(board => !stop && setState({ key, board }))
      .catch(() => !stop && setState({ key, board: null }))
    return () => {
      stop = true
    }
  }, [project.id, isTier, key])

  if (!isTier) return { board: null, loaded: true }
  // enquanto busca o quadro da fileira nova, vale o de antes (a prévia não pisca)
  return { board: state?.board ?? null, loaded: state?.key === key }
}
