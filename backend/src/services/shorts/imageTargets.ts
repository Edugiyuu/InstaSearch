// Tamanhos das versões de uma imagem da biblioteca (funções puras, sem ffmpeg: dá para testar).

// O vídeo é 1080×1920 e o zoom do modo cover chega a 1,6× (frontend/src/video/framing.ts): a versão
// do vídeo precisa cobrir 1728×3072 para não borrar. Mais que isso o player só decodifica à toa.
export const VIDEO_COVER = { width: 1728, height: 3072 }
/** Largura da miniatura das capas e grades (a capa aparece com ~170 px; 360 cobre telas 2×). */
export const THUMB_WIDTH = 360

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2)

/**
 * Tamanho da versão do vídeo: a menor que ainda cobre VIDEO_COVER, com o aspecto da original.
 * null = a original já é pequena o bastante (nunca amplia).
 */
export function videoSize(width: number, height: number, cover = VIDEO_COVER): { width: number; height: number } | null {
  const factor = Math.max(cover.width / width, cover.height / height)
  if (factor >= 1) return null
  return { width: even(width * factor), height: even(height * factor) }
}

/** Tamanho da miniatura; null = a imagem já é estreita como a miniatura. */
export function thumbSize(width: number, height: number, target = THUMB_WIDTH): { width: number; height: number } | null {
  if (width <= target) return null
  return { width: target, height: even((height * target) / width) }
}

/** Formatos de pixel que podem ter transparência (png rgba, webp com alfa, paleta com transparência…). */
export function mayHaveAlpha(pixFmt: string) {
  return /^(rgba|bgra|argb|abgr|ya|yuva|gbrap|pal8)/.test(pixFmt)
}
