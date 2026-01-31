import { nanoid } from 'nanoid'

export function generateId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`
}

export function generateProfileId(): string {
  return generateId('profile')
}

export function generateReelId(): string {
  return generateId('reel')
}

export function generateAnalysisId(): string {
  return generateId('analysis')
}

export function generateContentId(): string {
  return generateId('content')
}

export function generatePostId(): string {
  return generateId('post')
}

export function generateUserId(): string {
  return generateId('user')
}
