# 0042 — O ângulo sem rival e o formato Curiosidade

**Status:** Aceita · **Data:** 2026-11-05 · Muda a variedade do [0028](0028-variedade-nos-temas-do-debate.md) e os formatos do [0036](0036-formatos-de-video-e-tier-list.md); o formato novo segue a regra "sem dados de mentira" do [0011](0011-editor-automatico.md)

## Contexto

O debate criou "Reze vs. Makima: Quem Vence?", e a primeira fala é "Reze é a melhor personagem de Chainsaw Man". Em 15/10 o canal já tinha feito "Reze é melhor que a Makima", com a mesma tese. O usuário: "é a mesma vibe", e pediu "algo novo em vez de X vs Y, ou X é melhor que Y".

O problema é maior do que esse par. **9 dos últimos 15 vídeos colocam uma personagem contra outra**: "Yor contra Mikasa", "Nami humilha Robin no visual?", "Rebecca ou Lucy: quem lidera?", "Himeno contra Makima", "Power: mais viva que Makima?", "Yoruichi: rainha de Bleach?", "Rukia roubou a Yoruichi?". Mais 2 giram em torno de "a melhor": "Annie, a vilã desperdiçada" ("a melhor vilã de Attack on Titan") e "E se a Robin fosse vilã?" ("seria melhor que a Robin heroína?"). Dos 4 vídeos com a Makima, 3 a usam como rival. Os formatos do 0036 mudam a estrutura do roteiro, mas a tese continua a mesma: "Rukia: antes e depois" abre com "a Rukia é a melhor personagem de Bleach", e o tema dizia "o fandom só lembra da Orihime".

As causas:
1. **O filtro só olha a personagem principal, e só nos vídeos recentes.** A personagem fica bloqueada se estiver num dos 3 últimos vídeos, e descansa com 3 dos 8 últimos (`variety.ts`). O vídeo de 15/10 é o 25º mais novo, fora das duas janelas. A **rival** não é conferida em lugar nenhum.
2. **"O assunto não pode repetir" é só um pedido.** O debate recebe a lista de todos os títulos já feitos, mas nenhum código confere. Bastou trocar o título e o formato.
3. **O próprio brainstorm pede comparação.** Quando proíbe o ângulo "ela é mais que o visual", o pedido dá como exemplo de ângulo novo "uma comparação ('a Rebecca é melhor que a Lucy')" e "quem venceria" (`ideas.ts`). A IA segue o exemplo.

O usuário também pediu um assunto novo: **curiosidades que ninguém se perguntou**, "algo real". O exemplo que ele deu (a Rukia sem meias perto do Ichigo) é inventado, e ele mesmo avisou. Esse é o risco do formato: uma IA inventa curiosidade com facilidade, e soa verdadeira.

## Decisão

O usuário escolheu 1A, 2B (com a condição de voltar com outro assunto) e 3A, e pediu que a curiosidade seja o detalhe discreto, não o que a cena já explica.

### 1. A comparação vira um ângulo que o código confere, em qualquer formato

O brainstorm passa a devolver, além da personagem, a **rival** (`rival`): a outra personagem que o tema põe contra ela, ou vazio. Uma ideia **compara** quando tem rival, ou quando o tema tem as palavras de disputa ("vs", "contra", "melhor que", "ou … quem", "humilha", "no lugar de"). A IA pode esquecer de marcar a rival, e as palavras pegam o que escapar.

- **1A (escolhida).** No máximo **1 comparação nos 3 últimos vídeos**. Com 9 de 15 hoje, o canal precisa de mais de um vídeo de folga entre uma comparação e outra.
- **1B.** A comparação só não repete a do último vídeo, como o formato (`FORMAT_WINDOW = 1`). É menos apertado, mas ainda permite alternar: comparação, outra coisa, comparação…
- **1C.** Só tirar os exemplos de comparação do pedido, sem regra. O 0028 já mostrou que pedido sozinho é ignorado.

