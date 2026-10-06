import { AppError } from '../../middleware/errorHandler.js'
import { askJson, askJsonMeta } from './llm.js'
import { citedScenes, describeChanges, diffBeats, hasChanges, keepOnlyCited, scenesText } from './sceneEdits.js'
import type { AiCredit, Beat, Effect, LibraryImage, Motion, ProjectSettings, SceneKind, ShortStyle } from './types.js'

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

type RawBeat = Partial<Omit<Beat, 'characters'>> & { characters?: unknown; tags?: unknown; sound?: unknown }

/** Efeitos sonoros da biblioteca que o chat pode pôr nas cenas pelo nome. */
export interface SoundOption {
  id: string
  name: string
}

/**
 * "sound" que veio do chat → mudança no som da cena. undefined = não mexeu;
 * { sfxId: undefined } = tirou o som; { sfxId } = trocou.
 */
function chosenSound(value: unknown, previous: Beat | undefined, sounds?: SoundOption[]) {
  if (!sounds || value === undefined || value === null) return undefined
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
  const wanted = norm(String(value))
  const before = norm(sounds.find(s => s.id === previous?.sfxId)?.name ?? 'nenhum')
  if (wanted === before) return undefined
  if (/^(nenhum|none|sem som|sem|-|)$/.test(wanted)) return { sfxId: undefined as string | undefined }
  const found = sounds.find(s => norm(s.name) === wanted) ?? sounds.find(s => norm(s.name).includes(wanted) || wanted.includes(norm(s.name)))
  return found ? { sfxId: found.id as string | undefined } : undefined
}

