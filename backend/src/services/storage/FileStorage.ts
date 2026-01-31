import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export class FileStorage<T extends { id: string }> {
  protected dataDir: string
  protected collectionName: string

  constructor(collectionName: string) {
    this.collectionName = collectionName
    this.dataDir = path.join(__dirname, '../../../data', collectionName)
    this.ensureDirectoryExists()
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.dataDir)
    } catch {
      await fs.mkdir(this.dataDir, { recursive: true })
    }
  }

  protected getFilePath(id: string): string {
    return path.join(this.dataDir, `${id}.json`)
  }

  async save(item: T): Promise<T> {
    await this.ensureDirectoryExists()
    const filePath = this.getFilePath(item.id)
    await fs.writeFile(filePath, JSON.stringify(item, null, 2), 'utf-8')
    return item
  }

  async findById(id: string): Promise<T | null> {
    try {
      const filePath = this.getFilePath(id)
      const data = await fs.readFile(filePath, 'utf-8')
      return JSON.parse(data) as T
    } catch (error) {
      return null
    }
  }

  async findAll(): Promise<T[]> {
    try {
      await this.ensureDirectoryExists()
      const files = await fs.readdir(this.dataDir)
      const jsonFiles = files.filter(f => f.endsWith('.json'))
      
      const items: T[] = []
      for (const file of jsonFiles) {
        const filePath = path.join(this.dataDir, file)
        const data = await fs.readFile(filePath, 'utf-8')
        items.push(JSON.parse(data) as T)
      }
      
      return items
    } catch (error) {
      return []
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id)
      await fs.unlink(filePath)
      return true
    } catch (error) {
      return false
    }
  }

  async update(id: string, updates: Partial<T>): Promise<T | null> {
    const item = await this.findById(id)
    if (!item) return null

    const updatedItem = { ...item, ...updates }
    await this.save(updatedItem)
    return updatedItem
  }

  async exists(id: string): Promise<boolean> {
    try {
      const filePath = this.getFilePath(id)
      await fs.access(filePath)
      return true
    } catch {
      return false
    }
  }

  async count(): Promise<number> {
    const items = await this.findAll()
    return items.length
  }

  async clear(): Promise<void> {
    const items = await this.findAll()
    for (const item of items) {
      await this.delete(item.id)
    }
  }
}
