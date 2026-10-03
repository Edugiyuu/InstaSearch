# Contribuindo com o InstaSearch

Obrigado pelo interesse! Antes de começar, leia o [propósito](docs/PURPOSE.md) e o [roadmap](docs/ROADMAP.md). Contribuições alinhadas aos princípios do projeto têm muito mais chance de serem aceitas.

## Princípios que guiam as revisões

- **Custo zero por padrão:** recursos pagos são opcionais e ficam atrás de um provider.
- **Só APIs oficiais:** PRs com scraping ou automação contra os termos do Instagram não são aceitos.
- **Humano no controle:** nada é publicado sem revisão do usuário.
- **PT-BR primeiro:** textos de interface e mensagens ao usuário em português.

## Ambiente

Siga o [SETUP.md](docs/SETUP.md). Para desenvolver, você precisa de uma conta Instagram Business/Creator de teste.

## Fluxo

1. Abra uma issue descrevendo o problema ou a proposta. Para algo grande, espere um retorno antes de codar.
2. Crie uma branch a partir de `master`: `feat/legendas-ass`, `fix/token-expiracao`, `docs/...`.
3. Faça commits pequenos no padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/) (o histórico já usa): `feat:`, `fix:`, `docs:`, `refactor:`, `test:`.
4. Garanta que compila: `npm run build` no backend e no frontend.
5. Abra o PR explicando **o quê**, **por quê** e **como testar**.

## Padrões de código

- TypeScript nos dois lados. Evite `any` em código novo.
- **Backend:** `routes → controllers → services → storage`. Controllers ficam finos; a lógica vai em services. Use `asyncHandler` e `AppError`.
- **Frontend:** `página → hook → services/api.ts`. CSS puro com as variáveis existentes (sem Tailwind).
- **Vídeo (`video/`):** cada tipo de cena ou camada é um componente Remotion que recebe só os seus dados do `EditPlan`. Ele precisa ser determinístico (nada de `Math.random()` sem semente; use `random()` do Remotion) e funcionar igual no player e no render. Mudou o formato do plano? Atualize `video/src/schema.ts` primeiro.
- Serviços externos novos (IA, TTS, transcrição, hospedagem) entram como **provider** com interface, nunca chamados direto do controller. Veja [ARCHITECTURE.md](docs/ARCHITECTURE.md#arquitetura-alvo-próximas-fases).
- **Nunca** coloque tokens, chaves ou IDs de conta reais no código, em scripts ou na documentação.

## Documentação

Mudou o comportamento? Atualize o documento correspondente em `docs/` e o status no [ROADMAP](docs/ROADMAP.md) no mesmo PR.

## Por onde começar

Itens bons para uma primeira contribuição estão na Fase 0 do [ROADMAP](docs/ROADMAP.md), por exemplo: apagar o vídeo do Cloudinary depois de publicar, remover a dependência `openai` não usada e configurar o Vitest.
