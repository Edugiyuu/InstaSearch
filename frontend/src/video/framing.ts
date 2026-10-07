/**
 * Enquadramento de uma imagem no vídeo em pé (ADR 0020).
 *
 * `objectFit: cover` já recorta a imagem para caber em 9:16: numa imagem deitada, isso some com
 * dois terços da largura, o que já é um zoom. O movimento da cena tem que contar esse recorte;
 * antes, o zoom-in ia até 1,9× por cima dele, e num close sobrava só um pedaço do rosto.
 */
import type { Region } from '../api/shorts'

const FRAME_ASPECT = 1080 / 1920

/** Mais larga que isso (largura ÷ altura), a imagem aparece inteira sobre um fundo desfocado. */
export const FIT_ABOVE = 0.8

/** Fração mínima da imagem que continua na tela, na direção mais cortada. */
const MIN_VISIBLE = 0.45

/** Uma área (rosto) que já ocupa isso da tela é um close: não ganha zoom em cima. */
const CLOSE_UP = 0.45

export interface Framing {
  /** cover = ocupa a tela, cortando; fit = inteira, com o fundo desfocado. */
  mode: 'cover' | 'fit'
  /** Maior zoom permitido, já contando o recorte do cover. */
  maxScale: number
  /** Onde o zoom-in termina. */
  zoomEnd: number
  /** A área marcada já é grande na tela (close). */
  closeUp: boolean
}

/** Sem tamanho conhecido (imagem antiga ainda não medida): supõe um recorte médio. */
const UNKNOWN_VISIBLE = 0.75

/** forced: o que o usuário escolheu na revisão (tela cheia ou inteira); sem ele, decide pelo formato. */
export function framing(width?: number, height?: number, region?: Region, forced?: 'cover' | 'fit'): Framing {
  const aspect = width && height ? width / height : undefined
  if (forced === 'fit' || (!forced && aspect && aspect > FIT_ABOVE)) return { mode: 'fit', maxScale: 1.08, zoomEnd: 1.06, closeUp: false }

  // quanto da imagem aparece com o cover, na largura e na altura (1 = inteira)
  const visW = aspect ? Math.min(1, FRAME_ASPECT / aspect) : UNKNOWN_VISIBLE
  const visH = aspect ? Math.min(1, aspect / FRAME_ASPECT) : 1
  const maxScale = Math.max(1.05, Math.min(1.6, Math.min(visW, visH) / MIN_VISIBLE))

  // tamanho da área na tela, sem zoom; o zoom-in termina com ela ocupando ~75% do quadro
  const onScreen = region ? Math.max(region.w / visW, region.h / visH) : 0
  const closeUp = onScreen >= CLOSE_UP
  const toRegion = region && !closeUp ? 0.75 / Math.max(onScreen, 0.3) : 1.2
  const zoomEnd = Math.min(closeUp ? 1.1 : toRegion, maxScale)
  return { mode: 'cover', maxScale, zoomEnd, closeUp }
}

/**
 * A área marcada na imagem, em frações da tela, para a seta e o círculo apontarem para o lugar certo.
 * No modo inteira (fit), a imagem ocupa só uma faixa no meio da tela; no cover, continua a
 * aproximação de antes (a área relativa à imagem).
 */
export function regionOnScreen(region: Region | undefined, width?: number, height?: number, forced?: 'cover' | 'fit'): Region | undefined {
  if (!region || !width || !height || framing(width, height, undefined, forced).mode === 'cover') return region
  const aspect = width / height
  if (aspect >= FRAME_ASPECT) {
    // mais larga que a tela: uma faixa no meio, na altura
    const band = FRAME_ASPECT / aspect
    const top = (1 - band) / 2
    return { ...region, y: top + region.y * band, h: region.h * band }
  }
  // mais alta que a tela (inteira por escolha): uma faixa no meio, na largura
  const band = aspect / FRAME_ASPECT
  const left = (1 - band) / 2
  return { ...region, x: left + region.x * band, w: region.w * band }
}
