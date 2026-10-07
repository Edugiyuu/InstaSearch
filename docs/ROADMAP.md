# Roadmap

Substitui o antigo `PROGRESS.md`. Atualizado em **outubro de 2026**.

Legenda: ✅ pronto · ⚠️ funciona com ressalvas · 🚧 incompleto/stub · 📋 planejado

## Estado atual por tela

| Tela (rota) | Estado | Observação |
|---|---|---|
| Início (`/`) | ✅ | Criação rápida, seus vídeos, contagem da biblioteca e próximas publicações (tudo real) |
| Novo vídeo (`/novo`) | ✅ | Tema, estilo, duração e tom (da biblioteca, com "+ Novo tom"); a IA pesquisa até 4 vezes, escreve o roteiro com argumento e divide em cenas. Aceita narração pronta |
| Roteiro e voz (`/projeto/:id/roteiro`) | ✅ | Cenas editáveis, pedidos à IA, copiar narração, upload do áudio (a duração do áudio dita os cortes) |
| Montagem (`/projeto/:id/montagem`) | ✅ | Escolhe imagens, figurinhas, efeitos sonoros e música da biblioteca e mostra as decisões |
| Revisão (`/projeto/:id`) | ⚠️ | Prévia no `@remotion/player`, "Peça um ajuste", desfazer, ajustes rápidos (ritmo, efeitos, legenda quadrinho/completa/limpa, música, bordão de abertura e do final), salvar para depois. Legenda e cortes no tempo da voz (Whisper local, [ADR 0018](decisions/0018-legenda-sincronizada-com-a-voz.md)) |
| Trocar imagem (`/projeto/:id/imagens`) | ✅ | Uma cena por vez: sugestões da internet já buscadas (clique e usa), colar, arrastar, link, Google ou biblioteca |
| Publicar (modal) | ✅ | Legenda do post pela IA, render MP4 no Remotion com progresso, baixar MP4, publicar no Instagram (Reels) e no YouTube (Shorts) |
| Ideias (`/ideias`) | ⚠️ | Desempenho de cada Reel e Short publicado, comparado com a mediana dos seus últimos vídeos na mesma idade (fotos de 1, 7 e 28 dias, [ADR 0021](decisions/0021-ideias-a-partir-do-desempenho.md)). Falta o brainstorm de ideias |
| Projetos (`/projetos`) | ✅ | Filtros: no roteiro, faltam imagens, prontos, salvos, publicados |
| Biblioteca (`/biblioteca`) | ✅ | Abas Imagens, Vídeos, Figurinhas, Efeitos sonoros, Músicas, Bordões (abertura e final, [ADR 0016](decisions/0016-bordoes-de-abertura-e-final.md)) e Tons do roteiro ([ADR 0019](decisions/0019-roteiro-com-argumento-e-tons-proprios.md), escritos por você ou sugeridos pela IA). Catalogação pela IA; áudio de Reels/TikTok/Shorts por link (precisa do `yt-dlp`) |
| Estilos (`/estilos`) | ✅ | Galeria, ajustes em palavras simples, prévia "Como fica"; mudar um embutido salva uma cópia |
| Calendário (`/calendario`) | ✅ | Posts reais, status do agendador, publicar agora, cancelar, horário sugerido |
| Configurações (`/configuracoes`) | ✅ | Instagram (token) e IA reais; voz, mídia e sistema marcados como "prévia" |
| Ferramentas antigas (`/dashboard`, `/my-profile`, `/video-publish`, `/video-prompts`, `/profiles`, `/analysis`, `/content`) | ⚠️ legado | No rodapé do menu. Publicar Reels e Meu Perfil seguem funcionando; o resto é stub |

Dados do fluxo novo ficam em `backend/data/`: `short_projects/`, `library/` (imagens e figurinhas), `sounds/` (efeitos e músicas), `styles/`, `bordoes/` (abertura e final).

---

## Fase 0: fundação e segurança (prioridade imediata)

