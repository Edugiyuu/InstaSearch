# 0041 — O corte da voz na virada cai no silêncio real do áudio

**Status:** Aceito · **Data:** 2026-10-30

## Contexto

Na virada ([ADR 0039](0039-bordao-do-meio.md)), quando o clipe é mais longo que a frase, a voz para no fim da frase e volta quando o clipe termina. Onde exatamente ela para vinha do relógio do Whisper: o fim da última palavra da frase (`pauseAt`, em `video/timeline.ts`).

O usuário percebeu que, na prévia, a volta da voz come o começo da frase seguinte — e **come uma quantidade diferente a cada vez que o vídeo roda** ("rolou. na soul-", depois "rolou. na-").

Medindo o áudio da narração a cada 10 ms, no vídeo "Rukia: antes e depois":

| | |
|---|---|
| A fala "…rolou" termina de verdade em | **6,28 s** |
| O Whisper marca o fim de "rolou." em | 6,64 s |
| A palavra seguinte ("Na") começa a soar em | **6,66 s** |
| O Whisper marca o começo de "Na" em | 6,78 s |

Ou seja: o relógio do Whisper erra para os dois lados, e o fim marcado da palavra cai **20 ms antes** do começo real da próxima. O corte ficava encostado na palavra seguinte; qualquer imprecisão — e o MP3 só pode ser procurado de quadro em quadro (~26 ms), com o navegador levando mais ou menos tempo conforme o que já está no buffer — engolia o começo dela. Daí a variação a cada execução. Uma tentativa anterior de cortar no meio do intervalo marcado pelo Whisper deixava escapar um "n-", pelo mesmo motivo ao contrário.

## Decisão

O corte passa a cair no **silêncio real do áudio**, medido pelo ffmpeg, e não no relógio do Whisper.

- Ao transcrever a voz, o backend roda também o `silencedetect` do ffmpeg no mesmo WAV de 16 kHz que o Whisper usa (`detectSilences`, em `videoScenes.ts`), com limiar de **-45 dB** e duração mínima de **60 ms**. Os trechos de silêncio ficam guardados no `transcript.silences` do projeto.
- Na montagem da linha do tempo, `pauseAt` procura um silêncio que encoste no intervalo entre a última palavra da frase e a primeira da seguinte (com 0,25 s de folga para cada lado, que é o erro do relógio do Whisper) e corta **no meio dele**.
- Sem silêncio achado — transcrição antiga, ou fala emendada, sem pausa nenhuma — vale o fim marcado pela palavra, como antes.

No vídeo medido acima, o corte foi de 6,633 s (quadro 199, a 27 ms da palavra seguinte) para **6,462 s** (quadro 194): 180 ms depois do fim da fala e 206 ms antes da próxima palavra. Folga de sobra para a imprecisão do MP3.

O limiar de -45 dB não é chute: na narração medida, a sílaba mais fraca ficou em -38 dB, então -45 dB fica abaixo da fala e acima do ruído de fundo (-85 dB).

## Alternativas consideradas

- **Margem fixa depois da palavra** (cortar uns 3 quadros depois do fim marcado, sem passar do começo da seguinte): resolveria este caso com dez linhas, mas continua apoiado no relógio do Whisper, que erra para os dois lados e erra diferente em cada voz e em cada gravação. Em uma fala mais rápida, a margem de novo encostaria na palavra seguinte.
- **Corrigir só na prévia** (deixar o Remotion Player com mais folga): o problema aparece mais na prévia, mas a causa — cortar a 27 ms do começo da palavra — é do vídeo, não do player. O MP4 ficaria igualmente no limite.
- **Procurar o silêncio na hora de montar, no navegador**: o frontend teria que baixar e analisar o áudio inteiro a cada prévia. O backend já tem o áudio na mão e já roda o ffmpeg na transcrição; medir uma vez e guardar é mais barato e dá o mesmo resultado na prévia e no MP4.

## Consequências

- **Ganhamos:** a voz para e volta onde ela realmente está calada; nada de palavra partida nem de começo engolido, igual na prévia e no MP4. A medida fica guardada e serve para qualquer corte futuro que precise de silêncio (cortes de cena no ritmo da fala, por exemplo).
- **Perdemos / custa:** uma passada a mais do ffmpeg na transcrição (menos de um segundo). Os projetos já transcritos não têm os silêncios: continuam com o comportamento antigo até que a voz seja sincronizada de novo na Revisão.
- **Revisar quando:** se aparecer uma narração com música ou ruído por baixo, em que -45 dB nunca seja atingido — aí o limiar precisaria sair do nível absoluto e virar relativo ao volume da voz.
