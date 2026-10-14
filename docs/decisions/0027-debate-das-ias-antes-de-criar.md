# 0027 — Duas IAs debatem os temas antes de criar o vídeo

**Status:** Substituída em parte por [0030](0030-debate-em-rodadas-com-veto.md) (a escolha 2A: sem acordo, vêm temas novos, até 3 rodadas, e o criador tem 5 s para vetar o tema aceito) · **Data:** 2026-10-11 · Muda como o botão geral do [0026](0026-criacao-autonoma-de-videos.md) escolhe o tema (o resto do 0026 continua)

## Contexto

No [0026](0026-criacao-autonoma-de-videos.md), o botão "🤖 Criar um vídeo sozinho" fazia um brainstorm próprio e pegava a **primeira** ideia, sem ninguém questionar se ela era boa. Nos testes:
- primeiro, ele repetiu o tema do usuário (Tatsumaki);
- depois, fugiu do nicho (um anime que o usuário nem conhece);
- por fim, ficou nas obras do canal (Naruto).

Em nenhum caso deu para ver **por que** aquele tema. A explicação era um parágrafo da própria IA que deu a ideia.

O usuário pediu outro jeito:

> "Quero que duas IAs Sonnet 5.5 no médio conversem sobre os temas gerados (brainstorm) e discutam por que pode ou não ser um bom tema para vídeo, baseado no canal/Instagram do usuário. Elas têm que criticar uma à outra até as duas aceitarem que o tema está bom o suficiente e que vai gerar engajamento. Eu quero ver o que elas estão falando como se fosse um chat. Depois elas criam o vídeo sozinhas, com roteiro etc., e explicam por que acharam esse tema bom. Elas têm que ter em mente que não podem discutir por muito tempo."

**O que já existe:** o app chama o Sonnet 5.5 com esforço médio (`llm.ts`) pela API (`ANTHROPIC_API_KEY`) ou pelo Claude Code do plano (`CLAUDE_CODE=on`, que é o que está ligado). Hoje o Gemini vem primeiro, e o Claude só entra como reserva.

## Decisão

Os itens "decidido pelo usuário" vêm do pedido. Nos outros, o usuário escolheu a recomendação do Claude: **1A, 2A e 3A**.

### Decidido pelo usuário

- **Duas IAs, as duas Sonnet 5.5 com esforço médio**, sempre pelo Claude, sem o Gemini. Cada fala é uma chamada com a conversa inteira até ali.
- **Elas discutem os temas de um brainstorm** com os dados do canal: os vídeos e as métricas do [0021](0021-ideias-a-partir-do-desempenho.md), os comentários e os títulos já feitos.
- **Uma critica a outra até as duas aceitarem o mesmo tema.** Cada fala termina com um voto estruturado (o tema que ela aceita, ou nenhum), e o código confere o acordo. A IA não decide sozinha que "chegaram a um acordo".
- **Debate curto:** as duas sabem o limite de falas e que precisam convergir.
- **Chat visível**, ao vivo, como uma conversa entre duas pessoas.
- **Depois do acordo, o vídeo é criado sozinho** pelo caminho do 0026 (roteiro → montagem → imagens → "falta gravar a voz"), e **a explicação do porquê** (o resumo das duas) fica no projeto.

### 1. Quem são as duas IAs

- **1A (escolhida): dois papéis diferentes.**
  - **A Estrategista** olha os números: o que foi acima da mediana, se o público do canal se interessa, se o assunto já foi feito.
  - **A Roteirista** olha o vídeo: se o gancho prende em 2 segundos, se rende 30 segundos de argumento e se dá para achar imagens.

  As duas criticam e votam. Com olhares diferentes, uma pega o que a outra não vê.
- **1B: duas iguais**, com o mesmo pedido. É o mais simples, mas o mesmo modelo com o mesmo pedido tende a concordar com ele mesmo logo na primeira fala, e o debate vira teatro.

### 2. Quanto dura e o que acontece sem acordo

