import { useCallback, useEffect, useMemo, useState } from 'react'
import { Catchphrase, errorMessage, LibraryImage, ShortProject, shortsApi, ShortStyle, SoundItem } from '../api/shorts'

export function useProject(id: string | undefined) {
  const [project, setProject] = useState<ShortProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!id) return
    try {
      setProject(await shortsApi.getProject(id))
      setError(null)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    setLoading(true)
    reload()
  }, [reload])

  return { project, setProject, error, loading, reload }
}

export function useProjects() {
  const [projects, setProjects] = useState<ShortProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setProjects(await shortsApi.listProjects())
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

  return { projects, loading, error, reload }
}

/** Biblioteca inteira, com um mapa por id para a prévia. */
export function useLibrary() {
  const [images, setImages] = useState<LibraryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setImages(await shortsApi.listImages())
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

  const byId = useMemo(() => new Map(images.map(i => [i.id, i])), [images])
  return { images, setImages, byId, loading, error, reload }
}

export function useStyles() {
  const [styles, setStyles] = useState<ShortStyle[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setStyles(await shortsApi.listStyles())
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

  return { styles, setStyles, loading, error, reload }
}

/** Biblioteca de sons (efeitos sonoros e músicas), com um mapa por id para a prévia. */
export function useSounds() {
  const [sounds, setSounds] = useState<SoundItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setSounds(await shortsApi.listSounds())
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

  const byId = useMemo(() => new Map(sounds.map(s => [s.id, s])), [sounds])
  return { sounds, setSounds, byId, loading, error, reload }
}

// Os bordões são os mesmos no app inteiro (biblioteca, revisão, prévia, render):
// um cache compartilhado, e quem muda avisa os outros
let catchphraseCache: Catchphrase[] | null = null
let catchphraseLoad: Promise<Catchphrase[] | null> | null = null
const catchphraseListeners = new Set<(list: Catchphrase[] | null) => void>()

/** Como o setState: aceita a lista nova ou uma função que recebe a atual (evita sobrescrever com uma lista velha). */
function publishCatchphrases(next: Catchphrase[] | ((prev: Catchphrase[]) => Catchphrase[])) {
  const list = typeof next === 'function' ? next(catchphraseCache ?? []) : next
  catchphraseCache = list
  catchphraseListeners.forEach(fn => fn(list))
}

/** Bordões (abertura e final). `loaded` diz se a lista já chegou: antes disso a prévia ainda não sabe o que tocar. */
export function useCatchphrases() {
  const [catchphrases, setCatchphrases] = useState<Catchphrase[] | null>(catchphraseCache)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    catchphraseListeners.add(setCatchphrases)
    // a lista pode ter chegado entre o render e este efeito, antes de o ouvinte existir
    if (catchphraseCache) setCatchphrases(catchphraseCache)
    else {
      catchphraseLoad ??= shortsApi.listCatchphrases().catch(e => {
        setError(errorMessage(e))
        return null
      })
      catchphraseLoad.then(list => {
        catchphraseLoad = null
        if (list) publishCatchphrases(list)
      })
    }
    return () => {
      catchphraseListeners.delete(setCatchphrases)
    }
  }, [])

  const byId = useMemo(() => new Map((catchphrases ?? []).map(c => [c.id, c])), [catchphrases])
  return { catchphrases: catchphrases ?? [], byId, loaded: catchphrases !== null, error, setCatchphrases: publishCatchphrases }
}
