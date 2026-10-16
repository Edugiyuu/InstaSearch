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

## Adendo (2026-10-07): tela cheia por escolha

Pedido do usuário depois de ver o resultado: poder deixar uma imagem em **tela cheia** mesmo quando o automático a mostraria inteira. A decisão 4A continua valendo como padrão; o adendo só acrescenta a escolha.

- Na revisão, cada cena com imagem (fora as de prova) tem **Enquadramento: Automático / Tela cheia / Inteira**. O Automático diz o que faria com aquela imagem ("Automático (inteira)").
- A escolha fica na cena (`beat.framing`) e vale na prévia e no render. O zoom continua com o limite do recorte, e a seta acompanha o modo escolhido.
- Trocar a imagem da cena pelo chat volta para o Automático, porque a escolha foi feita para a imagem anterior. Na tela de troca, a escolha continua.
- Por que por cena, e não um ajuste para o vídeo todo: a decisão depende de cada imagem (um painel largo com o personagem no centro aguenta o corte; um com dois personagens nas pontas, não). Um padrão do vídeo inteiro pode vir depois, se a escolha cena a cena der trabalho demais.

## Adendo (2026-10-09): mais variações

O usuário gostou da sugestão "✨ Buscar a variação: “tatsumaki chibi fanart”" e pediu que ela aparecesse mais. A decisão 3A continua; muda só a dose:

- de cerca de 1 cena a cada 4 ou 5 para **cerca de 1 a cada 3**;
- a **variação** passa a ser o tipo mais comum, e não precisa de momento de piada (basta a cena mostrar o personagem); o **meme** continua nos momentos de piada, virada ou reação.

Fica no `TWIST_RULE` (`shortsAI.ts`), que vale para o roteiro e para o chat. Por que no prompt e não num ajuste rápido ("Memes: poucos / médio / muitos", a 3B): o pedido foi "mais", sem pedir controle; o chat continua aceitando "menos variações" para um vídeo só.

## Adendo (2026-10-13): vagas de fanart

O usuário achou as imagens boas, mas pediu **mais fanart**. A causa estava na escolha das candidatas, não na visão: a IA olhava as 4 primeiras de uma lista em que o Google e o Bing vêm antes do Danbooru, e `rankCandidates` só reordenava as 8 primeiras. Na prática, a visão via prints e wallpapers da web, e a fanart do Danbooru (as mais votadas do personagem) quase nunca chegava a ela.

- **Escolhida: vagas de fanart.** A visão olha **6 sugestões por cena, 3 da web e 3 do Danbooru, intercaladas** (`pickCandidates` em `imageSearch.ts`). Um lado com menos sugestões cede as vagas ao outro: cena sem personagem (sem Danbooru) fica com 6 da web. Para não aumentar o número de chamadas, vão 4 cenas por chamada em vez de 5 (umas 24 miniaturas cada).
- **O prompt da visão** passou a preferir arte bonita e bem desenhada (fanart caprichada ou arte oficial), nítida e colorida, a um print borrado; o print do anime vale mais quando a fala cita um momento específico de um episódio. A regra do personagem certo continua acima de tudo.
- **A tela Trocar imagem também intercala.** Ela mostra as 10 primeiras sugestões da busca, e o Danbooru vinha no fim da lista, atrás do "Ver mais". Agora a própria busca (`searchWebImages`) devolve web e fanart alternadas (`interleave`), e as 10 primeiras já trazem umas 5 fanarts. Com **Imagens sugestivas** ligada, nas personagens elas costumam ser as ousadas (das 40 fanarts mais votadas da Makima, 39 são "sensíveis").
- **Imagens chamativas, e ousadas quando liberado.** Depois de ver o resultado, o usuário pediu imagens "um pouco mais apelativas" e escolheu as duas leituras: a visão sempre prefere a imagem que prende o olho no feed (expressão intensa, ação, cores fortes, close dramático, aura); e, com a opção **Imagens sugestivas** ligada nas Configurações, também prefere a versão mais ousada de uma personagem (fanservice, pose sensual, roupa curta), sem nudez nem nada sexual. Desligada, essa regra nem vai no prompt. As regras do assunto e do personagem certo continuam acima das duas.
- Descartadas pelo usuário: **mais uma fonte de fanart** (Zerochan), que daria variedade, mas é mais uma fonte para manter; e **fanart sempre primeiro**, com a web só quando não há fanart, que perderia os prints dos momentos citados.
- **Custa:** miniaturas maiores por chamada (24 em vez de 20) e chamadas um pouco mais lentas. **Revisar quando:** as fanarts ficarem repetidas entre vídeos do mesmo personagem (as mais votadas são sempre as mesmas), ou a visão passar a escolher fanart de traço muito diferente do anime.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação.

## Consequências

- **Ganhamos:** o personagem certo na cena (ou um aviso de que falta, em vez de uma imagem errada); uma biblioteca que fica mais confiável a cada vídeo; memes e variações que engajam; imagens inteiras, sem zoom em dobro.
- **Custa:** umas 4 chamadas de visão a mais por montagem (e a montagem fica alguns segundos mais lenta); uma fila única para recatalogar 78 imagens; um campo novo por cena no roteiro (a busca criativa e o tipo); largura e altura em cada imagem da biblioteca.
- **Revisar quando:** a visão errar personagens parecidos (aí comparar com o retrato do AniList), ou os memes ficarem repetitivos ou fora de hora (aí o ajuste rápido do 3B).

## Adendo (2026-10-15): específica, mas que dê para achar

No vídeo "Fubuki, a irmã esquecida", o roteiro pediu, para a fala "Sem poder de S-Class, é a número 1", a imagem "ranking de heróis Classe B com Fubuki em primeiro", e para "Humana até no erro!", "Fubuki com expressão séria e ressentida". Essas imagens quase não existem: o Bing trouxe páginas de ranking ("All Heroes Rank One Punch Man") e vídeos do YouTube, e o usuário teve de trocar à mão. O usuário: "é muito específico, é difícil demais achar isso", e para essas falas prefere "uma cosplay da personagem, ou uma fanart".

- **A busca tem que ser fácil de achar.** No pedido do roteiro (e do chat da cena, que usa o mesmo formato), uma situação específica só quando é uma cena conhecida da obra (uma luta, um episódio, uma arte oficial), e no máximo uma emoção simples. **Fala abstrata** (opinião, ranking, sentimento, comparação) pede o personagem numa imagem que existe aos montes: "Fubuki fanart", "Fubuki cosplay" ou uma cena marcante dele. O "específico" deste ADR continua valendo para o personagem certo, que segue obrigatório.
- **Fanart e cosplay levam o nome da obra na busca.** Antes, toda busca "criativa" saía sem a obra, por causa do meme de reação; "Fubuki fanart" sozinho traria a Fubuki da Hololive. Agora só o meme sai sem a obra (`webQuery`, em `imageSearch.ts`).
- **Ficou de fora:** buscar de novo com "<personagem> fanart" quando a IA de visão não acha nenhuma imagem boa. Resolveria também os roteiros antigos, mas gasta mais uma chamada de visão por cena; fica para o caso de o pedido não bastar.
- **Revisar quando:** as cenas ficarem repetitivas (fanart do mesmo personagem em todas), ou as falas abstratas continuarem vindo com buscas impossíveis.
