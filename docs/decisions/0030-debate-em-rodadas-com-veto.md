# 0030 — Debate em rodadas de temas, com 5 s para o criador vetar

**Status:** Aceita · **Data:** 2026-10-13 · Substitui a escolha 2A do [0027](0027-debate-das-ias-antes-de-criar.md) ("no máximo 6 falas; sem acordo, nenhum vídeo"); o resto do 0027 e o [0028](0028-variedade-nos-temas-do-debate.md) continuam

## Contexto

No [0027](0027-debate-das-ias-antes-de-criar.md), o debate tinha uma rodada só: 4 temas, até 6 falas, e sem acordo nenhum vídeo. Duas coisas incomodavam o usuário:

- Se as duas IAs achavam os 4 temas fracos, o debate acabava sem vídeo, e era preciso clicar de novo.
- Quando as duas concordavam, o vídeo começava na hora, mesmo que o tema não agradasse ao usuário.

O pedido:

> "Se as duas acharem que nenhum dos 4 temas é bom, dê mais 4, e assim vai. Quando as duas entrarem em acordo, eu tenho 5 segundos para interrompê-las caso eu não goste; se passar do timer de 5 segundos, elas podem continuar normalmente."

**O que a 2A perde:** o teto de custo e de tempo. Cada rodada é um brainstorm com pesquisa na web (cerca de 1 minuto) e até 6 falas (de 1 a 3 minutos), tudo no limite do plano do Claude Code. "E assim vai" sem limite deixa um debate teimoso rodar sem parar.

## Decisão

O usuário escolheu as recomendações do Claude nos três pontos em aberto.

### 1. Até 3 rodadas

Cada rodada tem até 4 temas novos e até 6 falas. Depois da 3ª rodada sem acordo, o debate acaba sem vídeo, como antes. No pior caso: 12 temas e uns 10 minutos.

- Alternativas: 5 rodadas (uns 20 minutos no pior caso) ou sem limite, só com o botão de parar (custo sem teto).

### 2. Quando vem uma rodada nova

- **As duas recusam:** as duas falas mais recentes votam "nenhum" (`bothRefused` em `debate.ts`). Não espera as 6 falas.
- **As falas acabam:** as 6 falas terminam sem acordo, com cada uma num tema.

As IAs sabem disso: "vote null só quando nenhum tema serve de verdade". Os temas que caíram vão para o brainstorm seguinte, para ele não trazê-los de volta, e as IAs veem essa lista. A rodada que acabou fica no debate (`past`), e o chat a mostra fechada, com o motivo.

- Alternativa: rodada nova só quando as duas recusam tudo. Com isso, um impasse entre dois temas continuaria acabando sem vídeo.

### 3. O veto de 5 s

Quando as duas votam no mesmo tema, o debate fica em `aguardando` por 5 s, com o horário-limite gravado (`vetoUntil`). A tela mostra a contagem e o botão **"✋ Não gostei, vetar"**.

- **Sem veto:** segue normal: o resumo do porquê e o vídeo.
- **Com veto:** o tema sai (fica riscado), um aviso entra no chat ("Você vetou o tema 3") e as duas **seguem debatendo os outros**, sabendo que o criador não gostou. Um voto num tema vetado não conta. Se todos os temas da rodada forem vetados, vem uma rodada nova.
- **"■ Parar debate"** encerra tudo sem vídeo, a qualquer momento antes do resumo. Ele vale depois da fala em andamento, porque uma chamada ao Claude não é interrompida no meio.

O veto e o parar ficam **na memória do servidor**, não no arquivo do debate: quem grava o debate é o laço do `runDebate`, e uma segunda gravação por fora brigaria com ele. A espera dos 5 s é uma Promise que termina no primeiro destes: o tempo acabou, veio o veto ou veio o parar.

- Alternativa: o veto para tudo, sem vídeo. É mais simples, mas o usuário teria de clicar de novo e esperar outro brainstorm só porque um tema não agradou.

## Alternativas consideradas

Nos itens 1 a 3, acima. E ainda:

- **Vetar pela tela antes do debate** (escolher quais dos 4 temas entram): é mais controle, mas tira a graça de "as IAs escolhem sozinhas", e o usuário pediu para interferir só no fim.
- **Contagem medida pela tela** (5 s a partir de quando a tela vê o acordo): o servidor não saberia quando acabam os 5 s. Com o `vetoUntil` do servidor, os dois lados contam o mesmo tempo. A tela consulta a cada 1 s (a cada 0,3 s durante os 5 s), então mostra a contagem com no máximo 1 s de atraso.

## Consequências

- **Ganhamos:** menos debates que acabam sem vídeo e a última palavra do criador no tema, sem ele ter de escolher tudo à mão.
- **Perdemos / custa:**
  - Um debate pode custar até 3 vezes mais chamadas (3 brainstorms e 18 falas) no pior caso.
  - Os 5 s só valem se a tela estiver aberta: sem ninguém olhando, o vídeo segue, como antes.
  - Se o servidor reiniciar durante os 5 s, o debate vira "parou", como nas outras etapas.
- **Revisar quando:** a maioria dos debates precisar de 2 ou 3 rodadas (o brainstorm traz temas fracos demais: melhorar o pedido, não o limite); o usuário vetar com frequência (os papéis das IAs não estão vendo o que ele vê); ou os 5 s forem curtos demais para ler o tema.
