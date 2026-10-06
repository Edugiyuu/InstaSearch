# 0006 — Remover a OpenAI do projeto

**Status:** Aceita · **Data:** 2026-10-03 (retroativo; começou em 2026-02-15)

## Contexto

A documentação, o `.env.example` e a tela de Configurações citavam uma API da OpenAI, mas o código não usava a OpenAI em lugar nenhum. Isso fazia o usuário achar que precisava de mais uma chave paga para o app funcionar.

## Decisão

Tirar a OpenAI da documentação (commits `fdcbced` e `cc6de24`), do `.env.example` e da tela de Configurações. As IAs do projeto são o Gemini e o Claude ([0004](0004-gemini-com-reserva-automatica.md)).

## Alternativas consideradas

- **Implementar a OpenAI como mais um provedor:** não havia necessidade, e seria mais um conjunto de prompts para testar.

## Consequências

- **Ganhamos:** configuração mais simples e documentação fiel ao que o código faz.
- **Pendente:** o pacote `openai` ainda está no `package.json` do backend sem ser usado. Removê-lo é uma tarefa do backlog.
