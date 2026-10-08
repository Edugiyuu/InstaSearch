# 0022 — Imagens só da web, sem biblioteca de imagens, e controles à mão na cena

**Status:** Aceita · **Data:** 2026-10-08 · Substitui em parte o [0010](0010-biblioteca-de-imagens-em-vez-de-geracao.md) (a parte das imagens; o resto da biblioteca continua)

## Contexto

O usuário trouxe quatro incômodos depois de editar o vídeo "Yuki Tsukumo: A Feiticeira Mais Ousada?" (08/10):

**1. A biblioteca de imagens não serve para nada.** Desde o [0020](0020-imagens-especificas-memes-e-zoom.md), a IA busca na web, olha as sugestões e escolhe. Das **222 imagens** da biblioteca, só **5 foram enviadas à mão**; o resto veio da web, posto pela montagem. Quando falta uma imagem, o usuário resolve na tela "Trocar imagem", que já busca na web e aceita arquivo ou colar. Ninguém abre a aba "Imagens" para escolher, catalogar ou organizar.

Por trás, a biblioteca ainda trabalha: a montagem (`matchBeats` em `library.ts`) procura nela antes de ir à web, e 148 imagens já foram reaproveitadas. Foi o que o [0010](0010-biblioteca-de-imagens-em-vez-de-geracao.md) decidiu: cada vídeo novo do mesmo anime fica mais rápido. O usuário prefere que cada vídeo busque as próprias imagens.

**2. Figurinhas só pelo chat.** A figurinha (reação, como "chocado") aparece quando o roteiro marca a cena com `effect: emoji` e o `pickSticker` (`library.ts`) acha uma figurinha da biblioteca com etiqueta parecida. Para tirar ou trocar, o usuário pede ao chat ("tire as figurinhas de tudo"), espera a IA e confere se ela acertou as cenas. Para uma escolha visual e rápida, conversar é lento.

**3. Rolar a página para pôr um efeito sonoro.** Na Revisão, o controle de som de cada cena (`rv-sfx`, em `Review.tsx`) fica embaixo do player, da faixa de cenas, do texto e do enquadramento. Numa tela de notebook, ele fica abaixo da dobra: para cada cena, o usuário clica na faixa, rola até o fim, escolhe o som, sobe de novo. Em 18 cenas, é muita ida e volta.

**4. O fundo da cena é sempre o que a IA quis.** Quando o roteiro marca uma cena como prova (`scene: 'evidence'`), a imagem aparece **emoldurada e inclinada sobre um fundo quadriculado** (`Evidence` em `ShortVideo.tsx`); nas outras, em tela cheia ou inteira sobre ela mesma desfocada. A moldura é boa para print e comparação, mas às vezes o usuário quer a imagem normal. Hoje, o controle de enquadramento nem aparece nas cenas de prova, e a única saída é o chat.

**O que isso tem a ver com o [0011](0011-editor-automatico.md):** ele diz "sem linha do tempo, trilhas **ou painel por cena**". O enquadramento (adendo ao 0020) e o som por cena já abriram exceções. Este ADR acrescenta mais (figurinha e fundo) e assume a regra nova: **controles da cena atual são permitidos, desde que comecem no Automático (o que a IA escolheu) e nunca virem uma linha do tempo**. O que a decisão original perde está nas consequências.

## Decisão

O usuário escolheu **1B, 2C, 3B e 4A**.

### 1. Imagens: sempre da web, sem biblioteca (escolhida pelo usuário)

- **Escolhida (1B): a montagem não usa mais imagens da biblioteca.** Cada vídeo busca as suas na web, com a escolha por visão do 0020. Sai o código que põe imagens da biblioteca no vídeo:
  - a busca na biblioteca dentro de `matchBeats` (`pickImagesWithAI`, a escolha por palavras e a guarda `showsWanted` que só servia para ela);
  - o ajuste rápido "Quem escolhe as imagens: IA lê o roteiro / Por palavras" (`settings.imagePicker`), que só existia para escolher na biblioteca. "Escolher de novo" passa a buscar na web outra vez;
  - a aba "Imagens" da Biblioteca e a fila de catalogação das imagens (catalogar só servia para reaproveitar).
- **O que continua:**
  - o arquivo da imagem é baixado e guardado, porque a prévia e o render precisam dele; ele só não é oferecido para outro vídeo;
  - "Trocar imagem" (busca na web, enviar arquivo, colar), que grava a imagem só para aquela cena;
  - o resto da biblioteca, que o usuário cuida: Vídeos, Figurinhas, Efeitos sonoros, Músicas, Bordões e Tons. As figurinhas continuam sendo escolhidas pela etiqueta;
  - as 222 imagens que já existem ficam no disco, porque os projetos antigos apontam para elas. Apagar as que nenhum projeto usa pode virar uma tarefa depois.
