import axios from 'axios';
import { logger } from '../utils/logger';
import { InstagramAccountStorage } from './storage/InstagramAccountStorage';

const GRAPH_API_BASE_URL = 'https://graph.facebook.com/v18.0';

interface InstagramProfile {
  id: string;
  username: string;
  name?: string;
  biography?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  website?: string;
}

interface InstagramMedia {
  id: string;
  caption?: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
  like_count?: number;
  comments_count?: number;
  is_shared_to_feed?: boolean;
}

interface InstagramMediaInsights {
  id: string;
  impressions?: number;
  reach?: number;
  engagement?: number;
  saved?: number;
  video_views?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  plays?: number;
  total_interactions?: number;
}

interface InstagramAccountInsights {
  follower_count?: number;
  impressions?: number;
  reach?: number;
  profile_views?: number;
  website_clicks?: number;
  email_contacts?: number;
}

export class InstagramGraphService {
  private accountStorage: InstagramAccountStorage;

  constructor() {
    this.accountStorage = new InstagramAccountStorage();
  }

  /**
   * Busca o access token e account ID da conta conectada
   */
  private async getAccountCredentials(): Promise<{ accessToken: string; accountId: string }> {
    const accounts = await this.accountStorage.findAll();
    if (accounts.length === 0) {
      throw new Error('Nenhuma conta do Instagram conectada');
    }
    
    const account = accounts[0];
    if (!account.accessToken) {
      throw new Error('Token de acesso não encontrado');
    }

    if (!account.accountId) {
      throw new Error('ID da conta do Instagram não encontrado');
    }

    return {
      accessToken: account.accessToken,
      accountId: account.accountId
    };
  }

