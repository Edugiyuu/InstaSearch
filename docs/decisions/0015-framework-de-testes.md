# 0015 — Framework de testes

**Status:** Proposta · **Data:** 2026-10-05

## Contexto

O projeto não tem testes: no backend, `npm test` só imprime "Tests coming soon...", e o frontend não tem nenhum script de teste. O usuário quer começar a testar e sugeriu o **Jest**. O ROADMAP citava o **Vitest**, sem um motivo registrado.

O que pesa na escolha:

- Backend e frontend são **ESM** (`"type": "module"` nos dois `package.json`) e escritos em **TypeScript**. O backend roda com `tsx`, e o frontend é construído com **Vite**.
- As partes que mais valem a pena testar são lógica pura: a timeline do vídeo (`frontend/src/video/timeline.ts`), a escolha de imagens da biblioteca (`library.ts`), a normalização de texto (`text.ts`) e a extração de JSON das respostas da IA (`llm.ts`).

## Decisão

_A decidir pelo usuário._ Opções abaixo; a recomendação do Claude é a **B**.

## Alternativas consideradas

- **A. Jest:** o mais conhecido do mercado. Tem muito material de estudo e é o padrão de muitas vagas. Porém, com ESM e TypeScript, precisa de configuração extra: um transformador (`ts-jest` ou Babel), e o suporte nativo a ESM ainda depende de uma opção experimental do Node (`--experimental-vm-modules`). No frontend, não aproveita a configuração do Vite.
- **B. Vitest:** feito pela equipe do Vite. Roda TypeScript e ESM sem configuração e usa o mesmo `vite.config.ts` no frontend. A **API é praticamente a mesma do Jest** (`describe`, `it`, `expect`, `vi.fn()` no lugar de `jest.fn()`), então o que se aprende num serve no outro.
- **C. Test runner nativo do Node (`node:test`):** sem dependência nenhuma, mas tem menos recursos (mocks, relatórios, modo *watch*) e não serve para o frontend.

## Consequências

- **Com A (Jest):** aprendizado direto da ferramenta mais pedida, ao custo de configurar e manter o ESM e o TypeScript.
- **Com B (Vitest):** começa a testar em minutos, com a mesma API do Jest; a diferença está no nome do pacote e em `vi` no lugar de `jest`.
- **Nos dois casos:** um script `npm test` em cada projeto e os primeiros testes na lógica pura citada no contexto.
- **Revisar quando:** a escolhida atrapalhar algum caso real (por exemplo, testar componentes do Remotion).
