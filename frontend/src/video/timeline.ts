import type { Beat, ButtonStyle, Transition, Catchphrase, ClickStyle, Entrance, LibraryImage, ProjectSettings, Region, ShortProject, Silence, SoundItem, SubscribePart, TextAnim, TextPosition, TierBoard } from '../api/shorts'
import { afterButtonText, audioUrl, catchphraseFileUrl, catchphraseHasSound, DEFAULT_PIVOT_VOLUME, imageUrl, mediaUrl, pivotTrim, soundUrl } from '../api/shorts'
import { alignWords, type WordTime } from './align'

export const FPS = 30
export const WIDTH = 1080
export const HEIGHT = 1920

/** Volume dos efeitos sonoros quando o usuário não mexeu (o fixo de antes). */
export const DEFAULT_SFX_VOLUME = 0.75

/** Volume do efeito de uma cena: o do vídeo vezes o ajuste da cena (acima de 1, o Remotion amplifica). */
export const sfxVolume = (settings: ProjectSettings, beat: Beat) => (settings.sfxVolume ?? DEFAULT_SFX_VOLUME) * (beat.sfxVolume ?? 1)

/**
 * Os efeitos que valem no vídeo (ADR 0037): os escolhidos pelo usuário, por cima dos da IA.
 * focus '' escolhido = a imagem inteira, sem área. O mesmo cálculo do `effectiveBeat` do servidor.
 */
export function effectiveBeat(beat: Beat): Beat {
  const c = beat.chosen
  if (!c) return beat
  return {
    ...beat,
    motion: c.motion ?? beat.motion,
    transition: c.transition ?? beat.transition,
    effect: c.effect ?? beat.effect,
    focus: c.focus !== undefined ? c.focus || undefined : beat.focus,
  }
}

/**
 * Como a cena entra (ADR 0037). Sem escolha (da IA, do chat ou do usuário), o ritmo decide, como antes:
 * flash em todo corte no "frenético" e a cada 4 cenas no "rápido". A primeira cena não tem corte.
 */
export function sceneTransition(beat: Beat, index: number, settings: ProjectSettings): Transition {
  if (index === 0) return 'cut'
  const t = effectiveBeat(beat).transition
  if (t) return t
  return settings.pace === 'frenetico' || (settings.pace === 'rapido' && index % 4 === 0) ? 'flash' : 'cut'
}

/** Imagem (ou trecho de vídeo) da biblioteca, como a composição usa. */
export interface MediaProps {
  src: string
  regions: Region[]
  /** a cena de vídeo: src é o vídeo e o trecho vai de clip.start a clip.end */
  clip?: { start: number; end: number }
  poster?: string
  /** Tamanho em pixels, quando conhecido: decide o enquadramento (ADR 0020). */
  width?: number
  height?: number
  /**
   * O clipe da virada (ADR 0039): o trecho repete até a cena acabar (em vez de desacelerar e congelar) e
   * toca com este volume por baixo da voz. Sem o campo, a cena de vídeo é muda.
   */
  pivot?: { volume: number }
}

/** O que a composição precisa de cada batida: o texto, a imagem e quando entra. */
export interface TimedBeat {
  beat: Beat
  index: number
  from: number
  frames: number
  image?: MediaProps
  /** Efeito sonoro que toca no corte. */
  sfxSrc?: string
  /** Com a voz transcrita: em que quadro (desde o início da batida) cada palavra da fala começa. */
  wordStarts?: number[]
  /** Com a voz transcrita: em que quadro cada palavra acaba. A pausa até a seguinte fecha o bloco da legenda. */
  wordEnds?: number[]
  /** Na revelação da tier list (ADR 0036): o quadro (desde o início da batida) em que o personagem voa para a fileira. */
  revealAt?: number
}

