/**
 * Publica o MP4 renderizado de um Short no Instagram (Reels) e no YouTube (Shorts).
 *
 * Instagram: a Graph API só aceita uma URL pública, então o MP4 sobe para o Cloudinary,
 * o Instagram baixa de lá e o arquivo é apagado do Cloudinary depois.
 */

import { v2 as cloudinary } from 'cloudinary'
import { AppError } from '../../middleware/errorHandler.js'
import { logger } from '../../utils/logger.js'
import { instagramGraphService } from '../instagramGraphService.js'
import { uploadShort, type YouTubePrivacy } from '../youtubeService.js'
import { getProject, recordOutput } from './projects.js'
import { renderedFile } from './render.js'
import type { ShortProject } from './types.js'

function cloudinaryReady() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
}

async function markPublished(id: string, platform: 'instagram' | 'youtube', entry: { id: string; url?: string }) {
  const project = await getProject(id)
  const published: NonNullable<ShortProject['published']> = { ...project.published }
  const at = new Date().toISOString()
  if (platform === 'youtube') published.youtube = { id: entry.id, url: entry.url!, at }
  else published.instagram = { id: entry.id, url: entry.url, at }
  return recordOutput(id, { published, status: 'publicado' })
}

export async function publishInstagram(id: string, caption: string) {
  if (!cloudinaryReady()) {
    throw new AppError('Para publicar no Instagram, configure o Cloudinary no backend/.env (o Instagram só aceita vídeo por URL pública).', 503, 'NO_CLOUDINARY')
  }
  const { file } = await renderedFile(id)
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })

  logger.info('☁️ Subindo o MP4 para o Cloudinary…')
  const upload = await cloudinary.uploader.upload(file, { resource_type: 'video', folder: 'instasearch-shorts' })
  try {
    const { mediaId, permalink } = await instagramGraphService.publishReel(upload.secure_url, caption.trim())
    return await markPublished(id, 'instagram', { id: mediaId, url: permalink })
  } catch (error: any) {
    throw new AppError(error.message, 502, 'INSTAGRAM_ERROR')
  } finally {
    // o Instagram já copiou o vídeo (ou falhou): não precisa mais dele no Cloudinary
    await cloudinary.uploader.destroy(upload.public_id, { resource_type: 'video' }).catch(() => undefined)
  }
}

export async function publishYouTube(id: string, input: { title: string; description: string; privacy: YouTubePrivacy }) {
  const { file } = await renderedFile(id)
  const privacy: YouTubePrivacy = ['public', 'unlisted', 'private'].includes(input.privacy) ? input.privacy : 'public'
  // hashtags da legenda viram tags; #Shorts ajuda o YouTube a tratar como Short
  const tags = [...input.description.matchAll(/#([\p{L}\p{N}_]+)/gu)].map(m => m[1])
  const description = /#shorts\b/i.test(input.description) ? input.description : `${input.description.trim()}\n\n#Shorts`
  const result = await uploadShort(file, { title: input.title, description, privacy, tags })
  return markPublished(id, 'youtube', result)
}
