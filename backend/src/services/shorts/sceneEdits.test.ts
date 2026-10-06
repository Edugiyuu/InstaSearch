import { describe, expect, it } from '@jest/globals'
import { citedScenes, describeChanges, diffBeats, keepOnlyCited } from './sceneEdits.js'
import type { Beat } from './types.js'

/** Uma batida mínima; `say` muda quando a IA "edita" a cena. */
const beat = (id: string, say = `fala ${id}`): Beat => ({
  id,
  say,
  text: say.toUpperCase(),
  query: '',
  characters: [],
  scene: 'full',
  effect: 'none',
  motion: 'zoom-in',
  imageStatus: 'missing',
})

const ids = (beats: Beat[]) => beats.map(b => b.id)
const says = (beats: Beat[]) => beats.map(b => b.say)

describe('citedScenes', () => {
  it('acha "cena 6" com o número da tela', () => {
    expect(citedScenes('muda a imagem da cena 6', 10)).toEqual([6])
  })

  it('acha listas e intervalos', () => {
    expect(citedScenes('cenas 3 e 4', 10)).toEqual([3, 4])
    expect(citedScenes('cenas 2, 5 e 7', 10)).toEqual([2, 5, 7])
    expect(citedScenes('cenas 3 a 5', 10)).toEqual([3, 4, 5])
  })

  it('acha ordinais e números por extenso', () => {
    expect(citedScenes('a 6ª cena está fraca', 10)).toEqual([6])
    expect(citedScenes('troca a sexta cena', 10)).toEqual([6])
    expect(citedScenes('na cena seis põe uma seta', 10)).toEqual([6])
    expect(citedScenes('tira a última cena', 10)).toEqual([10])
  })

  it('"esta cena" é a cena aberta na prévia', () => {
    expect(citedScenes('nessa cena põe um X', 10, 4)).toEqual([4])
    expect(citedScenes('nessa cena põe um X', 10)).toEqual([])
  })

  it('não confunde palavras comuns com número de cena', () => {
    expect(citedScenes('coloca na cena uma seta', 10)).toEqual([])
    expect(citedScenes('na cena 6 e duas setas', 10)).toEqual([6])
    expect(citedScenes('deixa o gancho mais curto', 10)).toEqual([])
  })

  it('ignora cenas que não existem', () => {
    expect(citedScenes('cena 12', 10)).toEqual([])
  })
})

describe('keepOnlyCited', () => {
  const before = [beat('a'), beat('b'), beat('c'), beat('d')]

  it('desfaz mudanças fora das cenas citadas', () => {
    // pediu a cena 2 (b); a IA mudou a c
    const after = [beat('a'), beat('b'), beat('c', 'errado'), beat('d')]
    const out = keepOnlyCited(before, after, new Set(['b']))
    expect(says(out.beats)).toEqual(says(before))
    expect(out.reverted).toBe(true)
  })

  it('aceita a mudança na cena citada', () => {
    const after = [beat('a'), beat('b', 'nova fala'), beat('c'), beat('d')]
    const out = keepOnlyCited(before, after, new Set(['b']))
    expect(says(out.beats)).toEqual(['fala a', 'nova fala', 'fala c', 'fala d'])
    expect(out.reverted).toBe(false)
  })

  it('remove a cena citada e devolve a que a IA tirou sem pedido', () => {
    // pediu para tirar a b; a IA tirou a b e a d
    const after = [beat('a'), beat('c')]
    const out = keepOnlyCited(before, after, new Set(['b']))
    expect(ids(out.beats)).toEqual(['a', 'c', 'd'])
    expect(out.reverted).toBe(true)
  })

  it('aceita cena nova encostada na citada e recusa a que fica longe', () => {
    // pediu para dividir a b; a IA criou uma depois da b e outra no fim
    const after = [beat('a'), beat('b', 'metade'), beat('n1'), beat('c'), beat('d'), beat('n2')]
    const out = keepOnlyCited(before, after, new Set(['b']))
    expect(ids(out.beats)).toEqual(['a', 'b', 'n1', 'c', 'd'])
    expect(out.reverted).toBe(true)
  })

  it('aceita cena nova no lugar da citada', () => {
    // a IA trocou a b por uma batida nova (sem o id antigo)
    const after = [beat('a'), beat('n1'), beat('c'), beat('d')]
    const out = keepOnlyCited(before, after, new Set(['b']))
    expect(ids(out.beats)).toEqual(['a', 'n1', 'c', 'd'])
    expect(out.reverted).toBe(false)
  })
})

describe('diffBeats + describeChanges', () => {
  it('descreve o que mudou com os números da tela', () => {
    const before = [beat('a'), beat('b'), beat('c')]
    const after = [beat('a'), beat('b', 'outra'), beat('n1')]
    const changes = diffBeats(before, after)
    expect(changes).toEqual({ changed: [2], removed: [3], added: [3] })
    expect(describeChanges(changes)).toBe('Mudei a cena 2, tirei a cena 3 e criei a cena 3.')
  })

  it('não descreve nada quando nada mudou', () => {
    const before = [beat('a')]
    expect(describeChanges(diffBeats(before, [beat('a')]))).toBe('')
  })
})
