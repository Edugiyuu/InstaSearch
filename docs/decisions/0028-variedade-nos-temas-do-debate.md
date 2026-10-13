# 0028 — Variedade nos temas do debate: obra, personagem, hype e uma aposta do nicho

**Status:** Aceita · **Data:** 2026-10-13 · Muda como o [0027](0027-debate-das-ias-antes-de-criar.md) escolhe os 4 temas e o que as IAs sabem; troca a regra "só as obras do canal" do adendo do [0026](0026-criacao-autonoma-de-videos.md) por "as obras do canal e uma aposta do mesmo nicho"

## Contexto

Dos 6 vídeos criados sozinhos até 13/10, todos são de duas obras (One-Punch Man e Jujutsu Kaisen), e 3 são sobre a Tatsumaki: "O segredo de Tatsumaki", "O passado de Tatsumaki" e "Tatsumaki: Trauma ou Tirania?". O usuário: "as ideias são SÓ DELA".

As causas, uma puxando a outra:
1. **O brainstorm pede repetição.** O pedido dizia "ideias que repetem o que foi acima da mediana (mesmo assunto, personagem ou formato)", e "Tatsumaki: Heroína Odiada?" é o vídeo com mais visualizações do canal.
2. **A Estrategista só olha a mediana.** Nada no debate diz que repetir a personagem de ontem é um ponto fraco.
3. **"Não repita o assunto" compara títulos.** "O segredo" e "O passado" parecem assuntos diferentes para a IA, e o "varie a obra" é só um pedido: o código não confere.

E mais um padrão: 6 dos 7 debates escolheram o tema 3, sinal de viés de posição (o "Revisar quando" do 0027).

## Decisão

O usuário escolheu A, B e D da proposta, com duas condições dele.

- **A. Regra no código.** O brainstorm devolve, para cada ideia, a **obra** (`work`), a **personagem principal** (`character`) e se o tema está **em alta** ou é **atemporal** (`trend`). O código descarta:
  - a ideia cuja personagem aparece no título ou no tema de um dos **3 últimos vídeos**;
  - a ideia cuja obra já tem **2 dos 4 últimos vídeos**.

  A IA pode ignorar um pedido; o código, não. É o mesmo princípio do voto do 0027.
- **B. 4 temas de 4 obras diferentes.** O brainstorm pede 6 ideias, de obras diferentes. Depois do filtro, o código fica com uma por obra e escolhe 4. No pedido, "repita o que foi acima da mediana" vira "repita o **formato** que deu certo, com outra obra ou personagem".
- **D. As IAs veem a variedade.** O debate recebe os últimos vídeos com a obra e o "em alta / atemporal" de cada um, e a Estrategista passa a pesar também a variedade: repetir obra ou personagem cansa o público, mesmo que tenha ido bem.
- **A ordem dos 4 temas é sorteada**, contra o viés do tema 3.

### Condições do usuário

- **Em alta, mas nem sempre hype.** "O tema tem que estar em alta, mas nem sempre toda hora só ter vídeos no hype." Das ideias, a maioria vem do que está acontecendo agora, e pelo menos uma é atemporal (uma análise ou curiosidade que não depende da semana). Se as 4 escolhidas forem todas em alta e sobrar uma atemporal, o código troca a última por ela. O debate vê quantos dos últimos vídeos foram em alta para equilibrar.
- **Uma aposta do nicho, fora das obras do canal.** "Pesquise sobre algo que o pessoal tá falando ultimamente, tipo a Malfoid / Female Draco Malfoy (...) claro, tudo baseado no canal." Uma das ideias pode ser uma **aposta**: algo que está viralizando no **mesmo nicho** dos vídeos do canal (anime, desenho, games, cultura geek), mesmo numa obra que o canal nunca tratou, como uma trend de fãs, um meme ou uma versão alternativa de personagem. Nunca de outro nicho (nada de culinária num canal de anime). A pesquisa do brainstorm passa a procurar isso também, e a aposta aparece marcada no chat.

  Isso troca a regra do adendo do 0026 ("nada de obra nova que o canal nunca tratou"), que tinha surgido depois do "Firefly Wedding", um anime da temporada que o usuário nem conhecia. A diferença: a aposta é **uma** das 4, vem marcada, e precisa estar **bombando** (não basta estar na temporada). As IAs ainda podem recusá-la no debate.

### O que fica como está

- **As IAs concordam rápido.** O usuário notou ("acho que é normal") e preferiu não mexer agora. Continua em observação pelo "Revisar quando" do 0027.

## Alternativas consideradas

- **C. Vaga fora da caixa sem filtro de nicho:** foi a proposta original. O usuário a aceitou só na forma acima, presa ao nicho do canal.
- **Só pedir mais variedade no prompt:** é o que já falhava ("varie a obra" estava lá).
- **Guardar a personagem em cada projeto:** daria uma comparação exata, mas os projetos feitos à mão não têm esse dado. Procurar o nome da personagem no título e no tema dos últimos vídeos funciona com todos, porque os títulos citam a personagem ("O passado de Tatsumaki").

## Consequências

- **Ganhamos:** temas de obras diferentes a cada vídeo, um equilíbrio entre hype e atemporal, e de vez em quando um teste de algo que está bombando no nicho.
- **Perdemos / custa:**
  - O canal deixa de repetir na hora o que acabou de dar certo: a Tatsumaki só volta depois de 3 vídeos sem ela, mesmo sendo a campeã de visualizações.
  - O brainstorm pede 6 ideias em vez de 4 (a mesma chamada, mais longa). Se o filtro deixar menos de 2, ele pede de novo uma vez, avisando o que foi descartado.
  - A personagem é comparada pelo nome: um apelido que não aparece no título ("Senhorita Tornado") passa pelo filtro.
  - A aposta pode cair numa obra que o usuário não conhece, o mesmo risco do "Firefly Wedding", agora limitado a uma vaga marcada.
- **Revisar quando:** os vídeos de aposta forem bem abaixo da mediana (tirar a vaga ou deixá-la mais rara); o filtro deixar o debate sem temas com frequência (afrouxar para 2 vídeos); ou o canal sentir falta de repetir um sucesso logo depois (abrir uma exceção para "parte 2").
