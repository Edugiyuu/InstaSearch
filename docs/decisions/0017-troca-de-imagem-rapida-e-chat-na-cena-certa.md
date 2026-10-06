# 0017 — Troca de imagem rápida e chat que acerta a cena

**Status:** Aceita · **Data:** 2026-10-06

## Contexto

Dois problemas na revisão do vídeo, relatados pelo usuário:

**1. Trocar a imagem de uma cena demora muito.** Ao clicar numa sugestão em "Troque a imagem", o card fica carregando por cerca de um minuto. No log de 06/10, duas trocas levaram **59 s** e **68 s** do clique até a cena mudar. O motivo está em `importImageFromUrl` → `addImage` (`backend/src/services/shorts/library.ts`): o app baixa a imagem, **espera a IA catalogar** (nome, personagens, etiquetas, áreas de zoom) e só depois a tela chama `setBeatImage`. A catalogação é uma chamada de visão; quando o Gemini falha, a espera até desistir dele levou ~60 s, e só então o Claude Code respondeu (5 a 7 s). O usuário não precisa da catalogação para ver a imagem no vídeo: ela serve para a biblioteca e para a montagem automática dos **próximos** vídeos.

**2. "Muda a cena 6" muda a cena 7.** Em `adjustBeats` (`backend/src/services/shorts/shortsAI.ts`), as batidas vão para a IA como uma lista JSON **sem número**; a IA precisa contar a posição. A tela numera a partir de 1 ("Cena 6"), e a IA conta errado (de 0, ou se perde numa lista longa). Além disso, a IA devolve a lista inteira reescrita, então nada impede que ela mexa em outras cenas, e a resposta ("Troquei a cena 6…") é o texto dela, não o que de fato mudou.

**Fora deste ADR:** a legenda sincronizada palavra por palavra (hoje o tempo é estimado pelo número de palavras, em `frontend/src/video/timeline.ts`). Ela depende da transcrição com Whisper e terá um ADR próprio, depois destes dois.

## Decisão

O usuário escolheu **1A + 2A + 2B**, a recomendação do Claude. O 1B (desistir do Gemini mais cedo) não entra: com a catalogação em segundo plano, a troca de imagem não espera mais por ele; ficou no Backlog para as outras chamadas de IA.

### 1. Troca de imagem

**1A: aplicar na hora e catalogar depois.**

- `import-url` só baixa e salva a imagem (como já faz com `catalog: false`) e responde em 1 a 3 s. A tela troca a cena e segue para a próxima.
- A catalogação roda **em segundo plano** no backend, uma imagem por vez (fila simples em memória). Ao terminar, grava os dados na imagem (`catalogued: true`). Se falhar, a imagem fica como hoje fica quando a IA não responde: salva, sem catalogação, e dá para catalogar de novo na biblioteca.
- Enquanto não termina, a imagem usa o que a sugestão já informa (título e personagens da busca). A biblioteca mostra "catalogando…" nessas imagens, para não parecer que estão prontas.
- Se o servidor reiniciar com a fila cheia, as imagens com `catalogued: false` e sem erro registrado voltam para a fila ao subir.

### 2. Chat na cena certa

**2A: numerar as cenas como na tela.** Cada batida vai para a IA com `"cena": 6`, o mesmo número que o usuário vê. O prompt diz que "cena N" no pedido é o campo `cena`, e manda também qual cena está aberta na prévia ("esta cena" = a aberta).

**2B: o servidor confere o que mudou.** Quando o pedido cita cenas pelo número ("cena 6", "cenas 3 e 4") e não é um ajuste do vídeo inteiro (ritmo, efeitos, legenda), o servidor só aceita mudanças nessas cenas; as outras voltam como estavam. A resposta do chat passa a ser montada a partir da diferença real ("Mudei a cena 6: …"), e não do texto que a IA escreveu, para nunca dizer que mudou algo que não mudou ([0011](0011-editor-automatico.md): sem dados de mentira).

## Alternativas consideradas

**Troca de imagem**

- **1B: só encurtar a espera pelo Gemini** (desistir em ~10 s em vez de ~60 s). Ajuda todas as chamadas de IA e vale fazer de qualquer jeito, mas a troca ainda esperaria 10 a 20 s pela catalogação, sem necessidade. Fica como complemento, não como solução.
- **1C: catalogar com a miniatura** (imagem menor, IA mais rápida). Corta segundos, não o minuto; e piora a qualidade das áreas de zoom.
- **1D: não catalogar imagens escolhidas na troca.** O mais simples, mas a biblioteca enche de imagens sem personagens nem etiquetas, e a montagem automática deixa de reaproveitá-las ([0010](0010-biblioteca-de-imagens-em-vez-de-geracao.md)).

**Chat na cena certa**

- **Só 2A (numerar):** resolve o erro mais comum com poucas linhas, mas continua sem garantia: a IA ainda pode mexer na cena vizinha.
- **2C: a IA devolve operações** (`editar cena 6`, `remover cena 3`) em vez da lista inteira. É o mais preciso e a resposta sai mais rápida (menos texto), mas mudanças do vídeo inteiro (ritmo, juntar e dividir cenas) ficam bem mais difíceis de expressar. Exige reescrever o `adjustBeats`. Pode ser o passo seguinte se 2A + 2B não bastarem.
- **2D: selecionar a cena e escrever o pedido "para esta cena"** (o pedido vai só com aquela batida). Preciso, mas é um controle por cena a mais na revisão, perto do que o [0011](0011-editor-automatico.md) evita; e o 2A já manda a cena aberta como contexto.

## Consequências

- **Ganhamos:** trocar imagem passa de ~1 min para poucos segundos; o chat mexe na cena pedida e diz a verdade sobre o que mudou.
- **Custa:** uma fila de catalogação no backend (estado em memória, retomada ao reiniciar); por alguns segundos, a imagem nova fica na biblioteca sem catalogação completa; no 2B, o servidor precisa reconhecer números de cena no pedido ("cena 6", "6ª cena", "a sexta") e um pedido que cita cenas e também algo geral pode ter parte da mudança descartada.
- **Revisar quando:** o chat continuar errando a cena com os números (aí ir para 2C), ou a fila de catalogação acumular a ponto de a montagem automática pegar imagens ainda sem etiquetas.
