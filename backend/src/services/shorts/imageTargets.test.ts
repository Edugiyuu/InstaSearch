import { describe, expect, it } from '@jest/globals'
import { mayHaveAlpha, thumbSize, videoSize } from './imageTargets.js'

describe('videoSize: a versão do vídeo cobre 1728×3072 (1080×1920 com zoom de 1,6×)', () => {
  it('imagem alta e grande reduz até a altura bater 3072', () => {
    expect(videoSize(2463, 3788)).toEqual({ width: 1998, height: 3072 })
  })

  it('imagem larga reduz até a largura bater 1728... ou a altura, o que exigir mais', () => {
    // 6000×4000: pela altura (3072/4000 = 0,768) fica 4608×3072, que cobre a largura também
    expect(videoSize(6000, 4000)).toEqual({ width: 4608, height: 3072 })
  })

  it('nunca amplia: imagem menor que a tela fica como está', () => {
    expect(videoSize(1373, 2129)).toBeNull()
    expect(videoSize(997, 997)).toBeNull()
  })

  it('mede sempre em número par (o ffmpeg exige em alguns formatos)', () => {
    const size = videoSize(3001, 5003)!
    expect(size.width % 2).toBe(0)
    expect(size.height % 2).toBe(0)
  })
})

describe('thumbSize: miniatura de 360 de largura', () => {
  it('mantém o aspecto', () => {
    expect(thumbSize(1920, 1080)).toEqual({ width: 360, height: 202 })
  })

  it('imagem estreita não ganha miniatura', () => {
    expect(thumbSize(360, 640)).toBeNull()
    expect(thumbSize(300, 300)).toBeNull()
  })
})

describe('mayHaveAlpha: quando a versão sai em PNG', () => {
  it('formatos com transparência', () => {
    for (const f of ['rgba', 'rgba64be', 'ya8', 'yuva420p', 'pal8', 'bgra', 'gbrap']) expect(mayHaveAlpha(f)).toBe(true)
  })

  it('formatos opacos, inclusive os que têm "a" no nome', () => {
    for (const f of ['rgb24', 'yuvj420p', 'yuv420p', 'gray', 'gray16be', 'rgb48be']) expect(mayHaveAlpha(f)).toBe(false)
  })
})