O formato **X contra Y** continua existindo, mas passa a ser uma das comparações: ele também conta na regra.

### 2. O par e a tese olhados em todo o histórico

- **2A.** A dupla personagem + rival **nunca se repete** no canal, em qualquer ordem e em qualquer formato: Reze e Makima já foram, então não voltam juntas.
- **2B (escolhida, com uma condição).** A dupla descansa nos últimos 8 vídeos, como a personagem. Depois disso ela pode voltar, mas **com outro assunto**. O usuário: "pode ter os mesmos personagens, mas falando sobre outro assunto".

**Como o código confere o "outro assunto".** Comparar o sentido de dois temas exigiria mais uma chamada à IA (ver as alternativas). A regra usa o que dá para conferir:
- se um vídeo antigo da dupla já **comparou** as duas (regra 1), a dupla não volta comparando de novo. "Reze é melhor que a Makima" e "Reze vs. Makima: Quem Vence?" comparam as duas, então a segunda seria descartada. Um tema como "o que a Makima viu na Reze antes de mandar matá-la" passaria;
- o brainstorm e o debate recebem os temas antigos da dupla ("a dupla Reze e Makima já teve: …") e precisam trazer outra pergunta. Uma IA do debate pode recusar o tema por ser o mesmo assunto, como já faz com a volta do [0033](0033-volta-de-personagens-que-deram-views.md).

A personagem sozinha continua seguindo as janelas de hoje e a volta do 0033.

Junto com a regra da dupla, a tese **"X é a melhor personagem de Y"** entra na lista do que o brainstorm não pode usar, como já foi feito com "ela é mais que o visual". Os exemplos de comparação saem do pedido e entram ângulos sem rival: o detalhe que ninguém percebeu, a cena que explica a personagem, uma teoria, o bastidor do design ou da dublagem, o que a adaptação mudou, por que o fandom ama ou odeia alguém.

### 3. O formato novo: Curiosidade

**O que é uma curiosidade aqui: o detalhe discreto, que a obra não deixa explícito.** Não serve a curiosidade que a própria cena explica, como a cicatriz do Luffy (ele se corta no capítulo 1 e a obra conta por quê) ou a tatuagem da Nami: quem viu já sabe. O usuário: "algo mais discreto, que o anime não deixa explícito". Os tipos:
- **o presságio:** uma fala ou cena do começo que só faz sentido muito depois. Exemplo real: no episódio 1 de Attack on Titan, a Mikasa do sonho diz "Itterasshai, Eren" ("vai, Eren"), e a frase só se explica no último capítulo;
- **o detalhe de fundo:** algo que aparece na tela e ninguém comenta (um objeto, um gesto que se repete, a roupa que muda);
- **o símbolo:** a cor, o nome ou o desenho que diz algo da personagem sem a obra falar;
- **o que o mangá ou o autor confirmou e o anime deixou só no ar:** uma nota do volume, uma entrevista, uma página extra.

| Formato | Exemplo | Como o vídeo anda |
|---|---|---|
| **Curiosidade** | "Você reparou no que a Mikasa diz no primeiro episódio?" | gancho com o detalhe que ninguém reparou → onde ele está (episódio, capítulo, a cena) → o que ele quer dizer, e quem confirma (a própria obra mais tarde, o autor, o material oficial) → uma pergunta ao público ("você tinha reparado?") |

**Detalhe real, sentido confirmado.** O detalhe precisa estar na obra (o episódio ou capítulo onde ele aparece), e o sentido precisa ser confirmado pela própria obra mais tarde, pelo autor ou por um material oficial. Uma leitura só dos fãs ("isso deve significar…") não é curiosidade: é teoria, e fica de fora. É no detalhe discreto que uma IA mais inventa, porque ninguém tem como desmentir na hora.

A curiosidade não tem rival, então também abre espaço contra a regra 1. Ela usa as cenas de sempre, sem edição própria, e segue a regra do formato do 0036 (não repete o do último vídeo).

