import { describe, expect, it } from '@jest/globals'
import { cleanBeats } from './shortsAI.js'
import type { Beat } from './types.js'

/** Uma cena de prova em que o usuário escolheu a moldura sobre a imagem. */
const previous: Beat = {
  id: 'b1',
  say: 'olha o print',
  text: 'OLHA O PRINT',
  query: 'print do capítulo',
  characters: ['geto'],
  scene: 'evidence',
  effect: 'none',
  motion: 'zoom-in',
  imageId: 'img_1',
  imageStatus: 'match',
  framing: 'frame-blur',
}

/** O que a IA devolve quando o chat edita o vídeo: a mesma cena, com o que ela mudou. */
const fromAI = (changes: Partial<Beat> = {}) => ({ ...previous, framing: undefined, ...changes })

describe('cleanBeats: o fundo escolhido na revisão (ADR 0022)', () => {
  it('fica quando o chat não mexe na imagem nem no tipo da cena', () => {
    const [beat] = cleanBeats([fromAI({ say: 'olha esse print aqui' })], [previous])
    expect(beat.framing).toBe('frame-blur')
  })

  it('volta para o automático quando o chat troca a imagem', () => {
    const [beat] = cleanBeats([fromAI({ query: 'geto sorrindo' })], [previous])
    expect(beat.framing).toBeUndefined()
  })

  it('volta para o automático quando o chat muda o tipo da cena', () => {
    const [beat] = cleanBeats([fromAI({ scene: 'full' })], [previous])
    expect(beat.framing).toBeUndefined()
  })

  it('um tipo de cena inválido vira tela cheia, e o fundo volta para o automático', () => {
    const [beat] = cleanBeats([fromAI({ scene: 'quadro' as Beat['scene'] })], [previous])
    expect(beat.scene).toBe('full')
    expect(beat.framing).toBeUndefined()
  })
})

describe('cleanBeats: o volume do efeito na cena', () => {
  const sounds = [
    { id: 's1', name: 'whoosh' },
    { id: 's2', name: 'boom' },
  ]
  /** A cena tinha o whoosh, mais baixo que os outros efeitos. */
  const withSound: Beat = { ...previous, sfxId: 's1', sfxLocked: true, sfxVolume: 0.5 }

  it('fica quando o chat não troca o som', () => {
    const [beat] = cleanBeats([{ ...withSound, say: 'olha esse print aqui', sfxVolume: undefined }], [withSound], sounds)
    expect(beat.sfxId).toBe('s1')
    expect(beat.sfxVolume).toBe(0.5)
  })

  it('volta ao normal quando o chat troca o som, porque foi acertado para o som de antes', () => {
    const [beat] = cleanBeats([{ ...withSound, sfxVolume: undefined, sound: 'boom' }], [withSound], sounds)
    expect(beat.sfxId).toBe('s2')
    expect(beat.sfxVolume).toBeUndefined()
  })
})