/** Abertura ou final (ADR 0016): o que a composição precisa de um bordão. */
/** `music`: a música do vídeo continua por baixo do bordão (ADR 0032). */
export type CatchphraseProps = { frames: number; music: boolean } & (
  | { kind: 'clipe'; src: string }
  | { kind: 'montado'; audioSrc?: string; image?: MediaProps; text?: string; textAnim: TextAnim; textPosition: TextPosition }
  | {
      kind: 'inscreva'
      audioSrc?: string
      photoSrc?: string
      name: string
      text: string
      button: string
      afterButton: string
      buttonStyle: ButtonStyle
      entrance: Entrance
      click: ClickStyle
      show: Record<SubscribePart, boolean>
    }
)

export interface ShortVideoProps extends Record<string, unknown> {
  beats: TimedBeat[]
  settings: ProjectSettings
  audioSrc?: string
  musicSrc?: string
  /** Toca antes da narração; as batidas já vêm deslocadas pela duração dela. */
  intro?: CatchphraseProps
  /** Entra depois da última batida. */
  outro?: CatchphraseProps
  /** O quadro da tier list (ADR 0036), nas cenas marcadas com `tier`. */
  tier?: TierBoard
  /**
   * A voz para enquanto o clipe da virada termina (ADR 0039): em `at` (quadros desde o começo da
   * narração), ela fica `frames` quadros em silêncio e depois continua.
   */
  voicePause?: VoicePause
}

export interface VoicePause {
  at: number
  frames: number
}

const splitWords = (text: string) => text.split(/\s+/).filter(Boolean)
const words = (text: string) => splitWords(text).length

/** Tempo de cada palavra de cada batida, vindo da voz. */
export interface VoiceTiming {
  beats: WordTime[][]
  /** Palavras do roteiro que bateram com o que o Whisper ouviu. */
  matched: number
  total: number
  /** Os silêncios do áudio (ADR 0041); vazio nas transcrições antigas. */
  silences: Silence[]
}

/**
 * Casa o roteiro com a transcrição da voz (ADR 0018). null = sem transcrição pronta para o áudio
 * atual, ou nada bateu: o vídeo usa o tempo estimado.
 */
export function voiceTiming(project: ShortProject): VoiceTiming | null {
  const t = project.transcript
  if (!t || t.status !== 'pronto' || !t.words?.length || !project.audioFile || t.audioFile !== project.audioFile) return null
  const perBeat = project.beats.map(b => splitWords(b.say))
  const times = alignWords(perBeat.flat(), t.words)
  if (!times) return null
  let at = 0
  const beats = perBeat.map(list => times.slice(at, (at += list.length)))
  return { beats, matched: times.filter(w => w.matched).length, total: times.length, silences: t.silences ?? [] }
}

/** Menor batida possível com a voz: uma fala muito rápida não some da tela. */
const MIN_VOICE_FRAMES = 4

const libraryMedia = (img: LibraryImage): MediaProps => {
  const size = img.width && img.height ? { width: img.width, height: img.height } : {}
  return img.kind === 'cena' && img.clip
    ? { src: mediaUrl(img), regions: img.regions, clip: img.clip, poster: imageUrl(img), ...size }
    : { src: mediaUrl(img), regions: img.regions, ...size }
}

/** O clipe do meio na cena da virada (ADR 0039): o trecho e o volume deste vídeo, ou os do clipe. */
function pivotMedia(beat: Beat, catchphrases?: Map<string, Catchphrase>): MediaProps | undefined {
  const c = typeof beat.pivot?.clipId === 'string' ? catchphrases?.get(beat.pivot.clipId) : undefined
  if (!c?.file) return undefined
  const trim = pivotTrim(c, beat.pivot)
  return {
    src: catchphraseFileUrl(c.file)!,
    regions: [],
    clip: { start: trim.start, end: trim.start + trim.duration },
    pivot: { volume: beat.pivot?.volume ?? c.volume ?? DEFAULT_PIVOT_VOLUME },
  }
}

/**
 * Quadro (desde o começo da narração) em que cada batida começa, pela voz: quando a primeira
 * palavra dela é falada. A primeira batida começa no 0, para o vídeo não abrir sem imagem.
 * Os quadros são arredondados a partir do tempo absoluto, então o erro não se acumula.
 */
