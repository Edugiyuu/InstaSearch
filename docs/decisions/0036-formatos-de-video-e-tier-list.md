# 0036 — Formatos de vídeo, com a tier list animada

**Status:** Aceita · **Data:** 2026-10-16 · Muda o pedido do roteiro (`generateScript`), o brainstorm e a variedade do [0028](0028-variedade-nos-temas-do-debate.md), e cria uma cena nova no vídeo ([0009](0009-remotion-para-composicao.md))

## Contexto

O usuário: "eu quero só vídeos diferentes". A troca de personagem e de obra (0028, 0033) não basta, porque **todo vídeo tem a mesma estrutura**: o pedido do roteiro manda sempre gancho → tese → 2 provas → conclusão → "comenta aí". Muda quem aparece, mas o vídeo é sempre o mesmo. Uma piada por vídeo foi proposta e recusada ([0035](0035-piada-ligada-ao-tema.md)); os memes nas imagens ficam.

Sobre o ranking, o usuário pediu uma edição própria: "uma tier list, não imagem, mas criar no vídeo mesmo, tipo TierMaker, onde você rankeia os personagens de One Punch Man, por exemplo, explica o motivo, e vai uma animação colocando a personagem no rank A, B ou C. Só nesse tipo." E **um personagem por vídeo**, numa série: "no primeiro vídeo eu coloquei o Genos no A; no segundo, mostro a tier list de novo, só que o Genos já está rankeado, e nesse vídeo rankeia o Garou, e assim vai".

## Decisão

O usuário escolheu a recomendada em todos os pontos: 2A, 3A e 3C, 4A e 5A.

### 1. Os formatos

| Formato | Exemplo | Como o vídeo anda |
|---|---|---|
| **Opinião com provas** (o de hoje) | "A Hinata é a mais desperdiçada de Naruto" | gancho → tese → 2 provas → conclusão |
| **Tier list** (série) | "Tier list de One Punch Man, parte 2: onde fica o Garou?" | o quadro com quem já foi rankeado, o motivo do personagem novo e, no fim, a animação que o põe na fileira |
| **X contra Y** | "Rebecca ou Lucy: quem é melhor?" | os dois lados, ponto a ponto, e um vencedor |
| **E se…** | "E se a Tatsumaki entrasse na Associação dos Monstros?" | a premissa, o que mudaria na história, o desfecho |
| **Mito ou verdade** | "3 coisas que todo mundo acha da Makima, e estão erradas" | cada mito, a prova que derruba, o próximo |
| **Antes e depois** | "Nami antes e depois do time-skip" | como era, o que mudou, o que ficou melhor ou pior |

Só a tier list tem edição própria. Os outros mudam o roteiro (a abertura, o ritmo e o fim) e usam as cenas de sempre, com os memes nas imagens.

### 2. Quem escolhe o formato
- **2A (recomendada).** O brainstorm marca o formato de cada ideia, e o código tira as ideias com o formato de um dos **2 últimos vídeos**, como já faz com a obra e a personagem. A IA pode ignorar um pedido; o código, não. O debate vê o formato de cada tema.
- **2B.** O código sorteia o formato antes do roteiro, sem a IA escolher. Garante a variedade, mas pode cair um formato que não combina com o tema ("E se…" num tema de design).

### 3. A tier list é uma série, um personagem por vídeo
Uma **série** é uma obra com um critério: "One Punch Man: quem é o melhor personagem", "as mulheres de Bleach". Cada vídeo da série ranqueia **um** personagem novo:
1. **Abertura:** o quadro aparece com quem já foi rankeado nos vídeos anteriores ("parte 3: onde fica o Garou?").
2. **O motivo:** o personagem em tela cheia, com as imagens de sempre (fanart, cenas, memes), enquanto a narração defende a posição dele.
3. **No fim:** o quadro volta, a imagem do personagem voa para a fileira com um som de impacto, e fica a pergunta: "concorda ou ele merecia outra?".

O primeiro vídeo da série começa com o quadro vazio.

**Quem escolhe o próximo:**
- **3A (recomendada).** O brainstorm pode propor "a próxima da série X": um personagem da obra que **ainda não está no quadro** (o código confere). Ele também pode propor uma série nova. Uma série entra no debate como qualquer tema, e a regra do formato (ponto 2) evita duas tier lists seguidas.
- **3B.** O usuário começa a série e escolhe cada personagem; a criação sozinha não faz tier list.

**De onde vem o quadro:**
- **3C (recomendada).** O quadro **sai dos próprios vídeos**: cada vídeo da série guarda o seu personagem e a fileira, e o quadro de um vídeo é o de todos os vídeos da série criados **antes** dele, mais o dele. Apagar um vídeo tira o personagem do quadro; trocar a fileira na Revisão muda o quadro dos vídeos seguintes. Não existe um "quadro" guardado à parte que fique desatualizado (o mesmo cuidado do "apagar um projeto limpa a tela Ideias").
- **3D.** Um arquivo próprio por série com o quadro. Mais simples de ler, mas fica errado quando um vídeo é apagado ou a fileira muda.

