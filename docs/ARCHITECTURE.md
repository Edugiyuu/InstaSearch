# Arquitetura do Sistema InstaSearch

## 📐 Visão Geral da Arquitetura

O InstaSearch é construído com uma arquitetura de microserviços, separando responsabilidades em diferentes componentes especializados.

## 🏛️ Componentes Principais

### 1. Frontend (Dashboard)

**Tecnologias**: React, TypeScript, CSS Puro, Vite

**Responsabilidades**:
- Interface do usuário para gerenciar perfis de referência
- Visualização de análises e insights
- Dashboard de performance
- Agendamento de conteúdo
- Configurações da conta

**Páginas Principais**:
```
/dashboard          - Visão geral e métricas
/my-profile         - Perfil Instagram conectado
/profiles           - Gerenciar perfis de referência
/analysis           - Resultados de análises
/content            - Gerador de conteúdo
/video-prompts      - Geração de prompts para IA de vídeo
/video-publish      - Upload, merge e publicação de reels
/calendar           - Calendário de postagens
/settings           - Configurações e conexão Instagram
```

### 2. Backend API

**Tecnologias**: Node.js, Express, TypeScript, Sistema de Arquivos (JSON)

**Estrutura de Pastas**:
```
backend/src/
├── controllers/      # Lógica de controle das rotas
│   ├── profileController.ts
│   ├── analysisController.ts
│   ├── contentController.ts
│   ├── postController.ts
│   ├── dashboardController.ts
│   ├── instagramAuthController.ts
│   ├── instagramTokenController.ts
│   ├── instagramDataController.ts
│   ├── videoPromptController.ts
│   └── videoController.ts
├── services/         # Lógica de negócio
│   ├── aiService.ts              # Google Gemini (gratuito)
│   ├── instagramAuthService.ts   # OAuth 2.0
│   ├── instagramGraphService.ts  # Graph API v18.0
│   ├── videoService.ts           # FFmpeg processing
│   └── storage/                  # Sistema de armazenamento JSON
│       ├── FileStorage.ts
│       ├── ProfileStorage.ts
│       ├── AnalysisStorage.ts
│       ├── ContentStorage.ts
│       ├── PostStorage.ts
│       ├── InstagramAccountStorage.ts
│       └── VideoStorage.ts
├── models/           # Modelos de dados TypeScript
│   └── index.ts
├── routes/           # Definição de rotas
│   └── api.ts
├── middleware/       # Middlewares
│   └── errorHandler.ts
└── utils/            # Utilitários
    ├── logger.ts
    └── idGenerator.ts
```

**Endpoints Principais**:

```
# Profiles
POST   /api/profiles              - Adicionar perfil de referência
GET    /api/profiles              - Listar perfis
GET    /api/profiles/:id          - Detalhes do perfil
DELETE /api/profiles/:id          - Remover perfil

# Analysis
POST   /api/analysis/start        - Iniciar análise
GET    /api/analysis/:id          - Obter análise
GET    /api/analysis/profile/:id  - Análises de um perfil

# Content
POST   /api/content/generate      - Gerar conteúdo
GET    /api/content               - Listar conteúdo gerado
PUT    /api/content/:id           - Editar conteúdo

# Posts
POST   /api/posts/schedule        - Agendar postagem
GET    /api/posts                 - Listar postagens
GET    /api/posts/:id/stats       - Estatísticas da postagem

# Instagram Auth (OAuth 2.0)
GET    /api/instagram/auth-url            - Gerar URL de autorização
GET    /api/instagram/callback            - Callback OAuth
POST   /api/instagram/connect-token       - Conectar com token manual
GET    /api/instagram/account             - Buscar conta conectada
DELETE /api/instagram/account             - Desconectar conta
POST   /api/instagram/account/refresh     - Atualizar dados

# Instagram Data (Graph API)
GET    /api/instagram/data/profile        - Dados do perfil conectado
GET    /api/instagram/data/media          - Lista de posts/reels
GET    /api/instagram/data/reels          - Apenas reels
GET    /api/instagram/data/media/:id      - Detalhes de um post
GET    /api/instagram/data/insights       - Insights da conta

# Video Prompts (IA)
POST   /api/video-prompts/generate        - Gerar prompts para IA de vídeo
GET    /api/video-prompts/styles          - Listar estilos disponíveis

# Video Publishing (Reels)
POST   /api/videos/upload                 - Upload de 1-3 vídeos
POST   /api/videos/merge                  - Juntar múltiplos vídeos
POST   /api/videos/publish-reel           - Publicar reel no Instagram
DELETE /api/videos/:filename              - Deletar arquivo temporário

# Dashboard
GET    /api/dashboard/overview            - Visão geral e métricas
GET    /api/dashboard/recent-activity     - Atividades recentes
```

