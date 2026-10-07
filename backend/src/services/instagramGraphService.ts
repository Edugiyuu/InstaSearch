import axios from 'axios';
import { logger } from '../utils/logger';
import { InstagramAccountStorage } from './storage/InstagramAccountStorage';

import { GRAPH_API_BASE_URL } from './graphApi.js';

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
  media_product_type?: 'AD' | 'FEED' | 'STORY' | 'REELS';
  media_url?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
  username: string;
  like_count?: number;
  comments_count?: number;
  is_shared_to_feed?: boolean;
}

/** Métricas de um post; nomes da Graph API v22+ (ADR 0021). */
export interface InstagramMediaInsights {
  id: string;
  /** Visualizações (substituiu plays, video_views e impressions em abril de 2025). */
  views?: number;
  reach?: number;
  saved?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  total_interactions?: number;
  /** Só Reels: tempo médio assistido, em milissegundos. */
  ig_reels_avg_watch_time?: number;
}

/** Um Reel do perfil, com o que a listagem já devolve. */
export interface InstagramReel {
  id: string;
  caption?: string;
  permalink: string;
  thumbnail_url?: string;
  timestamp: string;
}

interface InstagramAccountInsights {
  follower_count?: number;
  impressions?: number;
  reach?: number;
  profile_views?: number;
  website_clicks?: number;
  email_contacts?: number;
}

/** Mensagem em português para os erros mais comuns da Graph API. */
export function instagramErrorMessage(error: any): string {
  const fb = error.response?.data?.error;
  if (!fb) return error.message;
  if (fb.code === 190) return 'O token do Instagram expirou ou foi revogado. Conecte de novo em Configurações.';
  if (fb.code === 10 || fb.code === 200 || fb.code === 803) {
    return 'O token do Instagram não tem permissão para ler métricas. Gere um token novo com instagram_manage_insights e conecte de novo em Configurações.';
  }
  if (fb.code === 4 || fb.code === 17 || fb.code === 32) return 'O Instagram limitou os pedidos por agora. Tente de novo daqui a uma hora.';
  return `Instagram: ${fb.message}`;
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
          fields: 'id,caption,media_type,media_product_type,media_url,permalink,thumbnail_url,timestamp,username,like_count,comments_count,is_shared_to_feed',
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
   * Busca métricas (insights) de um post/reel específico.
   * Precisa da permissão instagram_manage_insights e de conta profissional.
   * Quem já sabe o tipo (a coleta de métricas, que só lista Reels) passa `productType` e economiza um pedido.
   */
  async getMediaInsights(mediaId: string, productType?: InstagramMedia['media_product_type']): Promise<InstagramMediaInsights> {
    const { accessToken } = await this.getAccountCredentials();
    const type = productType ?? (await this.getMediaById(mediaId)).media_product_type;
    const base = ['views', 'reach', 'saved', 'likes', 'comments', 'shares', 'total_interactions'];
    // o tempo médio assistido só existe para Reels
    const isReel = type === 'REELS';

    const ask = async (metrics: string[]) => {
      const response = await axios.get(`${GRAPH_API_BASE_URL}/${mediaId}/insights`, {
        params: { metric: metrics.join(','), access_token: accessToken },
      });
      const insights: InstagramMediaInsights = { id: mediaId };
      response.data.data.forEach((insight: any) => {
        (insights as any)[insight.name] = insight.values?.[0]?.value ?? insight.total_value?.value;
      });
      return insights;
    };

    try {
      return await ask(isReel ? [...base, 'ig_reels_avg_watch_time'] : base);
    } catch (error: any) {
      const fb = error.response?.data?.error;
      // métrica que esta versão da API não aceita: tenta de novo só com as básicas
      if (isReel && fb?.code === 100) {
        try {
          return await ask(base);
        } catch (retryError: any) {
          error = retryError;
        }
      }
      logger.error('Error fetching Instagram media insights', { mediaId, error: error.response?.data || error.message });
      throw new Error(instagramErrorMessage(error));
    }
  }

  /**
   * Os Reels mais recentes do perfil (até `max`), seguindo a paginação.
   */
  async listReels(max: number = 50): Promise<InstagramReel[]> {
    const { accessToken, accountId } = await this.getAccountCredentials();
    const reels: InstagramReel[] = [];
    let url: string | undefined = `${GRAPH_API_BASE_URL}/${accountId}/media`;
    let params: Record<string, unknown> | undefined = {
      fields: 'id,caption,media_product_type,permalink,thumbnail_url,timestamp',
      limit: 50,
      access_token: accessToken,
    };
    // no máximo 4 páginas: perfis com muitos posts de foto não precisam de mais
    for (let page = 0; url && page < 4 && reels.length < max; page++) {
      try {
        const response: any = await axios.get(url, { params });
        for (const m of response.data.data ?? []) {
          if (m.media_product_type === 'REELS') reels.push(m);
        }
        url = response.data.paging?.next;
        params = undefined; // o link "next" já traz os parâmetros
      } catch (error: any) {
        throw new Error(instagramErrorMessage(error));
      }
    }
    return reels.slice(0, max);
  }

  /**
   * Se o token tem uma permissão. null = não deu para saber (token que não é de usuário do Facebook).
   */
  async hasPermission(permission: string): Promise<boolean | null> {
    const { accessToken } = await this.getAccountCredentials();
    try {
      const response = await axios.get(`${GRAPH_API_BASE_URL}/me/permissions`, { params: { access_token: accessToken } });
      const list: { permission: string; status: string }[] = response.data.data ?? [];
      return list.some(p => p.permission === permission && p.status === 'granted');
    } catch {
      return null;
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
