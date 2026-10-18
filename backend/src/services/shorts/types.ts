// Modelo do fluxo tema → Short (docs/ARQUITETURA.md, "O projeto e as cenas").
// O frontend tem uma cópia destes tipos em frontend/src/api/shorts.ts.

export type Pace = 'calmo' | 'normal' | 'rapido' | 'frenetico'
export type EffectsLevel = 'poucos' | 'medida' | 'muitos'
/** Quantas figurinhas o vídeo leva (ADR 0022, 2C); a escolha feita na cena vale mais. */
export type StickerLevel = 'nenhuma' | 'poucas' | 'muitas'
export const STICKER_LEVELS: StickerLevel[] = ['nenhuma', 'poucas', 'muitas']
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

/** Tom do roteiro (ADR 0019): como a narração fala e argumenta. */
export interface Tone {
  id: string
  name: string
  /** Uma frase; aparece no chip do Novo vídeo. */
  summary: string
  /** A instrução completa que vai para a IA ("polêmico. Defenda uma opinião forte…"). */
  guide: string
  builtIn: boolean
  /** Quem escreveu: o usuário à mão ou a IA a partir de uma descrição (revisada por ele). */
  createdBy?: 'usuario' | 'ia'
  updatedAt?: string
}

export type SceneKind = 'full' | 'evidence'
export type Effect = 'none' | 'arrow' | 'cross' | 'circle' | 'emoji'
/** 'still' = parado (ADR 0037): a imagem não se mexe. */
export type Motion = 'zoom-in' | 'zoom-out' | 'shake' | 'pan' | 'still'
export const MOTIONS: Motion[] = ['zoom-in', 'zoom-out', 'shake', 'pan', 'still']
/** Como a cena entra, no corte que vem da anterior (ADR 0037). */
export type Transition = 'cut' | 'flash' | 'flash-black' | 'shake' | 'zoom'
export const TRANSITIONS: Transition[] = ['cut', 'flash', 'flash-black', 'shake', 'zoom']
/** O destaque que o usuário pode escolher (a reação é a figurinha, que tem o pop-up dela). */
export const CHOSEN_EFFECTS: Effect[] = ['none', 'arrow', 'cross', 'circle']

/**
 * Efeitos que o usuário escolheu na cena (ADR 0037). Valem por cima dos da IA, que ficam guardados
 * para o "Automático"; sem o campo, vale o da IA. focus '' = a imagem inteira, sem área.
 */
export interface ChosenEffects {
  motion?: Motion
  transition?: Transition
  focus?: string
  effect?: Effect
}
export type ChosenField = keyof ChosenEffects
export const CHOSEN_FIELDS: ChosenField[] = ['motion', 'transition', 'focus', 'effect']
export type ImageStatus = 'match' | 'similar' | 'missing'
/** Fundo escolhido na revisão: tela cheia, inteira, moldura no quadriculado ou moldura sobre a imagem (ADR 0022). */
export type FramingChoice = 'cover' | 'fit' | 'frame' | 'frame-blur'
export const FRAMING_CHOICES: FramingChoice[] = ['cover', 'fit', 'frame', 'frame-blur']

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
  /**
   * true quando o usuário escolheu a figurinha na cena (uma da biblioteca, ou nenhuma); a montagem
   * e o ajuste "Figurinhas" do vídeo não trocam mais. Figurinha escolhida aparece mesmo sem reação.
   */
  stickerLocked?: boolean
  /** Efeito sonoro pedido pela IA (ex.: "whoosh", "boom"). */
  sfx?: string
  sfxId?: string
  /** true quando o usuário (no editor ou pelo chat) escolheu o som; a montagem não troca mais. */
  sfxLocked?: boolean
  /**
   * Ajuste do volume do efeito nesta cena, multiplicado pelo volume dos efeitos do vídeo
   * (0 a 2; sem valor = 1). Vale para o som atual: com outro som, volta para 1.
   */
  sfxVolume?: number
  /** true quando o usuário escolheu a imagem; a montagem não troca mais. */
  locked?: boolean
  /**
   * Imagem diferente da cena literal (ADR 0020): um meme conhecido ou uma variação do personagem
   * (versão mulher, chibi…). A montagem procura isso primeiro nesta cena.
   */
  twist?: BeatTwist
  /**
   * Enquadramento escolhido pelo usuário na revisão: tela cheia (cover) ou a imagem inteira sobre o
   * fundo desfocado (fit). Sem valor, o automático do ADR 0020 decide pelo formato da imagem.
   */
  framing?: FramingChoice
  /** Como a cena entra (ADR 0037); sem valor, o ritmo decide (flash nos cortes do "rápido" e do "frenético"). */
  transition?: Transition
  /** Os efeitos que o usuário escolheu na cena (ADR 0037); o chat só troca quando o pedido fala deles. */
  chosen?: ChosenEffects
  /**
   * Cena da tier list (ADR 0036), no lugar da imagem: "quadro" mostra o quadro da série; "revelacao" mostra
   * o personagem e, na palavra que aponta ("aqui"), o põe na fileira.
   */
  tier?: TierScene
}