### 3. Instagram Integration Service

**Tecnologia**: Node.js, Instagram Graph API v18.0, OAuth 2.0

**Componentes**:

#### Instagram Auth Service
```typescript
class InstagramAuthService {
  /**
   * Gera URL de autorização OAuth
   */
  generateAuthUrl(): string;
  
  /**
   * Troca código por access token
   */
  async exchangeCodeForToken(code: string): Promise<TokenResponse>;
  
  /**
   * Conecta via token manual
   */
  async connectWithToken(accessToken: string): Promise<Account>;
  
  /**
   * Renova token de acesso
   */
  async refreshToken(accountId: string): Promise<void>;
}
```

#### Instagram Graph Service
```typescript
class InstagramGraphService {
  /**
   * Busca dados do perfil conectado
   */
  async getProfile(accountId: string, accessToken: string): Promise<Profile>;
  
  /**
   * Busca posts/reels da conta
   */
  async getMedia(accountId: string, accessToken: string): Promise<Media[]>;
  
  /**
   * Busca apenas reels
   */
  async getReels(accountId: string, accessToken: string): Promise<Reel[]>;
  
  /**
   * Busca insights da conta (opcional)
   */
  async getInsights(accountId: string, accessToken: string): Promise<Insights>;
  
  /**
   * Publica reel no Instagram
   */
  async publishReel(
    accountId: string, 
    videoUrl: string, 
    caption: string, 
    accessToken: string
  ): Promise<PublishResponse>;
}
```

**Fluxo de Autenticação OAuth**:
```
1. Usuário clica "Conectar Instagram"
   ↓
2. Backend gera URL de autorização com scopes
   ↓
3. Usuário autoriza no Facebook/Instagram
   ↓
4. Instagram redireciona com código
   ↓
5. Backend troca código por access token
   ↓
6. Backend busca dados do perfil
   ↓
7. Salva conta em InstagramAccountStorage
   ↓
8. Frontend exibe perfil conectado
```

**Escopos OAuth Necessários**:
- `instagram_basic` - Informações básicas do perfil
- `instagram_content_publish` - Publicar conteúdo
- `pages_read_engagement` - Ler métricas
- `pages_show_list` - Listar páginas

### 4. Video Processing Service

**Tecnologia**: Node.js, FFmpeg, Cloudinary, Multer

**Componentes**:

#### Video Service
```typescript
class VideoService {
  /**
   * Valida formato, tamanho e duração do vídeo
   */
  async validateVideo(filePath: string): Promise<ValidationResult>;
  
  /**
   * Junta múltiplos vídeos em um único arquivo
   */
  async mergeVideos(
    videoPaths: string[], 
    outputFilename: string
  ): Promise<string>;
  
  /**
   * Otimiza vídeo para Instagram (1080x1920, 30fps)
   */
  async optimizeVideo(
    inputPath: string, 
    outputPath: string
  ): Promise<void>;
  
  /**
   * Deleta arquivo temporário
   */
  async deleteFile(filePath: string): Promise<void>;
}
```

**Fluxo de Publicação de Vídeo**:
```
1. Usuário faz upload de 1-3 vídeos (drag-and-drop)
   ↓
2. Multer salva em data/videos/temp/
   ↓
3. VideoService valida cada vídeo
   ↓
4. Se múltiplos: FFmpeg junta em merged_xxx.mp4
   ↓
5. Cloudinary faz upload para CDN público
   ↓
6. Instagram Graph API cria container de mídia
   ↓
7. Polling até vídeo ser processado
   ↓
8. Instagram publica reel
   ↓
9. Arquivos locais deletados
   ↓
10. Frontend exibe sucesso com mediaId
```

**Validações de Vídeo**:
- Formato: MP4, MOV, AVI, MKV
- Tamanho: Máximo 50MB por arquivo
- Duração: Máximo 30 segundos por vídeo
- Quantidade: 1 a 3 vídeos por upload

