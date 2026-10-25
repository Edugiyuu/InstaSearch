import fs from 'fs/promises'
import path from 'path'
import type { LibraryImage } from './types.js'
import { imageInfo, minAlpha, resizeImage } from './videoScenes.js'
import { mayHaveAlpha, thumbSize, videoSize } from './imageTargets.js'

export type Variants = Pick<LibraryImage, 'file' | 'original' | 'thumb' | 'width' | 'height'>

// Abaixo de 90% do tamanho da original, a versão do vídeo não vale o arquivo a mais
const WORTH_IT = 0.9
// Alfa a partir disso conta como opaco (a borda de um PNG às vezes fica em 254)
const OPAQUE = 250

/**
 * Cria a versão do vídeo (`id.v.jpg`) e a miniatura (`id.t.jpg`) de uma imagem já salva em `dir/file`.
 * A original fica intacta. Imagem com transparência (o recorte de uma figurinha) sai em PNG; GIF fica
 * como está (pode ser animado). Devolve os campos para o LibraryImage.
 */
export async function makeVariants(dir: string, file: string): Promise<Variants | null> {
  if (path.extname(file).toLowerCase() === '.gif') return null
  const input = path.join(dir, file)
  const info = await imageInfo(input)
  if (!info) return null

  // PNG só se a transparência é usada de verdade (o recorte da figurinha); o resto vai em JPEG
  const transparent = mayHaveAlpha(info.pixFmt) && (await minAlpha(input).catch(() => 0)) < OPAQUE
  const ext = transparent ? '.png' : '.jpg'
  const base = path.parse(file).name
  const result: Variants = { file, width: info.width, height: info.height }

  // a versão do vídeo: reduzida (se for grande) e no formato leve; só fica se compensar
  const target = videoSize(info.width, info.height) ?? { width: info.width, height: info.height }
  const videoFile = `${base}.v${ext}`
  await resizeImage(input, path.join(dir, videoFile), target.width, target.height)
  const [before, after] = await Promise.all([fs.stat(input), fs.stat(path.join(dir, videoFile))])
  if (after.size < before.size * WORTH_IT) {
    Object.assign(result, { file: videoFile, original: file, ...target })
  } else {
    await fs.unlink(path.join(dir, videoFile)).catch(() => undefined)
  }

  // a miniatura só fica se for menor que o arquivo do vídeo (senão a grade usa o próprio arquivo)
  const small = thumbSize(info.width, info.height)
  if (small) {
    const thumbFile = `${base}.t${ext}`
    await resizeImage(input, path.join(dir, thumbFile), small.width, small.height)
    const [thumb, video] = await Promise.all([fs.stat(path.join(dir, thumbFile)), fs.stat(path.join(dir, result.file))])
    if (thumb.size < video.size) result.thumb = thumbFile
    else await fs.unlink(path.join(dir, thumbFile)).catch(() => undefined)
  }
  return result
}
