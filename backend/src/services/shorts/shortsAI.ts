import { AppError } from '../../middleware/errorHandler.js'
import { askJson } from './llm.js'
import type { Beat, Effect, LibraryImage, Motion, ProjectSettings, SceneKind, ShortStyle } from './types.js'

const PACE_SECONDS: Record<ShortStyle['pace'], number> = {
  calmo: 1.8,
  normal: 1.3,
  rapido: 1.0,
  frenetico: 0.75,
}

const EFFECTS_SHARE: Record<ShortStyle['effects'], string> = {
  poucos: 'no máximo 1 a cada 8 batidas',
  medida: 'cerca de 1 a cada 4 batidas',
  muitos: 'cerca de 1 a cada 2 batidas',
}

const IMAGE_TYPE: Record<ShortStyle['imageType'], string> = {
  manga: 'painéis de mangá',
  anime: 'cenas do anime',
  fanart: 'fanarts',
  'tanto-faz': 'qualquer tipo de imagem',
}

const SCENES: SceneKind[] = ['full', 'evidence']
const EFFECTS: Effect[] = ['none', 'arrow', 'cross', 'circle', 'emoji']
const MOTIONS: Motion[] = ['zoom-in', 'zoom-out', 'shake', 'pan']

type RawBeat = Partial<Omit<Beat, 'characters'>> & { characters?: unknown }