**Processamento FFmpeg**:
```bash
# Merge de vídeos (concat demuxer)
ffmpeg -f concat -safe 0 -i filelist.txt -c copy output.mp4

# Otimização para Instagram
ffmpeg -i input.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920" \
  -c:v libx264 -preset fast -crf 23 \
  -r 30 -pix_fmt yuv420p \
  -c:a aac -b:a 128k \
  output.mp4
```

### 5. AI Service (Google Gemini)

**Tecnologia**: Google Gemini API (gemini-2.5-flash-preview), 100% Gratuito

**Responsabilidades**:
- Gerar prompts otimizados para IA de vídeo
- Analisar perfis e conteúdo (futuro)
- Gerar ideias de conteúdo (futuro)
- Extrair insights de tendências (futuro)

**Modelo de Dados**:
```typescript
// Perfil Instagram Conectado
interface InstagramAccount {
  id: string;
  accountId: string;        // Instagram Business/Creator Account ID
  username: string;
  fullName: string;
  profilePicUrl?: string;
  bio?: string;
  website?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  accessToken: string;      // Criptografado
  tokenExpiresAt?: Date;
  connectedAt: Date;
  lastRefreshed?: Date;
}

// Perfil de Referência
interface Profile {
  id: string;
  username: string;
  fullName: string;
  bio: string;
  metrics: {
    followers: number;
    following: number;
    posts: number;
  };
  category?: string;
  status: 'active' | 'inactive';
  addedAt: Date;
  lastAnalyzed?: Date;
}

// Reel/Post do Instagram
interface Media {
  id: string;
  instagramId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnailUrl?: string;
  caption?: string;
  permalink: string;
  timestamp: Date;
  likeCount?: number;
  commentsCount?: number;
}

// Vídeo Temporário (Upload)
interface VideoUpload {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  duration?: number;
  uploadedAt: Date;
}

// Prompt de Vídeo Gerado
interface VideoPrompt {
  id: string;
  topic: string;
  duration: 8 | 16;
  style: VideoStyle;
  prompts: string[];
  dialogues?: Dialogue[];
  createdAt: Date;
}

interface Dialogue {
  speaker: string;      // Quem fala (ex: "Hambúrguer", "Personagem")
  text: string;         // O que fala
  timing?: string;      // Quando fala (ex: "início", "meio")
}
```

### 4. AI Analysis Engine

**Tecnologia**: Python, OpenAI API, TensorFlow (opcional)

**Módulos**:

#### Video Prompt Generator
```typescript
class AIService {
  /**
   * Gera prompts otimizados para ferramentas de IA de vídeo
   * Suporta: Grok Video, Runway ML, Pika Labs, etc.
   */
  async generateVideoPrompt(params: {
    topic: string;
    duration: 8 | 16;
    style: VideoStyle;
    dialogues?: Dialogue[];
    context?: string;
  }): Promise<VideoPromptResult>;
}

interface VideoPromptResult {
  prompts: string[];  // 1 prompt (8s) ou 2 prompts (16s)
  style: string;
  aspectRatio: '9:16';
  estimatedDuration: number;
}

type VideoStyle = 
  | 'cinematic'   // Cinematográfico, profissional
  | 'realistic'   // Realista, câmera handheld
  | 'animated'    // Animado, cartoonizado
  | 'minimalist'  // Minimalista, clean
  | 'meme'        // Meme, viral, zoomer humor
  | 'nonsense'    // Absurdo, random, Gen Z
  | 'aesthetic'   // Estético, dreamy
  | 'satisfying'; // ASMR, oddly satisfying
```

**Prompt Template (Exemplo)**:
```
Baseado em: {topic}
Estilo: {style}
Duração: {duration} segundos

{style_specific_instructions}

Especificações técnicas:
- Aspect ratio: 9:16 (vertical)
- Duração: {duration}s
- {dialogues_if_any}

Prompt otimizado: {generated_prompt}
```

**Prompts de IA**:

```python
ANALYSIS_PROMPT = """
Analise os seguintes reels do Instagram e identifique:
1. Temas principais
2. Estilo de comunicação
3. Padrões de sucesso (o que gera mais engajamento)
4. Formato de conteúdo (tutorial, entretenimento, educativo, etc)
5. Tom de voz

Reels: {reels_data}

Forneça uma análise detalhada em formato JSON.
"""

GENERATION_PROMPT = """
Com base na seguinte análise de perfis de referência, gere {count} ideias 
de conteúdo originais que:
1. Sejam inspiradas pelos padrões identificados
2. Sejam únicas e não copiem diretamente
3. Sejam adequadas para o público-alvo
4. Tenham potencial viral

Análise: {analysis_data}

Para cada ideia, forneça:
- Título/conceito
- Descrição
- Hook inicial (primeiros 3 segundos)
- Roteiro/estrutura
- Sugestões visuais
- Hashtags recomendadas
"""
```

