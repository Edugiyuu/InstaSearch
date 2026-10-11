import { describe, expect, it } from '@jest/globals'
import { agreement } from './debate.js'
import type { DebateMessage, Speaker } from './types.js'

const say = (speaker: Speaker, vote: number | null): DebateMessage => ({ speaker, text: '…', vote, at: '' })

describe('agreement: o acordo do debate das IAs (ADR 0027)', () => {
  it('existe quando o último voto das duas é o mesmo tema', () => {
    expect(agreement([say('estrategista', 2), say('roteirista', 2)])).toBe(2)
  })

  it('não existe com uma só falando', () => {
    expect(agreement([say('estrategista', 2)])).toBeNull()
  })

  it('vale o voto mais recente: quem mudou de ideia desfaz o acordo antigo', () => {
    expect(agreement([say('estrategista', 2), say('roteirista', 2), say('estrategista', 3)])).toBeNull()
    expect(agreement([say('estrategista', 1), say('roteirista', 3), say('estrategista', 3)])).toBe(3)
  })

  it('"nenhum ainda" das duas não é acordo', () => {
    expect(agreement([say('estrategista', null), say('roteirista', null)])).toBeNull()
  })
})
