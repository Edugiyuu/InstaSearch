import { Request, Response } from 'express';
import { instagramGraphService } from '../services/instagramGraphService';
import { logger } from '../utils/logger';

/**
 * Busca informações do perfil do Instagram
 */
export const getInstagramProfile = async (req: Request, res: Response) => {
  try {
    const profile = await instagramGraphService.getProfile();
    
    res.json({
      success: true,
      data: profile,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramProfile controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca lista de posts/reels do perfil
 */
export const getInstagramMedia = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    const media = await instagramGraphService.getMedia(limit);
    
    res.json({
      success: true,
      data: media,
      count: media.length,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramMedia controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca apenas reels do perfil
 */
export const getInstagramReels = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 25;
    const reels = await instagramGraphService.getReels(limit);
    
    res.json({
      success: true,
      data: reels,
      count: reels.length,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramReels controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca detalhes de um post/reel específico
 */
export const getInstagramMediaById = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const media = await instagramGraphService.getMediaById(mediaId);
    
    res.json({
      success: true,
      data: media,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramMediaById controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca métricas (insights) de um post/reel específico
 */
export const getInstagramMediaInsights = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const insights = await instagramGraphService.getMediaInsights(mediaId);
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramMediaInsights controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca insights da conta (últimos 30 dias)
 */
export const getInstagramAccountInsights = async (req: Request, res: Response) => {
  try {
    const insights = await instagramGraphService.getAccountInsights();
    
    res.json({
      success: true,
      data: insights,
    });
  } catch (error: any) {
    logger.warn('Insights not available', { error: error.message });
    // Retorna dados vazios em vez de erro (insights são opcionais)
    res.json({
      success: true,
      data: {},
      message: 'Insights not available for this account type'
    });
  }
};

/**
 * Busca comentários de um post/reel
 */
export const getInstagramMediaComments = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const comments = await instagramGraphService.getMediaComments(mediaId, limit);
    
    res.json({
      success: true,
      data: comments,
      count: comments.length,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramMediaComments controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Busca hashtags de um post/reel
 */
export const getInstagramMediaHashtags = async (req: Request, res: Response) => {
  try {
    const { mediaId } = req.params;
    const hashtags = await instagramGraphService.getMediaHashtags(mediaId);
    
    res.json({
      success: true,
      data: hashtags,
      count: hashtags.length,
    });
  } catch (error: any) {
    logger.error('Error in getInstagramMediaHashtags controller', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
