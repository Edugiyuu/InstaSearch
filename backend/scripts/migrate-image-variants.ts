// Cria a versão do vídeo e a miniatura das imagens que já estão na biblioteca (antes disso, todas
// ficavam no tamanho em que vieram da web). A original nunca é apagada: fica em `original`.
// Pode rodar de novo: pula as que já têm `original` ou miniatura.
// Uso (na pasta backend): npm run migrate:images
import 'dotenv/config'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { FileStorage } from '../src/services/storage/FileStorage.js'
import { makeVariants } from '../src/services/shorts/imageVariants.js'
import { LIBRARY_FILES_DIR } from '../src/services/shorts/library.js'
import type { LibraryImage } from '../src/services/shorts/types.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '../data')
const PARALLEL = 4

const sizeOf = (file?: string) => (file ? fs.stat(path.join(LIBRARY_FILES_DIR, file)).then(s => s.size, () => 0) : Promise.resolve(0))
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`

async function backup() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const dest = path.join(DATA_DIR, `library-backup-${stamp}`)
  await fs.cp(path.join(DATA_DIR, 'library'), dest, { recursive: true })
  console.log(`💾 Backup dos JSON da biblioteca em ${dest}`)
}

async function main() {
  const storage = new FileStorage<LibraryImage>('library')
  const all = await storage.findAll()
  const todo = all.filter(i => i.kind !== 'video' && i.kind !== 'cena' && !i.original && !i.thumb)
  console.log(`🖼️ ${all.length} itens na biblioteca, ${todo.length} imagens para converter`)
  if (!todo.length) return
  await backup()

  let done = 0
  let failed = 0
  let before = 0
  let after = 0
  const queue = [...todo]
  async function worker() {
    for (let img = queue.shift(); img; img = queue.shift()) {
      try {
        const original = await sizeOf(img.file)
        const variants = await makeVariants(LIBRARY_FILES_DIR, img.file)
        before += original
        if (variants) {
          // sem mudar o tamanho, a versão do vídeo não compensou: só ganha a miniatura
          await storage.update(img.id, variants)
          after += await sizeOf(variants.file)
        } else after += original
      } catch (error: any) {
        failed++
        console.warn(`⚠️ ${img.id} (${img.file}): ${error.message}`)
      }
      done++
      if (done % 50 === 0 || done === todo.length) console.log(`  ${done}/${todo.length} · o vídeo carrega ${mb(after)} em vez de ${mb(before)}`)
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
  console.log(`✅ ${done - failed} convertidas, ${failed} com erro (ficam como estavam). Originais guardadas.`)
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