/** Os formatos de vídeo (ADR 0036): cada um muda a estrutura do roteiro; a tier list tem cena própria. */
export const VIDEO_FORMATS = ['opiniao', 'tierlist', 'versus', 'ese', 'mito', 'antesdepois'] as const
export type VideoFormat = (typeof VIDEO_FORMATS)[number]

/** As fileiras da tier list, como no TierMaker (ADR 0036, 4A). */
export const TIER_RANKS = ['S', 'A', 'B', 'C', 'D'] as const
export type TierRank = (typeof TIER_RANKS)[number]
export type TierScene = 'quadro' | 'revelacao'

/** O personagem que o vídeo da tier list ranqueia; o quadro sai dos vídeos da série (ADR 0036, 3C). */
export interface TierEntry {
  /** A série: a obra e o critério ("One Punch Man: quem é o melhor personagem"). */
  series: string
  character: string
  rank: TierRank
  /** O retrato oficial (AniList), que vai no quadro (ADR 0036, 5A). */
  portrait?: string
}

export interface BeatTwist {
  kind: 'meme' | 'variacao'
  /** O que buscar (ex.: "polnareff wheelchair meme"). */
  query: string
  /** Etiquetas do Danbooru da variação (ex.: "genderswap", "chibi"). */
  tags?: string[]
}

export interface ProjectSettings {
  pace: Pace
  effects: EffectsLevel
  caption: CaptionMode
  /** Bordão de abertura (id em Biblioteca → Bordões); toca antes da narração. null = sem abertura. */
  intro?: string | null
  /**
   * Bordão do final; null = sem final. Projetos antigos guardavam true/false (o final do
   * "Seu canal"); a leitura do projeto converte (ver projects.ts).
   */
  outro?: string | null
  /** Volume de todos os efeitos sonoros do vídeo (0 a 1; sem valor = 0,75). */
  sfxVolume?: number
  /** Quantas figurinhas (sem valor = poucas: onde a IA pôs uma reação). */
  stickers?: StickerLevel
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
  /** O que foi buscado, na ordem (ADR 0019). */
  queries?: string[]
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
  /**
   * De que obra, pessoa ou marca é o vídeo, com o nome que se busca na internet ("Cyberpunk: Edgerunners").
   * Toda busca de imagem leva esse nome, e a IA que escolhe recusa imagem de outro assunto (ADR 0024).
   * Vazio quando o vídeo não é sobre nada específico; projetos antigos não têm.
   */
  subject?: string
  /** O formato do vídeo (ADR 0036); sem o campo, opinião com provas (os de antes). */
  format?: VideoFormat
  /** Só na tier list: o personagem deste vídeo e a fileira dele. */
  tier?: TierEntry
  styleId: string
  /** Duração alvo em segundos (15 a 40). */
  duration: number
  /** Nome do tom, para mostrar. */
  tone: string
  /** O tom da biblioteca usado (ADR 0019). */
  toneId?: string
  /** Cópia da instrução do tom quando o roteiro foi escrito: editar ou apagar o tom não muda o projeto. */
  toneGuide?: string
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
  /** O que o Whisper ouviu na voz, com o tempo de cada palavra (ADR 0018). */
  transcript?: Transcript
  /** Criado sozinho (ADR 0026): a etapa e o que deu errado. Sem valor = criado à mão. */
  autopilot?: Autopilot
  createdAt: string
  updatedAt: string
}

/**
 * Etapas da criação autônoma depois que o projeto existe; `stage` é a que está rodando (ou onde parou).
 * pronto = só falta a voz, que é do usuário.
 */
export type AutopilotStage = 'montagem' | 'imagens' | 'pronto'

export interface Autopilot {
  stage: AutopilotStage
  /** Por que parou; "Continuar" segue da etapa. */
  error?: string
  /** A ideia de onde o vídeo veio. */
  ideaId?: string
  /** O debate das IAs que escolheu o tema (ADR 0027) e por que elas o acharam bom. */
  debateId?: string
  why?: string
  /** A revisão do roteiro pelas IAs (ADR 0034): se aprovou, em quantas versões e o que sobrou. */
  review?: { approved: boolean; versions: number; problems: string[] }
  startedAt: string
}