function voiceStarts(voice: VoiceTiming) {
  const starts: number[] = []
  voice.beats.forEach((list, i) => {
    const wanted = i === 0 ? 0 : Math.round((list[0]?.start ?? 0) * FPS)
    starts.push(i === 0 ? 0 : Math.max(starts[i - 1] + MIN_VOICE_FRAMES, wanted))
  })
  return starts
}

/** Quanto o corte pode procurar silêncio para cada lado: o relógio do Whisper erra umas décimas. */
const SILENCE_SEARCH = 0.25

/**
 * Onde a voz para na virada (quadros desde o começo da narração), ADR 0041: no meio do silêncio
 * que o ffmpeg achou entre a última palavra da frase e a primeira da seguinte. O relógio do Whisper
 * não serve sozinho — ele marca o fim da palavra cedo e o começo da próxima tarde, então cortar
 * no fim marcado partia o "u" de "rolou" e cortar no meio do intervalo deixava escapar um "n-".
 * Sem silêncio achado (transcrição antiga, ou fala emendada), vale o fim marcado, como antes.
 */
function pauseAt(voice: VoiceTiming | null, index: number, fallback: number) {
  const said = voice?.beats[index]
  const next = voice?.beats[index + 1]
  if (!said?.length || !next?.length) return fallback
  const end = Math.max(...said.map(w => w.end))
  const nextStart = Math.min(...next.map(w => w.start))
  const quiet = voice!.silences.find(s => s.end > end - SILENCE_SEARCH && s.start < nextStart + SILENCE_SEARCH)
  const at = quiet ? (quiet.start + quiet.end) / 2 : end
  return Math.min(fallback, Math.round(at * FPS))
}

/**
 * Distribui o tempo do vídeo entre as batidas.
 * - Com a voz transcrita (ADR 0018): cada batida começa quando a primeira palavra dela é falada.
 * - Sem: pelo número de palavras faladas (estimado).
 * Com áudio, o total é a duração do áudio; sem áudio, a duração escolhida no tema.
 * `start` é onde a primeira batida entra (depois da abertura); os `from` já saem somados.
 */
export function buildTimeline(
  project: ShortProject,
  images: Map<string, LibraryImage>,
  sounds: Map<string, SoundItem> = new Map(),
  start = 0,
  /** Para o clipe da cena da virada (ADR 0039). */
  catchphrases?: Map<string, Catchphrase>,
) {
  const voice = voiceTiming(project)
  const lastWordEnd = voice ? Math.max(0, ...voice.beats.flat().map(w => w.end)) : 0
  const seconds = Math.max(project.audioDuration || project.duration, lastWordEnd)
  const total = Math.max(FPS, Math.round(seconds * FPS))
  const weights = project.beats.map(b => Math.max(2, words(b.say)))
  const sum = weights.reduce((a, b) => a + b, 0) || 1
  const starts = voice ? voiceStarts(voice) : null

  let from = start
  let voicePause: VoicePause | undefined
  // quadros que a cena da virada devolveu para a seguinte (ADR 0039, adendo): ver `early`
  let early = 0
  const beats: TimedBeat[] = project.beats.map((beat, index) => {
    const isLast = index === project.beats.length - 1
    // o tempo da voz não conta a pausa da virada
    const spoken = from - start - (voicePause?.frames ?? 0) + early
    const said =
      (starts
        ? Math.max(MIN_VOICE_FRAMES, (isLast ? total : starts[index + 1]) - starts[index])
        : isLast
          ? Math.max(8, total - spoken)
          : Math.max(8, Math.round((weights[index] / sum) * total))) + early
    const begin = early
    early = 0
    const img = beat.imageId ? images.get(beat.imageId) : undefined
    const sfx = beat.sfxId ? sounds.get(beat.sfxId) : undefined
    const pivot = pivotMedia(beat, catchphrases)
    // trecho da virada mais longo que a fala: a voz para no fim da frase e o clipe vai até o fim
    const clipFrames = pivot?.clip ? Math.floor((pivot.clip.end - pivot.clip.start) * FPS) : 0
    if (clipFrames > said && !voicePause) voicePause = { at: pauseAt(voice, index, spoken + said), frames: clipFrames - said }
    // fala mais longa que o trecho: a cena acaba com o clipe e a seguinte já entra (ADR 0039, adendo)
    if (clipFrames && clipFrames < said && !isLast) early = said - clipFrames
    const frames = voicePause && clipFrames > said ? clipFrames : said - early
    const timed: TimedBeat = {
      // a composição desenha os efeitos que valem: os escolhidos pelo usuário ou os da IA
      beat: effectiveBeat(beat),
      index,
      from,
      frames,
      image: pivot ?? (img ? libraryMedia(img) : undefined),
      sfxSrc: sfx ? soundUrl(sfx) : undefined,
      // `begin` desloca as palavras quando a cena entrou mais cedo, no lugar do clipe que acabou
      wordStarts: starts && voice ? voice.beats[index].map(w => Math.max(0, Math.round(w.start * FPS) - starts[index]) + begin) : undefined,
      wordEnds: starts && voice ? voice.beats[index].map(w => Math.max(0, Math.round(w.end * FPS) - starts[index]) + begin) : undefined,
    }
    if (beat.tier === 'revelacao') timed.revealAt = revealFrame(beat.say, frames, timed.wordStarts)
    from += frames
    return timed
  })

  /** end: o quadro em que a última batida termina */
  return { beats, end: Math.max(start + 1, from), voicePause }
}