**De onde vem a verdade.** É o ponto principal do formato:

- **3A (escolhida). Só curiosidade com fonte.** O brainstorm só pode propor uma curiosidade que **achou na pesquisa web** ou que está na própria obra, e devolve a **fonte** (`source`) das duas partes: onde o detalhe aparece ("episódio 1 de Attack on Titan") e quem confirma o sentido ("o capítulo 139", "entrevista do autor", "nota do volume 12"). O código descarta a curiosidade sem fonte. O debate vê a fonte e pode recusar uma que pareça fraca. A fonte vai junto para o roteiro, que não pode afirmar nada além dela, e a revisão do roteiro ([0034](0034-revisao-do-roteiro-pelas-ias.md)) reprova a narração que inventa um detalhe que a fonte não tem.
  - Hoje o que a pesquisa achou (`web`) fica só na ideia e não chega ao roteiro (o projeto recebe o tema, o gancho e o porquê). A fonte precisaria ser guardada no projeto.
- **3B. A IA pode propor de memória, e o roteiro avisa** ("dizem que…", "os fãs acham que…"). Mais ideias, mas abre a porta para curiosidade inventada no vídeo: é um dado de mentira com outra roupa.
- **3C. Só o que a própria obra confirma** (o presságio que se explica mais tarde), sem entrevista nem material oficial. É a mais segura, mas tira o tipo "o autor confirmou e o anime deixou no ar".

A IA ainda pode errar a fonte (citar o capítulo errado). A fonte guardada no projeto deixa o usuário conferir na Revisão antes de publicar, o que hoje não dá: o checklist "Antes de publicar" ganharia o item "a curiosidade e a fonte".

## Alternativas consideradas

- **Tirar o formato X contra Y:** resolve só uma parte, porque 5 das 9 comparações estavam em outros formatos (opinião e antes e depois).
- **Comparar o tema novo com todos os temas já feitos usando a IA** ("esse assunto já foi feito?"): pega mais casos, mas é mais uma chamada a cada debate, e a IA já recebe essa lista e deixou passar. A dupla de personagens, mais a regra "a dupla não volta comparando", é uma conferência exata e barata; o resto do "outro assunto" fica com as IAs do debate.
- **Curiosidade como ângulo, e não como formato:** ela tem um jeito próprio de andar (a pergunta, a resposta, a fonte), e o roteiro de "opinião com provas" pediria uma tese que a curiosidade não tem.

## Consequências

- **Ganhamos:** temas que não giram em torno de "quem é melhor", menos Makima como rival de todo mundo, e um formato com cara de "eu não sabia disso", que costuma dar compartilhamento.
- **Perdemos / custa:**
  - Menos temas passam no filtro. Com a regra 1A, logo depois de uma comparação os 2 vídeos seguintes não podem comparar; se o brainstorm insistir, vem o segundo brainstorm (já existe) e, no pior caso, o debate sai com menos temas.
  - A comparação é o ângulo que o canal mais fez, e pode ser o que dá mais comentário. Se as visualizações caírem, o "Revisar quando" abaixo vale.
  - As palavras de disputa podem pegar um tema que não compara ("quem matou o Ace?" não tem rival, mas "ou" e "quem" juntos são raros fora da disputa). A lista começa curta.
  - O formato Curiosidade custa: um campo novo na ideia e no projeto (a fonte), um pedido de roteiro novo, uma regra na revisão do roteiro e um item no checklist da Revisão.
  - Os vídeos antigos não têm a rival guardada: para eles, o código procura a dupla pelo nome no título e no tema, como já faz com a personagem.
- **Revisar quando:** as comparações forem sempre acima da mediana e as outras abaixo (afrouxar para 1B); a dupla voltar com o mesmo assunto em outras palavras (passar para 2A); as curiosidades saírem com fonte errada (passar para 3C); o debate sair sem temas com frequência.
