# Decisões (ADRs)

Cada arquivo aqui é um **ADR** (*Architecture Decision Record*, Registro de Decisão de Arquitetura): o **porquê** de uma decisão importante, o que mais foi considerado e o que ela custa. O código mostra *o que* foi feito; os ADRs guardam *por que* e *para quê*.

## Quando escrever um ADR

Escreva um ADR quando a decisão:

- escolhe uma biblioteca, serviço ou provedor (ex.: Remotion, Gemini, Cloudinary);
- muda a estrutura do código ou o formato dos dados;
- define uma regra de produto ou de processo que vale para o projeto todo;
- seria difícil ou cara de desfazer depois.

Mudanças menores não precisam de ADR: o porquê vai na descrição do PR ou no corpo da mensagem de commit.

## Como escrever

1. Copie [`template.md`](template.md) para `NNNN-titulo-curto.md`, com o próximo número.
2. Preencha Contexto, Decisão, Alternativas e Consequências. Seja curto: meia página basta.
3. Adicione uma linha na tabela abaixo.
4. Faça o commit junto com a mudança que a decisão gerou (ou antes dela).

**Um ADR nunca é apagado.** Se a decisão mudar, crie um ADR novo e mude o status do antigo para `Substituída por [NNNN](NNNN-...md)`. Assim o histórico do porquê fica completo.

Status possíveis: `Proposta` · `Aceita` · `Substituída por NNNN` · `Abandonada`.

ADRs marcados como **retroativos** registram decisões tomadas antes de adotarmos os ADRs (out/2026), reconstruídas a partir dos commits, da documentação e das conversas da época.

## Índice

| Nº | Decisão | Status |
|---|---|---|
| [0001](0001-registrar-decisoes-com-adrs.md) | Registrar decisões com ADRs | Aceita |
| [0002](0002-armazenamento-em-json.md) | Armazenamento em arquivos JSON, sem banco de dados | Aceita |
| [0003](0003-cloudinary-para-url-publica.md) | Cloudinary como URL pública temporária para o Instagram | Aceita |
| [0004](0004-gemini-com-reserva-automatica.md) | Gemini primeiro, com reserva automática em outros provedores | Aceita |
| [0005](0005-claude-code-do-plano-como-provedor.md) | Claude Code do plano Pro/Max como provedor de IA | Aceita |
| [0006](0006-remover-openai.md) | Remover a OpenAI do projeto | Aceita |
| [0007](0007-claude-haiku-como-reserva.md) | Claude Haiku 4.5 como modelo da reserva | Substituída por 0008 |
| [0008](0008-claude-sonnet-como-reserva.md) | Claude Sonnet 5.5 (esforço médio) como modelo da reserva | Aceita |
| [0009](0009-remotion-para-composicao.md) | Remotion para compor, pré-visualizar e renderizar | Aceita |
| [0010](0010-biblioteca-de-imagens-em-vez-de-geracao.md) | Biblioteca pessoal de imagens em vez de gerar imagens por IA | Aceita |
| [0011](0011-editor-automatico.md) | Editor automático, não editor manual | Aceita |
| [0012](0012-render-em-processo-separado.md) | Render em MP4 num processo separado, com o código do frontend | Aceita |
| [0013](0013-workflow-kanban-github-projects.md) | Workflow Kanban no GitHub Projects | Substituída por 0014 |
| [0014](0014-board-em-arquivo-e-commit-por-tarefa.md) | Board em arquivo e um commit por tarefa, sem branches nem PRs | Aceita |
| [0015](0015-framework-de-testes.md) | Framework de testes (Jest ou Vitest) | Proposta |
| [0016](0016-bordoes-de-abertura-e-final.md) | Bordões de abertura e de final na biblioteca | Aceita |
