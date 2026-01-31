import { FileStorage } from './FileStorage.js'
import { User } from '../../models/index.js'

export class UserStorage extends FileStorage<User> {
  constructor() {
    super('users')
  }

  async findByEmail(email: string): Promise<User | null> {
    const users = await this.findAll()
    return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null
  }

  async emailExists(email: string): Promise<boolean> {
    const user = await this.findByEmail(email)
    return user !== null
  }

  async updateSettings(id: string, settings: User['settings']): Promise<User | null> {
    return this.update(id, { settings })
  }
}
