# Arquitetura

## Visão geral

```
┌────────────────────────────┐        ┌───────────────────────────────────────────┐
│ Frontend (React + Vite)    │  HTTP  │ Backend (Express + TypeScript)            │
│ localhost:5173             │ ─────► │ localhost:3000/api                        │
│ pages → hooks → api.ts     │        │ routes → controllers → services → storage │
└────────────────────────────┘        └───────┬───────────┬──────────┬────────────┘
                                              │           │          │
                         ┌────────────────────┘           │          └──────────────┐
                         ▼                                ▼                         ▼
              ┌────────────────────┐        ┌──────────────────────┐   ┌──────────────────────┐
              │ FFmpeg / ffprobe   │        │ APIs externas        │   │ backend/data/ (JSON) │
              │ (processo local)   │        │ • Instagram Graph    │   │ um arquivo por item  │
              └────────────────────┘        │ • Gemini → Claude    │   └──────────────────────┘
                                            │   (API ou Claude Code│
                                            │    do plano Pro)     │
                                            │ • Cloudinary         │
                                            │ • yt-dlp (opcional)  │
                                            └──────────────────────┘
          + SchedulerService (setInterval de 1 min, dentro do mesmo processo do backend)
```

Decisões principais (o porquê completo de cada uma está nos [ADRs](decisions/README.md)):

| Decisão | Motivo | Custo |
|---|---|---|
| **Armazenamento em JSON**, sem banco ([ADR 0002](decisions/0002-armazenamento-em-json.md)) | Zero configuração para self-hosted | Sem consultas, sem transações; lento com milhares de itens. Migrar para SQLite quando o histórico de métricas (Fase 3) crescer |
| **Agendador no mesmo processo** | Simplicidade | Só publica com o backend rodando |
| **FFmpeg via `fluent-ffmpeg`** | Padrão da indústria, gratuito | Exige o FFmpeg instalado no sistema |
| **Cloudinary para a URL pública** ([ADR 0003](decisions/0003-cloudinary-para-url-publica.md)) | A Graph API só aceita vídeo por URL | Dependência externa; alternativa futura é um túnel para o próprio backend |
| **Monousuário** (`default_user`) | Feito para uso pessoal | Usa sempre a primeira conta conectada |

## Backend

```
backend/
├── src/
│   ├── index.ts                    # Express, CORS, logs, rotas, inicia o agendador
│   ├── routes/api.ts               # todas as rotas (ver API.md)
│   ├── controllers/
│   │   ├── shortsController.ts         # fluxo tema → Short: projetos, estilos, biblioteca, sons, status da IA
│   │   ├── videoController.ts          # upload (multer), merge, publish-reel, delete
│   │   ├── videoAnalysisController.ts  # legenda por IA a partir de frames
│   │   ├── videoPromptController.ts    # gerador de prompts (legado)
│   │   ├── schedulerController.ts      # status, publicar agora, reagendar, cancelar
│   │   ├── postController.ts           # CRUD de posts agendados/publicados
│   │   ├── instagramAuthController.ts  # OAuth (experimental)
│   │   ├── instagramTokenController.ts # conexão por token (recomendada)
│   │   ├── instagramDataController.ts  # perfil, mídias, insights, comentários
│   │   ├── aiController.ts             # análise de perfil, legenda, hashtags
│   │   ├── profileController.ts        # perfis de referência (🚧 sem fonte de dados)
│   │   ├── analysisController.ts       # análises (🚧 recebe perfis vazios)
│   │   ├── contentController.ts        # ideias de conteúdo (🚧 generate é um stub)
│   │   └── dashboardController.ts      # health e visão geral
│   ├── services/
│   │   ├── shorts/                     # fluxo tema → Short (ver USO.md)
│   │   │   ├── llm.ts                  # provedores de IA: Gemini → Claude API → Claude Code (Sonnet 5.5)
│   │   │   ├── shortsAI.ts             # prompts: roteiro, ajustes, escolha de imagens, catalogação
│   │   │   ├── sceneEdits.ts           # chat: cenas citadas no pedido, desfaz o resto, descreve a mudança
│   │   │   ├── transcription.ts        # whisper.cpp local: instala, converte o áudio e devolve as palavras com tempo
│   │   │   ├── projects.ts             # projetos, montagem, ajustes, desfazer, música
│   │   │   ├── library.ts              # imagens e figurinhas: busca, escolha por cena, uso, fila de catalogação
│   │   │   ├── sounds.ts               # efeitos sonoros e músicas, importação por link (yt-dlp)
│   │   │   ├── styles.ts               # estilos embutidos + os do usuário
│   │   │   ├── tones.ts                # tons do roteiro: embutidos + os do usuário (ADR 0019)
│   │   │   └── types.ts                # ShortProject, Beat, LibraryImage, SoundItem…
│   │   ├── videoService.ts             # ffprobe, merge, optimize, extractFrames
│   │   ├── aiService.ts                # Gemini: prompts das telas antigas e da legenda do post
│   │   ├── instagramGraphService.ts    # Graph API (graph.facebook.com/v18.0)
│   │   ├── instagramAuthService.ts     # OAuth + renovação (graph.instagram.com)
│   │   ├── schedulerService.ts         # loop de publicação
│   │   └── storage/                    # FileStorage<T> + um storage por entidade
│   ├── models/index.ts             # tipos: Profile, Reel, Analysis, Content, Post...
│   ├── middleware/errorHandler.ts  # AppError + asyncHandler
│   └── utils/                      # logger (winston), geradores de ID
├── scripts/                        # testes manuais (node / PowerShell)
└── data/                           # gerado em tempo de execução (gitignored)
```