/** Tira aspas que a IA às vezes coloca em volta das falas. */
const unquote = (text: unknown) => String(text ?? '').trim().replace(/^["“”']+|["“”']+$/g, '').trim()

/** Normaliza as batidas que vieram da IA (campos faltando, valores fora da lista). */
export function cleanBeats(raw: RawBeat[], keep: Beat[] = [], sounds?: SoundOption[]): Beat[] {
  return raw
    .filter(b => b && (b.say || b.text))
    .map((b, i) => {
      const previous = b.id ? keep.find(k => k.id === b.id) : undefined
      const changedImage = previous && (previous.query !== b.query || String(previous.characters) !== String(b.characters))
      const sound = chosenSound(b.sound, previous, sounds)
      return {
        id: previous?.id ?? `b${Date.now().toString(36)}${i}`,
        say: unquote(b.say ?? b.text),
        text: unquote(b.text ?? b.say).split(/\s+/).slice(0, 4).join(' '),
        query: String(b.query ?? '').trim(),
        searchTags: Array.isArray(b.tags)
          ? b.tags.map(t => String(t).trim().toLowerCase().replace(/\s+/g, '_')).filter(Boolean).slice(0, 4)
          : previous?.query === b.query ? previous?.searchTags : undefined,
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
        // som escolhido pelo usuário (editor ou chat) fica até ele trocar
        sfxId: sound ? sound.sfxId : previous?.sfxLocked || previous?.sfx === b.sfx ? previous?.sfxId : undefined,
        sfxLocked: sound ? true : previous?.sfxLocked,
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
  "tags": ["2 a 4 etiquetas do Danbooru, em inglês, que descrevem essa imagem: expressão, pose, ação, enquadramento (ex.: 'smirk', 'hands_in_pockets', 'from_below', 'close-up')"],
  "characters": ["nomes dos personagens que aparecem na imagem"],
  "scene": "full" (imagem em tela cheia) ou "evidence" (imagem emoldurada sobre fundo quadriculado, para provas, prints e comparações),
  "effect": "none" | "arrow" | "cross" | "circle" | "emoji",
  "emoji": "só se effect = emoji",
  "sticker": "só se effect = emoji: a reação em 1 a 3 palavras, para escolher uma figurinha (ex.: 'chocado', 'rindo', 'pensando', 'bravo')",
  "sfx": "efeito sonoro no corte, ou omita: ${SFX.join(' | ')}",
  "motion": "zoom-in" | "zoom-out" | "shake" | "pan",
  "focus": "área da imagem para dar zoom, se fizer sentido: rosto, mão, olhos, corpo"
}`

/** O que cada tom da tela Novo vídeo pede para a IA. Tons desconhecidos vão como texto. */
const TONE_GUIDE: Record<string, string> = {
  'Polêmico':
    'polêmico. Defenda uma opinião forte que divide o público, sem ofender ninguém, e sustente com fatos. Termine com uma pergunta que obrigue a pessoa a escolher um lado nos comentários',
  'Curioso':
    'curioso. Abra com uma pergunta ou um fato que pouca gente sabe e entregue a resposta aos poucos, um detalhe surpreendente por cena',
  'Mistério':
    'mistério. No gancho, prometa uma resposta ou um segredo e só revele no final; cada frase deixa uma pergunta aberta para a pessoa continuar assistindo',
  'Papo reto':
    'papo reto. Fale direto com quem assiste, como um amigo contando: frases curtas, gírias leves ("mano", "olha isso"), sem enrolação, já no ponto no primeiro segundo',
}

export async function generateScript(input: {
  theme: string
  tone: string
  duration: number
  style: ShortStyle
  narration?: string
}): Promise<{ title: string; narration: string; beats: Beat[]; ai: AiCredit }> {
  const { theme, tone, duration, style, narration } = input
  const beatCount = Math.round(duration / PACE_SECONDS[style.pace])
  const words = Math.round(duration * 2.6)

  const task = narration
    ? `O usuário já tem a narração. NÃO mude o texto: divida exatamente esta narração em batidas, na ordem:\n"""${narration}"""`
    : `Escreva a narração de um Short sobre: "${theme}".
- Cerca de ${words} palavras (${duration} segundos falados).
- Comece com um gancho forte nos primeiros 2 segundos.
- Tom: ${TONE_GUIDE[tone] ?? tone}.`

  const prompt = `Você é roteirista e editor de Shorts verticais (YouTube Shorts, Reels, TikTok) em português do Brasil.

${task}

Estilo do canal: "${style.name}" (${style.summary}). ${style.notes}
Imagens preferidas: ${IMAGE_TYPE[style.imageType]}.

Depois divida a narração em cerca de ${beatCount} batidas visuais. Em cada batida o vídeo corta para uma imagem nova.
Efeitos (setas, X, círculos, figurinhas de reação): ${EFFECTS_SHARE[style.effects]}; use "none" no resto.
Efeitos sonoros: "boom" ou "impacto" no gancho e nas revelações, "whoosh" em setas e cortes rápidos, "erro" com X, "pop" com figurinha de reação, "click" em provas; cerca de metade das batidas tem sfx.
Use "evidence" para 1 a cada 5 batidas, quando o trecho cita uma prova, um print ou uma comparação.
Concatenar os "say" de todas as batidas tem que dar exatamente a narração.

${BEAT_FORMAT}

Responda só com JSON:
{ "title": "título curto do vídeo (até 6 palavras)", "narration": "narração completa", "beats": [ ... ] }`

  // escrevendo do zero, a IA confirma os fatos na web (pouco); com a narração pronta, só divide
  const { data: out, ai } = await askJsonMeta<{ title?: string; narration?: string; beats?: RawBeat[] }>(prompt, {
    research: !narration,
  })
  const beats = cleanBeats(out.beats ?? [])
  if (beats.length === 0) throw new AppError('A IA não devolveu nenhuma batida. Tente de novo.', 502, 'AI_EMPTY')
  return {
    title: out.title?.trim() || theme,
    narration: narration ?? out.narration?.trim() ?? beats.map(b => b.say).join(' '),
    beats,
    ai,
  }
}

export async function adjustBeats(input: {
  request: string
  beats: Beat[]
  narration: string
  settings: ProjectSettings
  style: ShortStyle
  /** efeitos sonoros da biblioteca, para o chat pôr nas cenas pelo nome */
  sounds?: SoundOption[]
  /** Cena aberta na prévia, como na tela (a primeira é 1): é a "esta cena" do pedido. */
  openScene?: number
}): Promise<{ reply: string; beats: Beat[]; narration: string; settings: ProjectSettings; ai: AiCredit }> {
  const { request, beats, narration, settings, style, sounds = [] } = input
  const openScene = input.openScene && input.openScene <= beats.length ? input.openScene : undefined
  const soundName = (id?: string) => sounds.find(s => s.id === id)?.name ?? 'nenhum'
  // "cena" é o número que o usuário vê; sem ele a IA contava a posição na lista e errava por uma
  const compact = beats.map(({ id, say, text, query, searchTags, characters, scene, effect, emoji, sticker, sfx, sfxId, motion, focus }, i) => ({
    cena: i + 1, id, say, text, query, tags: searchTags, characters, scene, effect, emoji, sticker, sfx, sound: soundName(sfxId), motion, focus,
  }))

  const prompt = `Você edita um Short vertical em português do Brasil. O vídeo é uma lista de batidas; em cada batida o vídeo corta para uma imagem nova.

Estilo: "${style.name}". ${style.notes}
Ajustes atuais: ritmo=${settings.pace}, efeitos=${settings.effects}, legenda=${settings.caption}.

Batidas atuais (JSON):
${JSON.stringify(compact)}

Pedido do usuário: "${request}"

Aplique o pedido. Regras:
- O campo "cena" é o número que o usuário vê na tela (a primeira é 1). "Cena 6" no pedido é a batida com "cena": 6; não conte posições na lista.${openScene ? `
- A cena aberta na prévia agora é a cena ${openScene}: "esta cena", "essa cena" e "aqui" se referem a ela.` : ''}
- Mantenha o "id" das batidas que continuam; batidas novas vêm sem id.
- Só mude o que o pedido pede. Se o pedido cita cenas, não mexa nas outras.
- Se o pedido for sobre ritmo, efeitos ou legenda do vídeo inteiro, mude "settings" (pace: calmo|normal|rapido|frenetico, effects: poucos|medida|muitos, caption: quadrinho|completa|limpa|sem).
- "narration" é a junção dos "say".
- "sound" é o efeito sonoro que toca na batida. Para trocar, use o nome exato de um destes: ${sounds.length ? sounds.map(s => `"${s.name}"`).join(', ') : '(a biblioteca não tem efeitos sonoros)'}; para tirar, "nenhum". Não mude o "sound" das batidas que o pedido não cita.

${BEAT_FORMAT}

Responda só com JSON:
{ "reply": "uma frase dizendo o que você mudou, começando com um verbo no passado (ex.: 'Encurtei o gancho…')", "settings": {...}, "beats": [ ... ] }`

  const { data: out, ai } = await askJsonMeta<{ reply?: string; beats?: RawBeat[]; settings?: Partial<ProjectSettings> }>(prompt)
  let next = out.beats?.length ? cleanBeats(out.beats, beats, sounds) : beats

  // pedido que cita cenas: o que a IA mudou fora delas volta como estava
  const cited = citedScenes(request, beats.length, openScene)
  let reverted = false
  if (cited.length && next !== beats) {
    const kept = keepOnlyCited(beats, next, new Set(cited.map(n => beats[n - 1].id)))
    next = kept.beats
    reverted = kept.reverted
  }

  const changes = diffBeats(beats, next)
  if (!hasChanges(changes)) next = beats
  const nextSettings = { ...settings, ...pickSettings(out.settings) }
  return {
    reply: chatReply({ aiReply: out.reply?.trim() || 'Pronto.', changes, cited, reverted, settingsChanged: settingsDiffer(settings, nextSettings) }),
    beats: next,
    narration: next === beats ? narration : next.map(b => b.say).join(' '),
    settings: nextSettings,
    ai,
  }
}

const settingsDiffer = (a: ProjectSettings, b: ProjectSettings) => a.pace !== b.pace || a.effects !== b.effects || a.caption !== b.caption

/**
 * A resposta do chat diz o que de fato mudou (ADR 0017). O texto da IA só aparece quando
 * ninguém desfez nada: se a IA mexeu na cena errada, o texto dela descreveria a mudança errada.
 */
function chatReply(input: { aiReply: string; changes: ReturnType<typeof diffBeats>; cited: number[]; reverted: boolean; settingsChanged: boolean }) {
  const { aiReply, changes, cited, reverted, settingsChanged } = input
  const what = describeChanges(changes)
  if (reverted) {
    const asked = scenesText(cited)
    return what
      ? `${what} A IA também mexeu em outras cenas; desfiz, porque o pedido era só ${asked}.`
      : `Não mudei nada: a IA errou de cena e eu desfiz. O pedido era só ${asked}; tente de novo.`
  }
  if (!what) return settingsChanged ? aiReply : `${aiReply} (Nada mudou nas cenas.)`
  return `${aiReply} ${what}`
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

export type SceneInfo = Pick<LibraryImage, 'name' | 'characters' | 'tags' | 'description' | 'regions'> & {
  /** abertura, encerramento, créditos, tela preta: não serve para os vídeos */
  skip: boolean
}

/**
 * Cataloga várias cenas de um vídeo num pedido só: cada imagem é o quadro do meio de uma cena.
 * hint: de qual anime/episódio é, para a IA reconhecer os personagens.
 */
export async function catalogScenes(frames: Buffer[], hint: string): Promise<SceneInfo[]> {
  const prompt = `Você cataloga cenas de um vídeo para uma biblioteca de edição de Shorts de anime.
${hint ? `O vídeo é: ${hint}.\n` : ''}As ${frames.length} imagens, na ordem, são o quadro do meio de ${frames.length} cenas seguidas do vídeo.
Descreva cada cena em português do Brasil. Responda só com JSON, uma entrada por imagem, na mesma ordem:
{ "scenes": [ {
  "name": "nome curto em minúsculas, 1 a 4 palavras (ex.: 'gojo tira a venda')",
  "characters": ["personagens reconhecidos, com o nome mais conhecido; vazio se não souber"],
  "tags": ["4 a 8 etiquetas curtas em minúsculas: ação (luta, golpe, corrida, conversa), emoção, enquadramento (close, plano geral), cores, clima"],
  "description": "uma frase sobre o que acontece",
  "regions": [{ "label": "rosto" | "mão" | "olhos" | "corpo" | outro, "x": 0-1, "y": 0-1, "w": 0-1, "h": 0-1 }],
  "skip": true | false
} ] }
"regions": no máximo 2 caixas relativas ao quadro (x,y = canto superior esquerdo); o vídeo vertical corta as laterais e centraliza na primeira.
"skip": true para abertura, encerramento, créditos, logotipos, tela preta ou só texto.`

  const out = await askJson<{ scenes?: any[] }>(prompt, {
    images: frames.map(f => ({ data: f.toString('base64'), mimeType: 'image/jpeg' })),
    effort: 'low',
  })
  const clamp = (n: unknown) => Math.min(1, Math.max(0, Number(n) || 0))
  const list = Array.isArray(out.scenes) ? out.scenes : []
  return frames.map((_, n) => {
    const s = list[n] ?? {}
    return {
      name: String(s.name || 'cena').toLowerCase().slice(0, 40),
      characters: Array.isArray(s.characters) ? s.characters.map(String).slice(0, 5) : [],
      tags: Array.isArray(s.tags) ? s.tags.map((t: unknown) => String(t).toLowerCase()).slice(0, 10) : [],
      description: String(s.description || ''),
      regions: Array.isArray(s.regions)
        ? s.regions.slice(0, 2).map((r: any) => ({ label: String(r.label || 'área'), x: clamp(r.x), y: clamp(r.y), w: clamp(r.w), h: clamp(r.h) }))
        : [],
      skip: s.skip === true,
    }
  })
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
}): Promise<{ choices: ImageChoice[]; ai: AiCredit }> {
  const { title, narration, beats, images, usedElsewhere } = input
  const catalog = images
    .map(i =>
      [
        i.id,
        i.name,
        i.kind === 'cena' && i.clip ? `cena de vídeo (${(i.clip.end - i.clip.start).toFixed(1)}s, em movimento)` : i.kind,
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
- "cena de vídeo" é um trecho do anime em movimento: prefira nas falas de ação (luta, golpe, transformação, revelação, correria); imagem parada e quadro de mangá funcionam melhor nas explicações. Misture os dois ao longo do vídeo.
- Prefira imagens menos usadas em outros vídeos quando duas servem igual.
- "fit": "match" quando a imagem serve bem; "similar" quando é a melhor disponível mas não é o ideal.
- "imageId": null quando nada da biblioteca serve (melhor faltar do que pôr uma imagem errada).
- "focus": se a imagem tiver áreas marcadas, a que deve ganhar zoom nessa cena (ex.: "rosto"), ou null.
- "reason": até 8 palavras explicando a escolha.

Responda só com JSON:
{ "choices": [ { "beatId": "...", "imageId": "..." | null, "fit": "match" | "similar", "focus": "..." | null, "reason": "..." } ] }`

  const { data: out, ai } = await askJsonMeta<{ choices?: Partial<ImageChoice>[] }>(prompt, { effort: 'low' })
  const ids = new Set(images.map(i => i.id))
  const choices: ImageChoice[] = (out.choices ?? [])
    .filter(c => c && typeof c.beatId === 'string')
    .map(c => ({
      beatId: c.beatId!,
      imageId: c.imageId && ids.has(c.imageId) ? c.imageId : null,
      fit: c.fit === 'similar' ? 'similar' : 'match',
      focus: c.focus ? String(c.focus) : undefined,
      reason: c.reason ? String(c.reason) : undefined,
    }))
  return { choices, ai }
}