**Segurança**
- [ ] 🔴 **Revogar o token de acesso que está versionado em `backend/scripts/add-token.js`** e mudar o script para ler o token de argumento ou do `.env`. O arquivo está no histórico do GitHub; avaliar reescrever o histórico.
- [ ] Remover os logs que imprimem `INSTAGRAM_CLIENT_ID` (`index.ts`, `instagramAuthService.ts`).
- [ ] Criptografar os tokens em `data/instagram_accounts/` (AES-GCM com chave no `.env`).

**Instagram**
- [ ] Ler a expiração real do token (`/debug_token`) em vez de estimar 60 dias.
- [ ] Trocar automaticamente para um token de Página, que não expira.
- [ ] Unificar o OAuth (Instagram Login × Facebook Login) ou remover o fluxo quebrado.
- [x] Atualizar a versão da Graph API (agora `v23.0`) e centralizar a URL base (`services/graphApi.ts`).

**Vídeo**
- [ ] Unificar a lógica de publicação (`videoController` × `instagramGraphService.publishReel`).
- [ ] Apagar o vídeo do Cloudinary depois de publicar.
- [ ] Agendar `cleanupOldFiles()` sem apagar vídeos de posts pendentes.

**Código**
- [ ] Migrar `@google/generative-ai` → `@google/genai`; remover a dependência `openai`, que não é usada.
- [ ] Remover ou decidir o destino de `backend/data/virtual_characters/` (sobra de uma funcionalidade abandonada).
- [ ] ⚠️ Testes com Jest ([ADR 0015](decisions/0015-framework-de-testes.md)): configurado no backend (`npm test`), com os primeiros testes em `text.test.ts`. Falta o frontend e cobrir a lógica principal.
- [x] Documentação reescrita com o novo propósito.
- [x] `.env.example` corrigido (Gemini e Cloudinary; sem OpenAI).

## Fase 1: protótipo e biblioteca (prioridade)

Especificação: [AUTO_EDIT.md](AUTO_EDIT.md)

- [ ] **M1: protótipo Remotion.** ⚠️ Prévia pronta: `frontend/src/video/` (FullImage, Evidence, legendas, setas/X/círculos, figurinhas, sons, música) no `@remotion/player`, com estilos como configuração. Render MP4 pronto (`frontend/scripts/render.mjs`, chamado por `backend/src/services/shorts/render.ts`). Transcrição com whisper.cpp local: legenda e cortes no tempo da voz ([ADR 0018](decisions/0018-legenda-sincronizada-com-a-voz.md)).
  - Original: pacote `video/` com `FullImage`, `Evidence` e `Caption`, e **estilos como arquivo de configuração desde o início** (o `comentario-anime` primeiro); áudio + pasta de imagens → Whisper → batidas de 2 a 4 palavras → **prévia no `@remotion/player`** + render MP4 no backend. Sem LLM.
- [x] Estrutura de **projetos** (`data/short_projects/`, com histórico de ajustes e desfazer). Jobs em background ainda não.
  - Original: (`data/projects/<id>/`) com versões do plano e jobs em background.
- [x] **M2: biblioteca.** Feito: catalogação por visão (personagens, etiquetas, descrição, regiões), busca, controle de uso, figurinhas, efeitos sonoros e músicas (com áudio de links via yt-dlp). Falta: variantes de recorte.
  - Original: `data/library/` + `index.json`, catalogação por visão (personagens, tags, descrição, **regiões**), busca e variantes de recorte, controle de uso para evitar repetição.

## Fase 2: roteiro, planejador e anotações

- [x] **M3: roteiro e planejador.** Feito: roteiro em cenas pela IA, escolha de imagens pela IA lendo o roteiro (ou por palavras), tela "Trocar imagem" com sugestões da internet já buscadas por cena (AniList, Danbooru e Google opcional via Serper), colar, arrastar e URL.
  - Original: Tema → roteiro editável ("copiar narração"); batidas + candidatos da biblioteca → `EditPlan` pelo LLM; **lista de busca** com arrastar, colar e URL. Reaproveita o gerador de prompts atual.
- [ ] Caminho "já tenho o áudio": transcrição → roteiro reconstruído.
- [ ] **M4: anotações e memes.** ⚠️ Feito: setas para regiões, X, círculos, emojis e figurinhas. Falta: Logo, Meme, Clip, Versus, TitleCard.
  - Original: `Arrow` apontando para regiões, `Cross`, `Circle`, `Emoji`, `Sticker`, `Logo`, `Flash`, `Meme`, `Clip`, `Versus`, `TitleCard`.