/** As palavras que apontam para o quadro na revelação ("o lugar dele é aqui", "pra cá", "esse"). */
const POINTING = /^(aqui|esse|essa|cá|ca)[.,!?…]*$/i

/**
 * Em que quadro da batida a animação da revelação começa (ADR 0036): na palavra que aponta. Com a voz
 * transcrita, no tempo real dela; sem, pela posição da palavra na fala. Sem palavra que aponta, a 40%.
 */
export function revealFrame(say: string, frames: number, wordStarts?: number[]) {
  const list = splitWords(say)
  let i = -1
  list.forEach((w, n) => {
    if (POINTING.test(w)) i = n
  })
  const at = i < 0 ? frames * 0.4 : wordStarts?.[i] ?? (i / Math.max(1, list.length)) * frames
  // a animação precisa de uns quadros para acontecer antes do corte
  return Math.max(0, Math.min(Math.round(at), frames - 12))
}

/** Pausa que fecha o bloco da legenda: 0,45 s calado entre duas palavras já é outra frase. */
const CAPTION_PAUSE = Math.round(0.45 * FPS)
/** Bloco mais longo que isso fica tempo demais na tela para ser lido de uma vez só. */
const CAPTION_SPAN = Math.round(1.6 * FPS)
/** Fim de frase: fecha o bloco mesmo sem pausa medida, e por isso vale nos vídeos sem transcrição. */
const SENTENCE_END = /[.!?…]$/

/** Um bloco da legenda: as palavras de `from` até `to` (sem incluir o `to`). */
export interface CaptionGroup {
  from: number
  to: number
}

/**
 * Em que blocos a legenda "completa" mostra as palavras (ADR 0040). Era a cada `max` palavras
 * fixas, e o bloco cortava no meio da frase: o fim de uma oração aparecia junto com o começo da
 * outra. Agora fecha no fim da frase, na pausa da voz ou quando o bloco já passou de 1,6 s;
 * `max` continua valendo como teto, que é o que o tamanho escolhido da legenda controla.
 *
 * A pausa é o intervalo entre o fim de uma palavra e o começo da seguinte, como o Whisper marcou.
 * O ADR 0041 mostrou que essas marcas erram por algumas dezenas de milissegundos, o que importa
 * para cortar o áudio, mas não aqui: o corte do bloco é num limite de 450 ms.
 */
