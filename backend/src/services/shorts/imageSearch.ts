/**
 * Sugestões de imagens da internet para uma cena (tela "Trocar imagem").
 *
 * Fontes, na ordem em que aparecem:
 *  - Google Imagens via Serper (opcional, precisa de SERPER_API_KEY)
 *  - Bing Imagens (sem chave): a internet toda, e uma segunda busca só por painéis reais do mangá
 *  - AniList: arte oficial do personagem (sem chave)
 *  - Danbooru: só posts com classificação "geral" (rating:g), ordenados por nota (sem chave)
 *
 * Nada é baixado aqui: o usuário escolhe uma sugestão e o app importa pelo
 * link (POST /library/import-url), que salva e cataloga na biblioteca.
 */

import axios from 'axios'
import { logger } from '../../utils/logger.js'
import { listImages, normalize } from './library.js'

export type WebImageSource = 'google' | 'web' | 'manga' | 'anilist' | 'danbooru'

export interface WebImage {
  id: string
  /** Miniatura para a grade. */
  thumb: string
  /** Imagem grande que vai para a biblioteca. */
  url: string
  width?: number
  height?: number
  source: WebImageSource
  title: string
  /** Página de origem, para abrir e conferir. */
  page?: string
  /** Personagens que a fonte já informa (ajuda quando a IA não cataloga). */
  characters?: string[]
}

export interface WebSearchResult {
  images: WebImage[]
  /** O que foi buscado em cada fonte, para mostrar na tela. */
  searched: string[]
  google: boolean
}

const UA = 'InstaSearch/1.0 (uso pessoal)'
const http = axios.create({ timeout: 12000, headers: { 'User-Agent': UA } })

const CACHE_MS = 15 * 60 * 1000
const cache = new Map<string, { at: number; value: WebSearchResult }>()

/**
 * Palavras da cena (em português) → etiquetas do Danbooru. Sem isso, "Gojo calmo com a mão no bolso"
 * e "Gojo" davam as mesmas imagens. As etiquetas que a IA escreve no roteiro (Beat.searchTags) vêm antes.
 */
const SCENE_WORDS: [RegExp, string][] = [
  // expressão
  [/pensativ|pensando|reflet/, 'thinking'],
  [/chorand|lagrima|choro/, 'crying'],
  [/triste|tristeza|deprimid/, 'sad'],
  [/gargalh|\brindo|risada/, 'laughing'],
  [/sorriso malicioso|sorriso de canto|convencid|arrogant|orgulh/, 'smirk'],
  [/sorri/, 'smile'],
  [/brav|raiva|irritad|furios|odio/, 'angry'],
  [/chocad|surpres|espantad/, 'surprised'],
  [/assustad|medo/, 'scared'],
  [/serio|seriedade/, 'serious'],
  [/calm|tranquil|indiferente|sem expressao|inexpressiv/, 'expressionless'],
  [/confus|duvid/, 'confused'],
  [/envergonhad|corad|timid/, 'blush'],
  [/olhos fechados/, 'closed_eyes'],
  [/gritand|grito/, 'shouting'],
  [/louc|insan|psicopat/, 'crazy_eyes'],
  [/determinad|focad/, 'determined'],
  // pose e ação
  [/mao no bolso|maos nos bolsos|maos no bolso|mao nos bolsos/, 'hands_in_pockets'],
  [/bracos cruzados|braco cruzado/, 'crossed_arms'],
  [/apontand/, 'pointing'],
  [/sentad/, 'sitting'],
  [/deitad/, 'lying'],
  [/de pe\b|em pe\b/, 'standing'],
  [/de costas/, 'from_behind'],
  [/de lado|perfil/, 'from_side'],
  [/de cima/, 'from_above'],
  [/de baixo/, 'from_below'],
  [/correndo|corrend/, 'running'],
  [/pulando|saltand/, 'jumping'],
  [/voando|flutuand/, 'flying'],
  [/lutand|luta|briga|batalha|combate|golpe|soco/, 'fighting'],
  [/comend|comida/, 'eating'],
  [/dormind/, 'sleeping'],
  [/andand|caminhand/, 'walking'],
  [/abracand|abraco/, 'hug'],
  [/beijo|beijand/, 'kiss'],
  [/mao estendida|estendendo a mao|apontando a mao/, 'outstretched_hand'],
  [/acenand|tchau/, 'waving'],
  [/sinal de paz|v com os dedos/, 'v'],
  [/selo de mao|sinal de mao|fazendo (um )?jutsu/, 'hand_seal'],
  // enquadramento
  [/close|de perto|primeiro plano/, 'close-up'],
  [/\bolhos?\b|olhar/, 'eye_focus'],
  [/corpo inteiro/, 'full_body'],
  [/meio corpo|da cintura pra cima/, 'upper_body'],
  [/retrato/, 'portrait'],
  // visual e objetos
  [/venda|vendad/, 'blindfold'],
  [/oculos escuros|oculos de sol/, 'sunglasses'],
  [/oculos/, 'glasses'],
  [/sangue|sangrand|ferid/, 'blood'],
  [/espada|katana/, 'sword'],
  [/aura|energia|poder|brilhand/, 'aura'],
  [/\bmapa/, 'map'],
  [/ponta.?cabeca|de cabeca para baixo/, 'upside-down'],
  [/celular|telefone/, 'phone'],
  [/livro/, 'book'],
  [/chuva/, 'rain'],
  [/noite/, 'night'],
  [/ceu|nuvens/, 'sky'],
  [/sombra|escuro/, 'dark'],
  [/uniforme escolar|escola/, 'school_uniform'],
  [/crianca|pequeno|infancia/, 'child'],
  // tipo de imagem
  [/mang|quadrinho|painel/, 'comic'],
  [/preto e branco/, 'monochrome'],
  [/print|cena do anime|screenshot/, 'anime_screenshot'],
]

