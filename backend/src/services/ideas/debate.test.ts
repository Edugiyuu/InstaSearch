import { describe, expect, it } from '@jest/globals'
import { agreement, bothRefused } from './debate.js'
import type { Author, DebateMessage } from './types.js'

const say = (speaker: Author, vote: number | null): DebateMessage => ({ speaker, text: '…', vote, at: '' })

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

describe('o veto do criador no acordo (ADR 0030)', () => {
  it('um tema vetado não vale, mesmo com as duas ainda nele', () => {
    expect(agreement([say('estrategista', 2), say('roteirista', 2)], [2])).toBeNull()
  })

  it('outro tema aceito pelas duas depois do veto vale', () => {
    const chat = [say('estrategista', 2), say('roteirista', 2), say('criador', null), say('estrategista', 3), say('roteirista', 3)]
    expect(agreement(chat, [2])).toBe(3)
  })
})

describe('bothRefused: as duas recusam todos os temas, e vêm novos (ADR 0030)', () => {
  it('vale quando as duas falas mais recentes votam "nenhum"', () => {
    expect(bothRefused([say('estrategista', 1), say('roteirista', null), say('estrategista', null)])).toBe(true)
  })

  it('não vale com uma só recusando', () => {
    expect(bothRefused([say('estrategista', null), say('roteirista', 2)])).toBe(false)
    expect(bothRefused([say('estrategista', null)])).toBe(false)
  })

  it('o aviso do veto no meio não conta como fala', () => {
    expect(bothRefused([say('estrategista', null), say('criador', null), say('roteirista', null)])).toBe(true)
  })
})
