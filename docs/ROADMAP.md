# Roadmap

Substitui o antigo `PROGRESS.md`. Atualizado em **outubro de 2026**.

Legenda: ✅ pronto · ⚠️ funciona com ressalvas · 🚧 incompleto/stub · 📋 planejado

## Estado atual por tela

| Tela (rota) | Estado | Observação |
|---|---|---|
| Dashboard (`/`) | ⚠️ | Contadores gerais; vai virar a lista de projetos + o painel "o que funcionou" |
| Meu Perfil (`/my-profile`) | ✅ | Perfil, reels e insights da conta + análise por IA |
| Publicar Reels (`/video-publish`) | ✅ | Upload, junção, legenda por IA, publicação |
| Calendário (`/calendar`) | ✅ | Agendamento e publicação automática |
| Configurações (`/settings`) | ✅ | Conexão com o Instagram |
| Prompts de Vídeo (`/video-prompts`) | ⚠️ legado | Vai virar o gerador de roteiro (Fase 2, M3) |
| Perfis (`/profiles`) | 🚧 | Salva o username, mas não busca dados (o comentário cita um "scraper" que não existe) |
| Análises (`/analysis`) | 🚧 | Tela estática; o backend analisa perfis vazios |
| Conteúdo (`/content`) | 🚧 | `POST /api/content/generate` é um stub (`TODO`) |

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
- [ ] Atualizar a versão da Graph API (fixada em `v18.0`) e centralizar a URL base.

**Vídeo**
- [ ] Unificar a lógica de publicação (`videoController` × `instagramGraphService.publishReel`).
- [ ] Apagar o vídeo do Cloudinary depois de publicar.
- [ ] Agendar `cleanupOldFiles()` sem apagar vídeos de posts pendentes.

**Código**
- [ ] Migrar `@google/generative-ai` → `@google/genai`; remover a dependência `openai`, que não é usada.
- [ ] Remover ou decidir o destino de `backend/data/virtual_characters/` (sobra de uma funcionalidade abandonada).
- [ ] Configurar testes de verdade (Vitest); hoje `npm test` só imprime uma mensagem.
- [x] Documentação reescrita com o novo propósito.
- [x] `.env.example` corrigido (Gemini e Cloudinary; sem OpenAI).

## Fase 1: protótipo e biblioteca (prioridade)

Especificação: [AUTO_EDIT.md](AUTO_EDIT.md)

- [ ] **M1: protótipo Remotion.** Pacote `video/` com `FullImage`, `Evidence` e `Caption`, e **estilos como arquivo de configuração desde o início** (o `comentario-anime` primeiro); áudio + pasta de imagens → Whisper → batidas de 2 a 4 palavras → **prévia no `@remotion/player`** + render MP4 no backend. Sem LLM.
- [ ] Estrutura de **projetos** (`data/projects/<id>/`) com versões do plano e jobs em background.
- [ ] **M2: biblioteca.** `data/library/` + `index.json`, catalogação por visão (personagens, tags, descrição, **regiões**), busca e variantes de recorte, controle de uso para evitar repetição.

## Fase 2: roteiro, planejador e anotações

- [ ] **M3: roteiro e planejador.** Tema → roteiro editável ("copiar narração"); batidas + candidatos da biblioteca → `EditPlan` pelo LLM; **lista de busca** com arrastar, colar e URL. Reaproveita o gerador de prompts atual.
- [ ] Caminho "já tenho o áudio": transcrição → roteiro reconstruído.
- [ ] **M4: anotações e memes.** `Arrow` apontando para regiões, `Cross`, `Circle`, `Emoji`, `Sticker`, `Logo`, `Flash`, `Meme`, `Clip`, `Versus`, `TitleCard`.
- [ ] Abstração `LLMProvider` com saída estruturada (Gemini primeiro, Ollama em seguida).

## Fase 3: áudio, editor e ajustes

- [ ] **M5: áudio.** Biblioteca de SFX e música, regras `sfx` de cada estilo, ducking, normalização.
- [ ] **M6: editor da prévia.** Linha do tempo de batidas, trocar material e tipo de cena, arrastar a seta, dividir e mesclar batidas, editar legendas, desfazer/refazer.
- [ ] **M7: ajustes em linguagem natural.** Pedido → patch → nova versão.
- [ ] Exportar o MP4 (Shorts/TikTok) além de publicar no Instagram.
- [ ] **M8: mais estilos.** `explicativo`, `curiosidades`, `historia-com-fundo` (fundo de gameplay + `TextCard`), `ranking`; tela para duplicar, ajustar e salvar estilos.
- [ ] **M9: estilo por referência.** Vídeo de referência → rascunho de estilo (ritmo de cortes, legendas, tipos de cena).
- [ ] **M10 (opcionais):** ElevenLabs via API, geração de imagem por IA, Pexels, modo gravado, upload direto no YouTube Shorts.

## Fase 4: ciclo de aprendizado (o "Search")

- [ ] Coletar periodicamente os insights de cada vídeo publicado (plays, alcance, salvamentos, compartilhamentos) e guardar o histórico.
- [ ] Ligar cada post ao seu projeto (tema, estilo, gancho, duração, ritmo das batidas).
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
