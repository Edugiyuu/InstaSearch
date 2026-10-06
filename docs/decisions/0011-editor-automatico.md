# 0011 — Editor automático, não editor manual

**Status:** Aceita · **Data:** 2026-10-03 (retroativo)

## Contexto

A primeira versão das telas, feita a partir do protótipo no Figma, tinha linha do tempo com trilhas e um painel para cada cena (tipo de cena, recorte, movimento). O usuário rejeitou: parecia um editor de vídeo manual, e não um app que monta o vídeo sozinho. Além disso, havia conteúdo fixo de exemplo (o roteiro era sempre sobre o Gojo, qualquer que fosse o tema) e uma prévia estática em CSS, o que passava a impressão de que "nada funciona".

## Decisão

O app é um **editor automático**: gerar → revisar a prévia → pedir ajustes em português ("Peça um ajuste") ou mexer em poucos controles de alto nível → publicar. Regras que valem para todas as telas:

- **A IA sugere e o usuário aprova.** Nada é publicado sem revisão.
- **Sem linha do tempo, trilhas ou painel por cena.**
- **Sem dados de mentira:** toda tela usa geração real; nenhuma prévia falsa é mostrada como se fosse o vídeo.
- **O Figma é uma referência,** não uma especificação para copiar pixel a pixel.

## Alternativas consideradas

- **Editor completo, estilo CapCut:** dá controle total, mas é o trabalho manual que o app quer eliminar.
- **Totalmente automático, sem revisão:** rápido, mas publicaria erros da IA.

## Consequências

- **Ganhamos:** um vídeo sai em minutos, e o esforço do usuário vai para o que só ele faz bem (tema, voz, imagens que faltam).
- **Custa:** quando a IA erra num detalhe, o caminho é pedir um ajuste ou trocar uma imagem, e não editar quadro a quadro.
- **Revisar quando:** os ajustes em texto não derem conta de algo que os usuários pedem com frequência.
