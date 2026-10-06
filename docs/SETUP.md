# Instalação e Configuração

Objetivo: do zero ao primeiro Reel publicado em menos de 30 minutos.

## 1. Pré-requisitos

| Item | Versão / observação | Verificar |
|---|---|---|
| Node.js | 20 ou superior | `node -v` |
| npm | vem com o Node | `npm -v` |
| FFmpeg + ffprobe | no PATH. No Windows, use a build *full* do [gyan.dev](https://www.gyan.dev/ffmpeg/builds/) | `ffmpeg -version` |
| Git | qualquer versão recente | `git --version` |

Contas necessárias (todas com opção gratuita):

| Serviço | Para quê | Onde |
|---|---|---|
| Meta for Developers | Conectar e publicar no Instagram | [developers.facebook.com](https://developers.facebook.com/) |
| Google AI Studio | Chave do Gemini (legendas e análises) | [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) |
| Cloudinary | URL pública temporária do vídeo para a publicação | [cloudinary.com](https://cloudinary.com/users/register_free) |

### Instalando o FFmpeg

```bash
# Windows (winget)
winget install Gyan.FFmpeg

# macOS
brew install ffmpeg

# Debian/Ubuntu
sudo apt install ffmpeg
```

Feche e reabra o terminal depois de instalar para atualizar o PATH.

## 2. Clonar e instalar

```bash
git clone https://github.com/Edugiyuu/InstaSearch.git
cd InstaSearch
cd backend && npm install
cd ../frontend && npm install
```

## 3. Variáveis de ambiente

### Backend: `backend/.env`

```bash
cd backend
cp .env.example .env
```

| Variável | Obrigatória | Descrição |
|---|---|---|
| `PORT` | não (padrão `3000`) | Porta da API |
| `NODE_ENV` | não | `development` mostra detalhes de erro nas respostas |
| `LOG_LEVEL` | não (padrão `info`) | Nível de log do Winston |
| `GEMINI_API_KEY` | **sim**, para recursos de IA (ou uma das reservas abaixo) | Chave do Google AI Studio |
| `GEMINI_MODEL` | não (padrão `gemini-2.5-flash`) | Modelo usado. Confira os nomes atuais na [documentação do Gemini](https://ai.google.dev/gemini-api/docs/models) |
| `ANTHROPIC_API_KEY` | não | Claude Sonnet 5.5 pela API (pago por uso) como reserva do Gemini. Ver [AI.md](AI.md) |
| `CLAUDE_CODE` | não (padrão `off`) | `on` usa o Claude Code logado com o seu plano Pro/Max (Sonnet 5.5) como reserva. Ver [AI.md](AI.md#usando-o-claude-code-com-o-plano-promax) |
| `CLAUDE_CODE_PATH` | não | Caminho do `claude` se ele não estiver no PATH |
| `SERPER_API_KEY` | não | Inclui resultados do Google Imagens nas sugestões da tela "Trocar imagem" ([serper.dev](https://serper.dev), 2.500 buscas grátis). Sem ela, as sugestões vêm do Bing Imagens (internet e painéis de mangá), do AniList e do Danbooru |
| `LLM_PROVIDER` | não (padrão `auto`) | `auto` = Gemini → Claude API → Claude Code; `gemini`, `claude` ou `claude-code` usa só aquele |
| `CLOUDINARY_CLOUD_NAME` | **sim**, para publicar | Dashboard do Cloudinary |
| `CLOUDINARY_API_KEY` | **sim**, para publicar | Dashboard do Cloudinary |
| `CLOUDINARY_API_SECRET` | **sim**, para publicar | Dashboard do Cloudinary |
| `INSTAGRAM_CLIENT_ID` | só para OAuth | ID do App na Meta |
| `INSTAGRAM_CLIENT_SECRET` | só para OAuth | Chave secreta do App |
| `INSTAGRAM_REDIRECT_URI` | só para OAuth | `http://localhost:3000/api/instagram/callback` |

> A conexão por token (método recomendado) **não** precisa das variáveis `INSTAGRAM_*`. Veja [INSTAGRAM.md](INSTAGRAM.md).

### Frontend: `frontend/.env`

```bash
cd frontend
cp .env.example .env
```

| Variável | Padrão |
|---|---|
| `VITE_API_URL` | `http://localhost:3000/api` |
| `VITE_APP_NAME` | `InstaSearch` |

## 4. Rodar

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

- API: http://localhost:3000 (health check em `/api/health`)
- App: http://localhost:5173

O agendador inicia junto com o backend. **Posts agendados só são publicados enquanto o backend estiver rodando.**

## 5. Conectar o Instagram

Siga [INSTAGRAM.md](INSTAGRAM.md). Resumo: gere o token no Graph API Explorer, estenda no Access Token Debugger e cole em **Configurações → Conectar com Token**.

## 6. Verificar a instalação

```bash
cd backend
node scripts/test-gemini.js      # testa a chave e o modelo do Gemini
node scripts/test-scheduler.js   # testa o agendador
```

No Windows também há scripts PowerShell em `backend/scripts/` (`test-api.ps1`, `test-routes.ps1`, `check-instagram-setup.ps1`, `test-publish.ps1`, `test-ai-endpoints.ps1`).

Teste completo pela interface:
1. **Publicar Reels** → envie um clipe curto vertical.
2. Clique em gerar legenda com IA.
3. Publique ou agende para daqui a 5 minutos.

## 7. Onde ficam os dados

Tudo fica em `backend/data/` (no `.gitignore`):

```
backend/data/
├── instagram_accounts/   # contas conectadas e tokens (texto puro!)
├── posts/                # posts agendados e publicados
├── profiles/ reels/ analyses/ content/ users/
├── short_projects/       # projetos do fluxo tema → Short (+ audio/ com as narrações)
├── library/              # catálogo de imagens e figurinhas (+ files/ com os arquivos)
├── sounds/               # efeitos sonoros e músicas (+ files/)
├── styles/               # seus estilos
└── videos/
    ├── temp/             # uploads
    └── output/           # vídeos processados
```

**Backup:** copie a pasta `backend/data/`. **Limpeza:** apague o conteúdo de `videos/temp` e `videos/output` de vez em quando; ainda não há limpeza automática.

## Solução de problemas

| Problema | Solução |
|---|---|
| `Cannot find ffmpeg` / `ffprobe` | FFmpeg fora do PATH. Reinstale e reabra o terminal |
| `GEMINI_API_KEY não configurada` | Preencha o `.env` e reinicie o backend |
| "A cota grátis do Gemini acabou por hoje" | Espere a hora mostrada nas Configurações ou ligue a reserva do Claude. Veja [AI.md](AI.md) |
| "Para pegar áudio de links, instale o yt-dlp" | `pip install yt-dlp` e reinicie o backend |
| Publicação falha no upload | Credenciais do Cloudinary ausentes ou erradas |
| Erros de token do Instagram | Veja a tabela de erros em [INSTAGRAM.md](INSTAGRAM.md#erros-comuns) |
| Frontend não acessa a API | Confira `VITE_API_URL` e se o backend está na porta 3000 |
| Porta em uso | Mude `PORT` no `.env` e ajuste `VITE_API_URL` |
