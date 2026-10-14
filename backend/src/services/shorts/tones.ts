/**
 * Tons do roteiro (ADR 0019): como a narração fala e argumenta.
 *
 * Todos ficam em data/tones/: os 4 que vêm com o app (gravados lá na primeira vez) e os do usuário
 * (escritos por ele ou sugeridos pela IA). Editar muda o próprio tom, sem cópia (ADR 0031).
 */
import { FileStorage } from '../storage/FileStorage.js'
import { generateId } from '../../utils/idGenerator.js'
import type { Tone } from './types.js'

/**
 * Os 4 que vêm com o app, como eram no começo: vão para data/tones/ quando ainda não estão lá. Depois
 * disso, valem os arquivos (o usuário pode tê-los editado). Não podem ser apagados: o app usa o
 * "Curioso" e o "Polêmico" como padrão.
 */
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

// Uma vez por servidor: grava os tons do app que ainda não têm arquivo (os já gravados não mudam).
let seeded: Promise<void> | null = null
function seed() {
  seeded ??= (async () => {
    for (const tone of BUILT_IN_TONES) {
      if (!(await storage.findById(tone.id))) await storage.save(tone)
    }
  })().catch(error => {
    seeded = null // tenta de novo na próxima vez
    throw error
  })
  return seeded
}

export async function listTones(): Promise<Tone[]> {
  await seed()
  const all = await storage.findAll()
  // os do app primeiro, na ordem de sempre; depois os do usuário, do mais velho para o mais novo
  const order = (t: Tone) => {
    const i = BUILT_IN_TONES.findIndex(b => b.id === t.id)
    return i === -1 ? BUILT_IN_TONES.length : i
  }
  return all.sort((a, b) => order(a) - order(b) || (a.updatedAt ?? '').localeCompare(b.updatedAt ?? ''))
}

export async function getTone(id: string): Promise<Tone | null> {
  await seed()
  return storage.findById(id)
}

/** Projetos e telas de antes guardavam o tom pelo nome ("Polêmico"). */
export async function toneByName(name: string): Promise<Tone | null> {
  return (await listTones()).find(t => t.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}

/** Salva um tom: com o id de um que existe (inclusive os do app), muda ele mesmo; sem id, cria um novo. */
export async function saveTone(input: Partial<Tone>): Promise<Tone> {
  // um id desconhecido vira tom novo: o id só vem do app, nunca do que chegou na requisição
  const existing = input.id ? await getTone(input.id) : null
  const tone: Tone = {
    id: existing?.id ?? generateId('tone'),
    name: String(input.name ?? '').trim().slice(0, 40),
    summary: String(input.summary ?? '').trim().slice(0, 160),
    guide: String(input.guide ?? '').trim().slice(0, 1200),
    builtIn: existing?.builtIn ?? false,
    createdBy: input.createdBy === 'ia' ? 'ia' : (existing?.createdBy ?? 'usuario'),
    updatedAt: new Date().toISOString(),
  }
  return storage.save(tone)
}

export async function deleteTone(id: string): Promise<boolean> {
  return storage.delete(id)
}
