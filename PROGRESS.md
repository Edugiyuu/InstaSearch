# 📋 InstaSearch - Progresso do Projeto

**Última Atualização:** 2 de Fevereiro de 2026

## 🎯 Objetivo do Projeto
Criar uma aplicação para analisar perfis de referência do Instagram, estudar seus reels, e usar IA para gerar conteúdo baseado nas análises.

## ✅ Concluído

### 1. Documentação (100%)
- [x] README.md com visão geral do projeto
- [x] ARCHITECTURE.md com arquitetura local (JSON storage)
- [x] SETUP.md com guia de instalação
- [x] API.md com documentação de endpoints
- [x] API_ROUTES.md com lista de rotas
- [x] docs/INSTAGRAM_AUTH.md com guia de autenticação OAuth
- [x] docs/INSTAGRAM_QUICKSTART.md com guia rápido de conexão
- [x] docs/GERAR_TOKEN_INSTAGRAM.md com passo a passo para gerar token
- [x] docs/FIX_INSTAGRAM_ERROR.md com troubleshooting

### 2. Frontend (100%)
- [x] **Estrutura:** Vite + React 18 + TypeScript
- [x] **Roteamento:** React Router com 6 páginas
- [x] **Componentes:**
  - Layout principal com Navbar e Sidebar
  - Dashboard (página inicial)
  - Profiles (gerenciar perfis do Instagram)
  - Analysis (visualizar análises)
  - Content (conteúdo gerado)
  - Calendar (agenda de postagens)
  - Settings (configurações + conexão Instagram)
- [x] **Hooks Customizados:**
  - useProfiles, useAnalysis, useContent, usePosts, useDashboard
  - useInstagram (gerenciar conexão OAuth)
- [x] **Estilos:** CSS puro com variáveis (sem Tailwind)
- [x] **Status:** Rodando em http://localhost:5173

### 3. Backend - Storage System (100%)
- [x] **Sistema de Storage Completo:**
  - FileStorage.ts (base class)
  - ProfileStorage.ts (perfis)
  - ReelStorage.ts (reels)
  - AnalysisStorage.ts (análises)
  - ContentStorage.ts (conteúdo gerado)
  - PostStorage.ts (postagens)
  - UserStorage.ts (usuários)
  - InstagramAccountStorage.ts (contas conectadas)
- [x] **Testes:** 10/10 testes passando
- [x] **Armazenamento:** JSON em data/ directory

### 4. Backend - API Express (100%)
- [x] **Server Setup:**
  - Express configurado com TypeScript
  - CORS habilitado
  - Logger com Winston
  - Error handler middleware
  - Dotenv para variáveis de ambiente
- [x] **Controllers Implementados:**
  - profileController.ts (6 endpoints)
  - analysisController.ts (5 endpoints)
  - contentController.ts (7 endpoints)
  - postController.ts (7 endpoints)
  - dashboardController.ts (2 endpoints)
  - instagramAuthController.ts (5 endpoints OAuth)
  - instagramTokenController.ts (1 endpoint - conexão manual)
  - instagramDataController.ts (8 endpoints - Graph API)
