# 0007 — Claude Haiku 4.5 como modelo da reserva

**Status:** Substituída por [0008](0008-claude-sonnet-como-reserva.md) · **Data:** 2026-10-04 (retroativo)

## Contexto

Com a reserva de IA definida ([0004](0004-gemini-com-reserva-automatica.md), [0005](0005-claude-code-do-plano-como-provedor.md)), faltava escolher o modelo do Claude. A prioridade era gastar pouco do plano e da API, já que a reserva pode entrar em todos os pedidos quando a cota do Gemini acaba.

## Decisão

Usar o `claude-haiku-4-5`, sem *thinking* e com prompt de sistema curto (commit `611c136`).

## Alternativas consideradas

- **Claude Sonnet:** mais caro e mais lento, numa época em que custo era a preocupação principal.

## Consequências

- **Ganhamos:** a reserva mais barata e rápida possível.
- **Problema que apareceu:** nos roteiros de anime, o Haiku às vezes inventava fatos, o que levou à [0008](0008-claude-sonnet-como-reserva.md).
