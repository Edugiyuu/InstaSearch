# 0023 — Documentação enxuta em poucos arquivos, com diagramas

**Status:** Aceita · **Data:** 2026-10-08

## Contexto

A documentação tinha crescido para **14 arquivos em `docs/`** (PURPOSE, ARCHITECTURE, AUTO_EDIT, USO, AI, API, SETUP, INSTAGRAM, YOUTUBE, VIDEO_PIPELINE, SCHEDULER, COSTS, ROADMAP, FIGMA), mais o README e o `CONTRIBUTING.md`: umas 2.900 linhas. O usuário achou tudo "muito bagunçado". Ele pediu uma documentação bem visual, que ele, dono do repositório, entenda sem virar *vibe coder*, e que sirva para quem chega de fora.

Os problemas eram reais:

- **Repetição:** o fluxo tema → Short estava descrito no README, no PURPOSE, no AUTO_EDIT, no USO e no VIDEO_PIPELINE, cada um com um pedaço diferente.
- **Partes velhas:** o README ainda dizia que o render do MP4 era "próximo passo"; o VIDEO_PIPELINE chamava de "planejado" a edição automática que já funciona; o ARCHITECTURE e o CONTRIBUTING descreviam uma pasta `video/` e um `EditPlan` que nunca existiram.
- **Diagramas em texto** (caixas ASCII), que quebram em telas estreitas e não mostram bem as setas.
- A Definição de Pronto mandava atualizar "o documento correspondente em `docs/`": com 14 arquivos, era fácil esquecer um, e foi o que aconteceu.

## Decisão

**Cinco documentos, um por pergunta**, sem repetir conteúdo entre eles:

| Arquivo | Responde | Para quem |
|---|---|---|
| `README.md` | O que é isso? (curto: o que faz, por que existe, onde ler mais, começo rápido) | Quem chega |
| `docs/USO.md` | Como uso? (o caminho de um vídeo, tela por tela, e um glossário) | Quem usa |
| `docs/INSTALACAO.md` | Como instalo e conecto as contas? Quanto custa? | Quem instala |
| `docs/ARQUITETURA.md` | Como funciona por dentro? | Quem lê ou mexe no código |
| `CONTRIBUTING.md` | Como o projeto é tocado? (princípios, estado atual, fluxo, regras, comandos) | Quem contribui |

- **Diagramas são imagens SVG geradas de arquivos [Mermaid](https://mermaid.js.org/)** em `docs/diagramas/`: o `.mmd` é o texto do diagrama (fácil de editar e de ver a diferença num commit) e o `.svg` é a imagem que os documentos mostram. O comando para gerar de novo está no `CONTRIBUTING.md`, em "Comandos".
- Continuam com o seu papel: `BOARD.md` (as tarefas, [ADR 0014](0014-board-em-arquivo-e-commit-por-tarefa.md)), `docs/decisions/` (o porquê, [ADR 0001](0001-registrar-decisoes-com-adrs.md)) e `CLAUDE.md`.
- **Saem:** os 14 arquivos antigos de `docs/` (o conteúdo que valia foi para os cinco acima) e os scripts de teste manual em `backend/scripts/` que só chamavam endpoints das telas antigas (`test-*.ps1`, `test-*.js`, `check-instagram-setup.ps1`). Fica o `add-token.js`, que ainda é usado.
- A especificação longa (`AUTO_EDIT.md`) e a referência dos endpoints (`API.md`) não foram copiadas: as rotas estão em `backend/src/routes/api.ts` e os tipos em `backend/src/services/shorts/types.ts`, que não ficam velhos. O texto antigo continua no histórico do git.
- Os ADRs antigos que apontavam para os arquivos apagados passam a apontar para a versão deles no commit `3eef5d4`, o último em que existiam. Assim o link mostra o que o ADR leu na época, e a decisão do ADR não muda.

## Alternativas consideradas

- **Tudo num README só (a primeira versão desta decisão):** um lugar só para ler e atualizar, mas deu 765 linhas. O usuário achou gigante: o README é para dar uma visão geral, não para falar de tudo.
- **Mermaid direto no Markdown (também da primeira versão):** o GitHub desenha sozinho, mas qualquer outro visualizador (a prévia do VS Code, o painel de arquivos do app do Claude) mostra só o código. O usuário viu o código e não os diagramas.
- **Manter os 14 arquivos e só limpar:** menos mudança, mas continuaria a repetição e muitos lugares para atualizar.
- **Site de documentação (Docusaurus, GitHub Pages, wiki):** mais bonito e com busca, mas é mais uma ferramenta para instalar e publicar, longe do código.
- **Diagramas desenhados à mão (Figma, Excalidraw):** mais livres no visual, mas sem texto por trás: a imagem não muda junto com o código e não dá para ver a diferença num commit.

## Consequências

- **Ganhamos:** um README que se lê em um minuto; cada dúvida tem um arquivo certo; diagramas que aparecem em qualquer visualizador; o estado de cada parte conferido com o código, e não com os planos.
- **Perdemos / custa:** cada diagrama vira dois arquivos (`.mmd` e `.svg`), e é preciso gerar o `.svg` de novo depois de editar o `.mmd`; o gerador (`@mermaid-js/mermaid-cli`) baixa um navegador na primeira vez. Detalhes finos dos guias antigos (a tabela de cada endpoint, o passo a passo do Figma com MCP, as opções de linha de comando do Claude Code) agora só estão no código ou no histórico do git.
- **Revisar quando:** um dos cinco passar de umas 300 linhas (aí ele se divide), ou entrar alguém com uma necessidade nova (uma referência de API para quem integra, por exemplo).