const STOP = new Set(
  'a o as os de da do das dos e em no na nos nas um uma com sem por para pra que se seu sua the of and anime manga mangá cena imagem foto'.split(' '),
)

export function webSearchEnabled() {
  return { google: Boolean(process.env.SERPER_API_KEY?.trim()) }
}

export interface WebSearchInput {
  /** O que a cena precisa mostrar ("Gojo calmo com a mão no bolso, anime"). */
  query: string
  /** Personagens da cena, se a IA informou. */
  characters?: string[]
  /** Título do vídeo, para desempatar nomes ("Sakura" de Naruto, não de Fate). */
  context?: string
  /** Etiquetas do Danbooru que a IA escreveu para a cena (hands_in_pockets, smile…). */
  tags?: string[]
  /** 1 = as melhores; 2, 3… = outras opções (pede outra página e embaralha o resto). */
  page?: number
  /** Tipo de imagem do estilo: com "manga", os painéis reais do mangá vêm primeiro. */
  imageType?: string
}

/** Etiquetas da cena: as da IA primeiro, depois as que saem das palavras do texto. */
export function sceneTags(query: string, tags: string[] = []) {
  // "sem venda" não pode virar a etiqueta da venda
  const text = normalize(query).replace(/\b(sem|nao|tirou a|tirando a|tirando o) \w+/g, ' ')
  const fromWords = SCENE_WORDS.filter(([re]) => re.test(text)).map(([, tag]) => tag)
  const fromAi = tags.map(t => t.trim().toLowerCase().replace(/\s+/g, '_')).filter(t => /^[a-z0-9_()\-:'.!?]+$/.test(t))
  return [...new Set([...fromAi, ...fromWords])].slice(0, 4)
}

export async function searchWebImages(input: WebSearchInput): Promise<WebSearchResult> {
  const q = input.query.trim()
  const context = input.context ?? ''
  const page = Math.max(1, Math.min(20, Math.floor(input.page ?? 1)))
  const names = (input.characters?.length ? input.characters : guessNames(q)).map(c => c.trim()).filter(Boolean).slice(0, 2)
  const tags = sceneTags(q, input.tags)
  // meme, fanart e variações (ADR 0020): vale o que a web acha, não o painel do mangá nem o retrato oficial
  const creative = /\b(memes?|fanart|genderswap|genderbend|chibi|cosplay)\b/.test(normalize(q))
  const mangaFirst = !creative && (input.imageType === 'manga' || /mang|painel|quadrinho/.test(normalize(q)))
  const key = `${normalize(q)}|${names.map(normalize).join(',')}|${normalize(context)}|${tags.join(',')}|${page}|${mangaFirst}`
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_MS) return withoutLibrary(hit.value)

  const google = webSearchEnabled().google
  const googleQuery = [q, ...names.filter(c => !normalize(q).includes(normalize(c)))].join(' ')
  const [g, w, people] = await Promise.all([
    google ? safe('Google', () => searchGoogle(googleQuery, page)) : null,
    safe('Bing', () => searchBing(googleQuery, page, 'web')),
    safe('AniList', () => resolveCharacters(names, `${q} ${context}`)),
  ])
  // o retrato oficial é sempre o mesmo: só na primeira página
  const a = page === 1 && people?.length && !creative ? anilistImages(people) : null
  // painéis do mangá: nome completo (AniList) + série + etiquetas da cena em inglês ("Satoru Gojo smile manga panel")
  const fullNames = names.map((n, i) => people?.[i]?.name || n)
  const series = people?.find(p => p?.series.length)?.series[0] ?? ''
  const mangaQuery = [...fullNames, series, ...tags.filter(t => t !== 'comic').map(t => t.replace(/_/g, ' ')), 'manga panel']
    .filter(Boolean)
    .join(' ')
  // o nome completo do AniList acha a etiqueta certa no Danbooru ("Sakura Haruno" → haruno_sakura)
  const [d, m] = await Promise.all([
    safe('Danbooru', () =>
      searchDanbooru(
        names.map((n, i) => ({ name: fullNames[i], series: people?.[i]?.series ?? [] })),
        tags,
        page,
      ),
    ),
    names.length && !creative ? safe('Mangá', () => searchBing(mangaQuery, page, 'manga')) : null,
  ])

  // o que bate com a cena vem primeiro; o retrato e o resto do personagem depois.
  // Estilo de mangá: os painéis reais do mangá na frente de tudo.
  const manga = m?.images ?? []
  const ordered = [
    ...(mangaFirst ? manga : []),
    ...(g?.images ?? []),
    ...(w?.images ?? []).slice(0, 12),
    ...(d?.specific ?? []),
    ...(mangaFirst ? [] : manga),
    ...(a?.images ?? []),
    ...(w?.images ?? []).slice(12),
    ...(d?.general ?? []),
  ]
  const seen = new Set<string>()
  const images = ordered.filter(img => {
    if (seen.has(img.url)) return false
    seen.add(img.url)
    return true
  })
  const value: WebSearchResult = {
    images,
    searched: [g?.searched, mangaFirst ? m?.searched : w?.searched, mangaFirst ? w?.searched : m?.searched, a?.searched, d?.searched].filter((s): s is string => Boolean(s)),
    google,
  }
  if (images.length) cache.set(key, { at: Date.now(), value })
  return withoutLibrary(value)
}

/** Tira as imagens que já estão na biblioteca (importadas antes pelo mesmo link). */
async function withoutLibrary(result: WebSearchResult): Promise<WebSearchResult> {
  const sources = new Set((await listImages()).map(i => i.source).filter(Boolean))
  return { ...result, images: result.images.filter(i => !sources.has(i.url)) }
}

async function safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn()
  } catch (error: any) {
    logger.warn(`⚠️ Busca de imagens (${label}) falhou: ${error.response?.status ?? ''} ${error.message}`)
    return null
  }
}

