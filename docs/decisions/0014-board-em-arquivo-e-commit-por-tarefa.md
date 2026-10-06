# 0014 — Board em arquivo e um commit por tarefa, sem branches nem PRs

**Status:** Aceita · **Data:** 2026-10-05 · **Substitui:** [0013](0013-workflow-kanban-github-projects.md)

## Contexto

O [ADR 0013](0013-workflow-kanban-github-projects.md) adotou Kanban no GitHub Projects, com issue, branch e PR por tarefa. No mesmo dia, antes de o board ser criado, o usuário questionou se isso não era excessivo para uma pessoa trabalhando com o Claude. Abrir branch e PR só para o próprio usuário clicar em "merge" é cerimônia. Sem PRs, a principal vantagem do GitHub Projects (ligar issue, PR e commit) quase some, e ainda sobram custos: escopo extra no `gh`, abrir o site para ver o board e tarefas visíveis num repositório público.

A causa real da bagunça que motivou o 0013 não era a falta de branches. Eram várias tarefas abertas ao mesmo tempo, sem commit.

Deixar de usar PRs **não** significa deixar de revisar o código. O usuário não quer só testar o app e aceitar o que o Claude escreveu: quer **entender por que o código foi feito daquele jeito**, para continuar dono do projeto e aprender com ele, em vez de virar alguém que só aceita código gerado sem entender (*vibe coding*). Essa revisão precisa de um lugar no fluxo.

## Decisão

- O board é o arquivo **`BOARD.md` na raiz**, com as colunas `Fazendo`, `A fazer`, `Backlog` e `Feito`. A ordem das listas é a prioridade.
- **No máximo 1 tarefa em "Fazendo"**, como no 0013.
- **Revisão por explicação:** antes do commit, o Claude explica a mudança: o que mudou em cada arquivo, **por que foi feito daquele jeito**, que alternativas existiam e qualquer conceito novo que apareceu. O usuário pergunta até entender, pode pedir outro caminho e também testa o app.
- **Um commit por tarefa, direto no `master`**, só depois dessa revisão. O corpo do commit guarda o resumo do porquê, para a explicação não se perder com a conversa. O mesmo commit atualiza o `BOARD.md`.
- Branch só para experimento arriscado, que talvez seja descartado.
- Continuam valendo os Conventional Commits, a Definição de Pronto e os ADRs, descritos no [`CLAUDE.md`](../../CLAUDE.md).

## Alternativas consideradas

- **Manter o 0013 (GitHub Projects + PRs):** cerimônia sem revisor, como explicado no contexto.
- **Só issues do GitHub, sem Projects:** menos configuração, mas continua fora do repositório e público, e o Claude precisaria do `gh` para ler.
- **Seção "Agora" no topo do ROADMAP:** um arquivo a menos, mas mistura a visão de longo prazo com as tarefas do dia, e o ROADMAP perde a visão geral.

## Consequências

- **Ganhamos:** zero configuração; o Claude lê o board no início de cada sessão; o histórico do board vem junto com os commits. O usuário entende cada mudança antes de ela entrar, e o `git log` passa a explicar o código.
- **Custa:** cada tarefa leva mais tempo, por causa da explicação e das perguntas. Sem visual de quadro arrastável. Sem branches, um commit ruim no `master` só sai com `git revert`.
- **Revisar quando:** entrar outra pessoa no projeto. Aí PRs e um board compartilhado voltam a fazer sentido.
