# 0039 — Bordão do meio: um clipe do rodízio na virada do roteiro

**Status:** Aceita · **Data:** 2026-10-28 · Substitui em parte o [0016](0016-bordoes-de-abertura-e-final.md), o [0022](0022-imagens-da-web-e-controles-da-cena.md) e o [0025](0025-variacoes-volume-e-figurinhas.md) (as figurinhas saem)

## Contexto

Em Shorts de comentário que dão certo, aos ~0:13 aparece sempre um clipe curto de cosplayer dançando, com a mesma frase ("nada disso, relaxa que eu vou te explicar"). Ele não parece forçado por três motivos: cai na emenda entre o gancho e a explicação, que é onde a pessoa costuma rolar para o próximo vídeo; a frase é marca do canal, não piada sobre o tema; e a narração não para, porque o clipe é só o visual daquela fala. O canal usa poucos clipes e vai repetindo (a mesma dança aparece em dois dos três vídeos analisados).

Hoje o app só tem bordão de abertura e de final ([0016](0016-bordoes-de-abertura-e-final.md), [0032](0032-bordoes-personalizaveis.md)). O próprio 0016 diz para revisar quando o usuário quisesse bordão no meio. A aba Bordões também foi feita para um bordão de cada ponta: envia um clipe por vez, o "padrão" é de um só e a grade mistura todos.

## Decisão

Um terceiro papel de bordão, **meio**, com um estoque de clipes que gira sozinho. O usuário sobe os clipes uma vez e não faz mais nada por vídeo.

- **Papel no bordão:** cada bordão passa a ter `role: 'abertura' | 'meio' | 'final'`. Abertura e final continuam com um padrão cada; os do meio formam o **rodízio**.
- **Frases da virada:** uma lista de frases do usuário, na aba Bordões. O que faz a frase soar natural é o lugar e a função (a emenda entre o gancho e a explicação, prometendo a explicação), não as palavras; por isso a regra é: curta (até ~2 s falada), serve para qualquer tema e promete a explicação. "✨ Sugerir frases" pede 5 à IA no tom do canal, sem repetir as que existem, e o usuário aprova uma por uma ([0011](0011-editor-automatico.md): a IA sugere, o usuário aprova). As frases também giram (sem repetir a do último vídeo), para a marca não cansar.
- **No roteiro:** a IA escreve uma das frases, **como foi escrita**, no fim do gancho, e marca a cena dela como a virada. O código confere que a frase está lá; se não está, o vídeo segue sem virada (nada inventado).
- **Na montagem:** a cena da virada troca só o visual por um clipe do rodízio. **A narração continua por cima e o som do clipe entra baixinho por baixo** (20% por padrão, ajustável por clipe e por vídeo; 0% deixa mudo). Ao contrário da abertura, nada pausa. A música e os efeitos seguem como nas outras cenas.
- **Rodízio:** o usuário escolhe a ordem na faixa do meio: "sem repetir dos últimos N vídeos" (N escolhido, 2 por padrão: sorteia entre os que não saíram nesses vídeos; se todos saíram, o que descansou mais), "aleatório" (menos o do último vídeo) ou "na sequência" (o seguinte ao do último, na ordem de envio). O uso é lido dos projetos (o projeto guarda o id do clipe usado), sem contador à parte.
- **Trecho e recorte:** clipe de até 3 s entra inteiro. Com mais de 3 s, ao subir abre um **mini editor de recorte**: o player toca o trecho em loop, uma linha do tempo com uma janela que se arrasta (as pontas mudam a duração), durações prontas (1,5 a 3 s) e o som do clipe. O servidor sugere os 2 s com mais movimento (a diferença entre quadros, medida com o `ffmpeg`, como no detector de cortes dos vídeos), que já vêm selecionados; sem gastar IA de visão. Com vários clipes enviados de uma vez, o editor passa por eles em fila ("1 de 3 · Usar e ir ao próximo"). O recorte pode ser refeito depois, no painel do clipe e na Revisão.
- **Na Revisão:** a cena da virada mostra o clipe com "↻ Outro clipe", "Sem virada aqui", o trecho (com "✂ Recortar…") e o som do clipe, com prévia no player (mesma composição do render, [0009](0009-remotion-para-composicao.md)).
- **Aba Bordões:** três faixas (Abertura, Meio, Final), envio de vários clipes de uma vez, "usado há N vídeos" em cada clipe do meio, e o painel com papel, trecho, som e rodízio. O desenho está no Figma, página "InstaSearch · Telas atuais (28/10/2026)": 12b (aba), 12c (recorte), 12d (frases) e 05b (Revisão).

## Alternativas consideradas

