# InstaSearch - Analisador e Criador de Conteúdo Instagram com IA

## 📋 Visão Geral

InstaSearch é uma aplicação inteligente que analisa perfis do Instagram de referência e utiliza IA para criar conteúdo original inspirado nesses perfis. A aplicação automatiza o processo de pesquisa, análise e criação de conteúdo para Instagram.

## 🎯 Funcionalidades Principais

### 1. Publicação de Reels 🎥 (NOVO!)
- **Upload Múltiplo**: Envie 1-3 vídeos (MP4, MOV, AVI, MKV)
- **Merge de Vídeos**: Junte múltiplos vídeos em um único reel
- **Processamento FFmpeg**: 
  - Otimização automática para Instagram (1080x1920, 9:16)
  - Concatenação profissional com transições suaves
  - Frame rate 30fps, codec H.264
- **Upload Cloudinary**: CDN público para hospedagem temporária
- **Publicação Direta**: 
  - Integração com Instagram Graph API v18.0
  - Caption e hashtags customizáveis
  - Processamento assíncrono com feedback em tempo real
- **Interface Drag-and-Drop**: 
  - Arraste e solte vídeos
  - Preview com duração e tamanho
  - Workflow visual: upload → merge → publish

### 2. Geração de Prompts para Vídeo IA 🎬
- **Gerar Prompts Otimizados**: Crie prompts profissionais para ferramentas de IA de vídeo
  - Grok Video (https://grok.com/imagine)
  - Runway ML
  - Pika Labs
  - Outras ferramentas de geração de vídeo
- **Baseado em Contexto**:
  - Perfil Instagram conectado (bio, temas, público-alvo)
  - Ideias de conteúdo existentes
  - Tópicos customizados
- **Vídeos Curtos e Longos**:
  - 8 segundos: 1 prompt otimizado
  - 16 segundos: 2 prompts sequenciais com continuidade narrativa
- **10 Estilos Visuais**: Cinematic, Realistic, POV, Animated, Minimalist, Meme, Nonsense, Weird, Aesthetic, Satisfying
- **Diálogos/Falas**: Adicione personagens falantes
  - Especifique quem fala e o que fala
  - Perfeito para comidas falantes, objetos animados, narrativas
  - Timing customizável (início/meio/final)
- **Integração Direta**: Botão "Criar no Grok" com deep link + clipboard

### 3. Análise de Perfis de Referência
- **Coleta de Dados**: Busca e armazena informações de perfis do Instagram
- **Análise de Reels**: Analisa cada reel dos perfis de referência
  - Tema do conteúdo
  - Estilo visual
  - Tipo de edição
  - Duração média
  - Hashtags utilizadas
  - Engajamento (likes, comentários, visualizações)
- **Extração de Padrões**: Identifica padrões de sucesso nos conteúdos

### 4. Análise com IA
- **Análise de Conteúdo**: Compreende o tema e estilo dos posts
- **Reconhecimento de Tendências**: Identifica tendências nos perfis analisados
- **Análise de Engajamento**: Correlaciona características com performance
- **Extração de Insights**: Gera insights sobre o que funciona melhor

### 5. Geração de Conteúdo
- **Criação de Ideias**: Gera ideias de conteúdo baseadas nas análises
- **Geração de Scripts**: Cria roteiros para reels
- **Sugestão de Hashtags**: Recomenda hashtags relevantes
- **Agendamento**: Planeja calendário de postagens

### 6. Publicação Automatizada
- **Integração com Instagram**: Conecta com a API do Instagram
- **Postagem Automática**: Publica conteúdo na conta configurada
- **Monitoramento**: Acompanha performance das postagens

## 🏗️ Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │
│   (Dashboard)   │
└────────┬────────┘
         │
┌────────▼────────┐
│   Backend API   │
│   (Node.js)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───────┐ ┌──▼────────────┐
│ Instagram │ │  IA Engine    │
│Graph API  │ │Google Gemini  │
└───┬───────┘ └──┬────────────┘
    │            │
┌───▼────────────▼──────┐
│  Armazenamento        │
│  Sistema Arquivos     │
│     (JSON)            │
└───────────────────────┘
```

## � Documentação

- [Setup](docs/SETUP.md) - Configuração inicial do projeto
- [Arquitetura](docs/ARCHITECTURE.md) - Estrutura e design do sistema
- [API](docs/API.md) - Documentação completa da API- [Publicar Reels](docs/VIDEO_PUBLISH.md) - Sistema de upload/merge/publicação de vídeos ✨ NOVO- [Instagram - Início Rápido](docs/INSTAGRAM_QUICKSTART.md) - Como conectar sua conta Instagram
- [Instagram - Gerar Token](docs/GERAR_TOKEN_INSTAGRAM.md) - Passo a passo para gerar token
- [Instagram - Autenticação](docs/INSTAGRAM_AUTH.md) - Guia completo de OAuth

## �🛠️ Stack Tecnológica

### Backend
- **Node.js** com Express
- **TypeScript** para type safety
- **Sistema de arquivos** para armazenamento (JSON)
- **Node-cron** para agendamento de tarefas

### Frontend
- **React** com TypeScript
- **CSS puro** para estilização
- **Vite** como build tool

### IA e Análise
- **Google Gemini** para análise e geração de conteúdo (100% gratuito)
- **Instagram Graph API** para integração
- **FFmpeg** para processamento de vídeo
- **Cloudinary** para hospedagem de mídia (CDN)

## 📁 Estrutura do Projeto

```
InstaSearch/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   ├── instagram/
│   │   │   └── storage/
│   │   ├── models/
│   │   ├── routes/
│   │   └── utils/
│   ├── data/           # Armazenamento local (JSON)
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── styles/     # CSS puro
│   └── package.json
├── docs/
└── README.md
```

## 🚀 Começando

### Pré-requisitos
- Node.js 18+
- Conta Meta Developer (para Instagram API)
- Google Gemini API Key (100% gratuito)

### Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/InstaSearch.git
cd InstaSearch

# Instale as dependências do backend
cd backend
npm install

# Instale as dependências do frontend
cd ../frontend
npm install
```

### Configuração

1. Crie um arquivo `.env` na pasta `backend/`:
```env
PORT=3000
DATA_DIR=./data
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-1.5-flash
INSTAGRAM_CLIENT_ID=seu_client_id
INSTAGRAM_CLIENT_SECRET=seu_client_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
```

2. Configure as credenciais do Instagram no dashboard

### Executando

```bash
# Backend (em um terminal)
cd backend
npm run dev

# Frontend (em outro terminal)
cd frontend
npm run dev
```

## 📖 Documentação Adicional

- [Arquitetura Detalhada](./docs/ARCHITECTURE.md)
- [Guia de API](./docs/API.md)
- [Guia de Setup](./docs/SETUP.md)
- [Guia de Contribuição](./docs/CONTRIBUTING.md)

## 🔐 Segurança e Privacidade

- Todas as credenciais são armazenadas de forma segura
- Compliance com termos de uso do Instagram
- Dados criptografados em repouso
- Rate limiting implementado

## ⚠️ Avisos Legais

- Esta aplicação deve ser usada em conformidade com os Termos de Serviço do Instagram
- Respeite direitos autorais ao criar conteúdo inspirado em outros perfis
- O uso de automação deve seguir as diretrizes da plataforma

## 📈 Roadmap

### Fase 1 - MVP (✅ Completo)
- [✅] Sistema de análise de perfis
- [✅] Integração com Google Gemini (100% gratuito)
- [✅] Dashboard básico
- [✅] Análise de reels
- [✅] Geração de prompts para vídeo IA
- [✅] Upload e publicação de reels

### Fase 2
- [ ] Geração automática de legendas
- [ ] Sugestão de horários de postagem
- [ ] Análise de concorrentes
- [ ] Relatórios de performance

### Fase 3
- [ ] Suporte para múltiplas contas
- [ ] Geração de imagens com IA
- [ ] Integração com ferramentas de edição
- [ ] App mobile

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, leia o [Guia de Contribuição](./docs/CONTRIBUTING.md) antes de submeter PRs.

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](./LICENSE) para mais detalhes.

## 📧 Contato

Para dúvidas ou sugestões, abra uma issue no GitHub.

---

**Nota**: Esta aplicação é para fins educacionais e de pesquisa. Use com responsabilidade.