/** Sem personagens informados: palavras com cara de nome ("GOKU", "Zoro"). */
function guessNames(query: string): string[] {
  return query
    .split(/[\s,;:.!?()]+/)
    .filter(w => w.length > 2 && /^[A-ZÀ-Ú]/.test(w) && !STOP.has(w.toLowerCase()))
    .slice(0, 2)
}

// ─── Google (Serper) ──────────────────────────────────────

async function searchGoogle(q: string, page = 1) {
  const { data } = await http.post(
    'https://google.serper.dev/images',
    { q, gl: 'br', hl: 'pt-br', num: 20, page },
    { headers: { 'X-API-KEY': process.env.SERPER_API_KEY!.trim(), 'Content-Type': 'application/json' } },
  )
  const images: WebImage[] = (data?.images ?? [])
    .filter((r: any) => r.imageUrl && /^https?:/.test(r.imageUrl))
    .slice(0, 16)
    .map((r: any, n: number) => ({
      id: `google-${n}`,
      thumb: r.thumbnailUrl || r.imageUrl,
      url: r.imageUrl,
      width: r.imageWidth,
      height: r.imageHeight,
      source: 'google' as const,
      title: r.title || r.source || 'Google',
      page: r.link,
    }))
  return { images, searched: `Google: “${q}”` }
}

