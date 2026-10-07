/**
 * Provedor de IA do fluxo de Shorts: Gemini primeiro, Claude como reserva.
 *
 * LLM_PROVIDER (backend/.env):
 *   auto   (padrão) Gemini; se ele falhar por cota, sobrecarga ou rede, usa o Claude
 *   gemini só Gemini
 *   claude só Claude
 * O Claude precisa de ANTHROPIC_API_KEY e usa sempre o claude-sonnet-5-5 com esforço médio
 * (baixo nas tarefas simples: catalogar e escolher imagens).
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
import type { AiCredit, AiProvider } from './types.js'

export interface AskOptions {
  /** Imagem em base64 para a IA olhar (catalogação). */
  image?: { data: string; mimeType: string }
  /** Várias imagens no mesmo pedido, na ordem (cenas de um vídeo catalogadas de uma vez). */
  images?: { data: string; mimeType: string }[]
  /** Áudio em base64. Só o Gemini ouve áudio; o Claude não é usado nesse caso. */
  audio?: { data: string; mimeType: string }
  /** Quanto o Claude pensa antes de responder. Padrão: medium; catalogar e escolher imagens usam low. */
  effort?: 'low' | 'medium'
  /** Deixa a IA pesquisar na web antes de responder (no máximo MAX_SEARCHES buscas). */
  research?: boolean
  /** O que pesquisar; sem valor, a instrução do roteiro (provas para a tese). As ideias pedem o que está acontecendo agora. */
  researchNote?: string
}

type Provider = AiProvider

/** Todas as imagens do pedido, na ordem. */
const imagesOf = (opts: AskOptions) => opts.images ?? (opts.image ? [opts.image] : [])

interface Answer {
  text: string
  /** Contadas de verdade em cada provedor (ADR 0019), junto com o que foi buscado. */
  searches?: number
  queries?: string[]
}

// Até 4 buscas para achar argumento (ADR 0019); com 2, só para confirmar fatos, os roteiros saíam sem prova
export const MAX_SEARCHES = 4
const RESEARCH_NOTE = `Antes de escrever, pesquise na web, com até ${MAX_SEARCHES} buscas curtas e diferentes entre si, as provas que sustentam a ideia central do vídeo: acontecimentos concretos, o capítulo ou episódio em que aconteceram, números, falas marcantes e o que o público costuma discutir sobre o tema. Use as buscas para achar argumento, não só para conferir o que você já sabe. Não afirme nada que você não conseguiu confirmar. Não coloque links nem fontes na resposta.`

// Sonnet 5.5 na API e no Claude Code: o Haiku 4.5 inventava fatos nos roteiros
const CLAUDE_MODEL = 'claude-sonnet-5-5'
const DEFAULT_EFFORT = 'medium'

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

let geminiSearch: any = null

/** O Gemini não aceita a busca do Google junto com a resposta forçada em JSON: este modelo devolve texto. */
function geminiSearchModel() {
  if (geminiSearch) return geminiSearch
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  geminiSearch = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    tools: [{ googleSearch: {} }] as any,
    generationConfig: { temperature: 0.9, thinkingConfig: { thinkingBudget: 0 } } as any,
  })
  return geminiSearch
}

async function askGemini(prompt: string, opts: AskOptions): Promise<Answer> {
  const media = [...imagesOf(opts), ...(opts.audio ? [opts.audio] : [])]
  const research = opts.research && !media.length
  const text = research ? `${prompt}\n\n${opts.researchNote ?? RESEARCH_NOTE}` : prompt
  const parts = media.length ? [text, ...media.map(m => ({ inlineData: m }))] : text
  const result = await (research ? geminiSearchModel() : geminiModel()).generateContent(parts)
  // o Gemini não tem limite rígido de buscas (só a instrução): conta o que ele de fato fez
  const queries: string[] = research ? result.response.candidates?.[0]?.groundingMetadata?.webSearchQueries ?? [] : []
  return { text: result.response.text(), ...(research ? { searches: queries.length, queries } : {}) }
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

async function askClaude(prompt: string, opts: AskOptions): Promise<Answer> {
  claude ??= new Anthropic()
  const content: Anthropic.ContentBlockParam[] = []
  const images = imagesOf(opts)
  for (const image of images) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: image.mimeType as 'image/png', data: image.data },
    })
  }
  const research = opts.research && !images.length
  content.push({
    type: 'text',
    text: `${prompt}${research ? `\n\n${opts.researchNote ?? RESEARCH_NOTE}` : ''}\n\nResponda apenas com o JSON, sem texto antes ou depois.`,
  })

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content }]
  let searches = 0
  const queries: string[] = []
  // o Sonnet 5.5 pensa antes de responder (adaptive); o esforço controla quanto.
  // stream + finalMessage evita o tempo limite em respostas longas
  for (let round = 0; ; round++) {
    const response = await claude.messages
      .stream({
        model: CLAUDE_MODEL,
        max_tokens: 32000,
        output_config: { effort: opts.effort ?? DEFAULT_EFFORT },
        ...(research ? { tools: [{ type: 'web_search_20260209' as const, name: 'web_search' as const, max_uses: MAX_SEARCHES }] } : {}),
        messages,
      })
      .finalMessage()
    searches += response.usage.server_tool_use?.web_search_requests ?? 0
    for (const block of response.content) {
      if (block.type === 'server_tool_use' && block.name === 'web_search') queries.push(String((block.input as { query?: string })?.query ?? ''))
    }

    if (response.stop_reason === 'refusal') {
      throw new AppError('O Claude recusou esse pedido. Tente reformular o tema.', 422, 'AI_REFUSAL')
    }
    // a busca no servidor pode pausar a resposta; reenviar continua de onde parou
    if (response.stop_reason === 'pause_turn' && round < 3) {
      messages.push({ role: 'assistant', content: response.content })
      continue
    }
    const text = response.content.map(b => (b.type === 'text' ? b.text : '')).join('')
    return { text, ...(research ? { searches, queries: queries.filter(Boolean) } : {}) }
  }
}