- **Bordão do meio como uma cena comum com o vídeo trocado à mão:** já dá para fazer hoje com "Trocar imagem", mas é trabalho por vídeo, que é justamente o que o app quer evitar.
- **Clipe com o som dele, pausando a narração (igual à abertura):** o vídeo fica mais longo e quebra o ritmo; nos vídeos de referência a voz não para.
- **Clipe mudo:** mais simples, mas fica sem vida; o som baixinho por baixo da voz dá a sensação de "corte" sem brigar com a fala. Quem preferir mudo põe 0%.
- **A IA escolhe o clipe pelo tema:** os clipes não têm ligação com o assunto (é a graça do bordão), e escolher por tema gastaria uma chamada sem ganho; o rodízio resolve.
- **Ordem do rodízio fixa no código:** cada canal tem um estoque e um gosto diferentes; escolher a ordem custa um menu.
- **Posição fixa no tempo (sempre aos 13 s):** cairia no meio de uma frase. A virada do roteiro acompanha o texto.
- **Uma frase fixa só:** é a marca mais forte, mas cansa e o usuário não tem uma frase própria ainda. A lista com rodízio guarda a marca (são sempre frases dele) e varia.
- **A IA escreve a frase a cada vídeo:** soaria mais "do tema", mas perde a marca e tende ao forçado (piada sobre o assunto, que é o que o [0035](0035-piada-ligada-ao-tema.md) abandonou).
- **Recorte sempre com 2 s automáticos, sem editor:** zero trabalho, mas a IA pode errar o pedaço da dança, e não haveria como corrigir. O editor só abre para clipes longos e já vem com a sugestão dela.

## Consequências

- **Ganhamos:** o "respiro" dos vídeos de referência sai pronto e sem trabalho por vídeo; o estoque cresce sem mexer no código.
- **Custa:** migração dos bordões (os atuais ganham `role` pela marcação de padrão: abertura, final, ou final para os sem marca); o roteiro ganha mais uma regra (a frase da virada), que a revisão das IAs ([0034](0034-revisao-do-roteiro-pelas-ias.md)) também precisa respeitar; um mini editor de recorte novo (a linha do tempo com miniaturas é tirada no navegador, num `canvas`); a cena da virada usa vídeo com som, que pesa mais na prévia e entra na mixagem.
- **Direitos:** clipes de dança de outras pessoas podem gerar reclamação de direitos autorais. O app não baixa nada: o usuário sobe os clipes que pode usar.
- **Revisar quando:** a virada começar a parecer repetida nos números (queda na retenção perto dos 13 s), ou o usuário quiser mais de uma virada por vídeo.

## Na implementação

- **O trecho sugerido sai do movimento, e não da IA de visão:** a dança é justamente o que mais se mexe, e a medida é de graça e sempre igual; a IA de visão só gastaria uma chamada para dizer o mesmo.
- **Sem o botão "Clipe inteiro" no recorte:** o trecho vai até 3 s, a mesma regra que dispensa o recorte nos clipes curtos; um clipe longo inteiro pararia a explicação.
- **A cena da virada nasce "parada":** a dança já se mexe, e um zoom por cima tremia. O usuário pode escolher outro movimento na cena.
- **A voz espera o clipe terminar:** a cena da virada dura o que a frase leva para ser dita (uns 1,5 s), e um trecho mais longo era cortado antes do fim. Agora, com o trecho mais longo que a frase, a voz para no fim dela, o clipe vai até o fim, e a narração continua em seguida; as cenas seguintes andam junto e o vídeo fica mais longo por essa diferença. Isso muda o "nada pausa" da decisão, a pedido do usuário. Primeiro o clipe acelerava até 1,5× para caber; ele preferiu a dança no tempo dela. Esticar a cena por cima da fala seguinte atrasaria a imagem e a legenda dela. O corte da voz cai no fim da última palavra da frase, como a transcrição marca, com a voz sumindo e voltando em 2 quadros: a palavra seguinte começa a soar antes do tempo marcado dela, e cortar no começo dela (ou no meio do silêncio) deixava escapar um "n-" ("rolou. N-").
- **O clipe carrega antes do corte:** na prévia, a cena com vídeo é montada 2 s antes, escondida (`premountFor` do Remotion), para não piscar uma tela preta enquanto o vídeo busca o trecho. Desde 2026-10-30 **toda** cena é montada antes, 0,5 s, pelo mesmo motivo: ver o adendo abaixo.
- **A faixa do meio é uma fileira que rola para o lado:** com dezenas de clipes, uma grade cresceria para baixo e empurraria o Final.
- **Sem frase, a aba avisa:** os clipes do meio sem nenhuma frase da virada não entram em vídeo nenhum, e isso passava despercebido. A aba mostra o aviso com o botão "Escolher frases", as frases abrem sozinhas ao subir clipes sem frase, e a lista vazia já pede 5 sugestões à IA.

