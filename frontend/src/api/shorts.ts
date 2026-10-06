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
  /** Etiquetas do Danbooru que a IA escreveu para achar a imagem na internet */
  searchTags?: string[]
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
  /** o usuário escolheu o som (editor ou chat); a montagem não troca */
  sfxLocked?: boolean
  locked?: boolean
}

export type ImagePicker = 'ia' | 'palavras'

export interface ProjectSettings {
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  /** Quem escolhe as imagens: a IA lendo o roteiro (padrão) ou a busca por palavras. */
  imagePicker?: ImagePicker
  /** Bordão de abertura (Biblioteca → Bordões); toca antes da narração. null = sem abertura. */
  intro?: string | null
  /** Bordão do final; null = sem final. */
  outro?: string | null
}

/** Quem respondeu um pedido de IA (salvo no projeto pelo backend). */
export interface AiCredit {
  provider: 'gemini' | 'claude' | 'claude-code'
  model: string
  /** o primeiro da fila falhou e esta IA entrou de reserva */
  fallback: boolean
  /** buscas na web feitas antes de responder */
  searches?: number
  at: string
}

/** "claude-sonnet-5-5" → "Claude Sonnet 5.5"; "gemini-2.5-flash" → "Gemini 2.5 Flash" */
export function aiName(ai: AiCredit) {
  const pretty = ai.model
    .replace(/^claude-/, 'Claude ')
    .replace(/-(\d+)-(\d+)$/, ' $1.$2')
    .replace(/^gemini-/, 'Gemini ')
    .split(/[\s-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
  const where = ai.provider === 'claude-code' ? ' (seu plano)' : ai.provider === 'claude' ? ' (API)' : ''
  return pretty + where
}

/** Detalhes que aparecem junto do nome: reserva e buscas na web. */
export function aiDetails(ai: AiCredit) {
  const parts: string[] = []
  if (ai.fallback) parts.push('reserva, o Gemini estava fora')
  if (ai.searches !== undefined) {
    parts.push(ai.searches === 0 ? 'sem pesquisar na web' : `${ai.searches} ${ai.searches === 1 ? 'busca' : 'buscas'} na web`)
  }
  return parts
}

export interface AdjustEntry {
  id: string
  request: string
  reply: string
  at: string
  ai?: AiCredit
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
  /** Último MP4 renderizado; key = hash da composição (muda quando o vídeo muda). */
  render?: { file: string; key: string; at: string }
  /** Onde o vídeo já foi publicado. */
  published?: {
    instagram?: { id: string; url?: string; at: string }
    youtube?: { id: string; url: string; at: string }
  }
  history: AdjustEntry[]
  /** Qual IA escreveu o roteiro e qual escolheu as imagens. */
  ai?: { script?: AiCredit; images?: AiCredit }
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

/** video = episódio ou trecho enviado; cena = um momento desse vídeo (o que entra nas batidas). */
export type MediaKind = 'imagem' | 'meme' | 'print' | 'logo' | 'figurinha' | 'video' | 'cena'

export interface VideoProcessing {
  stage: 'preparando' | 'cortes' | 'catalogando' | 'pronto' | 'erro'
  progress: number
  error?: string
}

/** Sugestão da internet para uma cena (GET /library/web-search). */
export interface WebImage {
  id: string
  thumb: string
  url: string
  width?: number
  height?: number
  source: 'google' | 'web' | 'manga' | 'anilist' | 'danbooru'
  title: string
  page?: string
  characters?: string[]
}

export interface WebSearchResult {
  images: WebImage[]
  searched: string[]
  google: boolean
}

export const WEB_SOURCE_LABEL: Record<WebImage['source'], string> = {
  google: 'Google',
  web: 'Internet',
  manga: 'Mangá',
  anilist: 'Arte oficial',
  danbooru: 'Danbooru',
}

export interface LibraryImage {
  id: string
  /** Arquivo da imagem; no vídeo e nas cenas, o vídeo. */
  file: string
  /** Miniatura do vídeo e das cenas. */
  thumb?: string
  /** Trecho do vídeo, em segundos (só nas cenas). */
  clip?: { start: number; end: number }
  videoId?: string
  duration?: number
  processing?: VideoProcessing
  hint?: string
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
  /** Na linha 'ia': qual IA escolheu as imagens */
  ai?: AiCredit
}

/** O que se mostra como imagem: a miniatura nos vídeos e cenas, o próprio arquivo nas imagens. */
export const imageUrl = (img: Pick<LibraryImage, 'file' | 'thumb'>) => `/api/library/files/${img.thumb ?? img.file}`
/** O arquivo em si (o vídeo, nas cenas). */
export const mediaUrl = (img: Pick<LibraryImage, 'file'>) => `/api/library/files/${img.file}`
export const isClip = (img: Pick<LibraryImage, 'kind'>) => img.kind === 'cena'
/** Miniatura de uma sugestão da internet, carregada pelo backend (o CDN do Danbooru recusa o navegador). */
export const webThumbUrl = (img: Pick<WebImage, 'thumb'>) => `/api/library/web-thumb?url=${encodeURIComponent(img.thumb)}`
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
  /** Efeito sonoro de uma cena: id de um som, null = sem som, 'auto' = a montagem escolhe. */
  setBeatSfx: (id: string, beatId: string, sfxId: string | null) =>
    data<ShortProject>(api.put(`/shorts/projects/${id}/beats/${beatId}/sfx`, { sfxId })),
  /** Busca na internet e coloca imagem em todas as cenas que precisam (sem gastar IA). */
  autoImages: (id: string) =>
    data<{ project: ShortProject; added: number; total: number; results: { beatId: string; ok: boolean; message: string }[] }>(
      api.post(`/shorts/projects/${id}/auto-images`, {}, { timeout: 300000 }),
    ),
  uploadAudio: (id: string, file: File) => {
    const form = new FormData()
    form.append('audio', file)
    return data<ShortProject>(api.post(`/shorts/projects/${id}/audio`, form, { headers: { 'Content-Type': 'multipart/form-data' } }))
  },

  /** Começa o render em MP4 com as props da prévia (ou devolve o MP4 que já bate com elas). */
  startRender: (id: string, props: Record<string, unknown>) => data<RenderJob>(api.post(`/shorts/projects/${id}/render`, { props })),
  getRender: (id: string, key?: string) => data<RenderJob | null>(api.get(`/shorts/projects/${id}/render`, { params: key ? { key } : {} })),
  publishInstagram: (id: string, caption: string) =>
    data<ShortProject>(api.post(`/shorts/projects/${id}/publish/instagram`, { caption }, { timeout: 600000 })),
  publishYouTube: (id: string, input: { title: string; description: string; privacy: YouTubePrivacy }) =>
    data<ShortProject>(api.post(`/shorts/projects/${id}/publish/youtube`, input, { timeout: 1200000 })),

  listCatchphrases: () => data<Catchphrase[]>(api.get('/catchphrases')),
  /** O clipe já vai com o vídeo; o montado e o "se inscreve" se completam depois. */
  createCatchphrase: (kind: CatchphraseKind, file?: File) => {
    const form = new FormData()
    form.append('kind', kind)
    if (file) form.append('file', file, file.name)
    return data<Catchphrase>(api.post('/catchphrases', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }))
  },
  updateCatchphrase: (id: string, changes: Partial<Catchphrase>) => data<Catchphrase>(api.put(`/catchphrases/${id}`, changes)),
  /** O vídeo (clipe), o áudio (montado) ou a foto (se inscreve). */
  replaceCatchphraseFile: (id: string, file: File) => {
    const form = new FormData()
    form.append('file', file, file.name)
    return data<Catchphrase>(api.post(`/catchphrases/${id}/file`, form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }))
  },
  catchphrasePhotoFromInstagram: (id: string) => data<Catchphrase>(api.post(`/catchphrases/${id}/photo/instagram`, {}, { timeout: 30000 })),
  deleteCatchphrase: (id: string) => api.delete(`/catchphrases/${id}`),

  youtubeStatus: () => data<YouTubeStatus>(api.get('/youtube/status')),
  youtubeAuthUrl: () => data<{ url: string }>(api.get('/youtube/auth-url')),
  youtubeDisconnect: () => api.delete('/youtube/account'),

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
  /** Envia um episódio ou trecho; a divisão em cenas continua no servidor (acompanhe por listImages). */
  uploadVideo: (file: File, hint: string, onProgress?: (p: number) => void) => {
    const form = new FormData()
    form.append('hint', hint)
    form.append('video', file, file.name)
    return data<LibraryImage>(
      api.post('/library/upload-video', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 0,
        onUploadProgress: e => onProgress?.(e.total ? e.loaded / e.total : 0),
      }),
    )
  },
  reprocessVideo: (id: string) => data<LibraryImage>(api.post(`/library/${id}/reprocess`)),
  importImageUrl: (url: string, extra: { fallbackUrl?: string; name?: string; characters?: string[] } = {}) =>
    data<LibraryImage>(api.post('/library/import-url', { url, ...extra }, { timeout: 120000 })),
  searchWebImages: (q: string, opts: { characters?: string[]; tags?: string[]; context?: string; page?: number; projectId?: string } = {}) =>
    data<WebSearchResult>(
      api.get('/library/web-search', {
        params: {
          q,
          characters: (opts.characters ?? []).join(','),
          tags: (opts.tags ?? []).join(','),
          context: opts.context ?? '',
          page: opts.page ?? 1,
          projectId: opts.projectId ?? '',
        },
        timeout: 45000,
      }),
    ),
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

