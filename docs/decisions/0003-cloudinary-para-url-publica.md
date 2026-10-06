# 0003 — Cloudinary como URL pública temporária para o Instagram

**Status:** Aceita · **Data:** 2026-02-04 (retroativo)

## Contexto

A Graph API do Instagram não aceita o envio direto de um arquivo de vídeo: ela só aceita uma **URL pública**, de onde o próprio Instagram baixa o vídeo. O backend roda em `localhost`, que o Instagram não consegue acessar.

## Decisão

Antes de publicar um Reel, subir o MP4 para o Cloudinary, passar essa URL para a Graph API e apagar o arquivo do Cloudinary depois que o Instagram terminar de baixar.

## Alternativas consideradas

- **Túnel para o backend local (ngrok, Cloudflare Tunnel):** evita um serviço de terceiros, mas exige configurar e manter o túnel aberto. Continua como alternativa futura.
- **Hospedar o backend na nuvem:** contraria o objetivo de rodar no computador do usuário.

## Consequências

- **Ganhamos:** publicação funcionando sem expor o computador do usuário, no plano grátis do Cloudinary.
- **Custa:** uma dependência externa e mais três variáveis no `.env`.
- **Revisar quando:** o plano grátis não bastar, ou se o túnel ficar simples de configurar.