// ── Claude Code (plano Pro/Max) ──────────────────────────

// O mesmo Sonnet 5.5 da API; o esforço vai pela opção --effort
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
  // o raciocínio é controlado por --effort; um MAX_THINKING_TOKENS herdado atrapalharia
  delete env.MAX_THINKING_TOKENS
  const isWindows = process.platform === 'win32'
  const quoted = isWindows ? args.map(a => `"${a.replace(/"/g, '\\"')}"`) : args

  return new Promise<string>((resolve, reject) => {
    const child = spawn(isWindows ? `"${command}"` : command, quoted, { env, shell: isWindows, windowsHide: true })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('o Claude Code demorou demais (mais de 5 minutos)'))
    }, 300000)
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

async function askClaudeCode(prompt: string, opts: AskOptions): Promise<Answer> {
  let tempDir: string | null = null
  const images = imagesOf(opts)
  const research = opts.research && !images.length
  let text = research ? `${prompt}\n\n${opts.researchNote ?? RESEARCH_NOTE}` : prompt
  const args = [
    '-p',
    'Siga as instruções recebidas pela entrada padrão e responda só com o JSON pedido.',
    // stream-json: um evento por linha, inclusive cada busca feita (para contar e mostrar o que foi buscado)
    '--output-format', 'stream-json',
    '--verbose',
    '--model', CLAUDE_CODE_MODEL,
    '--effort', opts.effort ?? DEFAULT_EFFORT,
    '--no-session-persistence',
    // prompt de sistema curto no lugar do padrão (feito para programar): bem menos tokens do plano
    '--system-prompt', 'Você é o assistente de um app de edição de vídeos curtos. Responda sempre só com JSON válido, em português do Brasil.',
    '--strict-mcp-config',
    '--disable-slash-commands',
    '--disallowedTools', 'mcp__*',
  ]

  if (images.length) {
    // as imagens vão para arquivos temporários e o Claude Code só pode ler esses arquivos
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'instasearch-'))
    const files: string[] = []
    for (const [n, image] of images.entries()) {
      const ext = image.mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png'
      const file = path.join(tempDir, `imagem${n + 1}.${ext}`)
      await fs.writeFile(file, Buffer.from(image.data, 'base64'))
      files.push(file)
    }
    args.push('--tools', 'Read', '--allowedTools', 'Read', '--add-dir', tempDir)
    text = files.length === 1
      ? `Abra e olhe a imagem em ${files[0]} antes de responder.\n\n${prompt}`
      : `Abra e olhe as imagens, nesta ordem, antes de responder:\n${files.map((f, n) => `${n + 1}. ${f}`).join('\n')}\n\n${prompt}`
  } else if (research) {
    // só a busca (sem abrir páginas); cada busca gasta uma rodada, então as rodadas limitam as buscas
    args.push('--tools', 'WebSearch', '--allowedTools', 'WebSearch', '--max-turns', String(MAX_SEARCHES + 2))
  } else {
    args.push('--tools', '')
  }

  try {
    const out = await runClaudeCli(args, `${text}\n\nResponda apenas com o JSON, sem texto antes ou depois.`)
    const events = parseStream(out)
    const result = events.find(e => e.type === 'result') as
      | {
          is_error?: boolean
          result?: string
          subtype?: string
          duration_api_ms?: number
          usage?: { input_tokens?: number; output_tokens?: number }
        }
      | undefined
    if (!result) throw new Error('o Claude Code não devolveu resultado')
    const queries: string[] = events.flatMap(e =>
      e.type === 'assistant'
        ? (e.message?.content ?? []).filter((c: any) => c.type === 'tool_use' && c.name === 'WebSearch').map((c: any) => String(c.input?.query ?? ''))
        : [],
    )
    logger.info(
      `Claude Code: ${((result.duration_api_ms ?? 0) / 1000).toFixed(1)}s na IA · ${result.usage?.input_tokens ?? '?'} tokens de entrada, ${result.usage?.output_tokens ?? '?'} de saída`,
    )
    if (result.is_error && result.subtype === 'error_max_turns' && research) {
      // buscou demais e não terminou: responde de novo, agora sem buscar
      logger.warn('⚠️ Claude Code passou do limite de buscas; respondendo sem pesquisar')
      return askClaudeCode(prompt, { ...opts, research: false })
    }
    if (result.is_error) throw new Error(result.result || result.subtype || 'erro no Claude Code')
    return { text: result.result ?? '', ...(research ? { searches: queries.length, queries: queries.filter(Boolean) } : {}) }
  } finally {
    if (tempDir) await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined)
  }
}

