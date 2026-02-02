export { FileStorage } from './FileStorage.js'
export { ProfileStorage } from './ProfileStorage.js'
export { ReelStorage } from './ReelStorage.js'
export { AnalysisStorage } from './AnalysisStorage.js'
export { ContentStorage } from './ContentStorage.js'
export { PostStorage } from './PostStorage.js'
export { UserStorage } from './UserStorage.js'
export { InstagramAccountStorage } from './InstagramAccountStorage.js'

// Singleton instances
import { ProfileStorage } from './ProfileStorage.js'
import { ReelStorage } from './ReelStorage.js'
import { AnalysisStorage } from './AnalysisStorage.js'
import { ContentStorage } from './ContentStorage.js'
import { PostStorage } from './PostStorage.js'
import { UserStorage } from './UserStorage.js'
import { InstagramAccountStorage } from './InstagramAccountStorage.js'

export const profileStorage = new ProfileStorage()
export const reelStorage = new ReelStorage()
export const analysisStorage = new AnalysisStorage()
export const contentStorage = new ContentStorage()
export const postStorage = new PostStorage()
export const userStorage = new UserStorage()
export const instagramAccountStorage = new InstagramAccountStorage()