- [x] **Rotas Funcionando:**
  - Health check: /api/health
  - Dashboard: /api/dashboard/overview
  - Profiles: /api/profiles (GET, POST, DELETE)
  - Analysis: /api/analysis (GET, POST)
  - Content: /api/content (GET, POST, PUT, DELETE)
  - Posts: /api/posts (GET, POST, PUT, DELETE)
  - Instagram Auth: /api/instagram/* (OAuth + gerenciamento)
  - Instagram Data: /api/instagram/data/* (Graph API - 8 rotas)
- [x] **Status:** Rodando em http://localhost:3000

### 5. Instagram OAuth Authentication (100%)
- [x] **Service de Autenticação:**
  - Geração de URL de autorização
  - Exchange de código por token
  - Renovação automática de tokens
  - Busca de dados do perfil
  - Conexão via token manual (nova funcionalidade)
- [x] **Endpoints:**
  - GET /api/instagram/auth-url (gerar URL OAuth)
  - GET /api/instagram/callback (receber callback)
  - POST /api/instagram/connect-token (conectar com token manual)
  - GET /api/instagram/account (buscar conta conectada)
  - DELETE /api/instagram/account (desconectar)
  - POST /api/instagram/account/refresh (atualizar dados)
- [x] **Frontend:**
  - Hook useInstagram completo
  - Interface na página Settings com modal
  - Display de perfil com avatar e métricas
  - Botões de conectar/desconectar/atualizar
  - Modal para input de token manual
- [x] **Documentação:** 
  - docs/INSTAGRAM_AUTH.md (guia completo OAuth)
  - docs/INSTAGRAM_QUICKSTART.md (guia rápido)
  - docs/GERAR_TOKEN_INSTAGRAM.md (gerar token)
  - docs/FIX_INSTAGRAM_ERROR.md (troubleshooting)

### 6. Instagram Graph Service (100%)
- [x] **Service de Dados:**
  - InstagramGraphService completo usando Facebook Graph API v18.0
  - Buscar dados do perfil (seguidores, posts, etc.)
  - Buscar lista de posts/reels
  - Buscar métricas de cada post (likes, comments, views)
  - Buscar informações detalhadas de reels
  - Buscar comentários e hashtags
  - Buscar insights da conta (opcional)
- [x] **Endpoints da Graph API:**
  - GET /api/instagram/data/profile (dados do perfil)
  - GET /api/instagram/data/media (lista de posts/reels)
  - GET /api/instagram/data/reels (apenas reels)
  - GET /api/instagram/data/media/:id (detalhes de um post)
  - GET /api/instagram/data/media/:id/insights (métricas)
  - GET /api/instagram/data/media/:id/comments (comentários)
  - GET /api/instagram/data/media/:id/hashtags (hashtags)
  - GET /api/instagram/data/insights (insights da conta)
- [x] **Controller:**
  - instagramDataController.ts com 8 endpoints
- [x] **Correções Implementadas:**
  - Migração de graph.instagram.com para graph.facebook.com/v18.0
  - Uso correto do accountId nas requisições
  - Tratamento de insights como dados opcionais

### 7. Models & Types (100%)
- [x] TypeScript interfaces completas para:
  - Profile, Reel, Analysis, Content, Post, User
  - InstagramAccount (nova)
- [x] ID Generator com prefixos (nanoid)

### 8. Página "Meu Perfil" (100%)
- [x] **Hook useMyInstagram:**
  - Buscar perfil conectado
  - Buscar todas as postagens
  - Buscar apenas reels
  - Buscar insights da conta (opcional)
  - Buscar insights de posts individuais
  - Tratamento de erros robusto
- [x] **Página MyProfile.tsx:**
  - Card de perfil com avatar, nome, bio, website
  - Estatísticas (posts, seguidores, seguindo)
  - Card de insights (quando disponível)
  - Abas para filtrar: Todas Postagens / Reels
  - Grid responsivo de posts com thumbnails
  - Exibição de métricas (likes, comentários)
  - Links para ver posts no Instagram
  - Botão de atualizar dados
- [x] **Estilos MyProfile.css:**
  - Design moderno e responsivo
  - Grid adaptável para diferentes telas
  - Animações e efeitos hover
  - Badges de tipo de mídia
- [x] **Integração:**
  - Rota /my-profile no App.tsx
  - Link "📱 Meu Perfil" no Sidebar
  - Funcionamento completo com API do Instagram

### 9. Limpeza e Organização de Código (100%)
- [x] **Arquivos Removidos:**
  - backend/src/test-storage.ts (175 linhas)
- [x] **Reorganização:**
  - Scripts movidos para backend/scripts/
  - add-token.js, test-api.ps1, test-routes.ps1
- [x] **Imports Otimizados:**
  - Removido useEffect não utilizado em useMyInstagram
  - Corrigido import path em App.tsx
  - Limpeza de código não utilizado

### 10. Sistema de Publicação de Vídeos/Reels (100%) ✨ NOVO
- [x] **Backend - VideoService:**
  - videoService.ts com validação, merge e otimização
  - Validação de formato, tamanho (50MB) e duração (30s)
  - Merge de vídeos com FFmpeg (concat demuxer)
  - Otimização automática (1080x1920, 30fps, libx264)
  - Deleção segura de arquivos temporários
- [x] **Backend - VideoController:**
  - Upload de 1-3 vídeos (multer middleware)
  - Merge de múltiplos vídeos
  - Upload para Cloudinary (CDN público)
  - Publicação de reels via Instagram Graph API v18.0
  - Polling de status de processamento
  - Endpoints: POST /api/videos/upload, merge, publish-reel, DELETE /:filename
- [x] **Frontend - VideoPublish:**
  - Página VideoPublish.tsx com drag-and-drop
  - Upload de arquivos com preview de duração/tamanho
  - Workflow: upload → merge (opcional) → publish
  - Formulário de caption e hashtags
  - Loading states e feedback visual
  - Estilos responsivos (VideoPublish.css)
- [x] **Frontend - Hook useVideoPublish:**
  - Gerenciamento de estado completo
  - uploadVideos(), mergeVideos(), publishReel()
  - Computed properties: needsMerge, canPublish, totalDuration
  - Tratamento de erros robusto
- [x] **Integração Cloudinary:**
  - Upload de vídeos para CDN público
  - Transformações automáticas (crop, quality)
  - Configuração via variáveis de ambiente
- [x] **FFmpeg Integration:**
  - Processamento profissional de vídeo
  - Concatenação sequencial de múltiplos vídeos
  - Output otimizado para Instagram (9:16 aspect ratio)
- [x] **Routing e Navegação:**
  - Rota /video-publish em App.tsx
  - Link "🎥 Publicar Reel" no Sidebar
- [x] **Documentação:**
  - docs/VIDEO_PUBLISH.md (guia completo)
  - docs/API.md atualizado (4 novos endpoints)

## 🚧 Em Andamento

### **FASE ATUAL: Geração de Prompts para IA de Vídeo**
**Iniciado em:** 3 de Fevereiro de 2026

Implementação de sistema para gerar prompts otimizados para ferramentas de IA de vídeo (Grok Video, Runway, etc.):

#### 📋 Decisões Tomadas:
- ✅ **Abordagem escolhida:** Gerar prompts otimizados ao invés de integração direta com APIs de vídeo
- ✅ **Razão:** APIs de vídeo (Runway, Pika) são caras ($95-500/mês) e complexas
- ✅ **Ferramenta alvo:** Grok Video (https://grok.com/imagine)
- ✅ **Limitação do Grok:** Gera vídeos de 7-8 segundos por prompt
- ✅ **Solução para vídeos longos:** Gerar 2 prompts sequenciais com continuidade narrativa (total 16s)
- ✅ **Integração:** Deep link com parâmetros OU fallback clipboard + auto-open

#### 🎯 Funcionalidades a Implementar:
- [x] Método `generateVideoPrompt()` no AIService (Google Gemini) ✅
  - Gerar 1 prompt para vídeos de 8s
  - Gerar 2 prompts sequenciais (Parte 1 + Parte 2) para vídeos de 16s
  - Baseado no perfil Instagram conectado OU tópico customizado
  - Especificações técnicas: 9:16 aspect ratio, 8 estilos visuais
  - Sistema de diálogos/falas para personagens falantes
- [x] Tipos TypeScript para diálogos (interface Dialogue) ✅
- [x] Controller e endpoint `/api/video-prompts/generate` ✅
- [x] Página "Video Prompts" no frontend ✅
  - Opções: "Meu Perfil", "Ideia de Conteúdo", "Tópico Customizado"
  - Seletor de duração: 8s ou 16s
  - Seletor de estilo: 8 estilos disponíveis
  - Inputs dinâmicos para adicionar diálogos (quem fala + o que fala)
  - Botão "🚀 Criar no Grok" (deep link + fallback clipboard)
  - Cards com prompts gerados e botão copiar
- [x] Integração com página Content ✅
  - Botão "🎬 Gerar Prompt de Vídeo" em cada ideia
  - Redireciona para Video Prompts com contexto pré-preenchido
- [x] Documentação atualizada (VIDEO_PROMPTS.md com exemplos de diálogos) ✅

#### 🎯 Próximos Passos:
- [ ] Implementar AIService completo para análise de perfis
- [ ] Integrar análise de reels com IA
- [ ] Geração de conteúdo/ideias com IA
- [ ] Sistema de agendamento de postagens

## 📝 Pendente

### 10. Serviço de IA (Google Gemini) - EM PROGRESSO
- [x] Integração com Google Gemini API (100% gratuito) ✅
- [x] docs/GEMINI_SETUP.md criado ✅
- [ ] **PRÓXIMO:** Método `generateVideoPrompt()` para prompts de vídeo
- [ ] AIService.ts completo para análise de perfis
- [ ] Análise de padrões em reels
- [ ] Geração de insights
- [ ] Geração de sugestões de conteúdo
- [ ]2. Publishing Service (FUTURO)
- [ ] Sistema de fila com node-cron
- [ ] Publicação automática no Instagram
- [ ] Webhook para atualizar métricas
- [ ] Notificações de status

### 13Suporte para vídeos de 8s (1 prompt) e 16s (2 prompts sequenciais)
- [ ] Integração com página Content
- [ ] Documentação completa (API.md, README.md)

### 11. Publishing Service
- [ ] Sistema de fila com node-cron
- [ ] Publicação automática no Instagram
- [ ] Webhook para atualizar métricas
- [ ] Notificações de status

### 12. Melhorias Futuras
- [ ] Autenticação de usuários (JWT)
- [ ] Middleware de autenticação
- [ ] Testes automatizados (Jest/Vitest)
- [ ] Deploy (Netlify/Vercel)
- [ ] CI/CD pipeline

## 🗂️ Estrutura de Pastas

```
InstaSearch/
├── frontend/                    ✅ COMPLETO
│   ├── src/
│   │   ├── components/         (Layout, Navbar, Sidebar)
│   │   ├── hooks/              (7 hooks customizados)
│   │   ├── pages/              (7 páginas + MyProfile)
│   │   ├── styles/             (CSS)
│   │   └── App.tsx
│   └── package.json
│
├── backend/                     ✅ COMPLETO
│   ├── src/
│   │   ├── controllers/        (8 controllers)
│   │   ├── middleware/         (errorHandler)
│   │   ├── models/             (TypeScript types)
│   │   ├── routes/             (api.ts)
│   │   ├── services/           (Instagram Auth & Graph)
│   │   ├── services/storage/   (8 storage classes)
│   │   ├── utils/              (logger, idGenerator)
│   │   └── index.ts
│   ├── data/                   (JSON storage)
│   ├── logs/                   (Winston logs)
│   ├── scripts/                (utilitários de teste)
│   └── package.json
│
└── docs/                        ✅ COMPLETO
    ├── ARCHITECTURE.md
    ├── SETUP.md
    ├── API.md
    ├── INSTAGRAM_AUTH.md
    ├── INSTAGRAM_QUICKSTART.md
    ├── GERAR_TOKEN_INSTAGRAM.md
    └── FIX_INSTAGRAM_ERROR.md
```

## 🔧 Tech Stack

**Frontend:**
- React 18.2.0
- TypeScript 5.3.3
- Vite 5.0.11
- React Router 6.21.0
- Axios 1.6.5
- CSS puro

**Backend:**
- Node.js + Express 4.18.2
- TypeScript 5.3.3
- Winston (logging)
- Google Gemini API (IA gratuita)
- Node-cron 3.0.3
- Nanoid 5.1.6

**Storage:**
- JSON file-based system
- Sem banco de dados
- Sem Docker/MongoDB


- **Total de Arquivos:** ~60 arquivos de produção
- **Linhas de Código:** ~6000+ linhas (após limpeza)
- **Endpoints da API:** 41 rotas
- **Componentes React:** 9 componentes
- **Páginas:** 7 páginas (Dashboard, Profiles, Analysis, Content, Calendar, Settings, MyProfile)
- **Storage Classes:** 8 classes
- **Hooks Customizados:** 7 hooks
- **Documentação:** 7 arquivos markdown
- **Scripts Utilitários:** 3 arquivos (organizados em /scripts)
- **Documentação:** 7 arquivos markdown

## 🎯 Próxima Implementação

**Foco:** Sistema de Geração de Prompts para Vídeo IA
**Arquivos a Criar/Modificar:**

### Backend:
1. `backend/src/services/aiService.ts` - Adicionar método `generateVideoPrompt()`
2. `backend/src/controllers/videoPromptController.ts` - Controller para prompts de vídeo
3. `backend/src/routes/api.ts` - Registrar rota `/api/video-prompts/generate`

### Frontend:
4. `frontend/src/pages/VideoPrompts.tsx` - Página de geração de prompts
5. `frontend/src/pages/VideoPrompts.css` - Estilos da página
6. `frontend/src/hooks/useVideoPrompts.ts` - Hook para chamar API
7. `frontend/src/pages/Content.tsx` - Adicionar botão "🎬 Gerar Prompt"
8. `frontend/src/components/Sidebar.tsx` - Link "🎬 Video Prompts"
9. `frontend/src/App.tsx` - Rota `/video-prompts`

### Documentação:
10. `docs/VIDEO_PROMPTS.md` - Guia sobre geração de prompts (Grok, limitações, etc.)
11. `docs/API.md` - Documentar endpoint `/api/video-prompts/generate`
12. `README.md` - Adicionar feature "Geração de Prompts para IA de Vídeo"

**Objetivos:**
- ✅ Gerar prompts otimizados para Grok Video usando Google Gemini (gratuito)
- ✅ Suporte para vídeos de 8s (1 prompt) e 16s (2 prompts sequenciais)
- ✅ Baseado em perfil Instagram conectado OU tópicos customizados
- ✅ Integração com deep link/clipboard para Grok
- ✅ Botão na página Content para gerar prompts de ideias existentes
- ✅ 100% gratuito (apenas usa Gemini API - 1,500 requests/dia)
## 📝 Últimas Atualizações

### **4 de Fevereiro de 2026** - Sistema de Publicação de Vídeos/Reels Completo ✨

**Implementação Completa:**
1. **Backend - Processamento de Vídeo:**
   - VideoService.ts: validação, merge (FFmpeg), otimização (1080x1920, 30fps)
   - VideoController.ts: upload (multer), merge, publish, delete
   - Cloudinary integration: upload automático para CDN público
   - Instagram Graph API: publicação de reels com polling de status
   
2. **Frontend - Interface de Upload:**
   - VideoPublish.tsx: página completa com drag-and-drop
   - VideoPublish.css: estilos responsivos e modernos
   - useVideoPublish.ts: hook com gerenciamento de estado
   - Workflow: upload → merge (opcional para 2-3 vídeos) → publish
   
3. **Features Implementadas:**
   - ✅ Upload de 1-3 vídeos (MP4, MOV, AVI, MKV)
   - ✅ Validação: formato, tamanho (50MB), duração (30s)
   - ✅ Merge de múltiplos vídeos com FFmpeg
   - ✅ Otimização automática para Instagram (9:16)
   - ✅ Upload para Cloudinary (URL pública)
   - ✅ Publicação direta no Instagram como Reel
   - ✅ Caption e hashtags customizáveis
   - ✅ Feedback visual (loading, success, error)
   
4. **Arquivos Criados/Modificados:**
   - `backend/src/services/videoService.ts` (230 linhas)
   - `backend/src/controllers/videoController.ts` (340 linhas)
   - `backend/src/routes/api.ts` (4 novas rotas)
   - `frontend/src/pages/VideoPublish.tsx` (250 linhas)
   - `frontend/src/pages/VideoPublish.css` (380 linhas)
   - `frontend/src/hooks/useVideoPublish.ts` (180 linhas)
   - `frontend/src/App.tsx` (rota /video-publish)
   - `frontend/src/components/Sidebar.tsx` (link "🎥 Publicar Reel")
   - `docs/VIDEO_PUBLISH.md` (documentação completa)
   - `docs/API.md` (4 novos endpoints documentados)

5. **Dependências Instaladas:**
   - fluent-ffmpeg + @types/fluent-ffmpeg
   - multer + @types/multer
   - form-data
   - cloudinary

**Status:** Sistema 100% funcional e testado com sucesso!

---

### **3 de Fevereiro de 2026** - Planejamento de Geração de Prompts de Vídeo IA

**Discussão e Decisões:**
1. **Pesquisa de APIs de Vídeo IA:**
   - Analisadas: Runway ML, Stability AI, Google Veo 3.1, Replicate, Grok
   - Conclusão: Nenhuma API realmente gratuita, custos de $95-500/mês + $0.10-0.50/vídeo
   - Grok tem ferramenta de vídeo mas sem API pública

2. **Decisão Final:**
   - **Não integrar** diretamente com APIs de vídeo (custo-benefício ruim)
   - **Gerar prompts otimizados** para usuário criar vídeos manualmente em ferramentas IA
   - Foco em Grok Video (https://grok.com/imagine)

3. **Especificações do Sistema:**
   - Grok gera vídeos de 7-8 segundos por prompt
   - Para vídeos de 16s: 2 prompts sequenciais com continuidade narrativa
   - Integração: Deep link `https://grok.com/imagine?prompt=...` OU clipboard + auto-open
   - Prompts baseados em: perfil Instagram conectado, ideias de conteúdo, ou tópicos customizados

4. **Próxima Implementação:**
   - Método `generateVideoPrompt()` no AIService usando Google Gemini
   - Endpoint `/api/video-prompts/generate`
   - Página VideoPrompts.tsx com formulário e integração Grok
   - Botão "🎬 Gerar Prompt de Vídeo" na página Content

---

### **2 de Fevereiro de 2026** - Infraestrutura Base Completa

### ✅ Implementado:
1. **Nova Página "Meu Perfil":**
   - Visualização completa do perfil conectado
   - Grid de posts e reels com filtros
   - Card de insights (quando disponível)
   - Interface responsiva e moderna

2. **Correções na API do Instagram:**
   - Migração para Facebook Graph API v18.0
   - Correção no uso do accountId
   - Insights tratados como opcionais

3. **Hook useMyInstagram:**
   - Gerenciamento de estado robusto
   - Tratamento de erros melhorado
   - Suporte a Promise.allSettled
Limpeza e Organização:**
   - Removido backend/src/test-storage.ts (175 linhas)
   - Scripts movidos para backend/scripts/
   - Imports otimizados (removido useEffect não utilizado)
   - Corrigido import path inconsistente em App.tsx
   - Código 100% limpo e sem código morto

5. **Arquivos Criados/Modificados:**
   - `frontend/src/hooks/useMyInstagram.ts`
   - `frontend/src/pages/MyProfile.tsx`
   - `frontend/src/pages/MyProfile.css`
   - `frontend/src/App.tsx`
   - `backend/src/services/instagramGraphService.ts`
   - `backend/src/controllers/instagramDataController.ts`
   - `backend/src/controllers/instagramAuthController.ts`
   - `backend/src/services/instagramAuthService.ts`

---

**Notas:**
- Backend rodando em http://localhost:3000
- Frontend rodando em http://localhost:5173
- Proxy configurado no Vite para /api -> http://localhost:3000
- Instagram conectado e funcionando via token manual
- Página "Meu Perfil" exibindo posts e reels corretamente
- Código limpo e organizado, pronto para implementação de IA
- Proxy configurado no Vite para /api -> http://localhost:3000
