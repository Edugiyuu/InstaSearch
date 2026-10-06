/**
 * Transcrição da voz com o whisper.cpp local (ADR 0018): o tempo de cada palavra falada.
 *
 * O texto da legenda continua sendo o do roteiro; daqui só sai *quando* cada palavra foi dita.
 * O casamento com o roteiro é feito no frontend (video/align.ts), para a prévia e o render
 * usarem o mesmo código.
 *
 * Na primeira vez, o whisper.cpp (programa pronto no Windows) e o modelo são baixados para
 * backend/tools/whisper/, fora do git.
 */
import { existsSync, statSync } from 'fs'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { downloadWhisperModel, installWhisperCpp, transcribe } from '@remotion/install-whisper-cpp'
import { logger } from '../../utils/logger.js'
import { toWav16k } from './videoScenes.js'
import type { TranscriptWord } from './types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WHISPER_DIR = path.join(__dirname, '../../../tools/whisper')
const CPP_DIR = path.join(WHISPER_DIR, 'whisper.cpp')
const MODELS_DIR = path.join(WHISPER_DIR, 'models')

// No Windows não há programa pronto acima da 1.6.0; a 1.5.5 é a que o Remotion recomenda
export const WHISPER_VERSION = '1.5.5'
export const WHISPER_MODEL = 'small'
/** Tamanho exato do ggml-small.bin: um arquivo menor é um download que parou no meio. */
const MODEL_BYTES = 487_601_967

const EXECUTABLE = path.join(CPP_DIR, process.platform === 'win32' ? 'main.exe' : 'main')
const MODEL_FILE = path.join(MODELS_DIR, `ggml-${WHISPER_MODEL}.bin`)

export interface WhisperStatus {
  state: 'ausente' | 'baixando' | 'pronto' | 'erro'
  /** 0 a 1, durante o download. */
  progress?: number
  error?: string
  model: string
  sizeMb: number
}

const modelReady = () => existsSync(MODEL_FILE) && statSync(MODEL_FILE).size === MODEL_BYTES
const isReady = () => existsSync(EXECUTABLE) && modelReady()

let installing: Promise<void> | null = null
let progress = 0
let lastError: string | undefined

export function whisperStatus(): WhisperStatus {
  const base = { model: WHISPER_MODEL, sizeMb: Math.round(MODEL_BYTES / 1e6) }
  if (installing) return { ...base, state: 'baixando', progress }
  if (isReady()) return { ...base, state: 'pronto' }
  return lastError ? { ...base, state: 'erro', error: lastError } : { ...base, state: 'ausente' }
}

/**
 * Baixa o whisper.cpp e o modelo, se faltar. Chamadas ao mesmo tempo esperam o mesmo download.
 * onProgress recebe de 0 a 1 (o modelo é quase todo o tamanho).
 */
export function ensureWhisper(onProgress?: (p: number) => void): Promise<void> {
  if (isReady()) return Promise.resolve()
  if (!installing) {
    progress = 0
    lastError = undefined
    installing = (async () => {
      logger.info(`⬇️ Baixando o Whisper ${WHISPER_VERSION} e o modelo ${WHISPER_MODEL} (~${Math.round(MODEL_BYTES / 1e6)} MB)`)
      // pasta sem o programa (download interrompido): o instalador recusa, então começa do zero
      if (existsSync(CPP_DIR) && !existsSync(EXECUTABLE)) await fs.rm(CPP_DIR, { recursive: true, force: true })
      await installWhisperCpp({ to: CPP_DIR, version: WHISPER_VERSION, printOutput: false })
      await fs.mkdir(MODELS_DIR, { recursive: true })
      if (existsSync(MODEL_FILE) && !modelReady()) await fs.rm(MODEL_FILE)
      await downloadWhisperModel({
        model: WHISPER_MODEL,
        folder: MODELS_DIR,
        printOutput: false,
        onProgress: (done, total) => {
          progress = total ? done / total : 0
        },
      })
      logger.info('✅ Whisper pronto')
    })()
      .catch(error => {
        lastError = String(error.message ?? error)
        throw error
      })
      .finally(() => {
        installing = null
      })
  }
  if (!onProgress) return installing
  const timer = setInterval(() => onProgress(progress), 2000)
  return installing.finally(() => clearInterval(timer))
}

/** Itens do JSON do whisper.cpp com tempo por token. */
type WhisperItem = { tokens?: { text: string; t_dtw: number; offsets: { from: number; to: number } }[] }

/**
 * Tokens → palavras. O Whisper corta palavras em pedaços (" Suk", "una"); um pedaço que começa
 * com espaço abre uma palavra nova, o resto gruda na anterior. O início vem do DTW (mais preciso)
 * quando existe.
 */
export function tokensToWords(items: WhisperItem[]): TranscriptWord[] {
  const words: TranscriptWord[] = []
  for (const token of items.flatMap(i => i.tokens ?? [])) {
    if (/^\s*(\[_|<\|)/.test(token.text) || !token.text.trim()) continue // marcas internas do Whisper
    const start = (token.t_dtw >= 0 ? token.t_dtw * 10 : token.offsets.from) / 1000
    const end = token.offsets.to / 1000
    const last = words[words.length - 1]
    if (last && !/^\s/.test(token.text)) {
      last.text += token.text
      last.end = Math.max(last.end, end)
      continue
    }
    const begin = Math.max(start, last?.start ?? 0)
    words.push({ text: token.text.trim(), start: begin, end: Math.max(begin, end) })
  }
  return words
}

/** Transcreve um áudio (qualquer formato que o ffmpeg leia) e devolve as palavras com tempo. */
export async function transcribeAudio(
  audioPath: string,
  onStage: (stage: 'baixando' | 'transcrevendo', progress: number) => void,
): Promise<TranscriptWord[]> {
  if (!isReady()) {
    onStage('baixando', 0)
    await ensureWhisper(p => onStage('baixando', p))
  }
  onStage('transcrevendo', 0)
  const wav = path.join(os.tmpdir(), `instasearch-${Date.now()}.wav`)
  try {
    await toWav16k(audioPath, wav)
    const out = await transcribe({
      inputPath: wav,
      whisperPath: CPP_DIR,
      whisperCppVersion: WHISPER_VERSION,
      model: WHISPER_MODEL,
      modelFolder: MODELS_DIR,
      tokenLevelTimestamps: true,
      language: 'pt',
      printOutput: false,
    })
    return tokensToWords(out.transcription)
  } finally {
    await fs.unlink(wav).catch(() => undefined)
  }
}
