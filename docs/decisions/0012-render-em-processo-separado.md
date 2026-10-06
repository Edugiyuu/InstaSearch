# 0012 — Render em MP4 num processo separado, com o código do frontend

**Status:** Aceita · **Data:** 2026-10-05 (retroativo)

## Contexto

Para publicar, o vídeo precisa virar um MP4. A composição do Remotion ([0009](0009-remotion-para-composicao.md)) vive no frontend, junto com o React da prévia. O render é demorado e pesado, e o backend precisa continuar respondendo enquanto ele roda. A arquitetura-alvo previa um pacote `video/` compartilhado entre frontend e backend, que ainda não existe.

## Decisão

O navegador envia ao backend as mesmas *props* da prévia (com a timeline já calculada). O backend (`services/shorts/render.ts`) roda `frontend/scripts/render.mjs` num **processo separado**, que lê o progresso como uma linha JSON por evento e salva o MP4 em `data/short_projects/renders/`. Um hash das *props* indica se o MP4 salvo ainda corresponde ao vídeo atual, e o bundle só é refeito quando a composição muda.

## Alternativas consideradas

- **Renderizar dentro do processo do backend:** o backend teria que importar React e o código do frontend, e um render travado derrubaria a API.
- **Criar já o pacote `video/` compartilhado:** é o destino planejado, mas exigiria reorganizar o projeto antes de ter o render funcionando.
- **Renderizar no navegador:** não há suporte estável e prenderia a aba aberta durante o render.

## Consequências

- **Ganhamos:** a prévia e o MP4 saem do mesmo código; um render com erro não derruba o backend; renders repetidos são reaproveitados.
- **Custa:** o backend depende do caminho `frontend/scripts/` e das dependências do frontend instaladas.
- **Revisar quando:** for criado o pacote `video/` compartilhado; aí o script de render muda para lá.
