# 0008 — Claude Sonnet 5.5 (esforço médio) como modelo da reserva

**Status:** Aceita · **Data:** 2026-10-05 (retroativo) · **Substitui:** [0007](0007-claude-haiku-como-reserva.md)

## Contexto

Com o Haiku 4.5 ([0007](0007-claude-haiku-como-reserva.md)), os roteiros às vezes saíam com fatos inventados sobre os animes (nomes, idades, acontecimentos). Num canal de comentário, um erro de fato derruba a credibilidade do vídeo, então qualidade passou a valer mais do que o custo da reserva.

## Decisão

Usar o `claude-sonnet-5-5` na Claude API e no Claude Code, com esforço `medium` no roteiro e nos ajustes e `low` na catalogação e na escolha de imagens. Junto com isso, o roteiro escrito do zero pode fazer **no máximo 2 buscas na web** para confirmar fatos antes de escrever.

## Alternativas consideradas

- **Manter o Haiku e só adicionar a busca na web:** reduz os erros, mas o Haiku sabe menos sobre animes e erra mesmo com contexto.
- **Sonnet com esforço alto:** melhor qualidade, mas lento demais e consome muito do plano.
- **Opus:** caro demais para ser a reserva de todos os pedidos.

## Consequências

- **Ganhamos:** roteiros com fatos certos (exemplo testado: a idade do Gojo saiu correta com 1 busca).
- **Custa:** consome o limite do plano mais rápido que o Haiku, e um roteiro leva ~30 s. Na API, alguns centavos por roteiro.
- **Ajuste fácil:** para economizar, trocar `DEFAULT_EFFORT` para `'low'` em `llm.ts`.
- **Revisar quando:** o gasto do plano incomodar ou sair um modelo menor com o mesmo conhecimento.