- Descartadas pelo usuário: 1A (manter a biblioteca como memória da IA, sem aba) e 1C (manter a aba como vitrine só de leitura).

### 2. Figurinhas

- **2A: controle na cena.** "Figurinha: Automático / Nenhuma / [miniaturas da biblioteca]". A escolha fica travada na cena, como o som (`stickerLocked`, igual ao `sfxLocked`), e a montagem e o chat respeitam. Escolher uma figurinha numa cena sem reação faz a cena ganhar a reação.
- 2B: ajuste rápido do vídeo inteiro: "Figurinhas: Nenhuma / Poucas / Muitas", ao lado de "Efeitos". Resolve o "tira de tudo" com um clique, mas não deixa escolher qual figurinha vai em qual cena.
- **2C (escolhida): as duas.** O ajuste rápido decide **quanto** ("Nenhuma" tira de todas de uma vez) e o controle da cena decide **qual**. Uma escolha feita na cena vale mais que o ajuste do vídeo (uma figurinha posta à mão não some ao mudar para "Poucas").

### 3. Onde ficam os controles da cena

- 3A: um cartão "Esta cena" no alto da coluna do meio, ao lado do player; o chat desce. Fica tudo visível sem rolar, mas tira o chat, o caminho principal do 0011, do lugar de destaque.
- **3B (escolhida): uma linha compacta de botões logo abaixo da faixa de cenas**, cada um mostrando o valor atual e abrindo um pop-up pequeno ali mesmo:

  `🖼 Trocar imagem` · `▣ Fundo: moldura ▾` · `🔊 whoosh ▾ ▶` · `😮 chocado ▾`

  Uma linha só, colada nas cenas que o usuário clica, e cabe numa tela de notebook sem rolar. O ▶ toca o som ali mesmo. Clicar em outra cena na faixa troca os valores da linha. O chat continua onde está.
- 3C: só deixar a coluna do vídeo fixa (`position: sticky`) enquanto a página rola. É uma linha de CSS, mas o som continua abaixo da dobra em telas baixas.

### 4. Fundo da cena

- **4A (escolhida): um pop-up "Fundo" que junta o enquadramento e a moldura**, com uma miniatura de cada jeito, feita com a própria imagem da cena:
  - **Automático (o que a IA fez):** começa sempre aqui, e a IA continua decidindo pelo roteiro e pelo chat;
  - **Tela cheia:** a imagem ocupa a tela toda;
  - **Inteira:** a imagem toda, sobre ela mesma desfocada;
  - **Moldura no quadriculado:** o visual de prova de hoje;
  - **Moldura sobre a imagem:** a mesma moldura, mas com a própria imagem desfocada no fundo, no lugar do quadriculado.

  A escolha fica na cena (o `beat.framing` de hoje ganha `frame` e `frame-blur`) e vale na prévia e no render. Se o chat mudar a cena (outra imagem, "transforma em prova"), ela volta para o Automático, como já acontece com o enquadramento ao trocar a imagem. Assim, a IA continua editando o fundo, e o usuário só dá o toque final.
- 4B: só um botão "Tirar a moldura" nas cenas de prova. É o mínimo, mas não deixa pôr moldura numa cena comum nem trocar o quadriculado.
- 4C: um ajuste do vídeo inteiro ("Molduras: nunca / quando a IA quiser"). Resolve "nunca quero moldura", mas não "nesta cena, não".

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação (ou de o usuário não ter escolhido).

## Consequências

- **Ganhamos:** uma Biblioteca só com o que o usuário cuida; uma montagem com um caminho só (web + visão), mais simples de entender e de manter; figurinha, som e fundo resolvidos em um clique, sem esperar a IA nem rolar a página; o chat fica para os pedidos que precisam de texto ("final mais polêmico").
- **Perdemos / custa:**
  - Do 0010, perdemos o reaproveitamento: cada vídeo faz de novo as buscas e as chamadas de visão (umas 4 por montagem, pelo 0020) para todas as cenas, e não só para as que faltavam. A montagem fica mais lenta, gasta mais cota de IA, e um anime que já rendeu 10 vídeos não fica mais rápido no 11º. Uma imagem boa que a IA achou num vídeo não volta sozinha no próximo.
  - Do 0011, perdemos a regra simples de "nenhum controle por cena". Com quatro controles (imagem, fundo, som, figurinha), a Revisão fica mais perto de um editor manual. O freio: tudo começa no Automático, só a cena atual aparece, e não existe linha do tempo nem trilha.
  - Campos novos: `stickerLocked` na cena, `stickers` no vídeo, dois valores novos em `framing`; o chat precisa saber deles.
- **Revisar quando:** a montagem ficar lenta demais ou estourar a cota grátis da IA por buscar tudo de novo (aí volta a memória do 1A, sem aba), ou o usuário pedir mais um controle na cena (aí repensar se a Revisão virou um editor manual e se o 0011 precisa ser substituído).