### 5. Publishing Service

**Tecnologia**: Node.js, Instagram Graph API

**Responsabilidades**:
- Publicar conteúdo na conta do Instagram
- Agendar postagens
- Monitorar status de publicação
- Coletar métricas de performance

**Fluxo de Publicação**:
```
1. Recebe requisição de publicação
2. Valida conteúdo e credenciais
3. Faz upload da mídia para Instagram
4. Publica o post/reel
5. Armazena ID da publicação
6. Inicia monitoramento de métricas
7. Retorna confirmação
```

### 6. Sistema de Armazenamento (Arquivos JSON)

**Tecnologia**: Sistema de arquivos local com classes de storage TypeScript

**Storage Classes**:
```typescript
// Base class para todos os storages
class FileStorage<T> {
  protected dirPath: string;
  protected idPrefix: string;
  
  async save(data: T): Promise<T>;
  async findById(id: string): Promise<T | null>;
  async findAll(): Promise<T[]>;
  async update(id: string, data: Partial<T>): Promise<T>;
  async delete(id: string): Promise<boolean>;
}

// Storages específicos
class ProfileStorage extends FileStorage<Profile> {}
class AnalysisStorage extends FileStorage<Analysis> {}
class ContentStorage extends FileStorage<Content> {}
class PostStorage extends FileStorage<Post> {}
class InstagramAccountStorage extends FileStorage<InstagramAccount> {}
class ReelStorage extends FileStorage<Reel> {}
class VideoStorage extends FileStorage<VideoUpload> {}
```

**Estrutura de Diretórios**:

```
data/
├── instagram_accounts/
│   └── igacc__9f9Rfhhbmj.json
├── profiles/
│   ├── profile_123.json
│   └── profile_124.json
├── reels/
│   ├── reel_Hd-j-82r9k.json
│   └── reel_457.json
├── analyses/
│   └── analysis_Z3x2oOtMEV.json
├── content/
│   └── content_pPLeaC3i4D.json
├── posts/
│   └── post_202.json
├── videos/
│   ├── temp/                    # Uploads temporários
│   │   └── video_1738710530123_456789.mp4
│   └── output/                  # Vídeos processados
│       └── merged_1738710600000.mp4
└── users/
    └── user_456.json
```

**Formato dos Arquivos**:

```javascript
// instagram_accounts/igacc__xxx.json - Conta Instagram Conectada
{
  "id": "igacc__9f9Rfhhbmj",
  "accountId": "17841461234567890",
  "username": "meu_perfil",
  "fullName": "Meu Perfil",
  "profilePicUrl": "https://...",
  "bio": "Bio do perfil...",
  "followersCount": 5000,
  "followingCount": 800,
  "postsCount": 150,
  "accessToken": "EAATr6RZCzzIwBQgzl9l...",  // Criptografado em produção
  "connectedAt": "2026-02-04T10:00:00Z",
  "lastRefreshed": "2026-02-04T15:30:00Z"
}

// profiles/profile_123.json - Perfis de referência
{
  "id": "profile_123",
  "username": "perfil_referencia",
  "fullName": "Perfil de Referência",
  "bio": "Bio do perfil...",
  "metrics": {
    "followers": 150000,
    "following": 500,
    "posts": 320
  },
  "status": "active",
  "addedAt": "2026-01-30T10:00:00Z",
  "lastAnalyzed": "2026-01-30T09:00:00Z"
}

// reels/reel_456.json - Reels coletados
{
  "id": "reel_456",
  "profileId": "profile_123",
  "instagramId": "18123456789",
  "url": "https://...",
  "caption": "Legenda do reel...",
  "hashtags": ["#tech", "#ai"],
  "metrics": {
    "likes": 15000,
    "comments": 450,
    "views": 250000,
    "shares": 890
  },
  "duration": 25,
  "postedAt": "2026-01-29T15:00:00Z",
  "collectedAt": "2026-01-30T10:00:00Z"
}

// analyses/analysis_789.json - Análises realizadas
{
  "id": "analysis_789",
  "profileIds": ["profile_123", "profile_124"],
  "type": "comprehensive",
  "results": {
    "themes": ["tecnologia", "educação"],
    "patterns": {},
    "insights": ["..."],
    "recommendations": ["..."]
  },
  "createdAt": "2026-01-30T10:00:00Z"
}

// content/content_101.json - Conteúdo gerado
{
  "id": "content_101",
  "analysisId": "analysis_789",
  "idea": {
    "title": "5 Truques de IA",
    "description": "...",
    "hook": "Você está usando IA errado..."
  },
  "script": "Script completo...",
  "hashtags": ["#ia", "#tech"],
  "status": "draft",
  "createdAt": "2026-01-30T10:10:00Z",
  "scheduledFor": null
}

// posts/post_202.json - Postagens realizadas
{
  "id": "post_202",
  "contentId": "content_101",
  "instagramPostId": "18123456789",
  "status": "published",
  "metrics": {
    "likes": 1250,
    "comments": 43,
    "views": 15000,
    "shares": 89,
    "saves": 234
  },
  "publishedAt": "2026-01-31T18:00:15Z",
  "lastUpdated": "2026-01-31T20:00:00Z"
}
```

