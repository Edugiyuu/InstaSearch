# 0010 — Biblioteca pessoal de imagens em vez de gerar imagens por IA

**Status:** Substituída em parte por [0022](0022-imagens-da-web-e-controles-da-cena.md) (as imagens passam a vir só da web; figurinhas, sons e o resto da biblioteca continuam) · **Data:** 2026-10-03 (retroativo)

## Contexto

Um Short de até 40 s no formato de referência usa **de 25 a 40 imagens**. A parte mais cansativa de fazer esse vídeo à mão não é editar, é **conseguir as imagens**. Os geradores de imagem por IA não desenham bem personagens de anime ou bloqueiam personagens protegidos, e o resultado parece genérico.

## Decisão

Montar uma **biblioteca local** que cresce com o uso. Cada imagem é catalogada uma vez pela IA (personagens, etiquetas, descrição, áreas como rosto e mão) e reaproveitada nos vídeos seguintes. Uma imagem rende várias cenas com recortes diferentes. A IA só escolhe IDs da biblioteca e nunca inventa tempos ou coordenadas. O que faltar vira uma lista de busca, com sugestões da internet já buscadas na tela "Trocar imagem".

## Alternativas consideradas

- **Gerar todas as imagens por IA:** não funciona no nicho de anime e deixa o vídeo genérico. Pode voltar como opção plugável, desligada por padrão.
- **Banco de imagens pago (Pexels etc.):** não tem cenas de anime.

## Consequências

- **Ganhamos:** imagens reais do anime, e cada vídeo novo fica mais rápido. A meta é, depois de uns 10 vídeos do mesmo nicho, precisar de no máximo 10 a 15 imagens novas por vídeo.
- **Custa:** uma chamada de visão na primeira catalogação de cada imagem, e os primeiros vídeos ainda exigem buscar imagens.
- **Atenção:** os direitos autorais das imagens são responsabilidade de quem publica.
