// Modelo do fluxo tema → Short (docs/AUTO_EDIT.md).
// O frontend tem uma cópia destes tipos em frontend/src/api/shorts.ts.

export type Pace = 'calmo' | 'normal' | 'rapido' | 'frenetico'
export type EffectsLevel = 'poucos' | 'medida' | 'muitos'
/** quadrinho = 1 a 3 palavras-chave; completa = todas as palavras, uma acendendo por vez */
export type CaptionMode = 'quadrinho' | 'completa' | 'limpa' | 'sem'
export type MusicMood = 'tensa' | 'animada' | 'calma' | 'sem'
export type ImageType = 'manga' | 'anime' | 'fanart' | 'tanto-faz'

export interface ShortStyle {
  id: string
  name: string
  /** Resumo de duas ou três palavras para a galeria. */
  summary: string
  /** Texto grande que aparece na miniatura do estilo. */
  hook: string
  builtIn: boolean
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  music: MusicMood
  imageType: ImageType
  /** "Algo mais para a IA saber?" */
  notes: string
  updatedAt?: string
}

export type SceneKind = 'full' | 'evidence'
export type Effect = 'none' | 'arrow' | 'cross' | 'circle' | 'emoji'
export type Motion = 'zoom-in' | 'zoom-out' | 'shake' | 'pan'
export type ImageStatus = 'match' | 'similar' | 'missing'

export interface Beat {
  id: string
  /** Trecho da narração que toca nesta batida. */
  say: string
  /** Legenda curta (1 a 4 palavras) que aparece na tela. */
  text: string
  /** O que a imagem precisa mostrar, em linguagem natural. */
  query: string
  characters: string[]
  scene: SceneKind
  effect: Effect
  emoji?: string
  motion: Motion
  /** Área da imagem para dar zoom (ex.: "rosto", "mão"). */
  focus?: string
  imageId?: string
  imageStatus: ImageStatus
  /** Reação para a figurinha quando effect = emoji (ex.: "chocado"). */
  sticker?: string
  stickerId?: string
  /** Efeito sonoro pedido pela IA (ex.: "whoosh", "boom"). */
  sfx?: string
  sfxId?: string
  /** true quando o usuário escolheu a imagem; a montagem não troca mais. */
  locked?: boolean
}

export interface ProjectSettings {
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  /** Quem escolhe as imagens: a IA lendo o roteiro (padrão) ou a busca por palavras. */
  imagePicker?: 'ia' | 'palavras'
}

export interface AdjustEntry {
  id: string
  request: string
  reply: string
  at: string
}

/** salvo = pronto, guardado para publicar depois */
export type ProjectStatus = 'roteiro' | 'revisao' | 'salvo' | 'agendado' | 'publicado'

export interface ShortProject {
  id: string
  title: string
  theme: string
  styleId: string
  /** Duração alvo em segundos (15 a 40). */
  duration: number
  tone: string
  narration: string
  beats: Beat[]
  settings: ProjectSettings
  status: ProjectStatus
  audioFile?: string
  /** Música de fundo da biblioteca de sons; null = sem música (escolha do usuário). */
  musicId?: string | null
  /** Duração real do áudio, medida no navegador. */
  audioDuration?: number
  postCaption?: string
  history: AdjustEntry[]
  /** Versões anteriores das batidas para o "Desfazer". */
  undo: Beat[][]
  createdAt: string
  updatedAt: string
}

export interface Region {
  label: string
  /** Coordenadas de 0 a 1 relativas à imagem. */
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
  /** Projetos em que a imagem foi usada. */
  usedIn: string[]
  catalogued: boolean
  source?: string
  createdAt: string
}

/** Decisão da montagem automática, mostrada na tela 04b. */
export interface AssemblyLogEntry {
  beatId: string
  message: string
  status: ImageStatus
}

export type SoundKind = 'sfx' | 'musica'

export interface SoundItem {
  id: string
  file: string
  name: string
  kind: SoundKind
  tags: string[]
  /** Projetos em que o som foi usado. */
  usedIn: string[]
  source?: string
  createdAt: string
}
