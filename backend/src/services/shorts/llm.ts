/**
 * Provedor de IA do fluxo de Shorts: Gemini primeiro, Claude como reserva.
 *
 * LLM_PROVIDER (backend/.env):
 *   auto   (padrão) Gemini; se ele falhar por cota, sobrecarga ou rede, usa o Claude
 *   gemini só Gemini
 *   claude só Claude
 * O Claude precisa de ANTHROPIC_API_KEY e usa sempre o claude-haiku-4-5 (o mais barato).
 *
 * CLAUDE_CODE=on usa o Claude Code instalado no computador (`claude -p`), logado com o
 * plano Pro/Max, como última reserva. LLM_PROVIDER=claude-code usa só ele.
 * Uso pessoal: os pedidos contam no limite do seu plano.
 */

import Anthropic from '@anthropic-ai/sdk'
import { spawn } from 'child_process'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'

export interface AskOptions {
  /** Imagem em base64 para a IA olhar (catalogação). */
  image?: { data: string; mimeType: string }
  /** Áudio em base64. Só o Gemini ouve áudio; o Claude não é usado nesse caso. */
  audio?: { data: string; mimeType: string }
  /** Pedidos simples (catalogar, escolher imagens) podem usar menos raciocínio no Claude. */
  effort?: 'low' | 'medium'
}

type Provider = 'gemini' | 'claude' | 'claude-code'

// Haiku 4.5 na API e no Claude Code: o que menos gasta
const CLAUDE_MODEL = 'claude-haiku-4-5'

// ── Gemini ───────────────────────────────────────────────

let gemini: any = null
/** Depois de um 429, o Gemini fica de lado até esta hora (evita gastar uma tentativa por pedido). */
let geminiPausedUntil = 0

function geminiConfigured() {
  const key = process.env.GEMINI_API_KEY
  return !!key && key !== 'your-gemini-api-key-here'
}

function geminiModel() {
  if (gemini) return gemini
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  gemini = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    // sem "thinking": o roteiro sai em segundos em vez de mais de um minuto
    generationConfig: { responseMimeType: 'application/json', temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } } as any,
  })
  return gemini
}

async function askGemini(prompt: string, opts: AskOptions): Promise<string> {
  const media = opts.image ?? opts.audio
  const parts = media ? [prompt, { inlineData: media }] : prompt
  const result = await geminiModel().generateContent(parts)
  return result.response.text()
}

/** Erros em que vale tentar o outro provedor: cota, sobrecarga, rede. */
function isTransient(error: any) {
  const status = error?.status ?? error?.response?.status
  const text = String(error?.message ?? '')
  return status === 429 || status >= 500 || /429|Too Many Requests|quota|overloaded|503|fetch failed|ECONN|ETIMEDOUT/i.test(text)
}

/** "Please retry in 5h19m28s" ou retryDelay "19168s" → milissegundos. */
function retryDelayMs(error: any) {
  const text = String(error?.message ?? '')
  const seconds = text.match(/retryDelay"?:\s*"(\d+)s"/)?.[1]
  if (seconds) return Number(seconds) * 1000
  const h = Number(text.match(/retry in (\d+)h/)?.[1] ?? 0)
  const m = Number(text.match(/retry in (?:\d+h)?(\d+)m/)?.[1] ?? 0)
  const total = (h * 60 + m) * 60 * 1000
  return total || 10 * 60 * 1000
}

// ── Claude ───────────────────────────────────────────────

let claude: Anthropic | null = null

function claudeConfigured() {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN)
}

async function askClaude(prompt: string, opts: AskOptions): Promise<string> {
  claude ??= new Anthropic()
  const content: Anthropic.ContentBlockParam[] = []
  if (opts.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: opts.image.mimeType as 'image/png', data: opts.image.data },
    })
  }
  content.push({ type: 'text', text: `${prompt}\n\nResponda apenas com o JSON, sem texto antes ou depois.` })

  // Haiku 4.5 não tem níveis de esforço nem reserva automática do servidor
  const response = await claude.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    messages: [{ role: 'user', content }],
  })

  if (response.stop_reason === 'refusal') {
    throw new AppError('O Claude recusou esse pedido. Tente reformular o tema.', 422, 'AI_REFUSAL')
  }
  return response.content.map(b => (b.type === 'text' ? b.text : '')).join('')
}

// ── Claude Code (plano Pro/Max) ──────────────────────────

// Sempre Haiku 4.5: o que menos gasta do limite do plano (não tem níveis de esforço)
const CLAUDE_CODE_MODEL = CLAUDE_MODEL