/** Tira aspas que a IA às vezes coloca em volta das falas. */
const unquote = (text: unknown) => String(text ?? '').trim().replace(/^["“”']+|["“”']+$/g, '').trim()

/** Normaliza as batidas que vieram da IA (campos faltando, valores fora da lista). */
export function cleanBeats(raw: RawBeat[], keep: Beat[] = []): Beat[] {
  return raw
    .filter(b => b && (b.say || b.text))
    .map((b, i) => {
      const previous = b.id ? keep.find(k => k.id === b.id) : undefined
      const changedImage = previous && (previous.query !== b.query || String(previous.characters) !== String(b.characters))
      return {
        id: previous?.id ?? `b${Date.now().toString(36)}${i}`,
        say: unquote(b.say ?? b.text),
        text: unquote(b.text ?? b.say).split(/\s+/).slice(0, 4).join(' '),
        query: String(b.query ?? '').trim(),
        characters: Array.isArray(b.characters) ? b.characters.map(String).filter(Boolean) : [],
        scene: SCENES.includes(b.scene as SceneKind) ? (b.scene as SceneKind) : 'full',
        effect: EFFECTS.includes(b.effect as Effect) ? (b.effect as Effect) : 'none',
        emoji: b.effect === 'emoji' ? String(b.emoji || '😱') : undefined,
        motion: MOTIONS.includes(b.motion as Motion) ? (b.motion as Motion) : 'zoom-in',
        focus: b.focus && b.focus !== 'none' ? String(b.focus) : undefined,
        // a IA não escolhe imagem; quem escolhe é a montagem (ou o usuário)
        imageId: changedImage ? undefined : previous?.imageId,
        imageStatus: changedImage ? 'missing' : previous?.imageStatus ?? 'missing',
        locked: changedImage ? false : previous?.locked,
        sticker: b.effect === 'emoji' && b.sticker ? String(b.sticker) : undefined,
        stickerId: previous?.sticker === b.sticker ? previous?.stickerId : undefined,
        sfx: b.sfx && SFX.includes(String(b.sfx)) ? String(b.sfx) : undefined,
        sfxId: previous?.sfx === b.sfx ? previous?.sfxId : undefined,
      }
    })
}

/** Efeitos sonoros que a IA pode pedir; a montagem procura na biblioteca de sons pelo nome/etiquetas. */
export const SFX = ['whoosh', 'boom', 'pop', 'ding', 'erro', 'risada', 'suspense', 'impacto', 'glitch', 'click']

const BEAT_FORMAT = `Cada batida:
{
  "say": "trecho exato da narração falado nesta batida (3 a 8 palavras)",
  "text": "legenda na tela: 1 a 3 palavras-chave do trecho, em MAIÚSCULAS",
  "query": "o que a imagem precisa mostrar, curto e concreto (ex.: 'sukuna sorrindo, mangá')",
  "characters": ["nomes dos personagens que aparecem na imagem"],
  "scene": "full" (imagem em tela cheia) ou "evidence" (imagem emoldurada sobre fundo quadriculado, para provas, prints e comparações),
  "effect": "none" | "arrow" | "cross" | "circle" | "emoji",
  "emoji": "só se effect = emoji",
  "sticker": "só se effect = emoji: a reação em 1 a 3 palavras, para escolher uma figurinha (ex.: 'chocado', 'rindo', 'pensando', 'bravo')",
  "sfx": "efeito sonoro no corte, ou omita: ${SFX.join(' | ')}",
  "motion": "zoom-in" | "zoom-out" | "shake" | "pan",
  "focus": "área da imagem para dar zoom, se fizer sentido: rosto, mão, olhos, corpo"
}`

export async function generateScript(input: {
  theme: string
  tone: string
  duration: number
  style: ShortStyle
  narration?: string
}): Promise<{ title: string; narration: string; beats: Beat[] }> {
  const { theme, tone, duration, style, narration } = input
  const beatCount = Math.round(duration / PACE_SECONDS[style.pace])
  const words = Math.round(duration * 2.6)

  const task = narration
    ? `O usuário já tem a narração. NÃO mude o texto: divida exatamente esta narração em batidas, na ordem:\n"""${narration}"""`
    : `Escreva a narração de um Short sobre: "${theme}".
- Cerca de ${words} palavras (${duration} segundos falados).
- Comece com um gancho forte nos primeiros 2 segundos.
- Tom: ${tone}.`

  const prompt = `Você é roteirista e editor de Shorts verticais (YouTube Shorts, Reels, TikTok) em português do Brasil.

${task}

Estilo do canal: "${style.name}" (${style.summary}). ${style.notes}
Imagens preferidas: ${IMAGE_TYPE[style.imageType]}.

Depois divida a narração em cerca de ${beatCount} batidas visuais. Em cada batida o vídeo corta para uma imagem nova.
Efeitos (setas, X, círculos, emojis): ${EFFECTS_SHARE[style.effects]}; use "none" no resto.
Efeitos sonoros: "boom" ou "impacto" no gancho e nas revelações, "whoosh" em setas e cortes rápidos, "erro" com X, "pop" com emoji, "click" em provas; cerca de metade das batidas tem sfx.
Use "evidence" para 1 a cada 5 batidas, quando o trecho cita uma prova, um print ou uma comparação.
Concatenar os "say" de todas as batidas tem que dar exatamente a narração.

${BEAT_FORMAT}

Responda só com JSON:
{ "title": "título curto do vídeo (até 6 palavras)", "narration": "narração completa", "beats": [ ... ] }`

  const out = await askJson<{ title?: string; narration?: string; beats?: RawBeat[] }>(prompt)
  const beats = cleanBeats(out.beats ?? [])
  if (beats.length === 0) throw new AppError('A IA não devolveu nenhuma batida. Tente de novo.', 502, 'AI_EMPTY')
  return {
    title: out.title?.trim() || theme,
    narration: narration ?? out.narration?.trim() ?? beats.map(b => b.say).join(' '),
    beats,
  }
}

export async function adjustBeats(input: {
  request: string
  beats: Beat[]
  narration: string
  settings: ProjectSettings
  style: ShortStyle
}): Promise<{ reply: string; beats: Beat[]; narration: string; settings: ProjectSettings }> {
  const { request, beats, narration, settings, style } = input
  const compact = beats.map(({ id, say, text, query, characters, scene, effect, emoji, sticker, sfx, motion, focus }) => ({
    id, say, text, query, characters, scene, effect, emoji, sticker, sfx, motion, focus,
  }))

  const prompt = `Você edita um Short vertical em português do Brasil. O vídeo é uma lista de batidas; em cada batida o vídeo corta para uma imagem nova.

Estilo: "${style.name}". ${style.notes}
Ajustes atuais: ritmo=${settings.pace}, efeitos=${settings.effects}, legenda=${settings.caption}.

Batidas atuais (JSON):
${JSON.stringify(compact)}

Pedido do usuário: "${request}"

Aplique o pedido. Regras:
- Mantenha o "id" das batidas que continuam; batidas novas vêm sem id.
- Só mude o que o pedido pede.
- Se o pedido for sobre ritmo, efeitos ou legenda do vídeo inteiro, mude "settings" (pace: calmo|normal|rapido|frenetico, effects: poucos|medida|muitos, caption: quadrinho|completa|limpa|sem).
- "narration" é a junção dos "say".

${BEAT_FORMAT}

Responda só com JSON:
{ "reply": "uma frase dizendo o que você mudou, começando com um verbo no passado (ex.: 'Encurtei o gancho…')", "settings": {...}, "beats": [ ... ] }`

  const out = await askJson<{ reply?: string; beats?: RawBeat[]; settings?: Partial<ProjectSettings> }>(prompt)
  const next = out.beats?.length ? cleanBeats(out.beats, beats) : beats
  return {
    reply: out.reply?.trim() || 'Pronto.',
    beats: next,
    narration: next === beats ? narration : next.map(b => b.say).join(' '),
    settings: { ...settings, ...pickSettings(out.settings) },
  }
}

function pickSettings(s?: Partial<ProjectSettings>): Partial<ProjectSettings> {
  if (!s) return {}
  const out: Partial<ProjectSettings> = {}
  if (s.pace && ['calmo', 'normal', 'rapido', 'frenetico'].includes(s.pace)) out.pace = s.pace
  if (s.effects && ['poucos', 'medida', 'muitos'].includes(s.effects)) out.effects = s.effects
  if (s.caption && ['quadrinho', 'completa', 'limpa', 'sem'].includes(s.caption)) out.caption = s.caption
  return out
}

/** Cataloga uma imagem pela visão: quem aparece, etiquetas e áreas de zoom. */
export async function catalogImage(
  data: Buffer,
  mimeType: string,
): Promise<Pick<LibraryImage, 'name' | 'kind' | 'characters' | 'tags' | 'description' | 'regions'>> {
  const prompt = `Você cataloga imagens para uma biblioteca de edição de Shorts (anime, mangá, memes, prints).
Descreva a imagem em português do Brasil. Responda só com JSON:
{
  "name": "nome curto em minúsculas, 1 a 3 palavras (ex.: 'sukuna sorrindo')",
  "kind": "imagem" | "meme" | "print" | "logo" | "figurinha" (recorte com fundo transparente, reação, adesivo),
  "characters": ["personagens reconhecidos, com o nome mais conhecido; vazio se não souber"],
  "tags": ["4 a 8 etiquetas curtas em minúsculas: estilo (mangá, anime, fanart), emoção, ação, enquadramento, cores"],
  "description": "uma frase sobre o que acontece",
  "regions": [{ "label": "rosto" | "mão" | "olhos" | "corpo" | outro, "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 }]
}
Se for figurinha ou reação, coloque nas etiquetas a emoção e 2 ou 3 sinônimos (ex.: chocado, surpreso, espantado).
As regiões são caixas relativas ao tamanho da imagem (x,y = canto superior esquerdo). Marque no máximo 3, só as que valem um zoom.`

  const out = await askJson<any>(prompt, { image: { data: data.toString('base64'), mimeType }, effort: 'low' })
  const clamp = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0))
  return {
    name: String(out.name || 'imagem').toLowerCase(),
    kind: ['imagem', 'meme', 'print', 'logo', 'figurinha'].includes(out.kind) ? out.kind : 'imagem',
    characters: Array.isArray(out.characters) ? out.characters.map(String).slice(0, 5) : [],
    tags: Array.isArray(out.tags) ? out.tags.map((t: unknown) => String(t).toLowerCase()).slice(0, 10) : [],
    description: String(out.description || ''),
    regions: Array.isArray(out.regions)
      ? out.regions.slice(0, 3).map((r: any) => ({
          label: String(r.label || 'área'),
          x: clamp(r.x),
          y: clamp(r.y),
          w: clamp(r.w),
          h: clamp(r.h),
        }))
      : [],
  }
}