/** Saída stream-json do Claude Code: um objeto JSON por linha. Linhas que não são JSON são ignoradas. */
function parseStream(out: string): any[] {
  return out
    .split(/\r?\n/)
    .filter(line => line.trim().startsWith('{'))
    .flatMap(line => {
      try {
        return [JSON.parse(line)]
      } catch {
        return []
      }
    })
}

// ── Escolha do provedor ──────────────────────────────────

/** A fila normal de provedores (o primeiro é o principal; os outros são reserva). */
function preferred(opts: AskOptions): Provider[] {
  const mode = (process.env.LLM_PROVIDER || 'auto').toLowerCase()
  if (mode === 'gemini') return ['gemini']
  if (mode === 'claude') return opts.audio ? [] : ['claude']
  if (mode === 'claude-code') return opts.audio ? [] : ['claude-code']
  const list: Provider[] = []
  if (geminiConfigured()) list.push('gemini')
  if (claudeConfigured() && !opts.audio) list.push('claude')
  if (claudeCodeEnabled() && !opts.audio) list.push('claude-code')
  return list
}

/** A ordem desta vez: com o Gemini em pausa por cota, vai direto para o Claude (mas tenta o Gemini se não houver outro). */
function order(opts: AskOptions): Provider[] {
  const list = preferred(opts)
  if (Date.now() < geminiPausedUntil && list.length > 1) list.push(list.shift()!)
  return list
}

/** Acha o JSON na resposta, mesmo com texto antes ou depois (comum quando a IA pesquisou). */
function parseJson<T>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]
  const candidates = [
    text.trim(),
    fenced,
    text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1),
    text.slice(text.indexOf('['), text.lastIndexOf(']') + 1),
  ]
  for (const c of candidates) {
    if (!c) continue
    try {
      return JSON.parse(c) as T
    } catch {
      // tenta o próximo formato
    }
  }
  throw new Error('resposta sem JSON')
}

/** Pede um JSON para a IA, trocando de provedor se o primeiro falhar. */
export async function askJson<T>(prompt: string, opts: AskOptions = {}): Promise<T> {
  return (await askJsonMeta<T>(prompt, opts)).data
}

/** Igual ao askJson, mas diz também qual IA respondeu (para mostrar na tela). */
export async function askJsonMeta<T>(prompt: string, opts: AskOptions = {}): Promise<{ data: T; ai: AiCredit }> {
  const providers = order(opts)
  const primary = preferred(opts)[0]
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
      const answer =
        provider === 'gemini'
          ? await askGemini(prompt, opts)
          : provider === 'claude'
            ? await askClaude(prompt, opts)
            : await askClaudeCode(prompt, opts)
      if (provider === 'gemini') geminiPausedUntil = 0
      const label = provider === 'gemini' ? 'Gemini' : provider === 'claude' ? `Claude API (${CLAUDE_MODEL})` : `Claude Code do plano (${CLAUDE_CODE_MODEL})`
      const searched = answer.searches === undefined ? '' : ` · ${answer.searches} busca(s) na web`
      logger.info(`🤖 Respondido por ${label}${provider === primary ? '' : ' — reserva'}${searched}`)
      const ai: AiCredit = {
        provider,
        model: provider === 'gemini' ? process.env.GEMINI_MODEL || 'gemini-2.5-flash' : CLAUDE_MODEL,
        fallback: provider !== primary,
        searches: answer.searches,
        queries: answer.queries?.length ? answer.queries : undefined,
        at: new Date().toISOString(),
      }
      return { data: parseJson<T>(answer.text), ai }
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
    claude: { configured: claudeConfigured(), model: CLAUDE_MODEL, effort: DEFAULT_EFFORT },
    claudeCode: {
      enabled: claudeCodeEnabled() || (process.env.LLM_PROVIDER || '').toLowerCase() === 'claude-code',
      model: CLAUDE_CODE_MODEL,
    },
  }
}
