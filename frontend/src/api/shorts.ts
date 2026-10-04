// Cliente do fluxo tema → Short. Os tipos espelham backend/src/services/shorts/types.ts.
import api from '../services/api'

export type Pace = 'calmo' | 'normal' | 'rapido' | 'frenetico'
export type EffectsLevel = 'poucos' | 'medida' | 'muitos'
export type CaptionMode = 'quadrinho' | 'completa' | 'limpa' | 'sem'
export type MusicMood = 'tensa' | 'animada' | 'calma' | 'sem'
export type ImageType = 'manga' | 'anime' | 'fanart' | 'tanto-faz'

export interface ShortStyle {
  id: string
  name: string
  summary: string
  hook: string
  builtIn: boolean
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  music: MusicMood
  imageType: ImageType
  notes: string
}

export type SceneKind = 'full' | 'evidence'
export type Effect = 'none' | 'arrow' | 'cross' | 'circle' | 'emoji'
export type Motion = 'zoom-in' | 'zoom-out' | 'shake' | 'pan'
export type ImageStatus = 'match' | 'similar' | 'missing'

export interface Beat {
  id: string
  say: string
  text: string
  query: string
  characters: string[]
  scene: SceneKind
  effect: Effect
  emoji?: string
  motion: Motion
  focus?: string
  imageId?: string
  imageStatus: ImageStatus
  sticker?: string
  stickerId?: string
  sfx?: string
  sfxId?: string
  locked?: boolean
}

export type ImagePicker = 'ia' | 'palavras'

export interface ProjectSettings {
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  /** Quem escolhe as imagens: a IA lendo o roteiro (padrão) ou a busca por palavras. */
  imagePicker?: ImagePicker
}

export interface AdjustEntry {
  id: string
  request: string
  reply: string
  at: string
}

export type ProjectStatus = 'roteiro' | 'revisao' | 'salvo' | 'agendado' | 'publicado'

export interface ShortProject {
  id: string
  title: string
  theme: string
  styleId: string
  duration: number
  tone: string
  narration: string
  beats: Beat[]
  settings: ProjectSettings
  status: ProjectStatus
  audioFile?: string
  /** null = sem música (escolha do usuário); undefined = a montagem escolhe */
  musicId?: string | null
  audioDuration?: number
  postCaption?: string
  history: AdjustEntry[]
  undo: Beat[][]
  createdAt: string
  updatedAt: string
}

export interface Region {
  label: string
  x: number
  y: number
  w: number
  h: number
}

export type MediaKind = 'imagem' | 'meme' | 'print' | 'logo' | 'figurinha'

export interface LibraryImage {
  id: string
  file: string
  name: string
  kind: MediaKind
  characters: string[]
  tags: string[]
  description: string
  regions: Region[]
  usedIn: string[]
  catalogued: boolean
  source?: string
  createdAt: string
}

export type SoundKind = 'sfx' | 'musica'

export interface SoundItem {
  id: string
  file: string
  name: string
  kind: SoundKind
  tags: string[]
  usedIn: string[]
  source?: string
  createdAt: string
}

export interface AssemblyLogEntry {
  beatId: string
  message: string
  status: ImageStatus
}

export const imageUrl = (img: Pick<LibraryImage, 'file'>) => `/api/library/files/${img.file}`
export const soundUrl = (s: Pick<SoundItem, 'file'>) => `/api/sounds/files/${s.file}`
export const audioUrl = (p: Pick<ShortProject, 'audioFile'>) => (p.audioFile ? `/api/shorts/audio/${p.audioFile}` : undefined)

/** Mensagem de erro legível a partir de um erro do axios. */
export function errorMessage(error: unknown): string {
  const e = error as { response?: { data?: { error?: { message?: string } } }; message?: string }
  return e.response?.data?.error?.message ?? e.message ?? 'Algo deu errado'
}

const data = <T,>(p: Promise<{ data: { data: T } }>) => p.then(r => r.data.data)

