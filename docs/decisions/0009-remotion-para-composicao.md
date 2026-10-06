# 0009 — Remotion para compor, pré-visualizar e renderizar

**Status:** Aceita · **Data:** 2026-10-03 (retroativo)

## Contexto

O formato de referência (Shorts de comentário de anime) troca de imagem a cada 0,7 a 1,5 s e tem legendas de 1 a 2 palavras, setas, X, círculos, figurinhas e sons sincronizados. O usuário precisa ver o resultado antes de publicar, e cada ajuste ("coloca um X nessa cena") precisa aparecer na hora. As telas antigas do projeto usavam FFmpeg direto.

## Decisão

Montar o vídeo como componentes React com o **Remotion**: `@remotion/player` mostra a prévia ao vivo no navegador e `@remotion/renderer` gera o MP4 com o **mesmo código**. O FFmpeg continua só nas tarefas de arquivo (ffprobe, conversão, detecção de cortes).

## Alternativas consideradas

- **Filtros do FFmpeg escritos à mão:** gratuitos e rápidos, mas cada efeito vira uma linha de filtro difícil de manter, e não há prévia sem renderizar.
- **Editor externo (CapCut):** é exatamente o trabalho manual que o app quer eliminar.
- **Geração de vídeo por IA:** fora do escopo; o resultado parece genérico e não funciona bem com personagens de anime.

## Consequências

- **Ganhamos:** prévia ao vivo igual ao vídeo final; cada cena e efeito é um componente React testável, na mesma stack do frontend.
- **Custa:** o render usa um Chrome sem janela (baixado automaticamente) e é mais lento que o FFmpeg puro. A licença do Remotion é paga para empresas com mais de 3 funcionários; uso pessoal é grátis.
- **Revisar quando:** o projeto virar produto de uma empresa (licença) ou o tempo de render virar problema.