**ID Generator**:
```typescript
// Prefixos por tipo de entidade
const prefixes = {
  profile: 'profile',
  analysis: 'analysis',
  content: 'content',
  post: 'post',
  igacc: 'igacc_',  // Instagram Account
  reel: 'reel',
  user: 'user'
};

// Geração com nanoid (10 caracteres)
import { nanoid } from 'nanoid';

function generateId(prefix: string): string {
  return `${prefix}_${nanoid(10)}`;
}

// Exemplos:
// profile_Hd-j-82r9k
// analysis_Z3x2oOtMEV
// igacc__9f9Rfhhbmj
```

### 7. Serviços Externos

**Cloudinary** - CDN para hospedagem de vídeos
- Upload de vídeos com transformações automáticas
- URLs públicas para Instagram API
- Otimização de qualidade (1080x1920, 30fps)
- Plano gratuito: 25GB storage, 25GB bandwidth/mês

**Google Gemini API** - IA Generativa
- Modelo: gemini-2.5-flash-preview
- Geração de prompts de vídeo
- 100% gratuito (1,500 requests/dia)
- Sem necessidade de cartão de crédito

**Instagram Graph API** - Integração oficial
- Versão: v18.0
- OAuth 2.0 para autenticação
- Publicação de Reels
- Coleta de métricas e insights

**FFmpeg** - Processamento de vídeo
- Concatenação de múltiplos vídeos
- Otimização para Instagram (codec, resolução, fps)
- Instalação local (não é serviço cloud)

## 🔄 Fluxos de Trabalho

### Fluxo 1: Conectar Conta Instagram (OAuth 2.0)

```
1. Usuário clica "Conectar Instagram" em Settings
   ↓
2. Backend gera URL de autorização (Instagram Auth Service)
   ↓
3. Usuário é redirecionado para Facebook/Instagram
   ↓
4. Usuário autoriza a aplicação
   ↓
5. Instagram redireciona para /api/instagram/callback com código
   ↓
6. Backend troca código por access token
   ↓
7. Backend busca dados do perfil via Graph API
   ↓
8. Conta salva em InstagramAccountStorage
   ↓
9. Frontend exibe perfil conectado em Settings
   ↓
10. Página "Meu Perfil" agora acessível
```

### Fluxo 2: Publicar Reel no Instagram

```
1. Usuário acessa /video-publish
   ↓
2. Faz upload de 1-3 vídeos (drag-and-drop)
   ↓
3. Multer salva em data/videos/temp/
   ↓
4. VideoService valida formato, tamanho, duração
   ↓
5. Se múltiplos vídeos:
   - FFmpeg junta em merged_xxx.mp4
   - Salva em data/videos/output/
   - Deleta originais
   ↓
6. Usuário preenche caption e hashtags
   ↓
7. Clica "Publicar no Instagram"
   ↓
8. VideoController faz upload para Cloudinary
   ↓
9. Cloudinary retorna URL pública (HTTPS)
   ↓
10. Instagram Graph API cria container de mídia
   ↓
11. Polling até vídeo ser processado (max 60s)
   ↓
12. Instagram publica reel
   ↓
13. Backend deleta arquivos locais
   ↓
14. Frontend exibe sucesso com mediaId
```