/** Link de download do MP4 renderizado. */
export const videoDownloadUrl = (projectId: string, key: string) => `/api/shorts/projects/${projectId}/video?v=${key}`

/** clipe = vídeo pronto com o som; montado = imagem/cena + áudio + texto; inscreva = foto, nome, frase e botão (ADR 0016). */
export type CatchphraseKind = 'clipe' | 'montado' | 'inscreva'

/** Bordão: o que abre ou fecha o vídeo. */
export interface Catchphrase {
  id: string
  name: string
  kind: CatchphraseKind
  /** clipe: o vídeo; montado: o áudio */
  file?: string
  /** em segundos */
  duration: number
  /** montado: imagem ou cena da biblioteca no fundo */
  imageId?: string
  /** montado: texto na tela; inscreva: a frase */
  text?: string
  channelName?: string
  button?: string
  photoFile?: string
  defaultIntro?: boolean
  defaultOutro?: boolean
  createdAt: string
}

export const CATCHPHRASE_KIND_LABEL: Record<CatchphraseKind, string> = { clipe: 'Clipe pronto', montado: 'Montado', inscreva: 'Se inscreve' }

export const catchphraseFileUrl = (file?: string) => (file ? `/api/catchphrases/files/${file}` : undefined)

export interface RenderJob {
  key: string
  stage: 'bundle' | 'render' | 'done' | 'error'
  /** 0 a 1 */
  progress: number
  error?: string
}

export type YouTubePrivacy = 'public' | 'unlisted' | 'private'

export interface YouTubeStatus {
  configured: boolean
  account: { channelId: string; channelTitle: string; thumbnail?: string; connectedAt: string } | null
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