// ─── Bing Imagens (sem chave) ─────────────────────────────
// O Google Imagens só responde com JavaScript; o Bing devolve os resultados no HTML,
// com o link da imagem original (murl), a miniatura (turl) e a página de origem (purl).

const BROWSER_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
const MANGA_HINT = /mang|panel|painel|chapter|cap[ií]tulo|\bch\.? ?\d|scan|raw|colored|colorido/i

function decodeHtml(text: string) {
  return text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>')
}

async function searchBing(q: string, page: number, source: 'web' | 'manga') {
  const count = 35
  const { data } = await http.get<string>('https://www.bing.com/images/async', {
    params: { q, first: (page - 1) * count, count, mmasync: 1, setlang: 'pt-br', adlt: 'strict' },
    headers: { 'User-Agent': BROWSER_UA, 'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8' },
    responseType: 'text',
  })
  const seen = new Set<string>()
  const images: WebImage[] = []
  for (const match of String(data).matchAll(/\sm="(\{[^"]*\})"/g)) {
    try {
      const r = JSON.parse(decodeHtml(match[1]))
      if (!r.murl || !/^https?:/.test(r.murl) || seen.has(r.murl)) continue
      seen.add(r.murl)
      images.push({
        id: `${source}-${images.length}`,
        thumb: r.turl || r.murl,
        url: r.murl,
        source,
        title: decodeHtml(r.t || r.desc || 'Bing').slice(0, 120),
        page: r.purl,
      })
    } catch {
      // item com JSON quebrado: pula
    }
  }
  // painéis de verdade (título ou página falam de mangá/capítulo) antes de wallpapers e fanarts
  const list = source === 'manga' ? [...images.filter(i => MANGA_HINT.test(`${i.title} ${i.page}`)), ...images.filter(i => !MANGA_HINT.test(`${i.title} ${i.page}`))] : images
  return { images: list.slice(0, 24), searched: `${source === 'manga' ? 'Mangá' : 'Bing'}: “${q}”` }
}

// ─── AniList ──────────────────────────────────────────────

