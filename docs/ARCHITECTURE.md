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
/profiles           - Gerenciar perfis de referência
/analysis           - Resultados de análises
/content            - Gerador de conteúdo
/calendar           - Calendário de postagens
/settings           - Configurações
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
│   └── postController.ts
├── services/         # Lógica de negócio
│   ├── instagramService.ts
│   ├── aiService.ts
│   ├── scraperService.ts
│   └── publisherService.ts
├── models/           # Modelos de dados
│   ├── Profile.ts
│   ├── Analysis.ts
│   ├── Content.ts
│   └── Post.ts
├── routes/           # Definição de rotas
│   └── api.ts
├── middleware/       # Middlewares
│   ├── auth.ts
│   ├── rateLimiter.ts
│   └── errorHandler.ts
└── utils/            # Utilitários
    ├── logger.ts
    └── validators.ts
```

**Endpoints Principais**:

```
POST   /api/profiles              - Adicionar perfil de referência
GET    /api/profiles              - Listar perfis
GET    /api/profiles/:id          - Detalhes do perfil
DELETE /api/profiles/:id          - Remover perfil

POST   /api/analysis/start        - Iniciar análise
GET    /api/analysis/:id          - Obter análise
GET    /api/analysis/profile/:id  - Análises de um perfil

POST   /api/content/generate      - Gerar conteúdo
GET    /api/content               - Listar conteúdo gerado
PUT    /api/content/:id           - Editar conteúdo

POST   /api/posts/schedule        - Agendar postagem
GET    /api/posts                 - Listar postagens
GET    /api/posts/:id/stats       - Estatísticas da postagem
```

### 3. Instagram Scraper Service

**Tecnologia**: Node.js, Puppeteer

**Responsabilidades**:
- Coletar dados de perfis públicos do Instagram
- Extrair informações de reels
- Baixar metadados de posts
- Respeitar rate limits

**Fluxo de Coleta**:
```
1. Recebe URL do perfil
2. Navega até o perfil
3. Extrai informações básicas
4. Coleta lista de posts/reels
5. Para cada reel:
   - Extrai thumbnail
   - Coleta legenda
   - Obtém métricas
   - Extrai hashtags
6. Armazena no banco de dados
```

**Modelo de Dados**:
```typescript
interface ProfileData {
  username: string;
  fullName: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  profilePicUrl: string;
  isVerified: boolean;
  category?: string;
}

interface ReelData {
  id: string;
  profileId: string;
  url: string;
  caption: string;
  hashtags: string[];
  likes: number;
  comments: number;
  views: number;
  duration: number;
  thumbnail: string;
  postedAt: Date;
  musicName?: string;
}
```

### 4. AI Analysis Engine

**Tecnologia**: Python, OpenAI API, TensorFlow (opcional)

**Módulos**:

#### Content Analyzer
```python
class ContentAnalyzer:
    """Analisa conteúdo dos reels"""
    
    def analyze_caption(self, caption: str) -> dict:
        """Analisa a legenda usando NLP"""
        
    def extract_themes(self, reels: List[Reel]) -> List[str]:
        """Identifica temas recorrentes"""
        
    def analyze_engagement_patterns(self, reels: List[Reel]) -> dict:
        """Analisa padrões de engajamento"""
```

#### Trend Detector
```python
class TrendDetector:
    """Detecta tendências nos perfis"""
    
    def find_viral_patterns(self, reels: List[Reel]) -> dict:
        """Identifica padrões virais"""
        
    def analyze_hashtag_performance(self, reels: List[Reel]) -> dict:
        """Analisa performance de hashtags"""
```

#### Content Generator
```python
class ContentGenerator:
    """Gera ideias de conteúdo"""
    
    def generate_ideas(self, analysis: dict, count: int = 10) -> List[dict]:
        """Gera ideias baseadas na análise"""
        
    def create_script(self, idea: dict) -> str:
        """Cria roteiro para o reel"""
        
    def suggest_hashtags(self, idea: dict) -> List[str]:
        """Sugere hashtags relevantes"""
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