/** Cataloga um efeito sonoro ou música: nome curto e etiquetas (tipo de som, clima). */
export async function catalogSound(data: Buffer, mimeType: string, kind: 'sfx' | 'musica'): Promise<{ name: string; tags: string[] }> {
  const prompt = kind === 'sfx'
    ? `Este é um efeito sonoro para edição de vídeos curtos. Responda só com JSON:
{ "name": "nome curto em minúsculas (ex.: 'whoosh rápido')", "tags": ["2 a 6 etiquetas: o tipo (${SFX.join(', ')}, ou outro) e o clima"] }`
    : `Esta é uma música de fundo para vídeos curtos. Responda só com JSON:
{ "name": "nome curto em minúsculas", "tags": ["2 a 6 etiquetas: clima (tensa, animada, calma, épica, triste, engraçada), gênero, instrumentos"] }`
  const out = await askJson<{ name?: string; tags?: unknown }>(prompt, { audio: { data: data.toString('base64'), mimeType } })
  return {
    name: String(out.name || '').toLowerCase().slice(0, 40),
    tags: Array.isArray(out.tags) ? out.tags.map(t => String(t).toLowerCase()).slice(0, 8) : [],
  }
}

export interface ImageChoice {
  beatId: string
  imageId: string | null
  fit: 'match' | 'similar'
  /** Área da imagem escolhida para o zoom (um dos rótulos de região dela). */
  focus?: string
  reason?: string
}