interface Person {
  id: number
  name: string
  image?: string
  page?: string
  series: string[]
}

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 15) {
    characters(search: $search, sort: [SEARCH_MATCH, FAVOURITES_DESC]) {
      id name { full } image { large } siteUrl
      media(perPage: 2, sort: POPULARITY_DESC) { nodes { title { romaji english } } }
    }
  }
}`

/** Romanização sem vogais longas: "Yuuta" → "yuta", "Gojou" → "gojo", "Gokuu" → "goku". */
function romaji(text: string) {
  return normalize(text).replace(/ou/g, 'o').replace(/([aeiou])\1+/g, '$1')
}

/**
 * Quanto o nome procurado bate com o nome completo: 2 = todas as palavras exatas ("yuta" e "Yuuta Okkotsu"),
 * 1 = alguma só pelo começo ("goku" e "Son Gokuten"), 0 = não bate. "yuta" não serve para "Yutaka".
 */
function nameScore(searched: string, full: string) {
  const have = romaji(full).split(' ')
  const words = romaji(searched).split(' ').filter(Boolean)
  if (words.length === 0) return 0
  if (words.every(w => have.includes(w))) return 2
  // começo de palavra só vale se faltar no máximo 1 letra ("goku" → "gokuu" já virou "goku")
  const prefix = (w: string, h: string) => h.startsWith(w) && h.length - w.length <= 1 && w.length >= 3
  return words.every(w => have.some(h => h === w || prefix(w, h) || prefix(h, w))) ? 1 : 0
}

const sameName = (searched: string, full: string) => nameScore(searched, full) > 0

// mesma busca em várias cenas: uma ida só ao AniList (o limite deles é baixo, ~30 por minuto)
const anilistCache = new Map<string, Promise<any>>()

function anilistSearch(name: string) {
  const key = romaji(name)
  let hit = anilistCache.get(key)
  if (!hit) {
    hit = http.post('https://graphql.anilist.co', { query: ANILIST_QUERY, variables: { search: name } }).then(r => r.data)
    hit.catch(() => anilistCache.delete(key))
    anilistCache.set(key, hit)
  }
  return hit
}

/** Acha cada personagem no AniList, preferindo a série citada no contexto ou a dos outros personagens. */
async function resolveCharacters(names: string[], context: string): Promise<(Person | undefined)[]> {
  const ctx = normalize(context)
  const lists = await Promise.all(
    names.map(async name => {
      const data = await anilistSearch(name)
      return ((data?.data?.Page?.characters ?? []) as any[])
        .filter(c => c.name?.full && sameName(name, c.name.full))
        .map(
          (c): Person => ({
            id: c.id,
            name: c.name.full,
            image: c.image?.large && !/default\.jpg/.test(c.image.large) ? c.image.large : undefined,
            page: c.siteUrl,
            series: (c.media?.nodes ?? []).flatMap((m: any) => [m.title?.romaji, m.title?.english]).filter(Boolean).map(normalize),
          }),
        )
    }),
  )
  const inContext = (p: Person) => p.series.some(s => s && ctx.includes(s))
  const picked = lists.map(list => list.find(inContext))
  const known = new Set(picked.flatMap(p => p?.series ?? []))
  // sem série no contexto: o nome exato ganha do parecido ("Yuuta Okkotsu" antes de "Yutaka Hoshino")
  const best = (list: Person[], name: string) => [...list].sort((a, b) => nameScore(name, b.name) - nameScore(name, a.name))[0]
  return lists.map((list, i) => picked[i] ?? list.find(p => p.series.some(s => known.has(s))) ?? best(list, names[i]))
}

function anilistImages(people: (Person | undefined)[]) {
  const found = people.filter((p): p is Person => Boolean(p?.image))
  if (found.length === 0) return null
  const images: WebImage[] = found.map(p => ({
    id: `anilist-${p.id}`,
    thumb: p.image!,
    url: p.image!,
    source: 'anilist',
    title: p.name,
    page: p.page,
    characters: [p.name],
  }))
  return { images, searched: `Arte oficial: ${found.map(p => p.name).join(', ')}` }
}

// ─── Danbooru ─────────────────────────────────────────────

const DANBOORU = 'https://danbooru.donmai.us'
const tagCache = new Map<string, string | null>()

/** "Goku" → "son_goku": a etiqueta de personagem mais usada que bate com o nome. */
/**
 * "Goku" → "son_goku": a etiqueta de personagem que bate com o nome. Com a série do AniList,
 * prefere a dela: "Sukuna" de Jujutsu Kaisen é ryoumen_sukuna_(jujutsu_kaisen), não a Sukuna do Touhou.
 */
async function characterTag(name: string, series: string[] = []): Promise<string | null> {
  const key = `${normalize(name)}|${series.join(',')}`
  if (tagCache.has(key)) return tagCache.get(key)!
  const { data } = await http.get(`${DANBOORU}/autocomplete.json`, {
    params: { 'search[query]': name.trim().toLowerCase(), 'search[type]': 'tag_query', limit: 15 },
  })
  // a série entre parênteses no fim da etiqueta: "(jujutsu_kaisen)" → "jujutsu kaisen"
  const qualifier = (value: string) => normalize(value.match(/_\(([^()]*)\)$/)?.[1]?.replace(/_/g, ' ') ?? '')
  const fits = (value: string) => {
    const q = qualifier(value)
    if (!q || series.length === 0) return 0
    return series.some(s => s.includes(q) || q.includes(s)) ? 2 : -1
  }
  const tags = (Array.isArray(data) ? data : [])
    .filter((t: any) => t.category === 4 || t.category === 3)
    // variações como "(cosplay)" ou "(true_form)" não são o personagem em si
    .filter((t: any) => !/_\((cosplay|true_form|second_possession)\)/.test(String(t.value)))
    // compara só o nome, sem o "(série)" do fim: "tsunade_(naruto)" não serve para "naruto"
    .filter((t: any) => sameName(name, String(t.value).replace(/(_\([^()]*\))+$/, '').replace(/_/g, ' ')))
    .sort((a: any, b: any) => fits(b.value) - fits(a.value) || b.category - a.category || b.post_count - a.post_count)
  const tag = tags[0]?.value ?? null
  tagCache.set(key, tag)
  return tag
}

interface DanbooruResult {
  /** posts que têm o personagem e alguma etiqueta da cena */
  specific: WebImage[]
  /** posts do personagem em geral (mais votados, ou aleatórios a partir da página 2) */
  general: WebImage[]
  searched: string
}

async function searchDanbooru(people: { name: string; series: string[] }[], scene: string[], page: number): Promise<DanbooruResult | null> {
  const chars = [...new Set((await Promise.all(people.map(p => characterTag(p.name, p.series)))).filter((t): t is string => Boolean(t)))]
  if (chars.length === 0 && scene.length === 0) return null

  // visitantes podem usar no máximo 2 etiquetas; "rating" não conta, mas "order" conta
  const specificQueries: string[][] = []
  if (chars.length >= 2) specificQueries.push(chars.slice(0, 2))
  if (chars.length) for (const t of scene.slice(0, 3)) specificQueries.push([chars[0], t])
  else if (scene.length >= 2) specificQueries.push(scene.slice(0, 2))
  else if (scene.length) specificQueries.push([scene[0], 'order:score'])
  const generalQuery = chars.length ? [chars[0], page === 1 ? 'order:score' : 'order:random'] : null

  const series = { root: '' }
  const usedTags: string[] = []
  const run = async (tags: string[], limit: number, p: number) => {
    const data = await safe('Danbooru', async () => {
      const res = await http.get(`${DANBOORU}/posts.json`, {
        params: {
          tags: [...tags, 'rating:g'].join(' '),
          limit,
          page: p,
          only: 'id,rating,file_ext,file_size,image_width,image_height,preview_file_url,large_file_url,file_url,tag_string_character,tag_string_copyright,is_banned',
        },
      })
      return res.data
    })
    usedTags.push(tags.filter(t => !t.startsWith('order:')).join(' + '))
    return Array.isArray(data) ? data : []
  }

  const [specificLists, generalList] = await Promise.all([
    Promise.all(specificQueries.map(t => run(t, 24, page))),
    generalQuery ? run(generalQuery, 60, page === 1 ? 1 : 1) : Promise.resolve([]),
  ])
  // série principal do personagem ("dragon_ball" cobre dragon_ball_z e dragon_ball_super)
  series.root = seriesRoot([...specificLists.flat(), ...generalList].flatMap(p => String(p.tag_string_copyright ?? '').split(' ').filter(Boolean)))

  const taken: WebImage[] = []
  const toImages = (posts: any[], max: number) => {
    const out: WebImage[] = []
    for (const p of posts) {
      if (out.length >= max) break
      const img = postImage(p, series.root, chars.length === 1)
      if (!img) continue
      // a mesma imagem costuma aparecer repetida (versões com e sem texto)
      const twin = (i: WebImage) =>
        i.id === img.id || (i.width === img.width && i.height === img.height && String(i.characters) === String(img.characters))
      if (taken.some(twin)) continue
      taken.push(img)
      out.push(img)
    }
    return out
  }

  // intercala as buscas da cena para não vir só uma etiqueta
  const perList = specificLists.map(list => toImages(list, 8))
  const specific: WebImage[] = []
  for (let i = 0; i < 8; i++) for (const list of perList) if (list[i]) specific.push(list[i])
  const general = toImages(generalList, Math.max(4, 16 - specific.length))

  return { specific, general, searched: `Danbooru: ${[...new Set(usedTags)].join(' · ')}` }
}

/** Post do Danbooru → sugestão, ou null se não serve (classificação, formato, crossover). */
function postImage(p: any, series: string, singleCharacter: boolean): WebImage | null {
  if (p.rating !== 'g' || p.is_banned || !['jpg', 'jpeg', 'png', 'webp'].includes(p.file_ext)) return null
  if (!p.preview_file_url || !p.large_file_url) return null
  // crossover com muitos personagens raramente é o que a cena pede
  const chars = String(p.tag_string_character ?? '').split(' ').filter(Boolean).map(tagName)
  if (chars.length > 3) return null
  // crossover com outra série (Goku com Hatsune Miku) também não
  const copyrights = String(p.tag_string_copyright ?? '').split(' ').filter(Boolean)
  if (series && singleCharacter && copyrights.some(c => !c.startsWith(series))) return null
  const big = p.file_url && p.file_size < 8 * 1024 * 1024 && p.image_width <= 4000 ? p.file_url : p.large_file_url
  return {
    id: `danbooru-${p.id}`,
    // a miniatura de 360px fica nítida na grade; a de 180px fica borrada
    thumb: String(p.preview_file_url).replace('/180x180/', '/360x360/'),
    url: big,
    width: p.image_width,
    height: p.image_height,
    source: 'danbooru',
    title: chars.join(', ') || tagName(copyrights[0] ?? '') || 'Danbooru',
    page: `${DANBOORU}/posts/${p.id}`,
    characters: chars,
  }
}

/** A série mais comum nos resultados, nas duas primeiras palavras: "dragon_ball_z" → "dragon_ball". */
function seriesRoot(copyrights: string[]) {
  const count = new Map<string, number>()
  for (const c of copyrights) count.set(c, (count.get(c) ?? 0) + 1)
  const top = [...count.entries()].sort((a, b) => b[1] - a[1])[0]?.[0]
  return top ? top.replace(/_\(.*\)$/, '').split('_').slice(0, 2).join('_') : ''
}

/** "haruno_sakura_(cosplay)" → "haruno sakura" */
function tagName(tag: string) {
  return tag.replace(/_\(.*\)$/, '').replace(/_/g, ' ')
}

// ─── Miniaturas ───────────────────────────────────────────
// Alguns CDNs (Danbooru) recusam o navegador sem cookies, então a grade carrega as miniaturas
// pelo backend. Só domínios das fontes acima, para não virar um proxy aberto.

const THUMB_HOSTS = [/^cdn\.donmai\.us$/, /^s4\.anilist\.co$/, /^encrypted-tbn\d\.gstatic\.com$/, /^tse?\d*\.mm\.bing\.net$/]
const thumbCache = new Map<string, { type: string; data: Buffer }>()

export async function fetchThumb(url: string) {
  let host = ''
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    host = parsed.hostname
  } catch {
    return null
  }
  if (!THUMB_HOSTS.some(re => re.test(host))) return null

  const hit = thumbCache.get(url)
  if (hit) return hit
  const res = await http.get<ArrayBuffer>(url, { responseType: 'arraybuffer', maxContentLength: 3 * 1024 * 1024 })
  const type = String(res.headers['content-type'] ?? '').split(';')[0]
  if (!type.startsWith('image/')) return null
  const thumb = { type, data: Buffer.from(res.data) }
  thumbCache.set(url, thumb)
  // guarda as ~400 mais recentes
  if (thumbCache.size > 400) thumbCache.delete(thumbCache.keys().next().value!)
  return thumb
}