/** Um passo da revisão do roteiro (ADR 0034): uma versão da Roteirista ou a revisão da Estrategista. */
export interface ReviewStep {
  kind: 'roteiro' | 'revisao'
  version: number
  /** A narração (roteiro) ou a fala da revisora (revisão). */
  text: string
  /** Só na revisão: se aprovou e o que pediu para mudar. */
  approved?: boolean
  problems?: string[]
  ai?: AiCredit
  at: string
}

export interface ScriptReview {
  status: 'revisando' | 'aprovado' | 'reprovado' | 'erro'
  steps: ReviewStep[]
  /** O que está sendo feito agora, para a tela mostrar "escrevendo…" ou "revisando…". */
  thinking?: 'roteiro' | 'revisao'
}

/** Uma palavra ouvida pelo Whisper; tempos em segundos desde o começo do áudio. */
export interface TranscriptWord {
  text: string
  start: number
  end: number
}

export interface Transcript {
  /** O áudio transcrito; se o áudio do projeto mudar, esta transcrição não vale mais. */
  audioFile: string
  status: 'pendente' | 'transcrevendo' | 'pronto' | 'erro'
  /** Na primeira vez, o Whisper e o modelo são baixados antes de transcrever. */
  stage?: 'baixando' | 'transcrevendo'
  /** 0 a 1, da etapa atual. */
  progress?: number
  words?: TranscriptWord[]
  error?: string
  model?: string
  at?: string
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
  /** Na fila da catalogação em segundo plano (a imagem já pode ser usada). */
  cataloguing?: boolean
  /**
   * Os personagens foram conferidos: pela visão da IA na montagem, pelo usuário na biblioteca ou
   * pela fonte (etiquetas do Danbooru, retrato do AniList). Catalogada pela IA também conta (ADR 0020).
   */
  charactersChecked?: boolean
  /** Tamanho em pixels (nas cenas de vídeo, o da miniatura): decide o enquadramento no vídeo. */
  width?: number
  height?: number
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

// Personalização dos bordões (ADR 0032)
export type ButtonStyle = 'youtube' | 'instagram' | 'tiktok' | 'canal'
export type Entrance = 'pulo' | 'deslizar' | 'zoom' | 'tremida'
export type ClickStyle = 'cursor' | 'dedo' | 'pulsar' | 'nenhum'
export type SubscribePart = 'foto' | 'nome' | 'frase' | 'botao'
export type TextAnim = 'pulo' | 'digitando' | 'tremer'
export type TextPosition = 'cima' | 'meio' | 'baixo'

export interface Catchphrase {
  id: string
  name: string
  kind: CatchphraseKind
  /** clipe: o vídeo; montado e inscreva: o áudio (ADR 0032). */
  file?: string
  /** Em segundos: do vídeo (clipe), do áudio, ou escolhida de 2 a 6 s quando não há áudio (ADR 0032). */
  duration: number
  /** A música do vídeo continua baixinho durante o bordão; sem o campo, só quando o bordão não tem som próprio. */
  music?: boolean
  /** montado: imagem ou cena da biblioteca no fundo. */
  imageId?: string
  /** montado: texto na tela; inscreva: a frase ("Se inscreve pra mais!"). */
  text?: string
  /** inscreva: o @ embaixo da foto. */
  channelName?: string
  /** inscreva: texto do botão. */
  button?: string
  /** inscreva: texto do botão depois do clique ("SEGUINDO"); vazio, o app adivinha pelo do botão. */
  afterButton?: string
  /** inscreva: as cores do botão, vindas do modelo escolhido (sem o campo, o vermelho do YouTube). */
  buttonStyle?: ButtonStyle
  /** inscreva: como foto, nome, frase e botão aparecem. */
  entrance?: Entrance
  /** inscreva: como o botão é clicado. */
  click?: ClickStyle
  /** inscreva: o que aparece na tela; uma parte com false fica escondida. */
  show?: Partial<Record<SubscribePart, boolean>>
  /** montado: como o texto entra e onde fica. */
  textAnim?: TextAnim
  textPosition?: TextPosition
  /** inscreva: foto do perfil. */
  photoFile?: string
  /** Vídeos novos já começam com este bordão na abertura / no final. */
  defaultIntro?: boolean
  defaultOutro?: boolean
  createdAt: string
}