### Fluxo 3: Gerar Prompt de Vídeo IA

```
1. Usuário acessa /video-prompts
   ↓
2. Seleciona fonte: "Meu Perfil" / "Tópico Customizado"
   ↓
3. Escolhe duração: 8s ou 16s
   ↓
4. Seleciona estilo visual (cinematic, realistic, meme, etc.)
   ↓
5. Opcionalmente adiciona diálogos (personagens falantes)
   ↓
6. Clica "Gerar Prompts"
   ↓
7. Backend chama AIService.generateVideoPrompt()
   ↓
8. Google Gemini gera prompt(s) otimizado(s)
   ↓
9. Se 8s: retorna 1 prompt
   Se 16s: retorna 2 prompts sequenciais
   ↓
10. Frontend exibe cards com prompts
   ↓
11. Usuário pode copiar ou abrir no Grok Video
```

### Fluxo 4: Visualizar Meu Perfil

```
1. Usuário acessa /my-profile
   ↓
2. Frontend chama useMyInstagram hook
   ↓
3. Hook busca conta conectada
   ↓
4. Faz requisições paralelas para:
   - /api/instagram/data/profile (dados básicos)
   - /api/instagram/data/media (posts e reels)
   - /api/instagram/data/insights (métricas - opcional)
   ↓
5. Frontend renderiza:
   - Card de perfil (avatar, nome, bio)
   - Estatísticas (posts, seguidores, seguindo)
   - Abas: "Todas Postagens" / "Reels"
   - Grid de posts com thumbnails e métricas
   ↓
6. Usuário pode clicar para ver no Instagram
```

### Fluxo 5: Adicionar e Analisar Perfil de Referência

```
1. Usuário adiciona perfil via Dashboard
   ↓
2. Backend valida e salva em ProfileStorage
   ↓
3. Job adicionado à fila de scraping (futuro)
   ↓
4. Scraper Service coleta dados (futuro)
   ↓
5. Dados salvos em arquivos JSON
   ↓
6. AI Service analisa conteúdo (futuro)
   ↓
7. Resultados salvos em AnalysisStorage
   ↓
8. Dashboard atualizado com insights
```

## 🔒 Segurança

### Autenticação e Autorização
- OAuth 2.0 para Instagram (padrão da indústria)
- Access tokens armazenados em arquivos JSON locais
- Tokens nunca expostos no frontend
- Variáveis sensíveis em .env (não commitadas)

### Proteção de Dados
- Access tokens devem ser criptografados em produção
- .env com credenciais do Instagram/Cloudinary/Gemini
- HTTPS obrigatório em produção
- CORS configurado apenas para domínios permitidos

### Rate Limiting
- Instagram Graph API: 200 calls/hour por token
- Google Gemini: 1,500 requests/dia (free tier)
- Cloudinary: 25GB bandwidth/mês (free tier)
- Backend pode implementar rate limiting por IP

### Validação de Uploads
- Formato de vídeo: MP4, MOV, AVI, MKV apenas
- Tamanho máximo: 50MB por arquivo
- Duração máxima: 30 segundos por vídeo
- Quantidade: Máximo 3 vídeos por upload
- Validação de malware (a implementar em produção)

## 📊 Monitoramento

### Logs
- Winston para logging estruturado
- Níveis: error, warn, info, debug
- Arquivo de log: logs/app-YYYY-MM-DD.log
- Rotação diária automática
- Console logs em desenvolvimento

### Métricas Disponíveis
- Tempo de resposta das APIs
- Taxa de sucesso de uploads
- Status de publicações no Instagram
- Uso de quotas (Gemini, Cloudinary)
- Erros de validação de vídeos

### Health Check
- Endpoint: GET /api/health
- Retorna status de serviços externos
- Verifica conectividade com Instagram API
- Monitora espaço em disco para uploads

## 🚀 Performance

### Otimizações Implementadas
- Armazenamento em arquivos JSON (leitura/escrita rápida)
- Processamento assíncrono de vídeos
- Compressão de respostas HTTP
- Lazy loading de posts no frontend
- Validação early-return (fail fast)
- Cache de dados do perfil (5 minutos)

### Processamento de Vídeo
- FFmpeg usa hardware acceleration quando disponível
- Merge de vídeos: ~1-5s (dependendo do hardware)
- Upload Cloudinary: ~5-15s (dependendo da internet)
- Instagram processing: ~10-60s (polling assíncrono)

