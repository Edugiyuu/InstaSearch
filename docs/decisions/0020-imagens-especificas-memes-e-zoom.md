# 0020 — Imagens específicas, memes e zoom na medida

**Status:** Aceita · **Data:** 2026-10-07

## Contexto

O usuário acha que a IA escolhe imagens ruins: numa cena sobre o Vanilla Ice veio uma imagem de outro personagem, e uma imagem que já era um close recebeu ainda mais zoom na edição. Ele também quer imagens mais **específicas** e, às vezes, um **meme** ou uma imagem **diferente** (o meme do Polnareff na cadeira de rodas, o Polnareff versão mulher), mesmo quando o assunto é pesado, porque isso engaja.

O projeto "A Batalha Final de Polnareff" (07/10) mostra três causas:

**1. A biblioteca aceita o personagem errado.** Na cena 6 ("na batalha contra o Vanilla Ice") a IA da montagem (`pickImagesWithAI`) escolheu "wamu bravo" (o Wamuu, de outra parte de JoJo); na cena 5, pedindo o Polnareff, escolheu "dio e jotaro". O prompt diz "não use imagem de outro personagem", mas o servidor não confere, e a IA marca como `similar` e usa mesmo assim.

**2. As imagens da internet entram sem ninguém olhar, e com rótulo falso.** O preenchimento automático (`autoFillImages` em `projects.ts`) pega a sugestão melhor colocada pela proporção e pela resolução (`bestCandidate`), sem ver a imagem. Depois grava na biblioteca, como personagens da imagem, **os que a cena pedia** (`catalog: false`). Assim, a capa de um volume do mangá entrou como "jean pierre polnareff e vanilla ice". Hoje **78 das 143 imagens** da biblioteca (55%) têm personagens que ninguém conferiu, e a IA da montagem confia nesses rótulos nos próximos vídeos, e o erro se espalha.

**3. Zoom em dobro.** A imagem ocupa a tela com `objectFit: cover`: uma imagem larga num vídeo em pé perde dois terços da largura, o que já é um zoom. Por cima disso, o movimento `zoom-in` vai até 1,26×, ou até **1,9×** quando há uma área marcada (rosto), calculado sem contar o recorte (`ShortVideo.tsx`). Num close, o resultado é só um pedaço do rosto.

**Memes e imagens diferentes** não existem no fluxo: o roteiro só descreve a cena ("Vanilla Ice furioso, mangá"), e a busca procura a cena literal.

Os filtros de conteúdo que já existem continuam: Bing com `adlt=strict` e Danbooru só com classificação "geral".

## Decisão

O usuário escolheu a recomendação do Claude nas quatro escolhas: **1A, 2A, 3A e 4A**.

### 1. Como escolher entre as imagens da internet

- **1A (escolhida): a IA olha antes de escolher.** Para cada cena sem imagem, as 4 melhores sugestões vão como miniaturas para a IA de visão, junto com o que a cena precisa mostrar. Ela responde qual mostra o personagem certo fazendo a coisa certa, ou "nenhuma" (aí a cena fica para você, e não com uma imagem errada). Para gastar pouco, várias cenas vão na mesma chamada (umas 5 cenas × 4 miniaturas por vez): um vídeo de 20 cenas gasta umas 4 chamadas. A escolhida entra na biblioteca e é catalogada de verdade (fila do [0017](0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)).
- 1B: melhorar só a busca (consultas mais específicas, mais peso para o Danbooru, que tem as etiquetas de personagem certas). Barato, mas continua escolhendo às cegas; não resolve o caso do Vanilla Ice.
- 1C: catalogar todas as sugestões antes de escolher. É o mais completo, mas são dezenas de chamadas de visão por vídeo.

### 2. Rótulos verdadeiros na biblioteca

- **2A (escolhida): ninguém escreve personagem que não viu, e o servidor confere.**
  - O preenchimento automático para de copiar os personagens da cena para a imagem; eles vêm da catalogação (ou da fonte, quando a fonte é confiável: as etiquetas do Danbooru e o retrato do AniList).
  - Na escolha da biblioteca, o servidor recusa uma imagem catalogada cujos personagens não incluem nenhum dos que a cena pede (o Wamuu numa cena do Vanilla Ice vira "falta imagem").
  - As 78 imagens com rótulo não conferido entram na fila de catalogação, uma vez, para corrigir o que já está lá. Até terminar, elas não contam como "personagem certo".
