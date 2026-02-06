import { postStorage, contentStorage, instagramAccountStorage } from './storage/index.js'
import { logger } from '../utils/logger.js'
import type { Post } from '../models/index.js'
import { instagramGraphService } from './instagramGraphService.js'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs'

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

interface PublishResult {
  success: boolean
  post: Post
  error?: string
}

/**
 * Serviço de Agendamento Automático
 * Verifica periodicamente posts agendados e os publica na hora certa
 */
export class SchedulerService {
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private checkIntervalMs: number

  constructor(checkIntervalMinutes: number = 1) {
    this.checkIntervalMs = checkIntervalMinutes * 60 * 1000
  }

  /**
   * Inicia o scheduler
   */
  start() {
    if (this.isRunning) {
      logger.warn('Scheduler já está em execução')
      return
    }

    logger.info(`🕐 Scheduler iniciado - verificando a cada ${this.checkIntervalMs / 60000} minuto(s)`)
    this.isRunning = true

    // Executa imediatamente e depois periodicamente
    this.checkScheduledPosts()
    this.intervalId = setInterval(() => {
      this.checkScheduledPosts()
    }, this.checkIntervalMs)
  }

  /**
   * Para o scheduler
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    logger.info('🛑 Scheduler parado')
  }

  /**
   * Verifica posts agendados e publica os que devem ser publicados
   */
  private async checkScheduledPosts() {
    try {
      const now = new Date()
      const allPosts = await postStorage.findAll()
      
      // Filtra posts agendados que já deveriam ter sido publicados
      const postsToPublish = allPosts.filter(post => {
        if (post.status !== 'scheduled' || !post.scheduledFor) {
          return false
        }
        
        const scheduledDate = new Date(post.scheduledFor)
        return scheduledDate <= now
      })

      if (postsToPublish.length === 0) {
        logger.debug('Nenhum post para publicar no momento')
        return
      }

      logger.info(`📤 ${postsToPublish.length} post(s) prontos para publicação`)

      // Publica cada post
      const results = await Promise.allSettled(
        postsToPublish.map(post => this.publishPost(post))
      )

      // Log dos resultados
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length
      const failed = results.length - successful

      logger.info(`✅ Posts publicados: ${successful} sucesso, ${failed} falhas`)

    } catch (error) {
      logger.error('Erro ao verificar posts agendados:', error)
    }
  }

  /**
   * Publica um post no Instagram
   */
  private async publishPost(post: Post): Promise<PublishResult> {
    try {
      logger.info(`📸 Publicando post ${post.id}...`)

      // Busca a conta conectada do Instagram
      const accounts = await instagramAccountStorage.findAll()
      const connectedAccount = accounts[0] // Pega a primeira conta conectada
      
      if (!connectedAccount) {
        throw new Error('Nenhuma conta do Instagram conectada')
      }

      // Validar que tem mídia
      if (!post.media || post.media.type !== 'reel' || !post.media.videoUrl) {
        throw new Error('Post deve ter um vídeo (reel) para ser publicado')
      }

      // Upload do vídeo para Cloudinary (URL pública)
      logger.info(`☁️ Fazendo upload do vídeo para Cloudinary...`)
      const videoPath = post.media.videoUrl
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Arquivo de vídeo não encontrado: ${videoPath}`)
      }

      const uploadResult = await cloudinary.uploader.upload(videoPath, {
        resource_type: 'video',
        folder: 'instagram-reels-scheduled',
        format: 'mp4',
        transformation: [
          { width: 1080, height: 1920, crop: 'fill' },
          { quality: 'auto:good' }
        ]
      })

      const publicVideoUrl = uploadResult.secure_url
      logger.info(`✅ Upload concluído: ${publicVideoUrl}`)

      // Publicar no Instagram via Graph API
      const publishResult = await instagramGraphService.publishReel(
        publicVideoUrl,
        post.caption,
        true // share_to_feed
      )

      // Atualizar post com dados reais do Instagram
      const publishedPost: Post = {
        ...post,
        status: 'published',
        publishedAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        instagramPostId: publishResult.mediaId,
        instagramUrl: publishResult.permalink,
        metrics: {
          likes: 0,
          comments: 0,
          views: 0,
          shares: 0,
          saves: 0,
        }
      }

      await postStorage.update(post.id, publishedPost)

      // Atualiza o conteúdo relacionado
      if (post.contentId) {
        const content = await contentStorage.findById(post.contentId)
        if (content) {
          await contentStorage.updateStatus(post.contentId, 'published')
        }
      }

      logger.info(`✅ Post ${post.id} publicado no Instagram!`)
      logger.info(`🔗 URL: ${publishResult.permalink}`)
      
      return {
        success: true,
        post: publishedPost
      }

    } catch (error) {
      logger.error(`❌ Erro ao publicar post ${post.id}:`, error)
      
      // Marca como falho
      const failedPost: Post = {
        ...post,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastUpdated: new Date().toISOString(),
      }
      
      await postStorage.update(post.id, failedPost)

      return {
        success: false,
        post: failedPost,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Publica um post manualmente (fora do agendamento)
   */
  async publishNow(postId: string): Promise<PublishResult> {
    const post = await postStorage.findById(postId)
    
    if (!post) {
      throw new Error('Post não encontrado')
    }

    if (post.status !== 'scheduled') {
      throw new Error('Apenas posts agendados podem ser publicados')
    }

    return this.publishPost(post)
  }

  /**
   * Retorna o status do scheduler
   */
  getStatus() {
    return {
      running: this.isRunning,
      checkIntervalMinutes: this.checkIntervalMs / 60000,
    }
  }

  /**
   * Agenda um post para publicação
   */
  async schedulePost(postData: Omit<Post, 'id' | 'lastUpdated'>): Promise<Post> {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    const post: Post = {
      ...postData,
      id: postId,
      lastUpdated: new Date().toISOString(),
    }

    await postStorage.save(post)
    logger.info(`📅 Post ${postId} agendado para ${post.scheduledFor}`)
    
    return post
  }

  /**
   * Cancela um post agendado
   */
  async cancelScheduledPost(postId: string): Promise<void> {
    const post = await postStorage.findById(postId)
    
    if (!post) {
      throw new Error('Post não encontrado')
    }

    if (post.status !== 'scheduled') {
      throw new Error('Apenas posts agendados podem ser cancelados')
    }

    await postStorage.delete(postId)
    logger.info(`🗑️  Post ${postId} cancelado`)
  }

  /**
   * Reagenda um post
   */
  async reschedulePost(postId: string, newScheduledFor: string): Promise<Post> {
    const post = await postStorage.findById(postId)
    
    if (!post) {
      throw new Error('Post não encontrado')
    }

    if (post.status !== 'scheduled') {
      throw new Error('Apenas posts agendados podem ser reagendados')
    }

    const updatedPost: Post = {
      ...post,
      scheduledFor: newScheduledFor,
      lastUpdated: new Date().toISOString(),
    }

    await postStorage.update(postId, updatedPost)
    logger.info(`📅 Post ${postId} reagendado para ${newScheduledFor}`)
    
    return updatedPost
  }
}

// Instância singleton
export const schedulerService = new SchedulerService(1) // Verifica a cada 1 minuto
