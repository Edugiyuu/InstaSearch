# Guia de Setup - InstaSearch

Este guia irá ajudá-lo a configurar o ambiente de desenvolvimento completo do InstaSearch.

## 📋 Pré-requisitos

### Software Necessário

1. **Node.js** (v18 ou superior)
   - Download: https://nodejs.org/
   - Verifique: `node --version`

2. **Git**
   - Download: https://git-scm.com/
   - Verifique: `git --version`

### Contas e APIs Necessárias

1. **Meta Developer Account**
   - Acesse: https://developers.facebook.com/
   - Crie uma conta
   - Crie um App

2. **OpenAI API**
   - Acesse: https://platform.openai.com/
   - Crie uma conta
   - Gere uma API key

3. **Conta Instagram**
   - Crie uma conta específica para o bot
   - Converta para conta Business/Creator
   - Conecte ao Facebook Page

## 🚀 Setup Passo a Passo

### 1. Clone o Repositório

```bash
git clone https://github.com/seu-usuario/InstaSearch.git
cd InstaSearch
```

### 2. Configure o Backend

```bash
cd backend

# Instale as dependências
npm install

# Crie o arquivo .env
copy .env.example .env

# Edite o arquivo .env com suas credenciais
notepad .env
```

**Conteúdo do .env**:

```env
# Server
PORT=3000
NODE_ENV=development

# Storage
DATA_DIR=./data

# OpenAI
OPENAI_API_KEY=sk-sua-chave-aqui
OPENAI_MODEL=gpt-4-turbo-preview

# Instagram API
INSTAGRAM_APP_ID=seu-app-id
INSTAGRAM_APP_SECRET=seu-app-secret
INSTAGRAM_ACCESS_TOKEN=seu-token-de-acesso

# JWT
JWT_SECRET=seu-segredo-jwt-super-secreto
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Scraping
SCRAPER_USER_AGENT=Mozilla/5.0 (Windows NT 10.0; Win64; x64)
SCRAPER_DELAY_MS=2000
SCRAPER_MAX_RETRIES=3

# Logging
LOG_LEVEL=debug
```

```bash
# Inicie o servidor em modo desenvolvimento
npm run dev
```

O backend estará rodando em `http://localhost:3000`

**Nota**: Na primeira execução, as pastas de dados serão criadas automaticamente em `./data/`

### 3. Configure o Frontend

```bash
cd ../frontend

# Instale as dependências
npm install

# Crie o arquivo .env
copy .env.example .env

# Edite o arquivo .env
notepad .env
```

**Conteúdo do .env**:

```env
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=InstaSearch
```

```bash
# Inicie o servidor de desenvolvimento
npm run dev
```

O frontend estará rodando em `http://localhost:5173`

### 4. Configure as Credenciais do Instagram

#### 7.1. Crie um App no Meta Developer

1. Acesse https://developers.facebook.com/apps/
2. Clique em "Create App"
3. Escolha "Business" como tipo
4. Preencha os detalhes do app
5. Adicione o produto "Instagram Basic Display" ou "Instagram Graph API"

#### 7.2. Configure o Instagram Graph API

1. No painel do app, vá em "Instagram Graph API"
2. Configure o redirect URI: `http://localhost:3000/auth/instagram/callback`
3. Adicione permissões necessárias:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_manage_posts`

#### 7.3. Conecte sua conta Instagram

1. Vincule sua página do Facebook ao app
2. Vincule sua conta Instagram à página do Facebook
3. Gere o Access Token

**No Dashboard do InstaSearch**:

1. Acesse `http://localhost:5173/settings`
2. Clique em "Connect Instagram Account"
3. Siga o fluxo de autorização
4. O token será salvo automaticamente

## 🧪 Teste a Instalação

### 1. Teste o Backend

```bash
cd backend

# Execute os testes
npm test

# Teste um endpoint manualmente
curl http://localhost:3000/api/health
# Resposta esperada: {"status":"ok"}
```

### 2. Teste o Frontend

