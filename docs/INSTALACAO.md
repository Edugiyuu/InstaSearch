# Instalação e configuração

Do zero ao app rodando, mais as contas que ele usa (Instagram, YouTube, IA) e quanto custa.

## Pré-requisitos

| Item | Obrigatório? | Para quê |
|---|---|---|
| [Node.js](https://nodejs.org/) 20+ | Sim | Backend e frontend |
| [FFmpeg](https://ffmpeg.org/) no PATH | Sim | Medir e converter áudio e vídeo (`winget install Gyan.FFmpeg` no Windows) |
| Chave do [Gemini](https://aistudio.google.com/app/apikey) | Sim, ou uma reserva do Claude | Roteiro, ajustes, imagens |
| [Cloudinary](https://cloudinary.com/users/register_free) (grátis) | Para publicar no Instagram | URL pública temporária do vídeo |
| Conta Instagram **Business ou Creator** ligada a uma Página do Facebook | Para publicar no Instagram | A API não aceita conta pessoal |
| Projeto no Google Cloud | Para enviar ao YouTube | OAuth do canal |
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`pip install yt-dlp`) | Não | Pegar o áudio de Reels/TikTok/Shorts para a biblioteca de músicas |

## Instalar e abrir

```bash
git clone https://github.com/Edugiyuu/InstaSearch.git
cd InstaSearch
npm --prefix backend install
npm --prefix frontend install
cp backend/.env.example backend/.env      # e preencha as chaves
cp frontend/.env.example frontend/.env
```

Em dois terminais:

```bash
npm --prefix backend run dev
```

```bash
npm --prefix frontend run dev
```

Abra **http://localhost:5173**. A API fica em http://localhost:3000/api (`/api/health` responde se está viva). O `.env` só é lido quando o backend inicia: **reinicie o backend depois de mudar**.

## Variáveis do `backend/.env`

| Variável | O que é |
|---|---|
| `GEMINI_API_KEY`, `GEMINI_MODEL` | A IA principal (padrão `gemini-2.5-flash`) |
| `ANTHROPIC_API_KEY` | Reserva paga: Claude Sonnet 5.5 pela API |
| `CLAUDE_CODE=on`, `CLAUDE_CODE_PATH` | Reserva pelo Claude Code do seu plano Pro/Max (veja abaixo) |
| `LLM_PROVIDER` | `auto` (padrão: Gemini → Claude API → Claude Code) ou só um: `gemini`, `claude`, `claude-code` |
| `SERPER_API_KEY` | Opcional: Google Imagens nas sugestões |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | Para publicar no Instagram |
| `YOUTUBE_CLIENT_ID`, `_CLIENT_SECRET`, `_REDIRECT_URI`, `FRONTEND_URL` | Para enviar ao YouTube |
| `INSTAGRAM_ACCESS_TOKEN` | Só para o script `backend/scripts/add-token.js` |
| `INSTAGRAM_CLIENT_ID`, `_SECRET`, `_REDIRECT_URI` | Só para o OAuth experimental (não recomendado) |
| `GRAPH_API_VERSION` | Só se a Meta desativar a versão padrão (`v23.0`) |

O frontend só precisa de `VITE_API_URL` (padrão `http://localhost:3000/api`).

## Conectar o Instagram

1. **Prepare a conta:** no app do Instagram, mude para conta profissional (Creator ou Business) e ligue a uma Página do Facebook.
2. **Crie o app** em [developers.facebook.com/apps](https://developers.facebook.com/apps/) (tipo *Business*) e adicione o produto **Instagram**.
3. **Gere o token** no [Graph API Explorer](https://developers.facebook.com/tools/explorer/) com as permissões `instagram_basic`, `instagram_content_publish`, `instagram_manage_insights`, `instagram_manage_comments`, `pages_show_list`, `pages_read_engagement` e `business_management`.
4. **Estenda o token** no [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) (*Extend Access Token*): o do Explorer dura 1 hora; o estendido, cerca de 60 dias.
5. No app: **Configurações → Conectar com token** e cole.

| Erro | O que fazer |
|---|---|
| `Session has expired` | O token era de 1 hora: estenda no Debugger |
| `instagram_business_account` não aparece / `/me/accounts` vazio | Conta pessoal ou sem Página; ou falta `pages_show_list` / `business_management` |
| `(#10) Application does not have permission` | Falta uma permissão: gere o token de novo com ela |

O token não se renova sozinho: quando expirar, gere outro e conecte de novo.

## Conectar o YouTube

1. No [Google Cloud](https://console.cloud.google.com/), crie um projeto e ative a **YouTube Data API v3** e a **YouTube Analytics API**.
2. Na **Tela de consentimento OAuth**: tipo *Externo*, modo *Teste*, e o seu e-mail em *Usuários de teste*.
3. Em **Credenciais**, crie um **ID do cliente OAuth** do tipo *Aplicativo da Web* com o redirecionamento `http://localhost:3000/api/youtube/callback`.
4. Coloque `YOUTUBE_CLIENT_ID` e `YOUTUBE_CLIENT_SECRET` no `backend/.env`, reinicie e use **Configurações → YouTube → Conectar canal**.

Limites que valem saber: vídeos enviados por apps não auditados pelo Google ficam **privados** (mude no YouTube Studio); a cota dá uns **6 envios por dia**; no modo *Teste*, a conexão expira a cada **7 dias**.

## Reserva da IA com o Claude Code (plano Pro/Max)

O plano Pro não inclui a API, mas inclui o Claude Code, que o backend chama no seu computador (`claude -p`), sem custo extra além do limite do plano:

```bash
npm install -g @anthropic-ai/claude-code
```

```bash
claude auth login
```

Depois, `CLAUDE_CODE=on` no `backend/.env`. Cada pedido roda sem ferramentas, sem MCP e sem salvar sessão. É uso pessoal: os pedidos dividem o limite com o claude.ai.

## Problemas comuns

| Problema | Solução |
|---|---|
| `Cannot find ffmpeg` | FFmpeg fora do PATH: instale e reabra o terminal |
| "A cota grátis do Gemini acabou por hoje" | Espere a hora mostrada em Configurações ou ligue uma reserva do Claude |
| "Nenhuma IA configurada" | Preencha `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` ou `CLAUDE_CODE=on` |
| Publicação no Instagram falha no envio | Cloudinary ausente ou errado no `.env` |
| Frontend não acessa a API | Backend na porta 3000? Confira `VITE_API_URL` |

## Quanto custa

| Peça | Caminho grátis | Quando pagar |
|---|---|---|
| Edição (Remotion, Whisper, FFmpeg) | Local, grátis para pessoas e empresas de até 3 funcionários | Licença do Remotion para empresas maiores |
| IA | Gemini, nível grátis (limite diário); Claude Code do plano que você já tem | Claude API: alguns centavos por vídeo |
| Imagens | Bing, Danbooru e AniList, sem chave | Serper tem 2.500 buscas grátis |
| Voz | Seu microfone | ElevenLabs, a partir de ~US$ 5/mês |
| Publicação | Instagram, YouTube e Cloudinary têm planos grátis | — |
| Servidor | Seu PC | VPS de ~US$ 5/mês, se quiser agendar 24 horas por dia |

**Uso pessoal: R$ 0.** Um canal frequente com voz do ElevenLabs: ~R$ 30 a 130 por mês, quase tudo da voz.

## Segurança e avisos

- **Feito para `localhost`.** O backend não tem login nem limite de pedidos: não o deixe aberto na internet.
- **Tokens em texto puro** em `backend/data/instagram_accounts/` e `backend/data/youtube/`. Não compartilhe essa pasta. Criptografar está no BOARD.
- **Direitos autorais:** usar personagens e artes de anime, filmes e jogos é responsabilidade de quem publica. Narração própria com opinião reduz o risco, mas as plataformas podem remover o vídeo ou bloquear a monetização.
- **Música:** Reels publicados pela API não podem usar a biblioteca de músicas do Instagram. Use trilhas livres.
- **Termos:** use de acordo com os [Termos da Plataforma Meta](https://developers.facebook.com/terms/) e os do YouTube.