## Adendo: as figurinhas saem do app

O usuário pediu para tirar as figurinhas por inteiro. Elas eram a "reação" da cena ([0022](0022-imagens-da-web-e-controles-da-cena.md), 2C, e [0025](0025-variacoes-volume-e-figurinhas.md), ponto 3): uma imagem com fundo transparente escolhida pela etiqueta da reação. Com a virada, o "respiro" do vídeo passa a ser o clipe do meio, e a figurinha automática combinava pouco (escolhida pela emoção, sem olhar a obra; estava no Backlog).

- **Sai:** a aba Figurinhas da Biblioteca, o pop-up "😮 Figurinha" da cena, o ajuste "Figurinhas" do vídeo, o efeito "reação" (`effect: 'emoji'`, que só existia para mostrar a figurinha) e a escolha automática na montagem. A IA não propõe mais reação, e a catalogação não classifica imagem como figurinha.
- **Dados:** as 53 figurinhas da biblioteca foram apagadas, a pedido do usuário. Nos projetos, as cenas com reação viraram "nada" (o "pop" que tocava com a figurinha saiu junto, menos o escolhido pelo usuário), e as cenas que usavam uma figurinha como imagem ficaram sem imagem.
- **Perdemos:** a reação desenhada por cima da cena, que dava humor sem trocar a imagem, e o trabalho de quem já tinha montado a coleção. Os memes e as variações ([0020](0020-imagens-especificas-memes-e-zoom.md)) continuam fazendo o papel do humor na imagem.

## Adendo (2026-10-30): a fala mais longa que o trecho corta para a próxima cena

A decisão original mandava o trecho **repetir** até a cena acabar, quando a fala fosse mais longa que ele. Com uma sobra pequena isso fica feio: no vídeo "Yoruichi: Rainha de Bleach?" o trecho tem 2,5 s (7,9 → 10,4 s do clipe) e a frase dura 2,83 s, então os últimos 10 quadros mostravam o começo da dança de novo — um pulo visível bem no fim da cena.

Agora a cena da virada **acaba junto com o trecho** e a cena seguinte entra ali, antes da frase dela começar; a fala que sobra da virada corre por cima dessa imagem nova. O usuário escolheu assim: "é só continuar a próxima cena, a próxima frase".

- O tempo da voz não muda: as palavras da cena que entrou mais cedo continuam acendendo na hora certa (o `wordStarts` dela é deslocado pelos quadros adiantados).
- Enquanto a primeira palavra da cena nova não é falada, o bloco da legenda dela aparece **apagado** (nenhuma palavra acesa), em vez de acender a última palavra da frase, que era o que a conta de "palavra atual" fazia quando o quadro era anterior à primeira.
- O caminho contrário — trecho mais longo que a fala, com a voz esperando o clipe terminar — fica como está.
- **Perdemos:** a imagem da cena seguinte aparece uma fração de segundo antes da fala dela; em compensação, nenhuma dança recomeça do zero no meio da cena. O `Loop` continua no código para o caso de o trecho ser bem mais curto que a fala em algum vídeo antigo sem transcrição.

E o navegador não trava mais no corte. O usuário filmou a tela: o clipe andava em todos os quadros e, bem no fim, prendia o último quadro por um instante antes de trocar de cena. Medindo os intervalos do `requestAnimationFrame` na prévia, o corte custava **183 ms** de travada (uns 5 quadros) — o tempo de montar a cena seguinte e decodificar a imagem nova. Agora toda cena é montada 0,5 s antes, escondida (`premountFor`), como já era feito com o clipe: nas medidas depois da mudança, nenhum engasgo acima de 40 ms em três execuções. O MP4 não muda (os dois renders, com e sem, saem pixel a pixel iguais): o render espera cada arquivo carregar, então a travada só existia na prévia.

E a cena logo depois da virada **não nasce mais parada**. Na gravação que o usuário mandou, o clipe se mexia em todos os quadros até o corte, mas a cena seguinte era uma prova (moldura) com `motion: "still"` escolhido pela IA: um cartão imóvel por ~3 s, que depois da dança parece o vídeo travado. Agora, se a IA marcar "parado" nessa cena, o `markPivot` troca por um zoom lento; nas outras cenas o "parado" continua valendo, e o que o usuário escolheu na cena nunca é mexido. Vale para roteiros novos: num projeto já montado, o Movimento se troca na Revisão.
