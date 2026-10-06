# 0013 — Workflow Kanban no GitHub Projects

**Status:** Substituída por [0014](0014-board-em-arquivo-e-commit-por-tarefa.md) · **Data:** 2026-10-05

## Contexto

O projeto é feito por uma pessoa com o Claude Code, e estava ficando desorganizado: em 2026-10-05 havia 55 arquivos alterados sem commit, misturando sete features. Isso impedia separar as mudanças, desfazer só uma parte ou saber o que causou um problema. Faltava um lugar para ver o que está sendo feito, o que vem depois e o que foi entregue.

## Decisão

Usar **Kanban** com um board no **GitHub Projects**, cada tarefa como uma issue:

- Colunas `Backlog → A fazer → Fazendo → Revisão → Feito`.
- **No máximo 1 cartão em "Fazendo"**; o que aparecer no meio vira issue no Backlog.
- Uma branch e um PR por issue; o usuário revisa e aprova o merge.
- Conventional Commits e uma Definição de Pronto, descritos no [`CLAUDE.md`](../../CLAUDE.md), que o Claude lê no início de toda sessão.

## Alternativas consideradas

- **Scrum:** feito para equipes de 5 a 9 pessoas, com papéis, sprints e cerimônias. Para duas "pessoas" vira burocracia.
- **Board num arquivo do repositório (`docs/BOARD.md`):** mais simples e sempre lido pelo Claude, mas sem visual de board e sem ligação automática entre issue, PR e commit.
- **Ferramenta externa (Trello, Notion):** fica longe do código, e o Claude não tem acesso sem configuração extra.

## Consequências

- **Ganhamos:** visão clara do trabalho; commits e PRs que contam a história de cada tarefa; `Closes #N` fecha a issue sozinho no merge; o Claude cria e move cartões pelo `gh`.
- **Custa:** cada tarefa precisa de issue, branch e PR, mesmo as pequenas. O `gh` precisa do escopo `project`.
- **Atenção:** o repositório é **público**, então as issues também são. Nada de segredos ou dados pessoais nelas.
- **Revisar quando:** o processo começar a atrasar mais do que ajuda, ou entrar mais gente no projeto.