```bash
cd frontend

# Execute os testes
npm test

# Acesse no navegador
# http://localhost:5173
```

### 3. Teste o AI Engine

```bash
cd ai-engine

# Execute os testes
python -m pytest tests/

# Teste manualmente
python test_connection.py
```

### 4. Teste o Fluxo Completo

1. Acesse o Dashboard: `http://localhost:5173`
2. Adicione um perfil de referência
3. Aguarde a análise completar
4. Gere conteúdo baseado na análise
5. Visualize as sugestões

## 🐛 Troubleshooting

### Problema: Pasta de dados não é criada

**Solução**:
```bash
# Crie manualmente as pastas necessárias
cd backend
mkdir data
cd data
mkdir profiles reels analyses content posts
```

### Problema: Erro ao ler/escrever arquivos

**Solução**:
1. Verifique permissões da pasta `data/`
2. Confirme que DATA_DIR está correto no .env
3. Verifique se há espaço em disco

### Problema: Erro de autenticação Instagram

**Solução**:
1. Verifique se o App ID e Secret estão corretos
2. Confirme que a conta está em Business mode
3. Verifique se o Access Token não expirou
4. Regenere o token se necessário

### Problema: OpenAI API retorna erro

**Solução**:
1. Verifique se a API key está correta
2. Confirme que há créditos na conta
3. Verifique rate limits
4. Use modelo alternativo (gpt-3.5-turbo) se necessário

### Problema: Frontend não carrega

**Solução**:
```bash
# Limpe o cache
npm run clean

# Reinstale dependências
rm -rf node_modules
npm install

# Tente em modo verbose
npm run dev -- --debug
```

### Problema: Scraper não funciona

**Solução**:
1. Verifique se o perfil é público
2. Aumente o delay entre requisições
3. Use proxy se necessário
4. Verifique logs de erro detalhados

## 🔧 Configurações Avançadas

### Usar Proxy para Scraping

No arquivo `backend/.env`:
```env
PROXY_HOST=seu-proxy.com
PROXY_PORT=8080
PROXY_USERNAME=usuario
PROXY_PASSWORD=senha
```

### Configurar Webhooks

Para receber notificações do Instagram:

1. Configure um domínio público (use ngrok para desenvolvimento)
2. No Meta App, configure o Webhook URL
3. Adicione no `backend/.env`:
```env
WEBHOOK_VERIFY_TOKEN=seu-token-de-verificacao
```

### Backup dos Dados

```bash
# Faça backup da pasta de dados regularmente
cp -r backend/data backend/data-backup-$(date +%Y%m%d)

# Ou use o comando do Windows:
xcopy backend\data backend\data-backup-%date:~-4,4%%date:~-7,2%%date:~-10,2% /E /I
```

## 📚 Próximos Passos

Agora que o ambiente está configurado:

1. Leia a [Documentação da API](./API.md)
2. Explore a [Arquitetura](./ARCHITECTURE.md)
3. Contribua lendo o [Guia de Contribuição](./CONTRIBUTING.md)

## 💡 Dicas de Desenvolvimento

### Hot Reload

Todos os serviços suportam hot reload:
- Backend: Usa `nodemon`
- Frontend: Vite hot reload automático
- AI Engine: Usa `watchdog` (se configurado)

### Debugging

#### VS Code Launch Configuration

Crie `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Backend",
      "skipFiles": ["<node_internals>/**"],
      "program": "${workspaceFolder}/backend/src/index.ts",
      "preLaunchTask": "npm: dev",
      "outFiles": ["${workspaceFolder}/backend/dist/**/*.js"]
    }
  ]
}
```

### Logs

- Backend: `backend/logs/`
- Dados: `backend/data/` (arquivos JSON)

## 🆘 Suporte

Se encontrar problemas:

1. Verifique os logs
2. Consulte a seção de Troubleshooting
3. Abra uma issue no GitHub
4. Entre em contato com a equipe

---

**Pronto! Seu ambiente está configurado e você está pronto para desenvolver! 🎉**
