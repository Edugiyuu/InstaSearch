/**
 * Tons do roteiro (ADR 0019): como a narração fala e argumenta.
 *
 * Os 4 de antes viram tons embutidos; os do usuário (escritos por ele ou sugeridos pela IA) ficam
 * em data/tones/. Mudar um embutido cria uma cópia, como nos estilos.
 */
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import type { Tone } from './types.js'

export const BUILT_IN_TONES: Tone[] = [
  {
    id: 'polemico',
    name: 'Polêmico',
    summary: 'Opinião forte que divide e faz a pessoa comentar',
    guide:
      'polêmico. Defenda uma opinião forte que divide o público, sem ofender ninguém, e sustente com fatos. Termine com uma pergunta que obrigue a pessoa a escolher um lado nos comentários',
    builtIn: true,
  },
  {
    id: 'curioso',
    name: 'Curioso',
    summary: 'Fato que pouca gente sabe, um detalhe surpreendente por cena',
    guide:
      'curioso. Abra com uma pergunta ou um fato que pouca gente sabe e entregue a resposta aos poucos, um detalhe surpreendente por cena',
    builtIn: true,
  },
  {
    id: 'misterio',
    name: 'Mistério',
    summary: 'Promete uma resposta no começo e só revela no final',
    guide:
      'mistério. No gancho, prometa uma resposta ou um segredo e só revele no final; cada frase deixa uma pergunta aberta para a pessoa continuar assistindo',
    builtIn: true,
  },
  {
    id: 'papo-reto',
    name: 'Papo reto',
    summary: 'Fala direto com quem assiste, como um amigo, sem enrolação',
    guide:
      'papo reto. Fale direto com quem assiste, como um amigo contando: frases curtas, gírias leves ("mano", "olha isso"), sem enrolação, já no ponto no primeiro segundo',
    builtIn: true,
  },
]

const storage = new FileStorage<Tone>('tones')

export async function listTones(): Promise<Tone[]> {
  const mine = await storage.findAll()
  mine.sort((a, b) => (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''))
  return [...BUILT_IN_TONES, ...mine]
}

export async function getTone(id: string): Promise<Tone | null> {
  return BUILT_IN_TONES.find(t => t.id === id) ?? (await storage.findById(id))
}

/** Projetos e telas de antes guardavam o tom pelo nome ("Polêmico"). */
export async function toneByName(name: string): Promise<Tone | null> {
  return (await listTones()).find(t => t.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}

/** Salva um tom. Mudar um embutido cria uma cópia do usuário. */
export async function saveTone(input: Partial<Tone>): Promise<Tone> {
  const builtIn = BUILT_IN_TONES.some(t => t.id === input.id)
  const name = String(input.name ?? '').trim().slice(0, 40)
  const tone: Tone = {
    id: builtIn || !input.id ? generateId('tone') : input.id,
    name: builtIn ? `${name} (meu)` : name,
    summary: String(input.summary ?? '').trim().slice(0, 160),
    guide: String(input.guide ?? '').trim().slice(0, 1200),
    builtIn: false,
    createdBy: input.createdBy === 'ia' ? 'ia' : 'usuario',
    updatedAt: new Date().toISOString(),
  }
  return storage.save(tone)
}

export async function deleteTone(id: string): Promise<boolean> {
  return storage.delete(id)
}