- [x] Provedor de IA com reserva automática: Gemini → Claude Sonnet 5.5 com esforço médio (API ou Claude Code do plano Pro/Max), em `services/shorts/llm.ts`. Ver [AI.md](AI.md). Falta: Ollama e saída estruturada com validação.

## Fase 3: áudio, editor e ajustes

- [ ] **M5: áudio.** ⚠️ Feito: biblioteca de SFX e música, sons colocados por tipo de efeito, música por clima com volume baixo sob a voz. Falta: normalização.
  - Original: Biblioteca de SFX e música, regras `sfx` de cada estilo, ducking, normalização.
- [ ] ~~**M6: editor da prévia.**~~ Trocado pelo editor automático (revisão + "Peça um ajuste" + ajustes rápidos); sem linha do tempo manual.
  - Original: Linha do tempo de batidas, trocar material e tipo de cena, arrastar a seta, dividir e mesclar batidas, editar legendas, desfazer/refazer.
- [x] **Bordões de abertura e de final** ([ADR 0016](decisions/0016-bordoes-de-abertura-e-final.md)): clipe pronto, montado ou "se inscreve", criados na biblioteca e escolhidos por vídeo na revisão. Substitui o "Seu canal" de Configurações.
- [x] **M7: ajustes em linguagem natural.** "Peça um ajuste" com histórico e desfazer; ritmo e efeitos também viram pedidos para a IA.
  - Original: Pedido → patch → nova versão.
- [ ] Exportar o MP4 (Shorts/TikTok) além de publicar no Instagram.
- [x] **M8: mais estilos.** 7 estilos embutidos e tela para ajustar e salvar os seus.
  - Original: `explicativo`, `curiosidades`, `historia-com-fundo` (fundo de gameplay + `TextCard`), `ranking`; tela para duplicar, ajustar e salvar estilos.
- [ ] **M9: estilo por referência.** Vídeo de referência → rascunho de estilo (ritmo de cortes, legendas, tipos de cena).
- [ ] **M10 (opcionais):** ElevenLabs via API, geração de imagem por IA, Pexels, modo gravado, upload direto no YouTube Shorts.

## Fase 4: ciclo de aprendizado (o "Search")

Decidido no [ADR 0021](decisions/0021-ideias-a-partir-do-desempenho.md): métricas comparadas com a mediana do canal, fotos com 1, 7 e 28 dias, e uma tela Ideias com banco de ideias, que depois vira a fila da criação autônoma (ADR 0022, ainda por escrever).

- [x] Coletar periodicamente as métricas de cada vídeo publicado (visualizações, alcance, retenção, salvamentos, compartilhamentos) e guardar fotos com 1, 7 e 28 dias (`services/insights/`).
- [x] Ligar cada post ao seu projeto (pelo id salvo ao publicar; tema, estilo, tom e duração vêm do projeto).
- [ ] **Perfis de referência via Business Discovery API**, tornando Perfis e Análises funcionais.
- [ ] Implementar `POST /api/content/generate` de verdade: sugestões de **temas** baseadas no que funcionou.
- [ ] Dashboard "o que funcionou": melhores ganchos, duração ideal, melhor horário.

## Fase 5: pronto para outras pessoas

- [ ] Docker Compose (backend + frontend + Remotion/Chrome headless + whisper) e guia de VPS.
- [ ] Assistente de configuração na primeira execução (checa FFmpeg, chaves e conexão).
- [ ] Autenticação simples no painel, para rodar fora do localhost.
- [ ] Várias contas Instagram.
- [ ] Nova tentativa automática e notificações de falha no agendador.
- [ ] CI no GitHub Actions (lint + testes + build).

---

## Fora do escopo (decisão consciente)

- Integração com IAs geradoras de vídeo (Grok, Sora, Veo...) como dependência. Motivo: [PURPOSE.md](PURPOSE.md#por-que-mudamos-de-rumo).
- Scraping, bots de seguir/curtir/comentar.
- Virar SaaS hospedado.
