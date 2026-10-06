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
  /** Etiquetas do Danbooru em inglês para achar a imagem na internet (hands_in_pockets, smile…). */
  searchTags?: string[]
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
  /** true quando o usuário (no editor ou pelo chat) escolheu o som; a montagem não troca mais. */
  sfxLocked?: boolean
  /** true quando o usuário escolheu a imagem; a montagem não troca mais. */
  locked?: boolean
}

export interface ProjectSettings {
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  /** Quem escolhe as imagens: a IA lendo o roteiro (padrão) ou a busca por palavras. */
  imagePicker?: 'ia' | 'palavras'
  /** Bordão de abertura (id em Biblioteca → Bordões); toca antes da narração. null = sem abertura. */
  intro?: string | null
  /**
   * Bordão do final; null = sem final. Projetos antigos guardavam true/false (o final do
   * "Seu canal"); a leitura do projeto converte (ver projects.ts).
   */
  outro?: string | null
}

export type AiProvider = 'gemini' | 'claude' | 'claude-code'

/** Quem respondeu um pedido de IA; aparece na tela. */
export interface AiCredit {
  provider: AiProvider
  model: string
  /** true quando o primeiro da fila falhou e esta IA entrou de reserva */
  fallback: boolean
  /** buscas na web feitas antes de responder */
  searches?: number
  at: string
}

export interface AdjustEntry {
  id: string
  request: string
  reply: string
  at: string
  /** IA que fez o ajuste */
  ai?: AiCredit
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

/** video = episódio ou trecho enviado; cena = um momento desse vídeo (o que entra nas batidas). */
export type MediaKind = 'imagem' | 'meme' | 'print' | 'logo' | 'figurinha' | 'video' | 'cena'

/** Andamento da divisão de um vídeo em cenas. */
export interface VideoProcessing {
  stage: 'preparando' | 'cortes' | 'catalogando' | 'pronto' | 'erro'
  /** 0 a 1 */
  progress: number
  error?: string
}

export interface LibraryImage {
  id: string
  /** Arquivo da imagem; no vídeo e nas cenas, o vídeo (as cenas dividem o arquivo do vídeo). */
  file: string
  /** Miniatura (jpg) do vídeo e das cenas. */
  thumb?: string
  /** Trecho do vídeo, em segundos (só nas cenas). */
  clip?: { start: number; end: number }
  /** Vídeo de onde a cena saiu. */
  videoId?: string
  /** Duração do vídeo, em segundos. */
  duration?: number
  /** Só no vídeo, enquanto é dividido em cenas. */
  processing?: VideoProcessing
  /** De qual anime/episódio é (ajuda a IA a reconhecer os personagens). */
  hint?: string
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
  /** Na linha 'ia': qual IA escolheu as imagens */
  ai?: AiCredit
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

/**
 * Bordão: o que abre ou fecha o vídeo (ADR 0016).
 * clipe = vídeo pronto, com o som; montado = imagem/cena da biblioteca + áudio + texto;
 * inscreva = foto, nome, frase e o botão de inscrever sendo clicado.
 */
export type CatchphraseKind = 'clipe' | 'montado' | 'inscreva'

export interface Catchphrase {
  id: string
  name: string
  kind: CatchphraseKind
  /** clipe: o vídeo; montado: o áudio. */
  file?: string
  /** Em segundos: do vídeo (clipe), do áudio (montado) ou fixa (inscreva e montado sem áudio). */
  duration: number
  /** montado: imagem ou cena da biblioteca no fundo. */
  imageId?: string
  /** montado: texto na tela; inscreva: a frase ("Se inscreve pra mais!"). */
  text?: string
  /** inscreva: o @ embaixo da foto. */
  channelName?: string
  /** inscreva: texto do botão. */
  button?: string
  /** inscreva: foto do perfil. */
  photoFile?: string
  /** Vídeos novos já começam com este bordão na abertura / no final. */
  defaultIntro?: boolean
  defaultOutro?: boolean
  createdAt: string
}