- 2B: só a guarda no servidor, sem corrigir a biblioteca. Mais rápido, mas os rótulos falsos continuam enganando a guarda.

### 3. Memes e imagens diferentes

- **3A (escolhida): o roteiro marca as cenas que pedem algo diferente.** Em alguns momentos (piada, virada, reação; cerca de 1 a cada 4 ou 5 cenas), a IA do roteiro escreve, além da cena literal, uma busca criativa e o tipo:
  - `meme`: o meme conhecido do personagem ou do momento ("polnareff wheelchair meme", "polnareff ojisan meme");
  - `variação`: fanart diferente do personagem (versão mulher, chibi, outro traço; no Danbooru, etiquetas como `genderswap`).

  A busca procura essas variações primeiro, e a escolha com visão (1A) confere se é mesmo um meme ou uma variação **daquele** personagem. **Assunto pesado pode virar meme:** é o que o canal quer, porque é o que o público já faz com esses momentos. O limite é o conteúdo da imagem, e os filtros atuais continuam (nada sexual; Danbooru só "geral"; Bing com SafeSearch). Dá para pedir mais ou menos pelo chat ("mais memes", "sem memes").
- 3B: um ajuste rápido na revisão ("Memes: poucos / médio / muitos"), parecido com o de efeitos. Dá controle direto, mas é mais uma opção na tela; pode vir depois, se o chat não bastar.
- 3C: memes só quando o usuário pedir no chat. Seguro, mas perde justamente o engajamento que motivou o pedido.

### 4. Zoom

- **4A (escolhida): zoom na medida de cada imagem.**
  - Medir a imagem (largura e altura) ao salvar na biblioteca; as que já estão lá são medidas uma vez.
  - O zoom passa a contar o recorte do `cover`: há um limite para o quanto da imagem pode sumir no total. Num close, o zoom-in fica leve e não mira o rosto.
  - Uma imagem bem mais larga que o vídeo aparece **inteira, sobre um fundo desfocado dela mesma** (o jeito comum nos Shorts), em vez de perder dois terços.
- 4B: só baixar os números do zoom (1,9 → 1,3). É uma linha, mas as imagens largas continuam super cortadas.
- 4C: sempre a imagem inteira com fundo desfocado. Nunca corta demais, mas perde o impacto da tela cheia nas imagens que já são em pé.

**Como ficou no código:** a guarda `showsWanted` e a fila única de recatalogação em `library.ts`, com `charactersChecked`, `width` e `height` em cada imagem; `pickWebImagesWithAI` (visão) e o `autoFillImages` em três etapas (buscar, olhar, importar) em `projects.ts`; o `twist` das cenas no roteiro e no chat (`shortsAI.ts`); as buscas de meme e variação sem o painel de mangá na frente (`imageSearch.ts`); `video/framing.ts` (o zoom conta o recorte do cover; imagem larga inteira sobre o fundo desfocado; a seta e o círculo acompanham a faixa da imagem).

**O que os testes mostraram (07/10), e foi ajustado:**
- Com a regra "nenhuma serve → null", a visão recusou 8 de 14 cenas, porque nenhuma sugestão mostrava a ação exata. A regra passou a ser: o personagem é obrigatório, a ação é preferência. Na segunda rodada, entraram 7 de 8 (inclusive o Polnareff versão feminina, uma variação), e só a cena do Cream ficou sem imagem.
- A visão confirmava que a imagem tinha *algum* personagem pedido, e o código gravava *todos* os da cena. Agora a IA diz quais aparecem, e só esses são gravados. A catalogação em segundo plano também não apaga mais um personagem já conferido quando ela não reconhece ninguém.
- A busca do meme trazia painéis de mangá comuns primeiro, por causa do estilo de mangá. Buscas com "meme", "fanart", "genderswap" ou "chibi" agora mostram a web primeiro.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação.

## Consequências

- **Ganhamos:** o personagem certo na cena (ou um aviso de que falta, em vez de uma imagem errada); uma biblioteca que fica mais confiável a cada vídeo; memes e variações que engajam; imagens inteiras, sem zoom em dobro.
- **Custa:** umas 4 chamadas de visão a mais por montagem (e a montagem fica alguns segundos mais lenta); uma fila única para recatalogar 78 imagens; um campo novo por cena no roteiro (a busca criativa e o tipo); largura e altura em cada imagem da biblioteca.
- **Revisar quando:** a visão errar personagens parecidos (aí comparar com o retrato do AniList), ou os memes ficarem repetitivos ou fora de hora (aí o ajuste rápido do 3B).
