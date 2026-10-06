# 0005 — Claude Code do plano Pro/Max como provedor de IA

**Status:** Aceita · **Data:** 2026-10-04 (retroativo)

## Contexto

A reserva de IA ([0004](0004-gemini-com-reserva-automatica.md)) precisava de um provedor confiável. A Claude API é cobrada à parte, por uso, mesmo para quem já paga o plano Pro. O plano Pro inclui o Claude Code, que tem um modo não interativo (`claude -p`).

## Decisão

Usar o Claude Code instalado e logado no computador do usuário como último provedor da cadeia, ligado por `CLAUDE_CODE=on`. O backend chama `claude -p` com um prompt de sistema curto, sem ferramentas (só `Read` na catalogação de imagens), sem MCP, sem salvar sessão e com a `ANTHROPIC_API_KEY` removida do ambiente, para a cobrança ir para o plano e não para a API.

## Alternativas consideradas

- **Só a Claude API:** mais rápida e simples, mas é um gasto extra além do plano. Continua disponível, antes do Claude Code na cadeia.
- **Usar o prompt padrão do Claude Code:** é feito para programar e muito grande; cada pedido gastaria bem mais do plano.

## Consequências

- **Ganhamos:** uma reserva de IA sem custo extra para quem já tem o plano.
- **Custa:** é mais lento (~6 s só para o programa iniciar) e divide o limite de uso com o claude.ai e o próprio Claude Code.
- **Restrição:** o plano é pessoal. Se o app atender outras pessoas, este provedor tem que sair e entra a Claude API.