### Armazenamento

`FileStorage<T>` grava **um arquivo por item** em `backend/data/<coleção>/<id>.json` e cria a pasta automaticamente. Cada entidade estende essa classe com consultas específicas (ex.: `PostStorage`, `InstagramAccountStorage`).

Coleções: `instagram_accounts`, `posts`, `profiles`, `reels`, `analyses`, `content`, `users` e, no fluxo de Shorts, `short_projects`, `library`, `sounds`, `styles` e `bordoes`. Os arquivos ficam ao lado (`library/files`, `sounds/files`, `bordoes/files`, `short_projects/audio`). Os vídeos das telas antigas ficam em `data/videos/temp` (uploads) e `data/videos/output` (processados).

### Tratamento de erros

Os controllers usam `asyncHandler` e lançam `AppError(mensagem, status, código)`. O `errorHandler` responde no formato:

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Respostas de sucesso seguem o formato `{ "success": true, "data": ... }`.

## Frontend

```
frontend/src/
├── App.tsx              # rotas (React Router 6, layout routes)
├── api/shorts.ts        # tipos e cliente do fluxo tema → Short (espelha backend/src/services/shorts/types.ts)
├── video/               # composição Remotion: ShortVideo (cenas, efeitos, figurinhas, legendas, sons), timeline, ShortPlayer, align (roteiro × voz), framing (enquadramento e zoom)
├── components/          # AppShell (menu lateral), PublishModal, TagEditor, flow.tsx (stepper, miniaturas, botões segmentados)...
├── pages/               # uma página por rota (ver ROADMAP.md, "Estado atual por tela")
├── hooks/               # useShorts (projetos, biblioteca, sons, estilos), useVideoPublish, usePosts, useMyInstagram...
├── services/api.ts      # cliente axios (VITE_API_URL)
├── types/               # tipos compartilhados
└── styles/              # index.css (tokens do Figma), ui.css (botões, chips, painéis), App.css (telas antigas)
```

O visual segue o protótipo do Figma ([FIGMA.md](FIGMA.md)): tema escuro, Inter e os tokens `--bg`, `--panel`, `--accent` etc. em `styles/index.css`. As telas antigas continuam acessíveis em **Ferramentas antigas**, no rodapé do menu.

Padrão: **página → hook → `api.ts`**. A página não chama o axios direto, e o hook guarda os estados `loading` e `error`.

## Arquitetura-alvo (próximas fases)

