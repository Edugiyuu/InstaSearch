# Board

O que está sendo feito, o que vem depois e o que já foi entregue. Como funciona no [ADR 0014](docs/decisions/0014-board-em-arquivo-e-commit-por-tarefa.md); a visão de longo prazo fica no [ROADMAP](docs/ROADMAP.md).

**Regras:** no máximo **1 tarefa em "Fazendo"**. Ideia nova no meio do trabalho vai para o Backlog. Cada tarefa termina num commit próprio, que também atualiza este arquivo. A ordem das listas é a prioridade: a primeira de "A fazer" é a próxima.

## Fazendo

_(nada; escolha a próxima em "A fazer")_

## A fazer

- [ ] 🔴 Revogar o token versionado em `backend/scripts/add-token.js` e ler o token do argumento ou do `.env` (a revogação no painel da Meta é com você)
- [ ] Corrigir os 18 erros antigos do `tsc` no backend: variáveis não usadas e funções sem `return` em todos os caminhos (hoje o `npm run build` do backend falha)
- [ ] Adicionar `.gitattributes` para padronizar as quebras de linha (LF/CRLF)
- [ ] Remover a dependência `openai`, que não é usada (pendência do [ADR 0006](docs/decisions/0006-remover-openai.md))

## Backlog

- [ ] Configurar o Jest no frontend (timeline do vídeo)
- [ ] Whisper local para a legenda palavra por palavra (começar por um ADR em Proposta)
- [ ] Migrar `@google/generative-ai` → `@google/genai`
- [ ] Remover os logs que imprimem `INSTAGRAM_CLIENT_ID`
- [ ] Criptografar os tokens em `data/instagram_accounts/`
- [ ] Apagar o vídeo do Cloudinary depois de publicar
- [ ] Demais itens da Fase 0 do [ROADMAP](docs/ROADMAP.md#fase-0-fundação-e-segurança-prioridade-imediata)

## Feito

- [x] 2026-10-06 · Jest no backend, com os primeiros testes ([ADR 0015](docs/decisions/0015-framework-de-testes.md))
- [x] 2026-10-06 · Bordões de abertura e de final na biblioteca, escolhidos na edição ([ADR 0016](docs/decisions/0016-bordoes-de-abertura-e-final.md))
- [x] 2026-10-05 · Workflow: board em arquivo e commit por tarefa (ADR 0014)
- [x] 2026-10-05 · ADRs em `docs/decisions/` e `CLAUDE.md`
- [x] 2026-10-05 · Render MP4, publicação no YouTube/Instagram e busca de imagens
