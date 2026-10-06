// Renderiza um Short em MP4 com o Remotion (chamado pelo backend).
// Uso: node scripts/render.mjs <props.json> <saida.mp4>
// Imprime uma linha JSON por evento: {"stage":"bundle"} · {"progress":0.42} · {"done":true}
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const [propsFile, outFile] = process.argv.slice(2)
const emit = event => process.stdout.write(`${JSON.stringify(event)}\n`)

/** Hash dos arquivos que entram no bundle: só refaz o bundle quando a composição muda. */
async function sourceHash() {
  const hash = createHash('sha1')
  for (const dir of ['src/video', 'src/api', 'src/services']) {
    const files = (await fs.readdir(path.join(root, dir))).sort()
    for (const f of files) hash.update(f).update(await fs.readFile(path.join(root, dir, f)))
  }
  return hash.digest('hex').slice(0, 12)
}

async function getBundle() {
  const outDir = path.join(root, 'node_modules', '.cache', 'remotion-bundle', await sourceHash())
  const ready = await fs.access(path.join(outDir, 'index.html')).then(() => true, () => false)
  if (ready) return outDir
  emit({ stage: 'bundle' })
  await fs.rm(path.dirname(outDir), { recursive: true, force: true })
  return bundle({ entryPoint: path.join(root, 'src/video/remotion.tsx'), outDir })
}

try {
  const inputProps = JSON.parse(await fs.readFile(propsFile, 'utf8'))
  const serveUrl = await getBundle()
  emit({ stage: 'render' })
  const composition = await selectComposition({ serveUrl, id: 'Short', inputProps })
  let last = -1
  await renderMedia({
    serveUrl,
    composition,
    inputProps,
    codec: 'h264',
    // Instagram e YouTube pedem AAC e yuv420p
    audioCodec: 'aac',
    pixelFormat: 'yuv420p',
    outputLocation: outFile,
    onProgress: ({ progress }) => {
      const p = Math.floor(progress * 100)
      if (p !== last) {
        last = p
        emit({ progress })
      }
    },
  })
  emit({ done: true })
} catch (error) {
  emit({ error: String(error?.message ?? error) })
  process.exit(1)
}