O que muda com o fluxo [tema → Short](AUTO_EDIT.md):

```
InstaSearch/
├── video/                       # NOVO: projeto Remotion, compartilhado
│   └── src/
│       ├── Short.tsx            # EditPlan (props) → vídeo
│       ├── scenes/              # FullImage, Evidence, Versus, Meme, Clip, TitleCard
│       ├── layers/              # Caption, Arrow, Cross, Circle, Emoji, Sticker, Logo, Flash
│       ├── styles/              # estilos embutidos (o usuário salva os seus em data/styles/)
│       └── schema.ts            # EditPlan: fonte única da verdade (zod)
├── frontend/                    # @remotion/player importa video/src → prévia ao vivo
└── backend/src/services/
    ├── providers/
    │   ├── llm/                 # gemini, ollama, openai, anthropic
    │   ├── vision/              # catalogação: descrição, personagens, regiões
    │   ├── transcription/       # whisper.cpp
    │   ├── voice/               # upload (padrão), elevenlabs, piper
    │   ├── imageGen/            # opcional
    │   └── mediaHost/           # cloudinary, tunnel
    ├── edit/
    │   ├── projects.ts · jobs.ts
    │   ├── script/              # tema → roteiro
    │   ├── beats/               # palavras → batidas de 2–4 palavras
    │   ├── library/             # index.json, busca, variantes, controle de uso
    │   ├── planner/             # batidas + candidatos → EditPlan · patches
    │   └── render/              # @remotion/bundler + @remotion/renderer → MP4
    ├── instagram/               # unifica auth + graph + publish
    └── learning/                # insights, Business Discovery, sugestões de temas
```

```
 ┌──────────── frontend ─────────────┐        ┌──────────────── backend ─────────────────┐
 │ Editor: linha do tempo de batidas │  REST  │ projects / library / planner / jobs      │
 │ @remotion/player ◄── EditPlan ────┼───────►│ Whisper · Gemini (LLM + visão)           │
 │ (prévia ao vivo, sem render)      │        │ @remotion/renderer ─► MP4 ─► publicar    │
 └───────────────┬───────────────────┘        └───────────────────┬──────────────────────┘
                 └────────── ambos importam video/src ─────────────┘
```

Princípios da evolução:
1. **O `EditPlan` é o centro:** é o que fica salvo, as *props* do player e do render, e o que o LLM edita (por patches). O formato fica em `video/src/schema.ts`.
2. **Composição em React (Remotion)** em vez de filtros FFmpeg escritos à mão: cada tipo de cena e camada é um componente testável.
3. **Estilo é configuração, não código:** um estilo combina cenas e camadas existentes (ritmo, pesos, legendas, sfx, orientações para a IA). Estilos novos raramente exigem componentes novos.
4. **Prévia sem render:** o player roda o mesmo código do render final, então o que você vê é o que sai.
5. **A biblioteca é um ativo:** a catalogação por visão roda uma vez por arquivo e fica em cache no `index.json`.
6. **Providers por configuração:** nenhum serviço externo chamado direto dos controllers.
7. **Jobs assíncronos** para transcrição, catalogação e render.
8. **SQLite** quando a biblioteca ou o histórico de métricas exigirem consultas mais pesadas. A interface do storage se mantém.

| Decisão | Motivo | Custo |
|---|---|---|
| **Remotion** para compor e renderizar ([ADR 0009](decisions/0009-remotion-para-composicao.md)) | Prévia ao vivo, componentes React, mesma stack | Licença paga para empresas com mais de 3 funcionários; o render usa Chrome headless (baixado automaticamente) |
| **Biblioteca local catalogada por visão** ([ADR 0010](decisions/0010-biblioteca-de-imagens-em-vez-de-geracao.md)) | Resolve o gargalo de imagens (25 a 40 por Short de até 40s) | Chamadas de visão na primeira catalogação de cada arquivo |
| **Batidas de 2 a 4 palavras** | Ritmo do formato de referência | Muitas imagens por vídeo, compensadas pela biblioteca e pelas variantes de recorte |