/**
 * A IA lê o roteiro inteiro e o catálogo da biblioteca e escolhe uma imagem por cena,
 * pensando na história (continuidade, variedade, quem está falando) e não só em palavras.
 */
export async function pickImagesWithAI(input: {
  title: string
  narration: string
  beats: Beat[]
  images: LibraryImage[]
  /** Quantas vezes cada imagem já foi usada em outros vídeos. */
  usedElsewhere: Map<string, number>
}): Promise<ImageChoice[]> {
  const { title, narration, beats, images, usedElsewhere } = input
  const catalog = images
    .map(i =>
      [
        i.id,
        i.name,
        i.kind,
        i.characters.length ? `personagens: ${i.characters.join(', ')}` : '',
        i.tags.length ? `etiquetas: ${i.tags.join(', ')}` : '',
        i.description,
        i.regions.length ? `áreas: ${i.regions.map(r => r.label).join(', ')}` : '',
        usedElsewhere.get(i.id) ? `já usada em ${usedElsewhere.get(i.id)} vídeos` : '',
      ]
        .filter(Boolean)
        .join(' | '),
    )
    .join('\n')
  const scenes = beats
    .map((b, n) => `${b.id} | cena ${n + 1} | fala: "${b.say}" | legenda: ${b.text} | precisa mostrar: ${b.query}${b.characters.length ? ` | personagens: ${b.characters.join(', ')}` : ''}${b.scene === 'evidence' ? ' | é uma prova/print' : ''}`)
    .join('\n')

  const prompt = `Você é o editor de um Short vertical chamado "${title}". Escolha a melhor imagem da biblioteca para cada cena.

Narração completa: """${narration}"""

Cenas (id | posição | fala | legenda | o que a imagem precisa mostrar):
${scenes}

Biblioteca (id | nome | tipo | personagens | etiquetas | descrição | áreas marcadas | uso):
${catalog}

Regras:
- Pense no vídeo inteiro: a imagem tem que combinar com o que está sendo dito naquele momento e com quem é o assunto.
- O personagem certo importa mais que o resto. Não use imagem de outro personagem.
- Evite repetir a mesma imagem em cenas seguidas; repita só se não houver alternativa.
- Prefira imagens menos usadas em outros vídeos quando duas servem igual.
- "fit": "match" quando a imagem serve bem; "similar" quando é a melhor disponível mas não é o ideal.
- "imageId": null quando nada da biblioteca serve (melhor faltar do que pôr uma imagem errada).
- "focus": se a imagem tiver áreas marcadas, a que deve ganhar zoom nessa cena (ex.: "rosto"), ou null.
- "reason": até 8 palavras explicando a escolha.

Responda só com JSON:
{ "choices": [ { "beatId": "...", "imageId": "..." | null, "fit": "match" | "similar", "focus": "..." | null, "reason": "..." } ] }`

  const out = await askJson<{ choices?: Partial<ImageChoice>[] }>(prompt, { effort: 'low' })
  const ids = new Set(images.map(i => i.id))
  return (out.choices ?? [])
    .filter(c => c && typeof c.beatId === 'string')
    .map(c => ({
      beatId: c.beatId!,
      imageId: c.imageId && ids.has(c.imageId) ? c.imageId : null,
      fit: c.fit === 'similar' ? 'similar' : 'match',
      focus: c.focus ? String(c.focus) : undefined,
      reason: c.reason ? String(c.reason) : undefined,
    }))
}