**Estrutura de Diretórios**:

```
data/
├── profiles/
│   ├── profile_123.json
│   └── profile_124.json
├── reels/
│   ├── reel_456.json
│   └── reel_457.json
├── analyses/
│   └── analysis_789.json
├── content/
│   └── content_101.json
├── posts/
│   └── post_202.json
└── index.json          # Índices para busca rápida
```

**Formato dos Arquivos**:

```javascript
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

// index.json - Índice para buscas rápidas
{
  "profiles": {
    "byUsername": {
      "perfil_referencia": "profile_123"
    },
    "byStatus": {
      "active": ["profile_123", "profile_124"]
    }
  },
  "lastUpdated": "2026-01-30T10:00:00Z"
}
```

### 7. Sistema de Filas (Em Memória)

**Filas Simples**:

```javascript
// Implementação com arrays em memória
const queues = {
  scraping: [],      // Jobs de coleta de dados
  analysis: [],      // Jobs de análise
  generation: [],    // Jobs de geração de conteúdo
  publishing: [],    // Jobs de publicação
  metrics: []        // Jobs de coleta de métricas
};

// Processamento com node-cron para tarefas agendadas
```

## 🔄 Fluxos de Trabalho

### Fluxo 1: Adicionar e Analisar Perfil

```
1. Usuário adiciona perfil via Dashboard
   ↓
2. Backend valida e salva em arquivo JSON
   ↓
3. Job adicionado à fila de scraping
   ↓
4. Scraper Service coleta dados
   ↓
5. Dados salvos em arquivos JSON
   ↓
6. Job adicionado à fila de análise
   ↓
7. AI Service analisa conteúdo
   ↓
8. Resultados salvos em arquivos JSON
   ↓
9. Dashboard atualizado com insights
```

### Fluxo 2: Gerar e Publicar Conteúdo

```
1. Usuário solicita geração de conteúdo
   ↓
2. Backend obtém análises de arquivos
   ↓
3. Job adicionado à fila de geração
   ↓
4. AI Service gera ideias e scripts
   ↓
5. Conteúdo salvo em JSON como 'draft'
   ↓
6. Usuário revisa e aprova no Dashboard
   ↓
7. Usuário agenda publicação
   ↓
8. Job adicionado à fila de publicação
   ↓
9. Publishing Service publica no Instagram
   ↓
10. Métricas coletadas e salvas em arquivo
```

## 🔒 Segurança

### Autenticação e Autorização
- JWT tokens para autenticação
- Refresh tokens para sessões longas
- Scopes de permissão para APIs

### Proteção de Dados
- Criptografia de credenciais (bcrypt)
- Variáveis sensíveis em environment variables
- HTTPS obrigatório em produção

### Rate Limiting
- Limite de requisições por IP
- Limite de jobs por usuário
- Respeito aos rate limits do Instagram

## 📊 Monitoramento

### Logs
- Winston para logging estruturado
- Níveis: error, warn, info, debug
- Rotação de logs diária

### Métricas
- Tempo de resposta das APIs
- Taxa de sucesso de scraping
- Performance da IA
- Status das filas

### Alertas
- Falhas críticas
- Rate limit atingido
- Erros de publicação

## 🚀 Performance

### Otimizações
- Cache em memória para análises recentes
- Processamento assíncrono de jobs
- Compressão de respostas
- Índices em arquivos JSON para busca rápida
- Lazy loading de dados no frontend

## 🛠️ Desenvolvimento

### Execução Local
```bash
# Backend
cd backend
npm run dev

# Frontend (em outro terminal)
cd frontend
npm run dev
```

### CI/CD
- Testes automatizados no GitHub Actions
- Build de produção simplificado
- Deploy via SCP/FTP ou serviços cloud

---

Esta arquitetura foi projetada para ser modular, escalável e fácil de manter.
