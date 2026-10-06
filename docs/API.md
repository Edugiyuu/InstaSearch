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

## Shorts: projetos (fluxo tema → Short)

Guia de uso: [USO.md](USO.md). Todas as rotas que chamam IA passam pela reserva Gemini → Claude ([AI.md](AI.md)).

| Método | Rota | | Corpo / resposta |
|---|---|---|---|
| GET | `/shorts/ai-status` | ✅ | Estado dos provedores (`gemini`, `claude`, `claudeCode`), sem gastar chamada |
| GET | `/shorts/projects` | ✅ | Lista, mais recentes primeiro |
| POST | `/shorts/projects` | ✅ | `{ theme, styleId, duration: 15–40, tone, narration? }` → projeto com roteiro e cenas (IA) |
| GET | `/shorts/projects/:id` | ✅ | |
| PUT | `/shorts/projects/:id` | ✅ | Campos editáveis: `title`, `beats`, `settings` (`pace`, `effects`, `caption`, `imagePicker`), `status` (`roteiro`, `revisao`, `salvo`…), `musicId` (`null` = sem música), `postCaption`, `audioDuration` |
| DELETE | `/shorts/projects/:id` | ✅ | As imagens e sons continuam na biblioteca |
| POST | `/shorts/projects/:id/assemble` | ✅ | Montagem: imagens (IA ou palavras), figurinhas, efeitos sonoros e música → `{ project, log }` |
| POST | `/shorts/projects/:id/adjust` | ✅ | `{ request }` → "Peça um ajuste" (IA); só as cenas novas recebem imagem |
| POST | `/shorts/projects/:id/undo` | ✅ | Volta a versão anterior das cenas |
| PUT | `/shorts/projects/:id/beats/:beatId/sfx` | ✅ | `{ sfxId }` efeito sonoro da cena: id de um som (fica travado), `null` = sem som, `'auto'` = a montagem escolhe |
| POST | `/shorts/projects/:id/render` | ✅ | `{ props }` (as props da prévia + `durationInFrames`) → começa o MP4 no Remotion; devolve `{ key, stage, progress }`. Se já existe MP4 para essas props, volta `stage: "done"` |
| GET | `/shorts/projects/:id/render` | ✅ | `?key=` andamento: `stage` = `bundle` \| `render` \| `done` \| `error`, `progress` 0–1; `null` = nada renderizado |
| GET | `/shorts/projects/:id/video` | ✅ | Baixa o MP4 (nome = título do projeto) |
| POST | `/shorts/projects/:id/publish/instagram` | ✅ | `{ caption }` → Cloudinary → Reels; grava `published.instagram` e status `publicado` |
| POST | `/shorts/projects/:id/publish/youtube` | ✅ | `{ title, description, privacy: "public"\|"unlisted"\|"private" }` → YouTube Shorts; grava `published.youtube` |
| GET | `/channel` | ✅ | Seu canal: `{ name, text, button, photoFile?, outroDefault }` (final dos vídeos) |
| PUT | `/channel` | ✅ | Muda `name`, `text` (bordão), `button`, `outroDefault` |
| POST | `/channel/photo` | ✅ | multipart `photo` → foto do final |
| POST | `/channel/photo/instagram` | ✅ | Copia a foto (e o @, se o nome estiver vazio) do Instagram conectado |
| GET | `/youtube/status` | ✅ | `{ configured, account }` (sem tokens) |
| GET | `/youtube/auth-url` | ✅ | URL de autorização do Google |
| GET | `/youtube/callback` | ✅ | Volta do Google; redireciona para `/configuracoes?youtube=ok\|erro` |
| DELETE | `/youtube/account` | ✅ | Desconecta e revoga o acesso |
| POST | `/shorts/projects/:id/auto-images` | ✅ | Busca na internet e coloca a melhor imagem em cada cena que precisa, sem IA: `{ project, added, total, results[] }` |
| PUT | `/shorts/projects/:id/beats/:beatId/image` | ✅ | `{ imageId }` escolhe a imagem da cena e trava; `{ imageId: null }` aceita a parecida |
| POST | `/shorts/projects/:id/audio` | ✅ | `multipart/form-data`, campo `audio` (≤30MB) |
| GET | `/shorts/audio/:file` | ✅ | Arquivo de áudio da narração |

## Shorts: estilos

| Método | Rota | | Corpo |
|---|---|---|---|
| GET | `/shorts/styles` | ✅ | 7 embutidos + os seus |
| POST | `/shorts/styles` | ✅ | Estilo novo (mudar um embutido cria uma cópia sua) |
| PUT | `/shorts/styles/:id` | ✅ | `{ name, pace, effects, caption, music, imageType, notes, … }` |
| DELETE | `/shorts/styles/:id` | ✅ | Só estilos seus |

## Biblioteca de imagens e figurinhas

| Método | Rota | | Corpo / parâmetros |
|---|---|---|---|
| GET | `/library` | ✅ | `?q=` busca em linguagem natural |
| POST | `/library/upload` | ✅ | `multipart/form-data`, campo `images` (até 30; ≤15MB cada) e `kind=figurinha` opcional. Cataloga com IA |
| POST | `/library/import-url` | ✅ | `{ url, fallbackUrl?, name?, characters? }` baixa a imagem e cataloga. `fallbackUrl` (a miniatura) é usada se o site bloquear a grande; `name` e `characters` valem se a IA não catalogar |
| GET | `/library/web-search` | ✅ | `?q=&characters=a,b&tags=a,b&context=&page=` sugestões da internet para uma cena (`tags` = etiquetas do Danbooru da cena; `page` 2, 3… = outras opções; `projectId` = usa o tipo de imagem do estilo: com mangá, os painéis do mangá vêm primeiro): `{ images[], searched[], google }`. Fontes: Google via Serper (se tiver `SERPER_API_KEY`), AniList (arte oficial) e Danbooru (só `rating:g`). Cache de 15 min |
| GET | `/library/web-thumb` | ✅ | `?url=` miniatura de uma sugestão, carregada pelo backend (o CDN do Danbooru recusa o navegador). Só aceita os domínios das fontes |
| PUT | `/library/:id` | ✅ | `{ name?, tags?, characters?, regions?, kind? }` |
| POST | `/library/:id/recatalog` | ✅ | Cataloga de novo com IA |
| DELETE | `/library/:id` | ✅ | |
| GET | `/library/files/:file` | ✅ | Arquivo da imagem |

## Biblioteca de sons (efeitos e músicas)

| Método | Rota | | Corpo / parâmetros |
|---|---|---|---|
| GET | `/sounds` | ✅ | `?kind=sfx\|musica` |
| POST | `/sounds/upload` | ✅ | `multipart/form-data`, campo `sounds` (até 30; ≤40MB) e `kind=sfx\|musica`. Etiquetas pelo nome do arquivo e pelo Gemini |
| POST | `/sounds/import-url` | ✅ | `{ url, kind? }` pega o áudio de um Reel, TikTok ou Short (precisa do `yt-dlp`) |
| PUT | `/sounds/:id` | ✅ | `{ name?, tags?, kind? }` |
| DELETE | `/sounds/:id` | ✅ | |
| GET | `/sounds/files/:file` | ✅ | Arquivo de áudio |

## Planejado

Render do MP4 no backend (Remotion) e publicação direto do projeto: veja [ROADMAP.md](ROADMAP.md).
