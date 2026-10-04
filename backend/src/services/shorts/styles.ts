import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import type { ShortStyle } from './types.js'

export const BUILT_IN_STYLES: ShortStyle[] = [
  {
    id: 'comentario-anime',
    name: 'Comentário de anime',
    summary: 'rápido · polêmico',
    hook: 'SUKUNA',
    builtIn: true,
    pace: 'rapido',
    effects: 'muitos',
    caption: 'quadrinho',
    music: 'tensa',
    imageType: 'manga',
    notes:
      'Tom de conversa ("mano", "olha só"), frases curtas, gancho polêmico em forma de pergunta, revelação no último terço e CTA pedindo comentário.',
  },
  {
    id: 'explicativo',
    name: 'Explicativo',
    summary: 'claro · didático',
    hook: 'COMO?',
    builtIn: true,
    pace: 'normal',
    effects: 'medida',
    caption: 'limpa',
    music: 'calma',
    imageType: 'anime',
    notes: 'Explique um conceito passo a passo, com uma pergunta no começo e um resumo no fim.',
  },
  {
    id: 'curiosidades',
    name: 'Curiosidades',
    summary: 'fatos · surpresa',
    hook: 'VOCÊ SABIA?',
    builtIn: true,
    pace: 'rapido',
    effects: 'medida',
    caption: 'quadrinho',
    music: 'animada',
    imageType: 'tanto-faz',
    notes: 'Três fatos pouco conhecidos, do menos ao mais surpreendente.',
  },
  {
    id: 'historia',
    name: 'História',
    summary: 'calmo · narrado',
    hook: 'E AÍ',
    builtIn: true,
    pace: 'calmo',
    effects: 'poucos',
    caption: 'limpa',
    music: 'calma',
    imageType: 'anime',
    notes: 'Conte como uma história, em ordem, com uma virada no final.',
  },
  {
    id: 'ranking',
    name: 'Ranking',
    summary: 'top 5 · contagem',
    hook: '#3',
    builtIn: true,
    pace: 'rapido',
    effects: 'muitos',
    caption: 'quadrinho',
    music: 'animada',
    imageType: 'tanto-faz',
    notes: 'Contagem regressiva do quinto ao primeiro lugar; cada posição começa com o número na legenda.',
  },
  {
    id: 'edit',
    name: 'Edit',
    summary: 'música · cortes',
    hook: '♪',
    builtIn: true,
    pace: 'frenetico',
    effects: 'poucos',
    caption: 'sem',
    music: 'animada',
    imageType: 'anime',
    notes: 'Pouca fala; frases de impacto e cortes no ritmo da música.',
  },
  {
    id: 'pov',
    name: 'POV',
    summary: 'você · imersivo',
    hook: 'VOCÊ',
    builtIn: true,
    pace: 'normal',
    effects: 'medida',
    caption: 'quadrinho',
    music: 'tensa',
    imageType: 'anime',
    notes: 'Narre na segunda pessoa ("você acorda e…"), como se o espectador estivesse na cena.',
  },
]

const storage = new FileStorage<ShortStyle>('styles')

export async function listStyles(): Promise<ShortStyle[]> {
  const mine = await storage.findAll()
  mine.sort((a, b) => (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''))
  return [...BUILT_IN_STYLES, ...mine]
}

export async function getStyle(id: string): Promise<ShortStyle> {
  return BUILT_IN_STYLES.find(s => s.id === id) ?? (await storage.findById(id)) ?? BUILT_IN_STYLES[0]
}

/** Salva um estilo. Mudar um embutido cria uma cópia do usuário. */
export async function saveStyle(input: ShortStyle): Promise<ShortStyle> {
  const builtIn = BUILT_IN_STYLES.some(s => s.id === input.id)
  const style: ShortStyle = {
    ...input,
    id: builtIn || !input.id ? generateId('style') : input.id,
    name: builtIn ? `${input.name} (meu)` : input.name,
    builtIn: false,
    updatedAt: new Date().toISOString(),
  }
  return storage.save(style)
}

export async function deleteStyle(id: string): Promise<boolean> {
  return storage.delete(id)
}