export const shortsApi = {
  listProjects: () => data<ShortProject[]>(api.get('/shorts/projects')),
  getProject: (id: string) => data<ShortProject>(api.get(`/shorts/projects/${id}`)),
  createProject: (input: { theme: string; styleId: string; duration: number; tone: string; narration?: string }) =>
    data<ShortProject>(api.post('/shorts/projects', input, { timeout: 180000 })),
  updateProject: (id: string, changes: Partial<ShortProject>) => data<ShortProject>(api.put(`/shorts/projects/${id}`, changes)),
  deleteProject: (id: string) => api.delete(`/shorts/projects/${id}`),
  assemble: (id: string) => data<{ project: ShortProject; log: AssemblyLogEntry[] }>(api.post(`/shorts/projects/${id}/assemble`)),
  adjust: (id: string, request: string) => data<ShortProject>(api.post(`/shorts/projects/${id}/adjust`, { request })),
  undo: (id: string) => data<ShortProject>(api.post(`/shorts/projects/${id}/undo`)),
  setBeatImage: (id: string, beatId: string, imageId: string | null) =>
    data<ShortProject>(api.put(`/shorts/projects/${id}/beats/${beatId}/image`, { imageId })),
  uploadAudio: (id: string, file: File) => {
    const form = new FormData()
    form.append('audio', file)
    return data<ShortProject>(api.post(`/shorts/projects/${id}/audio`, form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },

  aiStatus: () => data<AiStatus>(api.get('/shorts/ai-status')),
  listStyles: () => data<ShortStyle[]>(api.get('/shorts/styles')),
  saveStyle: (style: ShortStyle) =>
    data<ShortStyle>(style.builtIn || !style.id ? api.post('/shorts/styles', style) : api.put(`/shorts/styles/${style.id}`, style)),
  deleteStyle: (id: string) => api.delete(`/shorts/styles/${id}`),

  listImages: (q = '') => data<LibraryImage[]>(api.get('/library', { params: q ? { q } : {} })),
  uploadImages: (files: File[], kind?: MediaKind) => {
    const form = new FormData()
    if (kind) form.append('kind', kind)
    files.forEach(f => form.append('images', f, f.name || 'colada.png'))
    return data<LibraryImage[]>(
      api.post('/library/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }),
    )
  },
  importImageUrl: (url: string) => data<LibraryImage>(api.post('/library/import-url', { url })),
  updateImage: (id: string, changes: Partial<LibraryImage>) => data<LibraryImage>(api.put(`/library/${id}`, changes)),
  recatalogImage: (id: string) => data<LibraryImage>(api.post(`/library/${id}/recatalog`)),
  deleteImage: (id: string) => api.delete(`/library/${id}`),

  listSounds: (kind?: SoundKind) => data<SoundItem[]>(api.get('/sounds', { params: kind ? { kind } : {} })),
  uploadSounds: (files: File[], kind: SoundKind) => {
    const form = new FormData()
    form.append('kind', kind)
    files.forEach(f => form.append('sounds', f, f.name))
    return data<SoundItem[]>(api.post('/sounds/upload', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }))
  },
  importSoundUrl: (url: string, kind: SoundKind) =>
    data<SoundItem>(api.post('/sounds/import-url', { url, kind }, { timeout: 240000 })),
  updateSound: (id: string, changes: Partial<SoundItem>) => data<SoundItem>(api.put(`/sounds/${id}`, changes)),
  deleteSound: (id: string) => api.delete(`/sounds/${id}`),
}

export interface AiStatus {
  mode: string
  gemini: { configured: boolean; model: string; pausedUntil: string | null }
  claude: { configured: boolean; model: string }
  claudeCode: { enabled: boolean; model: string }
}

export const PICKER_LABEL: Record<ImagePicker, string> = { ia: 'IA lê o roteiro', palavras: 'Por palavras' }

export const PACE_LABEL: Record<Pace, string> = { calmo: 'Calmo', normal: 'Normal', rapido: 'Rápido', frenetico: 'Frenético' }
export const EFFECTS_LABEL: Record<EffectsLevel, string> = { poucos: 'Poucos', medida: 'Na medida', muitos: 'Muitos' }
export const CAPTION_LABEL: Record<CaptionMode, string> = { quadrinho: 'Quadrinho', completa: 'Completa', limpa: 'Limpa', sem: 'Sem legenda' }
export const MUSIC_LABEL: Record<MusicMood, string> = { tensa: 'Tensa', animada: 'Animada', calma: 'Calma', sem: 'Sem música' }
export const IMAGE_TYPE_LABEL: Record<ImageType, string> = { manga: 'Mangá', anime: 'Anime', fanart: 'Fanart', 'tanto-faz': 'Tanto faz' }

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  roteiro: 'Roteiro',
  revisao: 'Em revisão',
  salvo: 'Salvo',
  agendado: 'Agendado',
  publicado: 'Publicado',
}

/** Batidas que ainda precisam de uma imagem escolhida pelo usuário. */
export const beatsNeedingImage = (p: ShortProject) => p.beats.filter(b => !b.locked && b.imageStatus !== 'match')

/** Texto e cor do status de um projeto nas listas. */
export function projectStatus(p: ShortProject) {
  const pending = beatsNeedingImage(p).length
  if (p.status === 'revisao' && pending) return { text: `${pending} ${pending === 1 ? 'cena precisa' : 'cenas precisam'} de imagem`, cls: 'c-danger' }
  if (p.status === 'revisao') return { text: 'Pronto para revisar', cls: 'c-success' }
  if (p.status === 'roteiro') return { text: p.audioFile ? 'Pronto para montar' : 'Roteiro · falta a voz', cls: 'c-warning' }
  if (p.status === 'salvo') return { text: 'Salvo · publicar depois', cls: 'c-accent' }
  return { text: STATUS_LABEL[p.status], cls: p.status === 'publicado' ? 'c-success' : 'c-scheduled' }
}

/** Para onde levar o usuário ao abrir um projeto. */
export const projectHome = (p: ShortProject) => (p.status === 'roteiro' ? `/projeto/${p.id}/roteiro` : `/projeto/${p.id}`)

/** Cor estável a partir de um texto (capas de projeto sem imagem). */
export function hueOf(text: string) {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
