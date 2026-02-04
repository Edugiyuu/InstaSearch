/**
 * AIService - Serviço de Inteligência Artificial usando Google Gemini
 * 
 * Funcionalidades:
 * - Análise de perfis do Instagram
 * - Análise de reels e posts
 * - Geração de insights e sugestões
 * - Geração de captions e hashtags
 * - Sugestões de temas de conteúdo
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '../utils/logger.js';

interface ProfileAnalysisResult {
  overview: string;
  contentThemes: string[];
  targetAudience: string;
  postingFrequency: string;
  engagementPattern: string;
  recommendations: string[];
}

interface ReelAnalysisResult {
  theme: string;
  style: string;
  duration: string;
  visualElements: string[];
  audioType: string;
  hooks: string[];
  callToAction: string;
  engagement: {
    level: string;
    factors: string[];
  };
}

interface ContentSuggestion {
  title: string;
  description: string;
  format: string;
  targetAudience: string;
  estimatedEngagement: string;
  hooks: string[];
  hashtags: string[];
}

interface CaptionResult {
  caption: string;
  hashtags: string[];
  callToAction: string;
  tone: string;
}

interface VideoPrompt {
  prompt: string;
  duration: number;
  style: string;
  technicalSpecs: {
    aspectRatio: string;
    fps: number;
    length: string;
  };
}

interface VideoPromptResult {
  prompts: VideoPrompt[];
  context: string;
  tips: string[];
  grokUrl: string;
}

class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your-gemini-api-key-here') {
      logger.warn('⚠️ GEMINI_API_KEY não configurada. AI Service desabilitado.');
      logger.info('📝 Configure em: https://aistudio.google.com/app/apikey');
      throw new Error('GEMINI_API_KEY não configurada no .env');
    }

    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: this.modelName });

    logger.info(`✅ AIService inicializado: ${this.modelName}`);
    logger.info('💰 Google Gemini - 100% gratuito (1,500 requests/dia)');
  }

  /**
   * Analisa um perfil do Instagram baseado em seus dados
   */
  async analyzeProfile(profileData: {
    username: string;
    bio?: string;
    followersCount?: number;
    followingCount?: number;
    postsCount?: number;
    posts?: Array<{
      caption?: string;
      likesCount?: number;
      commentsCount?: number;
      type?: string;
    }>;
  }): Promise<ProfileAnalysisResult> {
    try {
      logger.info(`🔍 Analisando perfil: @${profileData.username}`);

      const prompt = `
Você é um especialista em marketing digital e análise de Instagram.

Analise este perfil do Instagram e forneça insights detalhados:

**Perfil:**
- Username: @${profileData.username}
- Bio: ${profileData.bio || 'Não informado'}
- Seguidores: ${profileData.followersCount || 0}
- Seguindo: ${profileData.followingCount || 0}
- Total de posts: ${profileData.postsCount || 0}

**Últimos posts:**
${profileData.posts?.slice(0, 10).map((post, i) => `
Post ${i + 1}:
- Tipo: ${post.type || 'imagem'}
- Caption: ${post.caption?.substring(0, 100) || 'Sem legenda'}...
- Likes: ${post.likesCount || 0}
- Comentários: ${post.commentsCount || 0}
`).join('\n') || 'Nenhum post disponível'}

**Forneça uma análise estruturada no seguinte formato JSON:**
{
  "overview": "Visão geral do perfil (2-3 frases)",
  "contentThemes": ["tema1", "tema2", "tema3"],
  "targetAudience": "Descrição do público-alvo",
  "postingFrequency": "Análise da frequência de postagens",
  "engagementPattern": "Padrão de engajamento observado",
  "recommendations": ["recomendação1", "recomendação2", "recomendação3"]
}

Responda APENAS com o JSON válido, sem texto adicional.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const analysis: ProfileAnalysisResult = JSON.parse(jsonMatch[0]);
      
      logger.info(`✅ Análise de perfil concluída: @${profileData.username}`);
      return analysis;

    } catch (error: any) {
      logger.error(`❌ Erro ao analisar perfil: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analisa um reel/vídeo específico
   */
  async analyzeReel(reelData: {
    caption?: string;
    likesCount?: number;
    commentsCount?: number;
    viewsCount?: number;
    duration?: number;
  }): Promise<ReelAnalysisResult> {
    try {
      logger.info('🎬 Analisando reel...');

      const prompt = `
Você é um especialista em criação de conteúdo para Instagram Reels.

Analise este reel e forneça insights detalhados:

**Dados do Reel:**
- Caption: ${reelData.caption || 'Sem legenda'}
- Views: ${reelData.viewsCount || 0}
- Likes: ${reelData.likesCount || 0}
- Comentários: ${reelData.commentsCount || 0}
- Duração: ${reelData.duration || 0} segundos

**Forneça uma análise estruturada no seguinte formato JSON:**
{
  "theme": "Tema principal do reel",
  "style": "Estilo de edição/apresentação",
  "duration": "Análise da duração",
  "visualElements": ["elemento1", "elemento2"],
  "audioType": "Tipo de áudio usado",
  "hooks": ["hook1", "hook2"],
  "callToAction": "Call to action identificado",
  "engagement": {
    "level": "alto/médio/baixo",
    "factors": ["fator1", "fator2"]
  }
}

Responda APENAS com o JSON válido, sem texto adicional.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const analysis: ReelAnalysisResult = JSON.parse(jsonMatch[0]);
      
      logger.info('✅ Análise de reel concluída');
      return analysis;

    } catch (error: any) {
      logger.error(`❌ Erro ao analisar reel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera sugestões de conteúdo baseadas em análises anteriores
   */
  async generateContentSuggestions(
    profileAnalysis: ProfileAnalysisResult,
    count: number = 5
  ): Promise<ContentSuggestion[]> {
    try {
      logger.info(`💡 Gerando ${count} sugestões de conteúdo...`);

      const prompt = `
Você é um estrategista de conteúdo para Instagram.

Baseado na análise do perfil a seguir, gere ${count} sugestões de conteúdo criativas e engajadoras:

**Análise do Perfil:**
- Temas principais: ${profileAnalysis.contentThemes.join(', ')}
- Público-alvo: ${profileAnalysis.targetAudience}
- Padrão de engajamento: ${profileAnalysis.engagementPattern}

**Gere ${count} sugestões no seguinte formato JSON:**
[
  {
    "title": "Título do conteúdo",
    "description": "Descrição detalhada (2-3 frases)",
    "format": "reel/carrossel/post único",
    "targetAudience": "Segmento específico do público",
    "estimatedEngagement": "alto/médio",
    "hooks": ["hook1", "hook2"],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
  }
]

Responda APENAS com o array JSON válido, sem texto adicional.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const suggestions: ContentSuggestion[] = JSON.parse(jsonMatch[0]);
      
      logger.info(`✅ ${suggestions.length} sugestões de conteúdo geradas`);
      return suggestions;

    } catch (error: any) {
      logger.error(`❌ Erro ao gerar sugestões: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera uma caption criativa para um post
   */
  async generateCaption(
    contentIdea: string,
    tone: 'casual' | 'profissional' | 'inspirador' | 'humorístico' = 'casual',
    includeHashtags: boolean = true
  ): Promise<CaptionResult> {
    try {
      logger.info(`✍️ Gerando caption (tom: ${tone})...`);

      const prompt = `
Você é um copywriter especializado em Instagram.

Crie uma caption envolvente para o seguinte conteúdo:

**Ideia do conteúdo:** ${contentIdea}
**Tom desejado:** ${tone}
**Incluir hashtags:** ${includeHashtags ? 'Sim' : 'Não'}

**Forneça o resultado no seguinte formato JSON:**
{
  "caption": "Caption completa (2-4 parágrafos, use emojis relevantes)",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"],
  "callToAction": "Call to action claro",
  "tone": "${tone}"
}

Regras:
- Use emojis de forma natural
- Caption deve ser autêntica e conversacional
- Inclua 5-10 hashtags relevantes
- CTA deve ser claro e específico

Responda APENAS com o JSON válido, sem texto adicional.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const caption: CaptionResult = JSON.parse(jsonMatch[0]);
      
      logger.info('✅ Caption gerada com sucesso');
      return caption;

    } catch (error: any) {
      logger.error(`❌ Erro ao gerar caption: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analisa tendências de hashtags
   */
  async analyzeHashtags(hashtags: string[]): Promise<{
    relevance: string;
    recommendations: string[];
    alternatives: string[];
  }> {
    try {
      logger.info(`🏷️ Analisando ${hashtags.length} hashtags...`);

      const prompt = `
Você é um especialista em estratégia de hashtags do Instagram.

Analise as seguintes hashtags e forneça insights:

**Hashtags:** ${hashtags.join(', ')}

**Forneça a análise no seguinte formato JSON:**
{
  "relevance": "Análise da relevância geral (2-3 frases)",
  "recommendations": ["dica1", "dica2", "dica3"],
  "alternatives": ["#alternativa1", "#alternativa2", "#alternativa3"]
}

Responda APENAS com o JSON válido, sem texto adicional.
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      logger.info('✅ Análise de hashtags concluída');
      return analysis;

    } catch (error: any) {
      logger.error(`❌ Erro ao analisar hashtags: ${error.message}`);
      throw error;
    }
  }

  /**
   * Gera prompts otimizados para criação de vídeos com IA (Grok, Runway, etc.)
   * Suporta vídeos de 8s (1 prompt) ou 16s (2 prompts sequenciais)
   */
  async generateVideoPrompt(input: {
    topic?: string;
    contentIdea?: {
      title: string;
      description: string;
      script?: {
        hook: string;
        body: string;
        cta: string;
      };
    };
    profileContext?: {
      username: string;
      bio?: string;
      contentThemes?: string[];
      targetAudience?: string;
    };
    duration: 8 | 16;
    style?: 'cinematic' | 'realistic' | 'animated' | 'minimalist';
  }): Promise<VideoPromptResult> {
    try {
      const { topic, contentIdea, profileContext, duration, style = 'cinematic' } = input;

      logger.info(`🎬 Gerando prompt de vídeo: ${duration}s, estilo: ${style}`);

      // Determinar contexto base
      let contextDescription = '';
      if (profileContext) {
        contextDescription = `
Perfil do criador:
- Username: @${profileContext.username}
- Bio: ${profileContext.bio || 'Não informada'}
- Temas de conteúdo: ${profileContext.contentThemes?.join(', ') || 'Variados'}
- Público-alvo: ${profileContext.targetAudience || 'Geral'}
`;
      }

      if (contentIdea) {
        contextDescription += `
Ideia de conteúdo:
- Título: ${contentIdea.title}
- Descrição: ${contentIdea.description}
${contentIdea.script ? `
- Hook: ${contentIdea.script.hook}
- Corpo: ${contentIdea.script.body}
- CTA: ${contentIdea.script.cta}
` : ''}
`;
      }

      if (topic) {
        contextDescription += `
Tópico solicitado: ${topic}
`;
      }

      const promptCount = duration === 8 ? 1 : 2;
      const segmentDuration = duration === 8 ? 8 : 8;

      const prompt = `
Você é um especialista em criação de prompts para IA de geração de vídeo (como Grok Video, Runway ML, Pika Labs).

CONTEXTO:
${contextDescription}

ESPECIFICAÇÕES TÉCNICAS:
- Plataforma alvo: Instagram Reels
- Aspect ratio: 9:16 (vertical)
- Duração: ${duration} segundos total
- Estilo visual: ${style}
- Número de prompts: ${promptCount} (cada um gera ~${segmentDuration}s de vídeo)

IMPORTANTE SOBRE PROMPTS PARA VÍDEO IA:
1. Prompts devem ser EXTREMAMENTE descritivos e visuais
2. Incluir: cena, iluminação, câmera, movimento, cores, atmosfera
3. Para vídeos de 16s: criar 2 prompts com CONTINUIDADE narrativa (Parte 1 → Parte 2)
4. Evitar texto on-screen (difícil de controlar em IA)
5. Foco em ação, transições suaves, dinâmica visual

TAREFA:
Gere ${promptCount} prompt(s) profissional(is) para criar um vídeo de ${duration}s sobre o contexto acima.

${promptCount === 2 ? `
Como são 2 prompts sequenciais:
- Parte 1 (0-8s): Introdução/Hook visual - apresenta o tema
- Parte 2 (8-16s): Desenvolvimento/Conclusão - aprofunda ou conclui a narrativa

GARANTIR CONTINUIDADE: 
- Mesma paleta de cores
- Mesmo estilo visual
- Mesma locação (ou transição lógica)
- Personagem/objeto consistente
` : ''}

Retorne APENAS um JSON válido (sem markdown, sem explicações) no formato:
{
  "prompts": [
    {
      "prompt": "Descrição visual detalhada do vídeo...",
      "duration": ${segmentDuration},
      "style": "${style}",
      "technicalSpecs": {
        "aspectRatio": "9:16",
        "fps": 30,
        "length": "${segmentDuration}s"
      }
    }${promptCount === 2 ? `,
    {
      "prompt": "Continuação visual com mesma estética...",
      "duration": ${segmentDuration},
      "style": "${style}",
      "technicalSpecs": {
        "aspectRatio": "9:16",
        "fps": 30,
        "length": "${segmentDuration}s"
      }
    }` : ''}
  ],
  "context": "Breve explicação do conceito do vídeo (1 frase)",
  "tips": [
    "Dica 1 para melhorar o resultado no Grok",
    "Dica 2 para ajustes após gerar",
    "Dica 3 sobre edição/finalização"
  ]
}
`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Extrair JSON da resposta
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não está em formato JSON válido');
      }

      const videoPromptData = JSON.parse(jsonMatch[0]);

      // Gerar URL do Grok com primeiro prompt pré-preenchido
      const firstPrompt = encodeURIComponent(videoPromptData.prompts[0].prompt);
      const grokUrl = `https://grok.com/imagine?prompt=${firstPrompt}`;

      logger.info(`✅ ${promptCount} prompt(s) de vídeo gerado(s) com sucesso`);

      return {
        ...videoPromptData,
        grokUrl
      };

    } catch (error: any) {
      logger.error(`❌ Erro ao gerar prompt de vídeo: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verifica se o serviço está funcionando
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.model.generateContent('Responda apenas: OK');
      const response = result.response.text();
      return response.trim().toUpperCase().includes('OK');
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null;

export function getAIService(): AIService {
  if (!aiServiceInstance) {
    aiServiceInstance = new AIService();
  }
  return aiServiceInstance;
}

export { AIService };
export default AIService;