export function captionGroups(words: string[], max: number, starts?: number[], ends?: number[]): CaptionGroup[] {
  const groups: CaptionGroup[] = []
  let from = 0
  for (let i = 1; i <= words.length; i++) {
    const last = i === words.length
    const pause = !!starts && !!ends && starts[i] - ends[i - 1] >= CAPTION_PAUSE
    const long = !!starts && starts[i] - starts[from] >= CAPTION_SPAN
    if (last || i - from >= max || SENTENCE_END.test(words[i - 1]) || pause || long) {
      groups.push({ from, to: i })
      from = i
    }
  }
  return groups
}

/** Bordão → props da composição. Sem o arquivo que ele precisa (clipe sem vídeo), não entra. */
export function catchphraseProps(c: Catchphrase, images: Map<string, LibraryImage>): CatchphraseProps | undefined {
  const frames = Math.max(1, Math.round(c.duration * FPS))
  const music = c.music ?? !catchphraseHasSound(c)
  switch (c.kind) {
    case 'clipe':
      return c.file ? { kind: 'clipe', frames, music, src: catchphraseFileUrl(c.file)! } : undefined
    case 'montado': {
      const img = c.imageId ? images.get(c.imageId) : undefined
      return {
        kind: 'montado',
        frames,
        music,
        audioSrc: catchphraseFileUrl(c.file),
        image: img ? libraryMedia(img) : undefined,
        text: c.text || undefined,
        textAnim: c.textAnim ?? 'pulo',
        textPosition: c.textPosition ?? 'baixo',
      }
    }
    case 'inscreva': {
      const button = c.button || 'INSCREVA-SE'
      const shown = (part: SubscribePart) => c.show?.[part] !== false
      return {
        kind: 'inscreva',
        frames,
        music,
        audioSrc: catchphraseFileUrl(c.file),
        photoSrc: catchphraseFileUrl(c.photoFile),
        name: c.channelName ?? '',
        text: c.text ?? '',
        button,
        afterButton: afterButtonText(button, c.afterButton),
        buttonStyle: c.buttonStyle ?? 'youtube',
        entrance: c.entrance ?? 'pulo',
        click: c.click ?? 'cursor',
        show: { foto: shown('foto'), nome: shown('nome'), frase: shown('frase'), botao: shown('botao') },
      }
    }
  }
}

/**
 * Props da composição: as mesmas na prévia e no render em MP4.
 * A abertura vem antes da primeira cena (e da narração); o final, depois da última.
 */
export function shortVideoProps(
  project: ShortProject,
  images: Map<string, LibraryImage>,
  sounds?: Map<string, SoundItem>,
  catchphrases?: Map<string, Catchphrase>,
  /** O quadro da tier list (ADR 0036), que vem do servidor (useTierBoard). */
  tier?: TierBoard | null,
) {
  const pick = (id?: string | null) => {
    const c = id ? catchphrases?.get(id) : undefined
    return c ? catchphraseProps(c, images) : undefined
  }
  const intro = pick(project.settings.intro)
  const outro = pick(project.settings.outro)
  const timeline = buildTimeline(project, images, sounds, intro?.frames ?? 0, catchphrases)
  const music = project.musicId ? sounds?.get(project.musicId) : undefined
  const props: ShortVideoProps = {
    beats: timeline.beats,
    settings: project.settings,
    audioSrc: audioUrl(project),
    musicSrc: music ? soundUrl(music) : undefined,
    ...(intro ? { intro } : {}),
    ...(outro ? { outro } : {}),
    ...(tier ? { tier } : {}),
    ...(timeline.voicePause ? { voicePause: timeline.voicePause } : {}),
  }
  const durationInFrames = timeline.end + (outro?.frames ?? 0)
  return { timeline, props, durationInFrames }
}

const normalize = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Área da imagem para o zoom e para onde a seta aponta. */
export function focusRegion(beat: Beat, regions: Region[] = []): Region | undefined {
  if (!beat.focus || regions.length === 0) return undefined
  const want = normalize(beat.focus)
  return regions.find(r => normalize(r.label).includes(want) || want.includes(normalize(r.label)))
}