function claudeCodeEnabled() {
  return /^(on|true|1|sim)$/i.test(process.env.CLAUDE_CODE ?? '')
}

/** Roda o `claude` e devolve a saída; no Windows o `claude` do npm é um .cmd e precisa de shell. */
function runClaudeCli(args: string[], input: string) {
  const command = process.env.CLAUDE_CODE_PATH || 'claude'
  const env = { ...process.env }
  // sem a chave da API no ambiente, o Claude Code usa o login do plano e não cobra pela API
  delete env.ANTHROPIC_API_KEY
  delete env.ANTHROPIC_AUTH_TOKEN
  // sem "thinking": o Haiku pensava ~9 mil tokens antes de um roteiro de ~1.500 (lento e gasta o plano)
  env.MAX_THINKING_TOKENS = '0'
  const isWindows = process.platform === 'win32'
  const quoted = isWindows ? args.map(a => `"${a.replace(/"/g, '\\"')}"`) : args

  return new Promise<string>((resolve, reject) => {
    const child = spawn(isWindows ? `"${command}"` : command, quoted, { env, shell: isWindows, windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('o Claude Code demorou demais (mais de 3 minutos)'))
    }, 180000)
    child.stdout.on('data', d => (stdout += d))
    child.stderr.on('data', d => (stderr += d))
    child.on('error', error => {
      clearTimeout(timer)
      reject(Object.assign(error, { notInstalled: (error as NodeJS.ErrnoException).code === 'ENOENT' }))
    })
    child.on('close', code => {
      clearTimeout(timer)
      // o shell do Windows sai com 1 e "não é reconhecido" quando o comando não existe
      if (code !== 0 && /not recognized|reconhecido|command not found/i.test(stderr)) {
        reject(Object.assign(new Error('Claude Code não instalado'), { notInstalled: true }))
      } else if (code !== 0 && !stdout) {
        reject(new Error(stderr.trim().split('\n').pop() || `claude saiu com código ${code}`))
      } else {
        resolve(stdout)
      }
    })
    child.stdin.end(input, 'utf8')
  })
}

