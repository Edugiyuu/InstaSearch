# 0001 — Registrar decisões com ADRs

**Status:** Aceita · **Data:** 2026-10-05

## Contexto

O projeto é feito por uma pessoa trabalhando com o Claude Code. Muitas decisões (trocar de modelo de IA, escolher o Remotion, remover a OpenAI) ficaram espalhadas em mensagens de commit, tabelas da documentação e conversas que o Claude não lembra na sessão seguinte. Sem um registro, cada sessão nova corre o risco de reabrir uma decisão já tomada ou de desfazer algo sem saber por que foi feito.

## Decisão

Registrar toda decisão importante como um ADR em `docs/decisions/`, num modelo fixo (Contexto, Decisão, Alternativas, Consequências). As regras de quando e como escrever estão no [README](README.md) da pasta.

## Alternativas consideradas

- **Só mensagens de commit:** ficam presas a um diff e são difíceis de achar depois. Continuam valendo para mudanças pequenas.
- **Tabelas de decisões dentro de `ARCHITECTURE.md`:** já existiam, mas guardam só uma linha de motivo e não mostram as alternativas nem o histórico quando a decisão muda.
- **Wiki ou ferramenta externa (Notion):** fica fora do repositório, e o Claude não lê sem acesso extra.

## Consequências

- **Ganhamos:** o porquê fica junto do código, versionado, e o Claude consegue ler antes de mudar algo.
- **Custa:** alguns minutos por decisão, e a disciplina de não pular o registro.
- **Revisar quando:** os ADRs pararem de ser lidos ou atualizados.
