# 0004 — Gemini primeiro, com reserva automática em outros provedores

**Status:** Aceita · **Data:** 2026-10-04 (retroativo; o Gemini é usado desde 2026-02-02)

## Contexto

O Gemini foi a primeira IA do projeto porque tem um nível grátis. Em 2025–2026 a cota grátis caiu muito (em out/2026: 20 pedidos por dia no `gemini-2.5-flash`). Um único vídeo gasta várias chamadas (roteiro, escolha de imagens, ajustes, catalogação), então a cota acaba no meio do uso e o app para de funcionar.

## Decisão

Todas as chamadas do fluxo de Shorts passam por um único módulo, `backend/src/services/shorts/llm.ts`, que tenta os provedores em ordem:

```
Gemini (grátis) → Claude API (com chave) → Claude Code (plano Pro/Max)
```

Se um falhar por cota (429), sobrecarga (5xx) ou rede, o mesmo pedido vai para o próximo. Quando o Gemini responde 429, ele fica de lado até o horário que o erro indica, para não gastar uma tentativa a cada pedido. O app registra e mostra qual IA fez cada parte do vídeo.

## Alternativas consideradas

- **Só o Gemini:** grátis, mas o app trava quando a cota acaba.
- **Só uma IA paga:** confiável, mas cobra por tudo, inclusive o que o Gemini faria de graça.
- **Ollama local:** grátis e sem cota, mas exige uma máquina forte e erra mais. Continua planejado como reserva grátis.

## Consequências

- **Ganhamos:** o app continua funcionando quando a cota grátis acaba, e só paga (ou usa o plano) quando precisa.
- **Custa:** os prompts precisam funcionar em mais de um modelo. O áudio só é entendido pelo Gemini, então sem ele os sons são etiquetados pelo nome do arquivo.
- **Revisar quando:** o Gemini mudar a cota grátis ou um provedor local ficar bom o suficiente.