  /**
   * Busca informações do perfil do Instagram
   */
  async getProfile(): Promise<InstagramProfile> {
    try {
      const { accessToken, accountId } = await this.getAccountCredentials();
      
      const response = await axios.get(`${GRAPH_API_BASE_URL}/${accountId}`, {
        params: {
          fields: 'id,username,name,biography,followers_count,follows_count,media_count,profile_picture_url,website',
          access_token: accessToken,
        },
      });

      logger.info('Instagram profile fetched successfully', {
        username: response.data.username,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error fetching Instagram profile', {
        error: error.response?.data || error.message,
      });
      throw new Error(`Erro ao buscar perfil: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Busca lista de posts/reels do perfil
   */
  async getMedia(limit: number = 25): Promise<InstagramMedia[]> {
    try {
      const { accessToken, accountId } = await this.getAccountCredentials();
      
      const response = await axios.get(`${GRAPH_API_BASE_URL}/${accountId}/media`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,is_shared_to_feed',
          limit,
          access_token: accessToken,
        },
      });

      logger.info('Instagram media fetched successfully', {
        count: response.data.data.length,
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching Instagram media', {
        error: error.response?.data || error.message,
      });
      throw new Error(`Erro ao buscar posts: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Busca apenas reels do perfil
   */
  async getReels(limit: number = 25): Promise<InstagramMedia[]> {
    try {
      const allMedia = await this.getMedia(limit);
      
      // Filtra apenas vídeos (reels)
      const reels = allMedia.filter(media => media.media_type === 'VIDEO');

      logger.info('Instagram reels filtered', {
        total: allMedia.length,
        reels: reels.length,
      });

      return reels;
    } catch (error: any) {
      logger.error('Error fetching Instagram reels', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Busca detalhes de um post/reel específico
   */
  async getMediaById(mediaId: string): Promise<InstagramMedia> {
    try {
      const { accessToken } = await this.getAccountCredentials();
      
      const response = await axios.get(`${GRAPH_API_BASE_URL}/${mediaId}`, {
        params: {
          fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,is_shared_to_feed',
          access_token: accessToken,
        },
      });

      logger.info('Instagram media details fetched', {
        mediaId,
      });

      return response.data;
    } catch (error: any) {
      logger.error('Error fetching Instagram media details', {
        mediaId,
        error: error.response?.data || error.message,
      });
      throw new Error(`Erro ao buscar detalhes do post: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Busca métricas (insights) de um post/reel específico
   */
  async getMediaInsights(mediaId: string): Promise<InstagramMediaInsights> {
    try {
      const { accessToken } = await this.getAccountCredentials();
      
      // Primeiro busca o tipo de mídia
      const media = await this.getMediaById(mediaId);
      
      let metrics: string[];
      
      if (media.media_type === 'VIDEO') {
        // Métricas para vídeos/reels
        metrics = [
          'impressions',
          'reach',
          'saved',
          'video_views',
          'likes',
          'comments',
          'shares',
          'plays',
          'total_interactions',
        ];
      } else {
        // Métricas para imagens/carrosséis
        metrics = [
          'impressions',
          'reach',
          'saved',
          'likes',
          'comments',
          'shares',
          'total_interactions',
        ];
      }

      const response = await axios.get(`${GRAPH_API_BASE_URL}/${mediaId}/insights`, {
        params: {
          metric: metrics.join(','),
          access_token: accessToken,
        },
      });

      // Converte array de insights em objeto
      const insights: any = { id: mediaId };
      response.data.data.forEach((insight: any) => {
        insights[insight.name] = insight.values[0].value;
      });

      logger.info('Instagram media insights fetched', {
        mediaId,
        metrics: Object.keys(insights),
      });

      return insights;
    } catch (error: any) {
      logger.error('Error fetching Instagram media insights', {
        mediaId,
        error: error.response?.data || error.message,
      });
      
      // Se o erro for de permissões, retorna insights vazios
      if (error.response?.data?.error?.code === 200) {
        logger.warn('Instagram insights not available for this media (requires business account)', {
          mediaId,
        });
        return { id: mediaId };
      }
      
      throw new Error(`Erro ao buscar métricas: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Busca insights da conta (últimos 30 dias)
   */
  async getAccountInsights(): Promise<InstagramAccountInsights> {
    try {
      const { accessToken, accountId } = await this.getAccountCredentials();
      
      const metrics = [
        'impressions',
        'reach',
        'profile_views',
        'follower_count',
        'website_clicks',
        'email_contacts',
      ];

      const response = await axios.get(`${GRAPH_API_BASE_URL}/${accountId}/insights`, {
        params: {
          metric: metrics.join(','),
          period: 'day',
          access_token: accessToken,
        },
      });

      // Converte array de insights em objeto
      const insights: any = {};
      response.data.data.forEach((insight: any) => {
        // Pega o último valor disponível
        const lastValue = insight.values[insight.values.length - 1];
        insights[insight.name] = lastValue.value;
      });

      logger.info('Instagram account insights fetched', {
        metrics: Object.keys(insights),
      });

      return insights;
    } catch (error: any) {
      logger.warn('Instagram account insights not available', {
        error: error.response?.data || error.message,
      });
      
      // Insights podem não estar disponíveis dependendo do tipo de conta
      // Retorna objeto vazio em vez de throw error
      return {};
    }
  }

  /**
   * Busca comentários de um post/reel
   */
  async getMediaComments(mediaId: string, limit: number = 50): Promise<any[]> {
    try {
      const { accessToken } = await this.getAccountCredentials();
      
      const response = await axios.get(`${GRAPH_API_BASE_URL}/${mediaId}/comments`, {
        params: {
          fields: 'id,text,username,timestamp,like_count',
          limit,
          access_token: accessToken,
        },
      });

      logger.info('Instagram media comments fetched', {
        mediaId,
        count: response.data.data.length,
      });

      return response.data.data;
    } catch (error: any) {
      logger.error('Error fetching Instagram media comments', {
        mediaId,
        error: error.response?.data || error.message,
      });
      throw new Error(`Erro ao buscar comentários: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Busca hashtags de um post/reel
   */
  async getMediaHashtags(mediaId: string): Promise<string[]> {
    try {
      const media = await this.getMediaById(mediaId);
      
      if (!media.caption) {
        return [];
      }

      // Extrai hashtags do caption
      const hashtags = media.caption.match(/#\w+/g) || [];
      
      logger.info('Instagram media hashtags extracted', {
        mediaId,
        count: hashtags.length,
      });

      return hashtags;
    } catch (error: any) {
      logger.error('Error extracting hashtags', {
        mediaId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Publica um reel no Instagram
   * @param videoUrl URL pública do vídeo (Cloudinary, etc)
   * @param caption Legenda do reel
   * @param shareToFeed Se deve compartilhar no feed
   * @returns ID do post publicado e URL permanente
   */
  async publishReel(videoUrl: string, caption: string, shareToFeed: boolean = true): Promise<{
    mediaId: string;
    permalink: string;
  }> {
    try {
      const { accessToken, accountId } = await this.getAccountCredentials();

      logger.info(`📱 Publicando reel no Instagram...`);
      logger.info(`Caption: ${caption.substring(0, 100)}...`);

      // Etapa 1: Criar container de mídia (upload do vídeo)
      const containerResponse = await axios.post(
        `${GRAPH_API_BASE_URL}/${accountId}/media`,
        {
          media_type: 'REELS',
          video_url: videoUrl,
          caption: caption,
          share_to_feed: shareToFeed
        },
        {
          params: { access_token: accessToken }
        }
      );

      const creationId = containerResponse.data.id;
      logger.info(`Container criado: ${creationId}`);

      // Etapa 2: Aguardar processamento (polling)
      await this.waitForVideoProcessing(creationId, accessToken);

      // Etapa 3: Publicar reel
      const publishResponse = await axios.post(
        `${GRAPH_API_BASE_URL}/${accountId}/media_publish`,
        {
          creation_id: creationId
        },
        {
          params: { access_token: accessToken }
        }
      );

      const mediaId = publishResponse.data.id;
      
      // Buscar permalink do post publicado
      const mediaResponse = await axios.get(`${GRAPH_API_BASE_URL}/${mediaId}`, {
        params: {
          fields: 'permalink',
          access_token: accessToken
        }
      });

      const permalink = mediaResponse.data.permalink;

      logger.info(`✅ Reel publicado com sucesso! ID: ${mediaId}`);

      return {
        mediaId,
        permalink
      };

    } catch (error: any) {
      logger.error('❌ Erro ao publicar reel:', error.response?.data || error.message);
      throw new Error(
        `Erro ao publicar no Instagram: ${error.response?.data?.error?.message || error.message}`
      );
    }
  }

  /**
   * Aguarda o processamento do vídeo pelo Instagram
   */
  private async waitForVideoProcessing(
    creationId: string,
    accessToken: string,
    maxAttempts: number = 30
  ): Promise<void> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const statusResponse = await axios.get(
        `${GRAPH_API_BASE_URL}/${creationId}`,
        {
          params: {
            fields: 'status_code',
            access_token: accessToken
          }
        }
      );

      const statusCode = statusResponse.data.status_code;

      if (statusCode === 'FINISHED') {
        logger.info('✅ Processamento concluído!');
        return;
      }

      if (statusCode === 'ERROR') {
        throw new Error('Erro no processamento do vídeo pelo Instagram');
      }

      logger.info(`⏳ Aguardando processamento... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 5000)); // 5 segundos
      attempts++;
    }

    throw new Error('Timeout: vídeo não foi processado a tempo');
  }
}

export const instagramGraphService = new InstagramGraphService();
