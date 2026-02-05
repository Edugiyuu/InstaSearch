/**
 * VideoPromptController - Geração de prompts para IA de vídeo
 * 
 * Endpoints para gerar prompts otimizados para ferramentas como:
 * - Grok Video (https://grok.com/imagine)
 * - Runway ML
 * - Pika Labs
 * - Outros geradores de vídeo IA
 */

import { Request, Response } from 'express';
import { AIService } from '../services/aiService.js';
import { ContentStorage } from '../services/storage/ContentStorage.js';
import { InstagramAccountStorage } from '../services/storage/InstagramAccountStorage.js';
import { InstagramGraphService } from '../services/instagramGraphService.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { AppError } from '../middleware/errorHandler.js';

const aiService = new AIService();
const contentStorage = new ContentStorage();
const accountStorage = new InstagramAccountStorage();
const instagramService = new InstagramGraphService();

/**
 * POST /api/video-prompts/generate
 * Gera prompts otimizados para criação de vídeos com IA
 * 
 * Body:
 * - topic?: string - Tópico customizado
 * - contentId?: string - ID de uma ideia de conteúdo existente
 * - useMyProfile?: boolean - Usar contexto do perfil Instagram conectado
 * - duration: 8 | 16 - Duração do vídeo (8s = 1 prompt, 16s = 2 prompts)
 * - style?: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'aesthetic' | 'satisfying'
 * - dialogues?: Array<{speaker: string, text: string, timing?: string}> - Diálogos/falas no vídeo
 */
export const generateVideoPrompt = asyncHandler(
  async (req: Request, res: Response) => {
    const { 
      topic, 
      contentId, 
      useMyProfile = false, 
      duration = 8, 
      style = 'cinematic',
      dialogues 
    } = req.body;

    // Validar duração
    if (duration !== 8 && duration !== 16) {
      throw new AppError('Duração deve ser 8 ou 16 segundos', 400);
    }

    // Pelo menos uma fonte de contexto deve ser fornecida
    if (!topic && !contentId && !useMyProfile) {
      throw new AppError(
        'Forneça pelo menos: topic, contentId, ou useMyProfile=true', 
        400
      );
    }

    let profileContext;
    let contentIdea;

    // 1. Buscar contexto do perfil Instagram (se solicitado)
    if (useMyProfile) {
      try {
        const accounts = await accountStorage.findAll();
        if (accounts.length === 0) {
          throw new AppError('Nenhuma conta do Instagram conectada', 400);
        }

        const profile = await instagramService.getProfile();

        // Analisar perfil com IA para extrair temas
        const profileAnalysis = await aiService.analyzeProfile({
          username: profile.username,
          bio: profile.biography,
          followersCount: profile.followers_count,
          postsCount: profile.media_count
        });

        profileContext = {
          username: profile.username,
          bio: profile.biography,
          contentThemes: profileAnalysis.contentThemes,
          targetAudience: profileAnalysis.targetAudience
        };
      } catch (error: any) {
        throw new AppError(
          `Erro ao buscar perfil Instagram: ${error.message}`, 
          400
        );
      }
    }

    // 2. Buscar ideia de conteúdo (se fornecido contentId)
    if (contentId) {
      const content = await contentStorage.findById(contentId);
      if (!content) {
        throw new AppError('Conteúdo não encontrado', 404);
      }

      contentIdea = {
        title: content.idea.title,
        description: content.idea.description,
        script: content.script
      };
    }

    // 3. Gerar prompts com IA
    const result = await aiService.generateVideoPrompt({
      topic,
      contentIdea,
      profileContext,
      duration: duration as 8 | 16,
      style: style as any,
      dialogues
    });

    res.json({
      success: true,
      data: {
        prompts: result.prompts,
        context: result.context,
        tips: result.tips,
        grokUrl: result.grokUrl,
        metadata: {
          duration,
          style,
          promptCount: result.prompts.length,
          source: contentId ? 'content' : useMyProfile ? 'profile' : 'topic'
        }
      }
    });
  }
);

/**
 * GET /api/video-prompts/styles
 * Lista estilos disponíveis para geração de vídeo
 */
export const getAvailableStyles = asyncHandler(
  async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        styles: [
          {
            id: 'cinematic',
            name: 'Cinematográfico',
            description: 'Estilo de filme profissional com iluminação dramática',
            bestFor: 'Storytelling, narrativas emocionais'
          },
          {
            id: 'realistic',
            name: 'Realista',
            description: 'Aparência natural e realista, como vídeo filmado',
            bestFor: 'Tutoriais, demonstrações, vlogs'
          },
          {
            id: 'animated',
            name: 'Animado',
            description: 'Estilo cartoon/animação 2D ou 3D',
            bestFor: 'Conteúdo educativo, explicações, infantil'
          },
          {
            id: 'minimalist',
            name: 'Minimalista',
            description: 'Visual limpo, cores simples, foco no essencial',
            bestFor: 'Conteúdo corporativo, tech, design'
          },
          {
            id: 'meme',
            name: 'Meme',
            description: 'Estilo de meme viral, humor visual rápido',
            bestFor: 'Conteúdo viral, humor, trends, gen-Z'
          },
          {
            id: 'nonsense',
            name: 'Nonsense',
            description: 'Absurdo, surreal, bizarro, fora do comum',
            bestFor: 'Humor absurdo'
          },
          {
            id: 'aesthetic',
            name: 'Aesthetic',
            description: 'Visual artístico, paleta de cores harmoniosa',
            bestFor: 'Lifestyle, moda, arte, vibes'
          },
          {
            id: 'satisfying',
            name: 'Satisfying',
            description: 'Vídeos satisfatórios/ASMR visual - cortes, fatiamento, organização',
            bestFor: 'Oddly satisfying, ASMR visual, loops, processos'
          }
        ],
        durations: [
          {
            value: 8,
            label: '8 segundos',
            prompts: 1,
            description: 'Ideal para hooks rápidos, teaser, transições'
          },
          {
            value: 16,
            label: '16 segundos',
            prompts: 2,
            description: 'Narrativa completa com introdução e conclusão'
          }
        ]
      }
    });
  }
);
