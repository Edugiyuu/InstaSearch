# 0034 — Revisão do roteiro pelas IAs antes da montagem

**Status:** Aceita · **Data:** 2026-10-15 · Estende o [0027](0027-debate-das-ias-antes-de-criar.md) (o debate passa a cobrir o roteiro, não só o tema) e o [0026](0026-criacao-autonoma-de-videos.md) (uma etapa nova na criação sozinha)

## Contexto

No "🗣️ Debater e criar um vídeo", as duas IAs debatem o **tema**, mas o **roteiro** sai de uma chamada só (`generateScript`, com o Gemini e a pesquisa na web) e vai direto para a montagem. Ninguém confere se o texto é coeso, se faz sentido ou se entrega o que as duas combinaram. O usuário: "ele cria o roteiro e elas não debatem sobre".

Mais duas coisas que apareceram olhando o código:
1. **O gancho combinado se perde.** O `createProject` recebe só o tema: o gancho e o porquê que saem do debate não chegam ao roteiro, que escreve um gancho novo.
2. **O "Por que este tema" é longo** (3 ou 4 frases, até 1.200 caracteres) para dizer por que as duas aceitaram o tema. O usuário prefere um resumo. Esse texto é escrito uma vez e só aparece na tela (nenhum pedido seguinte o lê), então encurtar economiza pouco token; o ganho maior é de leitura.

## Decisão

O usuário escolheu A em todos os pontos, com a preocupação de não gastar tokens demais: ver o ponto 8.

Depois do acordo, o roteiro passa por uma revisão: uma IA escreve, a outra critica, e o código confere a aprovação pelo voto, como no debate.

### 1. Quem escreve e quem revisa
- **1A (recomendada).** O roteiro continua saindo do `generateScript` (que já pesquisa os fatos e divide em batidas), agora com o gancho e o porquê do debate. No chat ele aparece como da **Roteirista**, e a **Estrategista** revisa.
- **1B.** A Roteirista (Sonnet) escreve num pedido próprio, e a Estrategista revisa. É mais "ela mesma", mas duplica o pedido do roteiro, que tem as regras de batidas, efeitos e sons, e as duas cópias tenderiam a divergir.

### 2. O que a revisora confere
Sempre: coesão (uma frase leva à outra), se faz sentido, a estrutura gancho → tese → provas → conclusão, se o gancho prende, se cabe na duração e se é o tema que as duas aprovaram.
- **2A (recomendada).** E os **fatos**: a revisora pesquisa na web as provas citadas (o capítulo, o episódio, o número, a fala). Um roteiro bem escrito que inventa um fato é o pior erro de um canal de comentário.
- **2B.** Só o texto, sem pesquisa: mais rápido e barato, mas não pega fato inventado.

### 3. Quantas voltas
- **3A (recomendada).** Até **2 reescritas**. A revisora devolve `aprovado` (sim ou não) e a lista dos problemas; sem aprovação, o roteiro é reescrito com a crítica. O código conta as voltas.
- **3B.** Uma só reescrita: mais barato, mas a segunda versão não é conferida.

### 4. Sem aprovação depois das voltas
- **4A (recomendada).** O vídeo segue para a montagem, e os problemas que sobraram aparecem na Revisão do projeto ("A revisora não aprovou: …"). O usuário grava a voz e revisa de qualquer jeito ([ADR 0011](0011-editor-automatico.md): a IA sugere, o usuário aprova).
- **4B.** Para sem vídeo, como quando não há acordo no tema.

### 5. Onde vale
- **5A (recomendada).** No debate e também no "🤖 Criar sozinho" de uma ideia, porque o roteiro sai do mesmo lugar. Sem debate, a revisão fica no projeto, e não num chat.
- **5B.** Só no debate.

### 6. Onde aparece
O roteiro, a crítica e cada versão nova entram no **mesmo chat do debate**, depois do acordo, para o usuário ver por que o roteiro ficou como ficou. A criação mostra a etapa "revisão do roteiro".

### 7. O "Por que este tema" mais curto
O resumo do debate passa de 3 ou 4 frases para **1 ou 2**, com o argumento principal e o número do canal que mais pesou.

### 8. Gastar pouco
Num debate de hoje (15/10, "Obito vs. Naruto"), o Claude respondeu 6 vezes no debate e cerca de 20 vezes depois, nas imagens (cada uma olhando fotos, o que pesa mais); o brainstorm e o roteiro foram no Gemini, de graça até o limite diário. A revisão entra assim:
- **Contexto enxuto:** a revisora recebe só o roteiro, o tema, o gancho e o porquê do debate e as regras de estrutura e duração. Nada dos 30 vídeos, 40 comentários e títulos que cada fala do debate carrega.
- **Até 4 buscas** na conferência dos fatos, como no roteiro: o usuário preferiu não economizar justo no que confere se o vídeo diz a verdade.
- **A reescrita vai pelo gerador de roteiro**, que tenta o Gemini primeiro; só a revisão é no Claude (Sonnet).
- No melhor caso, **1 chamada a mais** do Claude (aprovou de primeira); no pior caso, **3** (três revisões), perto de 10% do que um vídeo já gasta, por causa das imagens.
- **O gasto das imagens fica como está:** para o usuário, elas são a parte mais importante do vídeo.

## Alternativas consideradas

- **Pedir mais cuidado no próprio pedido do roteiro** ("revise antes de responder"): a IA que escreveu tende a aprovar o próprio texto; é o motivo de o debate ter dois olhares (0027).
- **Revisão pelo usuário antes da montagem:** já acontece depois, na Revisão; parar antes tira o "sozinho" da criação.
- **Revisão em cada batida:** mais precisa, mas multiplica as chamadas; a coesão é do texto inteiro.

## Consequências

- **Ganhamos:** um roteiro conferido por um segundo olhar (e, com 2A, com os fatos checados), que usa o gancho e o porquê do debate, e um "Por que este tema" que se lê de relance.
- **Perdemos / custa:**
  - De 1 a 3 chamadas a mais de Sonnet por vídeo, com até 4 buscas cada, e até 2 roteiros a mais no gerador; a criação fica mais lenta, talvez 1 ou 2 minutos.
  - O app ainda não mede o gasto de verdade: o log do Claude Code mostra só os tokens de entrada fora do cache ("4 tokens"), não o pedido inteiro.
  - As duas IAs podem discordar por gosto, e não por erro; o limite de voltas segura isso.
  - Com 1A, o roteiro continua no Gemini e a revisão no Claude: é um modelo criticando o outro, o que é bom para pegar erro, mas a "Roteirista" do chat é, na verdade, o `generateScript`.
- **Revisar quando:** a revisora aprovar quase sempre na primeira (a etapa não está pegando nada: tirar ou endurecer), reprovar quase sempre (critério exigente demais), ou os vídeos com o roteiro revisado não melhorarem a retenção.

## Adendo (2026-10-17): até 3 reescritas

A escolha 3A previa até 2 reescritas (3 versões). Num roteiro de "E se…" sobre Cyberpunk: Edgerunners, a Estrategista apontou fatos errados nas versões 1 e 2 e ainda achou dois problemas na 3, que seguiu sem aprovação. O limite passa para **3 reescritas** (até 4 versões e 4 revisões): a última crítica agora vira uma versão nova, em vez de só aparecer na Revisão.

- **Custa:** no pior caso, mais 1 chamada da revisora (com até 4 buscas) e mais 1 roteiro no gerador; a criação fica um pouco mais lenta.
- **Revisar quando:** a 4ª versão quase nunca for aprovada (aí o problema é o pedido do roteiro, não o número de voltas).
