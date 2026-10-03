# Referência da API

Base: `http://localhost:3000/api`. Sem autenticação: a API foi feita para rodar só em `localhost`.

Formato das respostas:

```jsonc
// sucesso
{ "success": true, "data": { ... } }
// erro
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
```

Legenda: ✅ funcional · ⚠️ com ressalvas · 🚧 stub/incompleto

## Sistema

| Método | Rota | | Descrição |
|---|---|---|---|
| GET | `/health` | ✅ | Health check |
| GET | `/dashboard/overview` | ✅ | Contadores gerais |

## Vídeos

| Método | Rota | | Corpo / parâmetros |
|---|---|---|---|
| POST | `/videos/upload` | ✅ | `multipart/form-data`, campo `videos` (1 a 3 arquivos; mp4/mov/avi/mkv; ≤50MB; ≤30s) |
| POST | `/videos/merge` | ✅ | `{ "filenames": string[] }` → `{ filename, path }` (1080x1920, H.264/AAC, 30fps) |
| POST | `/videos/analyze-for-caption` | ✅ | `{ "filename", "style"?: "realistic" }` → `{ caption, framesAnalyzed }` |
| POST | `/videos/publish-reel` | ✅ | `{ "filename", "caption", "hashtags"?: "#a #b" }`. Envia ao Cloudinary e publica |
| DELETE | `/videos/:filename` | ✅ | Remove o arquivo local |

Detalhes: [VIDEO_PIPELINE.md](VIDEO_PIPELINE.md).

## Posts e agendamento

| Método | Rota | | Corpo / parâmetros |
|---|---|---|---|
| POST | `/posts/schedule` | ✅ | `{ caption, scheduledFor (ISO), media: { type: "reel", videoUrl }, contentId? }` |
| GET | `/posts` | ✅ | `?status=scheduled\|published\|failed` |
| GET | `/posts/upcoming` | ✅ | `?limit=10` |
| GET | `/posts/:id` | ✅ | |
| GET | `/posts/:id/stats` | ⚠️ | Métricas salvas no post (não busca dados novos na Graph API) |
| PUT | `/posts/:id` | ✅ | Campos a alterar (só posts `scheduled`) |
| DELETE | `/posts/:id` | ✅ | |
| GET | `/scheduler/status` | ✅ | `{ running, checkIntervalMinutes, upcomingPosts, nextScheduled }` |
| POST | `/scheduler/publish/:id` | ✅ | Publica agora |
| PUT | `/scheduler/reschedule/:id` | ✅ | `{ scheduledFor }` |
| DELETE | `/scheduler/cancel/:id` | ✅ | |

Detalhes: [SCHEDULER.md](SCHEDULER.md).

## Instagram: conexão

| Método | Rota | | Descrição |
|---|---|---|---|
| POST | `/instagram/connect-token` | ✅ | `{ accessToken }`. Método recomendado |
| GET | `/instagram/account` | ✅ | Conta conectada |
| DELETE | `/instagram/account` | ✅ | Desconecta |
| POST | `/instagram/account/refresh` | ⚠️ | Atualiza o perfil; a renovação de token só vale para o fluxo OAuth |
| GET | `/instagram/auth-url` | ⚠️ | URL do OAuth (experimental) |
| GET | `/instagram/callback` | ⚠️ | Callback do OAuth |

Detalhes: [INSTAGRAM.md](INSTAGRAM.md).

## Instagram: dados da sua conta

| Método | Rota | | Parâmetros |
|---|---|---|---|
| GET | `/instagram/data/profile` | ✅ | |
| GET | `/instagram/data/media` | ✅ | `?limit=25` |
| GET | `/instagram/data/reels` | ✅ | `?limit=25` |
| GET | `/instagram/data/media/:mediaId` | ✅ | |
| GET | `/instagram/data/media/:mediaId/insights` | ✅ | Métricas variam por tipo de mídia |
| GET | `/instagram/data/media/:mediaId/comments` | ✅ | `?limit=50` |
| GET | `/instagram/data/media/:mediaId/hashtags` | ✅ | Hashtags extraídas da legenda |
| GET | `/instagram/data/insights` | ✅ | Insights da conta (período diário) |

## IA

| Método | Rota | | Corpo |
|---|---|---|---|
| GET | `/ai/health` | ✅ | Status, modelo e provedor |
| POST | `/ai/analyze-profile` | ✅ | `{ profileData: { username, bio, followersCount, ..., posts } }` |
| POST | `/ai/generate-content` | ✅ | `{ profileAnalysis, count?: 5 }` |
| POST | `/ai/generate-caption` | ✅ | `{ contentIdea, tone?: "casual", includeHashtags?: true }` |
| POST | `/ai/analyze-hashtags` | ✅ | `{ hashtags: string[] }` |
| GET | `/video-prompts/styles` | ⚠️ legado | Estilos disponíveis |
| POST | `/video-prompts/generate` | ⚠️ legado | `{ topic?, contentIdea?, profileContext?, duration: 8\|16, style?, dialogues? }` |

## Perfis de referência, análises e conteúdo

> 🚧 Estas rotas existem, mas **não há fonte de dados** para os perfis. Elas vão ser refeitas com a Business Discovery API na Fase 3 do [ROADMAP](ROADMAP.md).

| Método | Rota | | Observação |
|---|---|---|---|
| GET | `/profiles` | ⚠️ | `?status=&tag=&search=` |
| GET | `/profiles/stats` | ⚠️ | |
| GET | `/profiles/:id` | ⚠️ | |
| POST | `/profiles` | 🚧 | `{ username, tags? }`. Salva só o username |
| DELETE | `/profiles/:id` | ⚠️ | Não remove os reels associados |
| POST | `/profiles/:id/refresh` | 🚧 | Só muda o status para `pending` |
| POST | `/analysis/start` | 🚧 | `{ profileIds, type? }`. Analisa perfis sem dados |
| GET | `/analysis` | ⚠️ | `?status=` |
| GET | `/analysis/stats` | ⚠️ | |
| GET | `/analysis/profile/:profileId` | ⚠️ | |
| GET | `/analysis/:id` | ⚠️ | |
| POST | `/content/generate` | 🚧 | `{ analysisId, count? }`. Retorna um job falso (`TODO`) |
| GET | `/content` | ⚠️ | `?status=&sortBy=` |
| GET | `/content/stats` | ⚠️ | |
| GET | `/content/:id` | ⚠️ | |
| PUT | `/content/:id` | ⚠️ | |
| POST | `/content/:id/approve` | ⚠️ | |
| DELETE | `/content/:id` | ⚠️ | |

## Planejado

Rotas de projetos (tema → roteiro → voz → plano → ajustes → render) e da biblioteca de material (busca, upload com catalogação, correção de tags): veja [AUTO_EDIT.md](AUTO_EDIT.md#endpoints-propostos).
