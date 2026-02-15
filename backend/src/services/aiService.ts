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

export interface Dialogue {
  speaker: string; // Quem fala (ex: "Pizza", "Hambúrguer", "Narrador")
  text: string;    // O que fala
  timing?: string; // Opcional: momento da fala (ex: "início", "meio", "final")
}

interface VideoPrompt {
  prompt: string;
  duration: number;
  style: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'aesthetic' | 'satisfying' | 'pov';
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
    style?: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'weird' | 'aesthetic' | 'satisfying' | 'pov';
    dialogues?: Dialogue[]; // Diálogos/falas no vídeo
  }): Promise<VideoPromptResult> {
    try {
      const { topic, contentIdea, profileContext, duration, style = 'cinematic', dialogues } = input;

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

      // IMPORTANTE: Vídeos "satisfying" não devem ter diálogos/pessoas falando
      // Apenas ações visuais satisfatórias
      if (dialogues && dialogues.length > 0 && style !== 'satisfying') {
        contextDescription += `
Diálogos/Falas no vídeo:
`;
        dialogues.forEach((dialogue, i) => {
          contextDescription += `${i + 1}. ${dialogue.speaker}: "${dialogue.text}"`;
          if (dialogue.timing) {
            contextDescription += ` (${dialogue.timing})`;
          }
          contextDescription += `\n`;
        });
      }

      const promptCount = duration === 8 ? 1 : 2;
      const segmentDuration = duration === 8 ? 8 : 8;

      // Definir instruções específicas por estilo
      let styleInstructions = '';
      
      switch (style) {
        case 'realistic':
          styleInstructions = `
ESTILO: REALISTA (Vlog/Selfie Autêntico)
- Filmagem: "handheld smartphone selfie footage"
- Enquadramento: VARIÁVEL e imperfeito - às vezes muito perto (rosto 80%), às vezes mais afastado (rosto 60%), nunca perfeitamente enquadrado
- Zoom: Ajustes imperfeitos durante o vídeo - pessoa ajusta a distância do braço, zoom digital errático, às vezes muito perto, às vezes mais longe
- Ângulo: Braço estendido, levemente de baixo, mas VARIA durante o vídeo
- Imperfeições VISÍVEIS: motion blur, grain, soft focus ocasional, overexposure em zonas claras, tremor perceptível
- Imperfeições de Câmera de Celular: iluminação desigual, granulação perceptível, distorção suave nas bordas, contraste ligeiramente forte
- Câmera: Instável, micro-movimentos constantes, ajustes naturais e IMPERFEITOS de distância/zoom
- Iluminação: Luz solar DIRETA e FORTE, sombras marcadas, alto contraste, lens flare ocasional
- Ambiente: EXTERNO prioritário (rua, parque, calçada) com elementos reais, sons urbanos
- Foco: Não perfeitamente sharp, ajustes automáticos visíveis, às vezes desfoca e volta`;
          break;

        case 'cinematic':
          styleInstructions = `
ESTILO: CINEMATOGRÁFICO (Profissional)
- Filmagem: Câmera estabilizada profissionalmente, composição cinematográfica
- Enquadramento: Rule of thirds, depth of field controlado
- Iluminação: Dramática e artística, três pontos de luz, sombras intencionais
- Movimento: Suave, controlado, tracking shots, slow motion ocasional
- Cores: Grading cinematográfico, paleta específica (warm/cool tones)
- Qualidade: Sharp, alta resolução, sem imperfeições
- Ambiente: Locações escolhidas artisticamente, mise-en-scène cuidadosa`;
          break;

        case 'animated':
          styleInstructions = `
ESTILO: ANIMADO (Cartoon/3D)
- Visual: Estilo cartoon 2D ou animação 3D
- Personagens: Design estilizado, expressões exageradas
- Cores: Vibrantes, saturadas, paleta cartoon
- Movimento: Exagerado, bouncy, squash and stretch
- Ambiente: Cenários ilustrados/modelados, não realistas
- Efeitos: Motion graphics, transições animadas`;
          break;

        case 'minimalist':
          styleInstructions = `
ESTILO: MINIMALISTA (Clean & Simple)
- Visual: Limpo, espaços negativos, composição simples
- Cores: Paleta limitada (2-3 cores), tons neutros
- Fundo: Sólido ou extremamente simples, sem distrações
- Elementos: Mínimos, apenas o essencial
- Iluminação: Uniforme, flat lighting
- Foco: No sujeito principal, tudo mais é secundário`;
          break;

        case 'meme':
          styleInstructions = `
ESTILO: MEME (Viral/Humor)
- Energia: Alta, frenética, caótica
- Edição: Cortes rápidos, zoom-ins abruptos, freeze frames
- Elementos: Exagerados, cômicos, unexpected
- Timing: Punchlines visuais, perfect comedic timing
- Expressões: Over-the-top, reações exageradas
- Vibe: Gen-Z humor, self-aware, irônico`;
          break;

        case 'nonsense':
          styleInstructions = `
ESTILO: NONSENSE (Absurdo/Surreal)
- Visual: Bizarro, surreal, não faz sentido lógico
- Elementos: Inesperados, absurdos, justaposições estranhas
- Lógica: Quebrada intencionalmente, dream-like
- Cores: Pode ser oversaturated ou distorcido
- Atmosfera: Desconcertante, weird, memorable pela estranheza`;
          break;

        case 'weird':
          styleInstructions = `
ESTILO: WEIRD (Bizarro/Perturbador - jonmud.fun style)
- Visual: EXTREMAMENTE bizarro, perturbador mas hipnotizante
- Conceito: Situações cotidianas → pesadelos visuais, interpretações literais absurdas
- Personagens: Comportamentos anormais, expressões exageradas, ações ilógicas
- Objetos: Comida gigante, proporções erradas, texturas realistas em contextos bizarros
- Física: Ignorar leis quando aumenta absurdo (flutuando, derretendo, crescendo)
- Cenário: Ambientes normais COM elementos perturbadores
- Timing: Lento deliberado OU frenético caótico, nunca normal
- Som implícito: Visceral, úmido, ASMR desconfortável
- Humor: Absurdo, dark, liminal spaces, unsettling mas engraçado
- Exemplos: "sopa infinita", "chocolate vivo fugindo", "mãos gigantes manipulando pessoa pequena"
- Tom: Perturbador mas você não consegue parar de olhar (uncanny valley)
- PROIBIDO: Violência explícita, gore, sexual - bizarro deve ser SURREAL`;
          break;

        case 'aesthetic':
          styleInstructions = `
ESTILO: AESTHETIC (Artístico/Vibe)
- Visual: Artisticamente composto, instagram-worthy
- Cores: Paleta harmoniosa e específica (pastel/moody/vibrant)
- Iluminação: Soft, dreamy, golden hour, moody lighting
- Vibe: Mood específico (cozy/melancholic/dreamy/energetic)
- Composição: Visualmente agradável, balanced
- Elementos: Props e cenário contribuem para a estética`;
          break;

        case 'satisfying':
          styleInstructions = `
ESTILO: SATISFYING (Satisfatório/ASMR Visual)
- Visual: Macro close-up, foco extremo em detalhes e texturas
- Ação: Repetitiva, precisa, hipnotizante (corte, fatiamento, descascamento, organização)
- Movimento: Slow motion ocasional, câmera estável, tracking suave
- Iluminação: Perfeita para destacar textura e brilho, high-key ou dramática
- Som (implícito): ASMR-friendly, sons satisfatórios (crunch, slice, pop)
- Exemplos: Cortar sabão, fatiar objetos, organizar itens, peeling, crushing
- Cores: Vibrantes e saturadas OU monocromáticas clean
- Timing: Preciso, sincronizado, loops perfeitos
- Foco: No processo/ação, não em pessoas
- CRÍTICO: SEM PESSOAS FALANDO - Sem diálogos, sem narração, sem falas. Apenas visual puro.
- Personagens (se houver): Apenas mãos/corpo realizando a ação, SEM rosto, SEM falar
- CONTINUIDADE (para 2 prompts): Se Parte 1 termina derretendo → Parte 2 começa derretido. NUNCA resetar o estado do objeto.`;
          break;

        case 'pov':
          styleInstructions = `
ESTILO: POV (Point of View - Primeira Pessoa)
- Perspectiva: SEMPRE em primeira pessoa - câmera É o espectador
- Enquadramento: O que o espectador veria com seus próprios olhos
- Corpo visível: Apenas mãos, braços, pés do POV (do próprio espectador)
- Interação: Objetos/pessoas interagem DIRETAMENTE com a câmera/espectador
- Movimento: Natural como se fosse você andando/olhando/fazendo
- Imersão: Espectador SE TORNA o personagem principal
- Exemplos populares: "POV: você acordou em...", "POV: seu amigo te leva para...", "POV: você é..."
- Ângulo: Eye-level, perspectiva humana natural
- Câmera: Pode ter leve shake (movimentos naturais da cabeça/corpo)
- CRÍTICO: NUNCA mostrar o rosto do POV - apenas o que ELE vê e suas mãos/pés
- Contexto: Situações relacionáveis ou fantasiosas onde o espectador é o protagonista
- Tom: Imersivo, "você está vivendo isso agora"
- Diálogos: Outros personagens falam COM a câmera (com você)`;
          break;

        default:
          styleInstructions = `ESTILO: ${style}`;
      }

      const prompt = `
Você é um especialista em criação de prompts para IA de geração de vídeo (como Grok Video, Runway ML, Pika Labs).

CONTEXTO:
${contextDescription}

ESPECIFICAÇÕES TÉCNICAS:
- Plataforma alvo: Instagram Reels
- Aspect ratio: 9:16 (vertical)
- Duração: ${duration} segundos total
- Número de prompts: ${promptCount} (cada um gera ~${segmentDuration}s de vídeo)

${styleInstructions}

IMPORTANTE - APLICAR O ESTILO ESCOLHIDO:
Siga RIGOROSAMENTE as instruções do estilo "${style}" acima. Cada estilo tem características específicas de câmera, iluminação, movimento e atmosfera que devem ser respeitadas.

${style === 'satisfying' ? `CRÍTICO - SEM PESSOAS FALANDO: Este é um vídeo SATISFYING - NÃO DEVE CONTER pessoas falando, diálogos, narração ou qualquer tipo de fala. Apenas ações visuais satisfatórias puras (corte, fatiamento, organização, etc). Foco 100% no processo visual.` : ''}

${dialogues && dialogues.length > 0 && style !== 'satisfying' ? `DIÁLOGOS: Incorporar as falas no prompt - descrever expressões faciais, movimentos labiais sincronizados, gestos que acompanham a fala. Personagens devem "falar" de forma natural.` : ''}

ESTRUTURA DO PROMPT:
→ Aplicar primeiro as características visuais do estilo escolhido
→ Personagem: aparência física detalhada
→ Comportamento e emoções: evolução de expressões
→ Ambiente: adequado ao estilo
→ Ações físicas do personagem
→ Movimento de câmera conforme o estilo

TAREFA:
Gere ${promptCount} prompt(s) DINÂMICO(S) e DETALHADO(S) para criar um vídeo de ${duration}s sobre o contexto acima.

${promptCount === 2 ? `
Como são 2 prompts sequenciais:
- Parte 1 (0-8s): Hook visual dinâmico - introduz o personagem/objeto/ação com energia
- Parte 2 (8-16s): Continuação DIRETA - mantém a dinâmica e conclui com impacto

⚠️ CRÍTICO - CONTINUIDADE TEMPORAL EXATA:
- A Parte 2 deve começar EXATAMENTE no estado/momento final da Parte 1
- Se Parte 1 termina com chocolate derretido → Parte 2 começa com chocolate derretido (NÃO volta inteiro)
- Se Parte 1 termina com bolo cortado → Parte 2 começa com bolo cortado (NÃO volta inteiro)
- Se Parte 1 termina com objeto quebrado → Parte 2 começa com objeto quebrado (NÃO volta inteiro)
- NUNCA resetar ou reverter o estado - apenas continuar a progressão
- Descrever o ESTADO INICIAL da Parte 2 = ESTADO FINAL da Parte 1

GARANTIR CONTINUIDADE VISUAL: 
- Mesmo objeto/personagem com aparência consistente
- Mesma iluminação, ângulo de câmera e atmosfera
- Transição suave e natural entre as partes
- Progressão lógica da ação (não repetir ou voltar atrás)
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
      "prompt": "CONTINUA do estado final da Parte 1 - descrever o estado inicial exato (como terminou a Parte 1) e depois a continuação da ação...",
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

  /**
   * Gera legenda baseada em análise visual de frames do vídeo
   * @param frameImages Array de imagens em base64
   * @param style Estilo visual do vídeo (weird, realistic, cinematic, etc)
   * @returns Legenda contextual com hashtags
   */
  async generateCaptionFromVideo(frameImages: string[], style: string = 'realistic'): Promise<string> {
    try {
      logger.info(`🎬 Gerando legenda para estilo: ${style}`)
      logger.info(`🎞️ Analisando ${frameImages.length} frames...`)

      // Criar prompt com as imagens
      const imageParts = frameImages.map(imageData => ({
        inlineData: {
          data: imageData,
          mimeType: 'image/jpeg'
        }
      }))

      // Ajustar prompt baseado no estilo
      let styleContext = ''
      switch (style) {
        case 'weird':
          styleContext = `
ESTILO DO VÍDEO: WEIRD/BIZARRO (jonmud.fun)
- Foque no QUÃO ESTRANHO e BIZARRO é o conteúdo
- Use linguagem como "WTF", "espera o quê?", "isso é muito bizarro"
- Emojis perturbadores mas divertidos: 👻😳🤯😱😵‍💫
- Tom: Desconcertante mas engraçado
- Hashtags: #weird #bizarre #wtf #oddlyterrifying #liminalspace #unsettling #cursed`
          break
        case 'meme':
          styleContext = `
ESTILO DO VÍDEO: MEME/VIRAL
- Use linguagem de meme e humor gen-Z
- Emojis humorísticos: 😂💀😭🙏👀
- Tom: Engraçado e viral
- Hashtags: #meme #viral #funnyvideos #relatable #comedy`
          break
        case 'satisfying':
          styleContext = `
ESTILO DO VÍDEO: SATISFYING/ASMR VISUAL
- Foque nos detalhes satisfatórios do vídeo
- Use linguagem como "satisfatório", "hipnotizante", "relaxante"
- Emojis: 😌✨👌🏼❤️
- Hashtags: #satisfying #oddlysatisfying #asmr #relaxing`
          break
        case 'aesthetic':
          styleContext = `
ESTILO DO VÍDEO: AESTHETIC/ARTÍSTICO
- Foque na beleza visual e na vibe
- Use linguagem poética e artística
- Emojis: ✨🌿🌸🌙🧡
- Hashtags: #aesthetic #vibes #artsy #moodygrams`
          break
        case 'pov':
          styleContext = `
ESTILO DO VÍDEO: POV (PRIMEIRA PESSOA)
- Use "POV:" no início da legenda
- Descreva a experiência em segunda pessoa ("você")
- Crie situações relacionáveis ou fantasiosas
- Emojis: 👀🫵🏼💭🎬
- Tom: Imersivo e envolvente
- Hashtags: #pov #povs #relatable #storytime #fyp`
          break
        default:
          styleContext = '\nUse linguagem natural e engajante para Instagram Reels'
      }

      const prompt = `Analyze these images that are frames from an Instagram video (Reel) and create an AMAZING and VIRAL caption.
${styleContext}

IMPORTANT:
- Be CREATIVE and EYE-CATCHING
- Use relevant emojis
- Include 5-8 strategic hashtags
- Maximum 300 characters
- The caption MUST be in English
- Focus on what you SEE in the images
- Be specific about the visual content
- Don't make up things that aren't in the images
- ADAPT THE TONE to match the video style above

WHAT DO YOU SEE IN THE IMAGES?
Describe the visual content and create a caption that:
1. Grabs attention in the first 2 seconds
2. Is relevant to Instagram audience
3. Encourages interaction (comments, shares)
4. Uses hashtags that help with reach
5. MATCHES THE STYLE CONTEXT ABOVE

RESPONSE FORMAT (only the caption text):
[Eye-catching caption in English] #hashtag1 #hashtag2 #hashtag3`

      const result = await this.model.generateContent([prompt, ...imageParts])
      const caption = result.response.text().trim()

      logger.info(`✅ Legenda contextual gerada com sucesso`)
      return caption

    } catch (error: any) {
      logger.error(`❌ Erro ao gerar legenda do vídeo: ${error.message}`)
      
      // Fallback para legenda genérica
      return `🎥 Novo vídeo incrível! Não deixe de assistir até o final! 

O que você achou? Comenta aqui embaixo! 👇

#reels #viral #instagram #conteudo #video #explore #fyp #trending`
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
