# 0002 — Armazenamento em arquivos JSON, sem banco de dados

**Status:** Aceita · **Data:** 2026-01-30 (retroativo)

## Contexto

O InstaSearch é um app pessoal e *self-hosted*: roda no computador de quem usa, com um único usuário. Instalar e configurar um banco de dados seria um passo a mais na instalação, sem ganho real com o volume de dados do começo do projeto.

## Decisão

Guardar os dados em `backend/data/<coleção>/<id>.json`, um arquivo por item, pela classe `FileStorage<T>`. Cada entidade estende essa classe com as consultas de que precisa. Os arquivos de mídia ficam em pastas ao lado (`library/files`, `sounds/files`…).

## Alternativas consideradas

- **SQLite:** um arquivo só e sem servidor, mas exige migrações e esquema desde o início.
- **PostgreSQL / MongoDB:** precisam de um servidor rodando, o que complica a instalação para uso pessoal.

## Consequências

- **Ganhamos:** zero configuração; dá para abrir e corrigir os dados num editor de texto.
- **Custa:** sem consultas, sem transações e lento com milhares de itens.
- **Revisar quando:** a biblioteca ou o histórico de métricas crescerem a ponto de precisar de buscas pesadas. O plano é migrar para SQLite mantendo a interface do storage.