async function askClaudeCode(prompt: string, opts: AskOptions): Promise<string> {
  let tempDir: string | null = null
  let text = prompt
  const args = [
    '-p',
    'Siga as instruções recebidas pela entrada padrão e responda só com o JSON pedido.',
    '--output-format', 'json',
    '--model', CLAUDE_CODE_MODEL,
    '--no-session-persistence',
    // prompt de sistema curto no lugar do padrão (feito para programar): bem menos tokens do plano
    '--system-prompt', 'Você é o assistente de um app de edição de vídeos curtos. Responda sempre só com JSON válido, em português do Brasil.',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--disallowedTools', 'mcp__*',
  ]

  if (opts.image) {
    // a imagem vai para um arquivo temporário e o Claude Code só pode ler esse arquivo
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instasearch-'))
    const ext = opts.image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
    const file = path.join(tempDir, `imagem.${ext}`)
    await fs.writeFile(file, Buffer.from(opts.image.data, 'base64'))
    args.push('--tools', 'Read', '--allowedTools', 'Read', '--add-dir', tempDir)
    text = `Abra e olhe a imagem em ${file} antes de responder.\n\n${prompt}`
  } else {
    args.push('--tools', '')
  }

  try {
    const out = await runClaudeCli(args, `${text}\n\nResponda apenas com o JSON, sem texto antes ou depois.`)
    const result = JSON.parse(out) as {
      is_error?: boolean
      result?: string
      subtype?: string
      duration_api_ms?: number
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    logger.info(
      `Claude Code: ${((result.duration_api_ms ?? 0) / 1000).toFixed(1)}s na IA · ${result.usage?.input_tokens ?? '?'} tokens de entrada, ${result.usage?.output_tokens ?? '?'} de saída`,
    )
    if (result.is_error) throw new Error(result.result || result.subtype || 'erro no Claude Code')
    return result.result ?? ''
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

// ── Escolha do provedor ──────────────────────────────────

function order(opts: AskOptions): Provider[] {
  const mode = (process.env.LLM_PROVIDER || 'auto').toLowerCase()
  if (mode === 'gemini') return ['gemini']
  if (mode === 'claude') return opts.audio ? [] : ['claude']
  if (mode === 'claude-code') return opts.audio ? [] : ['claude-code']
  const list: Provider[] = []
  if (geminiConfigured()) list.push('gemini')
  if (claudeConfigured() && !opts.audio) list.push('claude')
  if (claudeCodeEnabled() && !opts.audio) list.push('claude-code')
  // Gemini em pausa por cota: vai direto para o Claude (mas tenta o Gemini se não houver outro)
  if (Date.now() < geminiPausedUntil && list.length > 1) list.push(list.shift()!)
  return list
}

function parseJson<T>(text: string): T {
  const json = text.match(/[[{][\s\S]*[\]}]/)
  if (!json) throw new Error('resposta sem JSON')
  return JSON.parse(json[0]) as T
}

/** Pede um JSON para a IA, trocando de provedor se o primeiro falhar. */
export async function askJson<T>(prompt: string, opts: AskOptions = {}): Promise<T> {
  const providers = order(opts)
  if (providers.length === 0) {
    throw new AppError(
      opts.audio
        ? 'Só o Gemini consegue ouvir áudio, e ele não está disponível.'
        : 'Nenhuma IA configurada. Coloque GEMINI_API_KEY ou ANTHROPIC_API_KEY no backend/.env.',
      503,
      'AI_NOT_CONFIGURED',
    )
  }

  let lastError: any
  for (const provider of providers) {
    try {
      const text =
        provider === 'gemini'
          ? await askGemini(prompt, opts)
          : provider === 'claude'
            ? await askClaude(prompt, opts)
            : await askClaudeCode(prompt, opts)
      if (provider === 'gemini') geminiPausedUntil = 0
      const label = provider === 'gemini' ? 'Gemini' : provider === 'claude' ? `Claude API (${CLAUDE_MODEL})` : `Claude Code do plano (${CLAUDE_CODE_MODEL})`
      logger.info(`🤖 Respondido por ${label}${provider === providers[0] ? '' : ' — reserva'}`)
      return parseJson<T>(text)
    } catch (error: any) {
      lastError = error
      if (error instanceof AppError) throw error
      if (provider === 'gemini' && isTransient(error)) {
        if (/429|quota|Too Many Requests/i.test(String(error.message))) geminiPausedUntil = Date.now() + retryDelayMs(error)
        logger.warn(`⚠️ Gemini indisponível (${String(error.message).slice(0, 120)}). ${providers.length > 1 ? 'Usando o Claude.' : ''}`)
        continue
      }
      if (provider === 'claude' && error instanceof Anthropic.APIError) {
        logger.error(`❌ Claude ${error.status}: ${error.message}`)
        continue
      }
      if (provider === 'claude-code' && error.notInstalled) {
        logger.error('❌ Claude Code não encontrado. Instale com: npm install -g @anthropic-ai/claude-code')
        continue
      }
      // JSON inválido ou outro erro: tenta o próximo provedor, se houver
      logger.error(`❌ ${provider}: ${error.message}`)
    }
  }

  const message = String(lastError?.message ?? '')
  if (lastError?.notInstalled) {
    throw new AppError(
      'O Claude Code não está instalado. Rode "npm install -g @anthropic-ai/claude-code" e depois "claude" uma vez para entrar com o seu plano.',
      503,
      'NO_CLAUDE_CODE',
    )
  }
  if (providers.includes('claude-code') && /not logged in|please run \/login|authenticat/i.test(message)) {
    throw new AppError('O Claude Code não está logado. Abra um terminal, rode "claude" e entre com a conta do seu plano.', 401, 'CLAUDE_CODE_LOGIN')
  }
  if (/quota|429|Too Many Requests/i.test(message) && !claudeConfigured() && !claudeCodeEnabled()) {
    throw new AppError(
      'A cota grátis do Gemini acabou por hoje. Para continuar agora, ligue o Claude Code do seu plano (CLAUDE_CODE=on no backend/.env) ou coloque uma ANTHROPIC_API_KEY.',
      429,
      'AI_QUOTA',
    )
  }
  if (lastError instanceof Anthropic.AuthenticationError) {
    throw new AppError('A ANTHROPIC_API_KEY do backend/.env é inválida.', 401, 'AI_AUTH')
  }
  throw new AppError(`A IA não respondeu direito: ${message.slice(0, 300)}`, 502, 'AI_ERROR')
}

/** Para a tela de Configurações: quais provedores estão prontos. */
export function aiStatus() {
  return {
    mode: (process.env.LLM_PROVIDER || 'auto').toLowerCase(),
    gemini: { configured: geminiConfigured(), model: process.env.GEMINI_MODEL || 'gemini-2.5-flash', pausedUntil: geminiPausedUntil > Date.now() ? new Date(geminiPausedUntil).toISOString() : null },
    claude: { configured: claudeConfigured(), model: CLAUDE_MODEL },
    claudeCode: {
      enabled: claudeCodeEnabled() || (process.env.LLM_PROVIDER || '').toLowerCase() === 'claude-code',
      model: CLAUDE_CODE_MODEL,
    },
  }
}