- **2A (escolhida): no máximo 6 falas (3 de cada).** Antes da última, as duas recebem o aviso "última fala: decida". Se ainda discordarem, **o vídeo não é criado**, e o chat mostra por quê. O usuário pode clicar de novo ou criar pelo cartão de uma das ideias.
- **2B: no máximo 6 falas, e sem acordo vale o tema com mais apoio** (o que cada uma deu como segunda opção). Sempre sai um vídeo, mas sem as duas aceitarem, o que contraria o pedido.
- 2C: no máximo 10 falas. Dá mais chance de acordo, mas custa o dobro de chamadas e tempo (cada fala leva de 10 a 30 s pelo Claude Code).

### 3. Quais temas elas discutem

- **3A (escolhida): um brainstorm novo delas, com 4 ideias** nas obras do canal, sem repetir assunto (a regra do adendo do 0026). O lote da tela do usuário não muda. Com 4, e não 6, o debate cabe em poucas falas.
- **3B: as ideias novas que estão na tela**, do último brainstorm do usuário. Não gasta um brainstorm, mas volta ao problema da Tatsumaki: se o usuário fez o brainstorm com um tema, todas as opções são sobre ele.

### Onde aparece

- **Na tela Ideias**, o botão vira **"🤖 Debater e criar um vídeo"** e abre o chat: as falas aparecem uma a uma (a tela consulta a cada 2 s), com o nome e a cor de cada IA, os votos e, no fim, o tema escolhido e o andamento do vídeo.
- **O debate fica salvo** em `data/debates/`, com o link para o projeto. Na Revisão e na tela do roteiro do projeto, aparece **"Por que este tema"**, com a explicação e o link para o debate inteiro.

## Alternativas consideradas

- **Uma IA só, que se auto-avalia:** é o que o 0026 fazia. Uma IA não critica de verdade a própria ideia.
- **Gemini numa ponta e Claude na outra:** dá olhares mais diferentes, mas o usuário pediu Sonnet 5.5 nas duas, e o Gemini do plano grátis vive sem cota.
- **Um juiz, uma terceira IA que decide:** resolve o "sem acordo", mas é uma chamada a mais, e o usuário pediu que as duas aceitassem.

## Consequências

- **Ganhamos:** um tema que passou por crítica antes de virar vídeo; o usuário vê o raciocínio e aprende com ele (o que o canal acha que funciona); a explicação fica no projeto.
- **Perdemos / custa:**
  - Mais chamadas: até 6 falas, além do brainstorm, do roteiro e da visão. Pelo Claude Code, elas contam no limite do plano, e o debate leva de 1 a 3 minutos.
  - O debate é sempre no Claude: se o Claude Code estiver fora do ar ou deslogado, o botão não funciona (o Gemini não entra de reserva).
  - "Vai gerar engajamento" é a opinião de duas IAs, não uma previsão: as métricas do 0021 é que dizem depois se elas acertaram.
- **Revisar quando:** os debates terminarem sempre no primeiro tema (sinal de teatro, então endurecer os papéis), terminarem sem acordo com frequência (aumentar o limite ou passar para a 2B), ou os vídeos escolhidos no debate não forem melhores que os escolhidos à mão (comparar pelas métricas).

## Adendo (2026-10-11): como ficou na implementação

- **O botão** ficou "🗣️ Debater e criar um vídeo" (o 🤖 continua no "Criar sozinho" de cada ideia).
- **O acordo é conferido pelo código** (`agreement` em `debate.ts`): vale o voto mais recente de cada IA. Se uma muda de ideia, o acordo antigo se desfaz. O laço para em 6 falas, mesmo que o pedido seja ignorado.
- **Só a vencedora vai para o banco de ideias:** as 4 candidatas saem do brainstorm sem ser gravadas (`save: false`), e as 3 perdedoras ficam só no debate.
- **Sempre Claude:** `llm.ts` ganhou a opção `claudeOnly` (a API e, se ela não estiver configurada, o Claude Code), sem o Gemini como reserva.
- **Debate interrompido:** se o servidor reiniciar no meio, o debate vira "parou" ao subir de novo, em vez de ficar "pensando…".
- **Primeiro teste real:** acordo no tema 2 (o episódio 4 da 3ª temporada de Jujutsu Kaisen) em **2 falas**. A Roteirista criticou e aceitou na mesma fala, e ajustou o gancho. As falas saíram maiores que as "2 a 4 frases" pedidas. Fica em observação pelo "Revisar quando" acima: se o acordo em 2 falas virar regra, exigir pelo menos uma réplica.
