# 0014 — Board em arquivo e um commit por tarefa, sem branches nem PRs

**Status:** Aceita · **Data:** 2026-10-05 · **Substitui:** [0013](0013-workflow-kanban-github-projects.md)

## Contexto

O [ADR 0013](0013-workflow-kanban-github-projects.md) adotou Kanban no GitHub Projects, com issue, branch e PR por tarefa. No mesmo dia, antes de o board ser criado, o usuário questionou se isso não era excessivo para uma pessoa trabalhando com o Claude. O PR existe para outra pessoa revisar o código antes de entrar, mas aqui a revisão é o usuário testar o app, e não ler código no GitHub. Sem PRs, a principal vantagem do GitHub Projects (ligar issue, PR e commit) quase some, e ainda sobram custos: escopo extra no `gh`, abrir o site para ver o board e tarefas visíveis num repositório público.

A causa real da bagunça que motivou o 0013 não era a falta de branches. Eram várias tarefas abertas ao mesmo tempo, sem commit.

## Decisão

- O board é o arquivo **`BOARD.md` na raiz**, com as colunas `Fazendo`, `A fazer`, `Backlog` e `Feito`. A ordem das listas é a prioridade.
- **No máximo 1 tarefa em "Fazendo"**, como no 0013.
- **Um commit por tarefa, direto no `master`**, depois de o usuário testar. O mesmo commit atualiza o `BOARD.md`.
- Branch só para experimento arriscado, que talvez seja descartado.
- Continuam valendo os Conventional Commits, a Definição de Pronto e os ADRs, descritos no [`CLAUDE.md`](../../CLAUDE.md).

## Alternativas consideradas

- **Manter o 0013 (GitHub Projects + PRs):** cerimônia sem revisor, como explicado no contexto.
- **Só issues do GitHub, sem Projects:** menos configuração, mas continua fora do repositório e público, e o Claude precisaria do `gh` para ler.
- **Seção "Agora" no topo do ROADMAP:** um arquivo a menos, mas mistura a visão de longo prazo com as tarefas do dia, e o ROADMAP perde a visão geral.

## Consequências

- **Ganhamos:** zero configuração; o Claude lê o board no início de cada sessão; o histórico do board vem junto com os commits.
- **Custa:** sem visual de quadro arrastável. Sem branches, um commit ruim no `master` só sai com `git revert`.
- **Revisar quando:** entrar outra pessoa no projeto. Aí PRs e um board compartilhado voltam a fazer sentido.
