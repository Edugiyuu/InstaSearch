# InstaSearch — instruções para o Claude

App pessoal e *self-hosted* que transforma um tema num Short narrado: roteiro (IA) → voz → montagem automática com a biblioteca de imagens → prévia no Remotion → render MP4 → publicar no Instagram e no YouTube. Propósito em [docs/PURPOSE.md](docs/PURPOSE.md), arquitetura em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

**Idioma:** conversa, documentação, textos da interface e mensagens de commit em **PT-BR**. Nomes de código em inglês, como já está.

## Antes de mudar algo

1. Leia o ADR da área em [docs/decisions/](docs/decisions/README.md). Se a mudança contraria um ADR **Aceito**, pare e avise o usuário antes: diga o que a decisão original perde.
2. Siga os padrões de código do [CONTRIBUTING.md](CONTRIBUTING.md) (backend `routes → controllers → services → storage`, frontend `página → hook → api`, providers para serviços externos, nada de segredos no código).
3. Regras de produto do [ADR 0011](docs/decisions/0011-editor-automatico.md): editor automático, a IA sugere e o usuário aprova, sem linha do tempo/trilhas, **sem dados de mentira nem prévias falsas**.

## Workflow (ver [ADR 0014](docs/decisions/0014-board-em-arquivo-e-commit-por-tarefa.md))

O board é o **[BOARD.md](BOARD.md)**, na raiz. **Leia no início de cada sessão** para saber o que está em andamento. Colunas: `Fazendo`, `A fazer`, `Backlog`, `Feito`; a ordem das listas é a prioridade, e quem decide a prioridade é o usuário.

**Limite: 1 tarefa em "Fazendo".** Não começar outra com uma aberta. Se surgir algo fora do escopo no meio do trabalho, anote no Backlog e continue a tarefa atual.

Ciclo de uma tarefa:

1. **Escolha:** o usuário escolhe a tarefa (ou diz "a próxima": a primeira de "A fazer"). Mova para "Fazendo".
2. **Execução:** só o que a tarefa pede. Nada de misturar outras mudanças.
3. **Revisão por explicação:** cumpra a Definição de Pronto e **explique a mudança antes do commit**. O usuário quer entender o código, não só aceitar (ele não quer virar *vibe coder*). Para cada arquivo alterado:
   - **o que** mudou, apontando os trechos (`arquivo.ts:linha`);
   - **por que foi feito desse jeito**, e não de outro: as alternativas e o motivo da escolha;
   - **conceitos novos** (padrão, API, recurso da linguagem) explicados em poucas palavras.

   Responda às perguntas até ele entender. Se ele preferir outro caminho, ajuste. Ele também testa o app quando a interface muda.
4. **Commit no `master`** só depois da revisão, um por tarefa. O corpo do commit resume o porquê da explicação. O mesmo commit move a tarefa para "Feito" no `BOARD.md` (com a data). Push só quando o usuário pedir.

Branch só para experimento arriscado, que talvez seja descartado. Sem PRs.

**Commits** em [Conventional Commits](https://www.conventionalcommits.org/pt-br/): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`. A primeira linha diz *o quê*; o corpo diz *por quê*, quando não for óbvio.

### Definição de Pronto

- [ ] Compila: `npx tsc --noEmit -p backend` e `-p frontend` sem erros novos
- [ ] Se mudou a interface: testado no navegador (preview `frontend` em `.claude/launch.json`)
- [ ] Documentação em `docs/` e status no [ROADMAP](docs/ROADMAP.md) atualizados, se o comportamento mudou
- [ ] ADR escrito, se a tarefa tomou uma decisão importante (critérios abaixo)
- [ ] Mudança explicada ao usuário (o quê, por quê, alternativas) e dúvidas respondidas
- [ ] `BOARD.md` atualizado no mesmo commit

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
npm --prefix backend test       # testes (Jest; ver ADR 0015)
```

Problema conhecido: o `tsc` do backend acusa 18 erros antigos (variáveis não usadas e funções sem `return` em todos os caminhos); não são erros novos. Está no BOARD.