### Considerações de Escalabilidade
- Sistema atual: Single-user ou small team
- Para multi-tenancy: migrar para banco de dados
- Para alto volume: implementar fila de jobs (Bull/Redis)
- Para produção: considerar CDN para frontend

## 🛠️ Desenvolvimento

### Requisitos do Sistema
- Node.js 18+ (backend e frontend)
- FFmpeg instalado e no PATH
- Conta Cloudinary (gratuita)
- Conta Google (para Gemini API - gratuito)
- Conta Meta Developer (para Instagram API)

### Execução Local
```bash
# Backend (Terminal 1)
cd backend
npm install
npm run dev
# Rodando em http://localhost:3000

# Frontend (Terminal 2)
cd frontend
npm install
npm run dev
# Rodando em http://localhost:5173
```

### Variáveis de Ambiente (.env)
```bash
# Backend
PORT=3000
NODE_ENV=development

# Google Gemini (gratuito)
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.5-flash

# Instagram API
INSTAGRAM_CLIENT_ID=264303...
INSTAGRAM_CLIENT_SECRET=d2959c...
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback

# Cloudinary (gratuito)
CLOUDINARY_CLOUD_NAME=dvpnialhc
CLOUDINARY_API_KEY=693413...
CLOUDINARY_API_SECRET=5ZhQsv...
```

### Estrutura de Código
- **TypeScript Strict Mode**: Habilitado para type safety
- **ESM Modules**: Uso de import/export (não require)
- **Async/Await**: Toda operação assíncrona usa async/await
- **Error Handling**: Try/catch em todos os controllers + middleware global
- **Logging**: Winston para logs estruturados em desenvolvimento e produção

### Testes
- Sistema de storage: 10/10 testes passando
- Controllers: Testados manualmente via scripts PowerShell
- Frontend: Testado em navegador (Chrome/Edge)
- Integração: Testada com Instagram/Cloudinary reais

### CI/CD
- Atualmente sem pipeline automatizado
- Para produção: GitHub Actions recomendado
- Deploy: Netlify (frontend) + Heroku/Railway (backend)
- Docker: Não utilizado no momento (simplicidade)

## 📦 Dependências Principais

### Backend
```json
{
  "express": "^4.18.2",           // Framework web
  "typescript": "^5.3.3",         // Type safety
  "winston": "^3.11.0",           // Logging
  "axios": "^1.6.5",              // HTTP client
  "multer": "^1.4.5-lts.1",       // File upload
  "fluent-ffmpeg": "^2.1.2",      // Video processing
  "cloudinary": "^2.0.0",         // CDN hosting
  "@google/generative-ai": "^0.1.3", // Gemini API
  "nanoid": "^5.1.6",             // ID generation
  "dotenv": "^16.3.1"             // Environment variables
}
```

### Frontend
```json
{
  "react": "^18.2.0",             // UI framework
  "react-router-dom": "^6.21.0",  // Routing
  "typescript": "^5.3.3",         // Type safety
  "vite": "^5.0.11",              // Build tool
  "axios": "^1.6.5"               // HTTP client
}
```

---

## 🎯 Roadmap de Features

### ✅ Implementado (Fase 1 - Completa)
- [x] Sistema de armazenamento JSON
- [x] Autenticação OAuth com Instagram
- [x] Visualização de perfil conectado
- [x] Busca de posts e reels
- [x] Geração de prompts para IA de vídeo
- [x] Upload e merge de vídeos
- [x] Publicação de reels no Instagram
- [x] Integração com Cloudinary
- [x] Processamento FFmpeg

### 🚧 Em Desenvolvimento (Fase 2)
- [ ] Análise de perfis com IA
- [ ] Geração de ideias de conteúdo
- [ ] Sistema de agendamento de posts
- [ ] Coleta de métricas pós-publicação

### 📋 Planejado (Fase 3)
- [ ] Scraping de perfis públicos
- [ ] Análise de tendências
- [ ] Dashboard de analytics avançado
- [ ] Múltiplas contas Instagram
- [ ] Autenticação de usuários (JWT)
- [ ] Sistema de templates de conteúdo

---

Esta arquitetura foi projetada para ser modular, escalável e fácil de manter, com foco em simplicidade e funcionalidades essenciais implementadas primeiro.

**Última Atualização:** 4 de Fevereiro de 2026
