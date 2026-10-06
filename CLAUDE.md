# InstaSearch — instruções para o Claude

App pessoal e *self-hosted* que transforma um tema num Short narrado: roteiro (IA) → voz → montagem automática com a biblioteca de imagens → prévia no Remotion → render MP4 → publicar no Instagram e no YouTube. Propósito em [docs/PURPOSE.md](docs/PURPOSE.md), arquitetura em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Idioma:** conversa, documentação, textos da interface e mensagens de commit em **PT-BR**. Nomes de código em inglês, como já está.

## Antes de mudar algo

1. Leia o ADR da área em [docs/decisions/](docs/decisions/README.md). Se a mudança contraria um ADR **Aceito**, pare e avise o usuário antes: diga o que a decisão original perde.
2. Siga os padrões de código do [CONTRIBUTING.md](CONTRIBUTING.md) (backend `routes → controllers → services → storage`, frontend `página → hook → api`, providers para serviços externos, nada de segredos no código).
3. Regras de produto do [ADR 0011](docs/decisions/0011-editor-automatico.md): editor automático, a IA sugere e o usuário aprova, sem linha do tempo/trilhas, **sem dados de mentira nem prévias falsas**.

## Workflow (Kanban — ver [ADR 0013](docs/decisions/0013-workflow-kanban-github-projects.md))

O board fica no **GitHub Projects** do repositório `Edugiyuu/InstaSearch`. Cada tarefa é uma **issue**.

Colunas: `Backlog → A fazer → Fazendo → Revisão → Feito`

**Limite: 1 cartão em "Fazendo".** Não começar outra tarefa com uma aberta. Se surgir algo fora do escopo no meio do trabalho, crie uma issue no Backlog e continue a tarefa atual.

Ciclo de uma tarefa:

1. **Escolha:** o usuário escolhe a issue. Mova para "Fazendo".
2. **Branch** a partir do `master` atualizado: `tipo/<nº-da-issue>-descricao-curta` (ex.: `feat/14-whisper-local`, `fix/21-avisos-tsc`).
3. **Commits pequenos** em [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. A primeira linha diz *o quê*; o corpo diz *por quê*, quando não for óbvio. Sem misturar features num commit.
4. **Pronto para revisão:** cumpra a Definição de Pronto, abra o PR com `Closes #<nº>` e mova para "Revisão".
5. **Revisão do usuário:** ele testa e aprova. Só então merge no `master`; a issue fecha sozinha e vai para "Feito".

Nunca faça commit direto no `master` fora desse fluxo, a não ser que o usuário peça.

### Definição de Pronto

- [ ] Compila: `npx tsc --noEmit -p .` no `backend` e no `frontend` sem erros novos
- [ ] Se mudou a interface: testado no navegador (preview `frontend` em `.claude/launch.json`)
- [ ] Documentação em `docs/` e status no [ROADMAP](docs/ROADMAP.md) atualizados, se o comportamento mudou
- [ ] ADR escrito, se a tarefa tomou uma decisão importante (critérios abaixo)
- [ ] PR explica **o quê**, **por quê** e **como testar**

## ADRs

O porquê das decisões importantes fica em [docs/decisions/](docs/decisions/README.md). Escreva um ADR quando a decisão tiver alternativas reais, for cara de desfazer, virar regra do projeto ou contrariar o óbvio. Não escreva para bugs, ajustes de tela ou escolhas sem alternativa.

- **Decisão grande ainda não tomada:** escreva o ADR como **Proposta**, compare as alternativas e espere o usuário escolher **antes** de implementar.
- **Mudou de ideia:** ADR novo que substitui o antigo; nunca apague nem reescreva a decisão de um ADR.
- Adicione cada ADR ao índice do README da pasta e cite o número no commit (`(ADR 0014)`).

## Comandos

```bash
npm --prefix backend run dev     # API em localhost:3000
npm --prefix frontend run dev    # app em localhost:5173
npx tsc --noEmit -p backend      # checagem de tipos
npx tsc --noEmit -p frontend
npm --prefix frontend run lint
```

Board e issues pelo `gh` (precisa do escopo `project`: `gh auth refresh -s project`):

```bash
gh issue list
gh issue create --title "..." --body "..." --label "..."
gh project item-list <nº-do-projeto> --owner Edugiyuu
```

Problema conhecido: o `tsc` do backend acusa variáveis não usadas (`noUnusedLocals`) em arquivos antigos; não são erros novos.
