# 0033 — Volta de personagens que deram views, sem sugar até a última gota

**Status:** Aceita · **Data:** 2026-10-14 · Muda em parte o [0028](0028-variedade-nos-temas-do-debate.md) (a regra da personagem e o "repita só o formato")

## Contexto

Depois do 0028, o debate passou a fugir das personagens e obras que deram views. Os vídeos à mão com mais visualizações no Instagram são quase todos de Jujutsu Kaisen ("Yuki Tsukumo: A Feiticeira Mais Ousada?" 1.382, "Kenjaku vs Yuki e Choso" 1.367, "Todo e a vida em dois segundos" 1.343), atrás só de "Tatsumaki: Heroína Odiada?" (1.718). Desde o 0028, os temas criados sozinhos foram de Bleach, Dandadan, Naruto e Chainsaw Man, e JJK apareceu uma vez.

O usuário: "às vezes é bom falar sobre outro tema com a mesma personagem sobre outra coisa (...) igual eu fiz com a tatsumaki, tem 3 vídeos dela, mas não é pra ficar sugando até a última gota da personagem".

As causas:
1. **O pedido proíbe a volta.** O brainstorm do debate diz "repita o FORMATO que deu certo com outra obra ou personagem, nunca o mesmo assunto", e a Estrategista pesa "repetir a obra ou a personagem cansa o público, mesmo que tenha ido bem".
2. **Nada empurra para quem deu views.** O filtro só bloqueia; não há vaga para uma personagem campeã.
3. **"Não sugar" não existe como regra.** Só a janela de 3 vídeos, que é cega ao desempenho: depois dela, a mesma personagem pode voltar sem limite.

## Decisão

O usuário escolheu A, com o limite de 3 dos últimos 8 vídeos.

- **A. Uma vaga de "volta".** Dos 4 temas, no máximo um é uma volta (`revisit`): uma personagem de um vídeo do canal que ficou **acima da mediana de visualizações**, com um **assunto novo** (outra pergunta, outro recorte; o "não repita o assunto" continua). Como a aposta do 0028, a volta vem marcada no chat e as IAs podem recusá-la.
  - **O código confere:** a personagem precisa aparecer no título ou no tema de um vídeo acima da mediana; a volta não pode ser da personagem do **último vídeo** (nada de dois seguidos), mas fica livre da janela de 3.
  - **Não sugar:** a personagem que já tem **3 dos últimos 8 vídeos** descansa, mesmo sendo campeã. E se o **vídeo mais recente dela** ficou abaixo da mediana, ela também descansa: o público deu sinal de cansaço.
  - **A obra também volta:** a vaga de volta não conta no "uma ideia por obra" nem no "2 dos 4 últimos", senão JJK continua travado.
- **As IAs mudam o discurso.** O brainstorm troca o "nunca o mesmo assunto com a mesma personagem" por "pode voltar a uma personagem que deu views, com outro assunto". A Estrategista passa a pesar: voltar a uma campeã com ângulo novo é bom de vez em quando; repetir o mesmo ângulo, ou a mesma personagem toda hora, cansa.

Com os vídeos de hoje: a Tatsumaki descansa (3 dos últimos 8), e Yuki Tsukumo, Kenjaku e Todo (JJK) podem voltar.

## Alternativas consideradas

- **B. Só mudar o pedido.** Tirar o "nunca o mesmo assunto" e dizer às IAs que voltar é bom. Simples, mas o 0028 mostrou que pedido sozinho é ignorado (para um lado ou para o outro), e não há freio de "não sugar".
- **C. Só afrouxar a janela** (de 3 para 2 vídeos). Deixa voltar mais cedo, mas não empurra para quem deu views, e não tem limite total.
- **D. Volta pelo desempenho, sem vaga fixa:** o código dá preferência às ideias de personagens campeãs em qualquer posição. Pode encher os 4 temas de voltas, que é justamente o "sugar".

## Consequências

- **Ganhamos:** o canal volta ao que dá views (hoje, JJK) com assuntos novos, e o freio é pelos números: a personagem descansa quando já apareceu demais ou quando o último vídeo dela caiu.
- **Perdemos / custa:**
  - Um pouco da variedade do 0028: uma das 4 vagas pode ser de uma obra ou personagem recente.
  - Com poucos vídeos medidos, a "mediana" é instável (hoje são ~9 vídeos no Instagram): um vídeo pode virar campeão por pouco.
  - A personagem continua comparada pelo nome no título e no tema (o mesmo limite do 0028: apelidos passam).
  - Os vídeos feitos à mão não têm a obra gravada (`subject`), então a regra da obra conta só pelos criados sozinhos; a personagem funciona em todos, porque é pelo título.
- **Revisar quando:** as voltas ficarem abaixo da mediana (tirar a vaga ou apertar o limite), o debate escolher a volta quase sempre (deixar só a cada N vídeos), ou o canal tiver vídeos medidos suficientes para usar a razão com a mediana em vez das visualizações brutas.