### 4. As fileiras
- **4A (recomendada).** **S, A, B, C e D**, como no TierMaker: o público conhece, e o "S" é onde mora a polêmica.
- **4B.** Só **A, B e C**, como o usuário citou: mais simples, mas sem o "S" (o melhor de todos) e sem o "D" (o pior).

### 5. A imagem que vai no quadro
- **5A (recomendada).** O **retrato oficial** do personagem (AniList, que a busca já usa): é sempre o personagem certo e já vem quadrado, do jeito que cabe numa fileira. A cena da explicação continua com a imagem da busca (fanart, cena, meme).
- **5B.** A mesma imagem da explicação, recortada no rosto. Fica mais bonito quando dá certo, mas o recorte de uma fanart pode cortar errado.

### 6. A narração não diz a fileira; quem revela é a animação
O problema (o usuário): se o roteiro termina com "por isso o Genos é tier A" e o usuário põe o Genos no B, a narração e a legenda ficam erradas.

- **A letra só aparece no quadro**, que é desenhado a partir da fileira guardada no vídeo. A narração **aponta** para o quadro sem dizer a letra, e a animação acontece na palavra que aponta: "…e pra mim, o lugar do Genos é **aqui**." (ele voa para a fileira) "Concorda? Comenta aí." Outros fechos: "O veredito é **esse**." / "E é **aqui** que ele fica." / "Então ele vai **pra cá**.", seguidos de uma pergunta sobre a fileira que já apareceu ("Exagerei?", "Ele merecia mais?"). Trocar a fileira muda só o quadro: "aqui" vale para qualquer uma, e nada falado nem escrito fica errado.
  - Uma pergunta antes da revelação ("e então, onde fica o Genos?") foi descartada: com a animação logo em seguida, soa retórica (o usuário).
  - A animação começa no tempo da palavra que aponta, que a legenda sincronizada já conhece ([0018](0018-legenda-sincronizada-com-a-voz.md)); sem a voz gravada, no começo da última batida.
- **O código confere:** uma narração que cite a fileira ("tier A", "rank B", "fica no S") é reprovada na revisão do roteiro ([0034](0034-revisao-do-roteiro-pelas-ias.md)), e vem outra versão.
- **Trocar a fileira:** na Revisão, o personagem do vídeo ganha **"Fileira: S A B C D"**, e o chat também troca ("põe o Garou no B"). A troca vale para o quadro dos vídeos seguintes da série. Sem linha do tempo ([0011](0011-editor-automatico.md)).
- **Quando o argumento não combina mais** (o roteiro elogia, e a fileira foi para o D): antes de gravar a voz, a troca oferece **"↻ Ajustar o roteiro para a nova fileira"**, que reescreve pelo chat; depois de gravar, só um aviso ("o que você gravou defendia outra fileira"), e o usuário decide se regrava.

## Alternativas consideradas

- **Tier list como imagem pronta** (um print do TierMaker): é só mais uma imagem; o usuário pediu a montagem no próprio vídeo, com a animação.
- **Ranking / top 3 falado, sem quadro:** foi a primeira ideia; sem o quadro, vira uma lista falada, e é o quadro que prende ("onde ele vai cair?").
- **A narração anunciar a fileira** ("por isso ele é tier A"): soa natural, mas fica errado quando o usuário troca a fileira, na voz e na legenda.
- **Vários personagens num vídeo só** (4 a 6): foi a primeira versão desta proposta. Dá uns 6 s por personagem, pouco para explicar; o usuário preferiu um por vídeo, o que também vira série e faz o público voltar para ver o próximo.
- **Só pedir variedade no roteiro:** o 0028 mostrou que pedido sozinho é ignorado; o código precisa conferir o formato.

## Consequências

- **Ganhamos:** vídeos que mudam de jeito, e não só de personagem; a tier list, que dá comentário ("o Garou no B? tá maluco") e faz o público voltar para a próxima parte.
- **Perdemos / custa:**
  - Uma cena nova no Remotion (o quadro e a animação), que aparece na prévia e no MP4: é a maior parte do trabalho.
  - O roteiro passa a ter um pedido por formato, mais texto para manter.
  - A série depende da ordem dos vídeos: um vídeo antigo renderizado de novo mostra o quadro de quando foi criado, não o de hoje (é o certo, mas pode surpreender).
  - Uma série da mesma obra conta na regra da obra do 0028 (2 dos 4 últimos): as partes ficam espaçadas, e não em sequência.
- **Revisar quando:** um formato for sempre abaixo da mediana (tirar), a tier list for bem acima (deixar mais frequente), ou o usuário pedir outro formato com edição própria.

## Adendo (2026-10-17): tier list desligada por enquanto

O usuário pediu para tirar a tier list por enquanto. Os outros formatos continuam. A tier list ficou pronta e testada (a cena com o quadro e a animação, a série, a fileira na Revisão e no chat), mas **desligada**: `TIER_LIST_ON = false` em `formats.ts`. O brainstorm não a propõe, e o código barra uma ideia de tier list se ela aparecer. Para ligar de novo, basta mudar essa constante.
