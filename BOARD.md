# Board

O que está sendo feito, o que vem depois e o que já foi entregue. Como funciona no [ADR 0014](docs/decisions/0014-board-em-arquivo-e-commit-por-tarefa.md); a visão de longo prazo fica no [ROADMAP](docs/ROADMAP.md).

**Regras:** no máximo **1 tarefa em "Fazendo"**. Ideia nova no meio do trabalho vai para o Backlog. Cada tarefa termina num commit próprio, que também atualiza este arquivo. A ordem das listas é a prioridade: a primeira de "A fazer" é a próxima.

## Fazendo

- [ ] ADR 0021 (Proposta): ideias de vídeo a partir do desempenho no Instagram e no YouTube; esperando a escolha do usuário

## A fazer

- [ ] 🔴 Revogar o token versionado em `backend/scripts/add-token.js` e ler o token do argumento ou do `.env` (a revogação no painel da Meta é com você)
- [ ] Corrigir os 18 erros antigos do `tsc` no backend: variáveis não usadas e funções sem `return` em todos os caminhos (hoje o `npm run build` do backend falha)
- [ ] Adicionar `.gitattributes` para padronizar as quebras de linha (LF/CRLF)
- [ ] Remover a dependência `openai`, que não é usada (pendência do [ADR 0006](docs/decisions/0006-remover-openai.md))

## Backlog

- [ ] Configurar o ESLint no frontend: não há arquivo de configuração, então o `npm run lint` falha antes de analisar qualquer arquivo
- [ ] Configurar o Jest no frontend (timeline do vídeo e `video/align.ts`)
- [ ] IA: desistir do Gemini mais cedo quando a rede falha (hoje espera ~60 s antes de passar para o Claude; alternativa 1B do [ADR 0017](docs/decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md))
- [ ] Migrar `@google/generative-ai` → `@google/genai`
- [ ] Remover os logs que imprimem `INSTAGRAM_CLIENT_ID`
- [ ] Criptografar os tokens em `data/instagram_accounts/`
- [ ] Apagar o vídeo do Cloudinary depois de publicar
- [ ] ADR 0022: criação autônoma de vídeos, sem publicar (depende do [ADR 0021](docs/decisions/0021-ideias-a-partir-do-desempenho.md))
- [ ] Demais itens da Fase 0 do [ROADMAP](docs/ROADMAP.md#fase-0-fundação-e-segurança-prioridade-imediata)

## Feito

- [x] 2026-10-07 · Enquadramento por cena na revisão: automático, tela cheia ou inteira (adendo ao [ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-07 · Imagens específicas (a IA olha antes de escolher), memes e zoom na medida ([ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-06 · Roteiro com argumento (até 4 buscas, mostradas na tela) e tons próprios na biblioteca ([ADR 0019](docs/decisions/0019-roteiro-com-argumento-e-tons-proprios.md))
- [x] 2026-10-06 · Legenda e cortes no tempo da voz, com o Whisper local ([ADR 0018](docs/decisions/0018-legenda-sincronizada-com-a-voz.md))
- [x] 2026-10-06 · Troca de imagem sem esperar a catalogação e chat que acerta a cena ([ADR 0017](docs/decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md))
- [x] 2026-10-06 · Jest no backend, com os primeiros testes ([ADR 0015](docs/decisions/0015-framework-de-testes.md))
- [x] 2026-10-06 · Bordões de abertura e de final na biblioteca, escolhidos na edição ([ADR 0016](docs/decisions/0016-bordoes-de-abertura-e-final.md))
- [x] 2026-10-05 · Workflow: board em arquivo e commit por tarefa (ADR 0014)
- [x] 2026-10-05 · ADRs em `docs/decisions/` e `CLAUDE.md`
- [x] 2026-10-05 · Render MP4, publicação no YouTube/Instagram e busca de imagens
