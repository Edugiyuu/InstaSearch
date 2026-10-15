import { describe, expect, it } from '@jest/globals'
import { countWords, MAX_REWRITES, reviewLoop, reviewSummary, wordProblem, type Verdict } from './scriptReview.js'
import type { ScriptReview } from './types.js'

// quem escreve devolve "versão 1", "versão 2"…; quem revisa segue a lista de vereditos, na ordem
function fakes(verdicts: Verdict[]) {
  const written: ({ narration: string; problems: string[] } | undefined)[] = []
  let n = 0
  return {
    written,
    write: async (revision?: { narration: string; problems: string[] }) => {
      written.push(revision)
      return { narration: `versão ${written.length}` }
    },
    review: async () => verdicts[n++],
  }
}

const ok: Verdict = { approved: true, problems: [], message: 'Coeso e os fatos batem.' }
const no = (problem: string): Verdict => ({ approved: false, problems: [problem], message: 'Precisa de ajuste.' })

describe('revisão do roteiro pelas IAs (ADR 0034)', () => {
  it('aprovou de primeira: uma versão e uma revisão', async () => {
    const f = fakes([ok])
    const { script, review } = await reviewLoop({ write: f.write, review: f.review, maxWords: 80 })
    expect(script.narration).toBe('versão 1')
    expect(review.status).toBe('aprovado')
    expect(review.steps.map(s => s.kind)).toEqual(['roteiro', 'revisao'])
    expect(reviewSummary(review)).toEqual({ approved: true, versions: 1, problems: [] })
  })

  it('reescreve com o que a revisora pediu e para quando ela aprova', async () => {
    const f = fakes([no('O capítulo citado está errado.'), ok])
    const { script, review } = await reviewLoop({ write: f.write, review: f.review, maxWords: 80 })
    expect(f.written).toEqual([undefined, { narration: 'versão 1', problems: ['O capítulo citado está errado.'] }])
    expect(script.narration).toBe('versão 2')
    expect(review.status).toBe('aprovado')
  })

  it(`sem aprovação, para depois de ${MAX_REWRITES} reescritas e segue com a última versão e os problemas`, async () => {
    const f = fakes([no('a'), no('b'), no('O gancho não prende.'), ok])
    const { script, review } = await reviewLoop({ write: f.write, review: f.review, maxWords: 80 })
    expect(f.written).toHaveLength(MAX_REWRITES + 1)
    expect(script.narration).toBe('versão 3')
    expect(reviewSummary(review)).toEqual({ approved: false, versions: 3, problems: ['O gancho não prende.'] })
  })

  it('o código não aprova um roteiro longo demais, mesmo que a revisora aprove', async () => {
    const long = Array.from({ length: 100 }, () => 'palavra').join(' ')
    expect(countWords(long)).toBe(100)
    expect(wordProblem(long, 91)).toBeNull() // 10% de folga: 91 aceita até 100
    expect(wordProblem(long + ' mais', 80)).toMatch(/101 palavras e o limite é 80/)

    let calls = 0
    const { review } = await reviewLoop({
      write: async () => ({ narration: calls++ === 0 ? long : 'curto' }),
      review: async () => ok,
      maxWords: 80,
    })
    expect(review.steps[1]).toMatchObject({ approved: false, problems: [expect.stringMatching(/100 palavras/)] })
    expect(review.status).toBe('aprovado') // a 2ª versão coube
  })

  it('reprovou sem dizer o quê: a fala dela vira o pedido', async () => {
    const f = fakes([{ approved: false, problems: [], message: 'Está confuso no meio.' }, ok])
    await reviewLoop({ write: f.write, review: f.review, maxWords: 80 })
    expect(f.written[1]?.problems).toEqual(['Está confuso no meio.'])
  })

  it('avisa cada passo, e um erro deixa a revisão como "erro"', async () => {
    const seen: ScriptReview[] = []
    await expect(
      reviewLoop({
        write: async () => ({ narration: 'versão 1' }),
        review: async () => {
          throw new Error('a IA caiu')
        },
        maxWords: 80,
        onChange: r => seen.push(r),
      }),
    ).rejects.toThrow('a IA caiu')
    expect(seen.map(r => r.thinking ?? r.status)).toEqual(['roteiro', 'revisao', 'erro'])
  })
})
