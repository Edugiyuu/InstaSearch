# 0018 — Legenda sincronizada com a voz

**Status:** Aceita · **Data:** 2026-10-06

## Contexto

A legenda e os cortes de imagem não acompanham a voz. Em `frontend/src/video/timeline.ts`, o app divide a duração do áudio entre as cenas **pelo número de palavras** de cada uma, e dentro da cena a legenda completa divide o tempo pelo tamanho de cada palavra. Só que ninguém fala num ritmo constante: há pausas, ênfases, palavras longas faladas rápido. O erro se acumula ao longo do vídeo, e no fim a legenda (e o corte para a próxima imagem) chega antes ou depois da fala.

Afeta os três modos de legenda:

- **quadrinho** e **limpa** mostram as palavras-chave da cena: aparecem certas só se a cena começar quando a fala dela começa;
- **completa** acende palavra por palavra: precisa do tempo de cada palavra.

O que já sabemos e ajuda:

- **O texto é conhecido.** A voz é o áudio que você grava lendo o roteiro. Não precisamos *descobrir* o que foi dito, só *quando* cada palavra do roteiro foi dita (isso se chama **alinhamento forçado**).
- Uma conversa anterior já apontou o caminho: depois de enviar o áudio, transcrever com o tempo de cada palavra e usar esses tempos para encaixar **a legenda e os cortes**.
- A documentação já previa o whisper.cpp local, e Configurações tem um cartão "Whisper · ainda não instalado" que hoje é só ilustrativo.

## Decisão

O usuário escolheu a recomendação do Claude nas cinco escolhas: **1A, 2A, 3A, 4A e 5A**.

### 1. De onde vem o tempo de cada palavra

- **1A (escolhida): whisper.cpp no computador**, pelo `@remotion/install-whisper-cpp`. Gratuito e offline. Com `tokenLevelTimestamps`, devolve cada palavra com início e fim, usando DTW (um método que casa o áudio com o texto quadro a quadro) para tempos mais precisos. No Windows, o pacote baixa um programa pronto (sem compilar nada). Leva alguns segundos a algumas dezenas de segundos por vídeo curto.
- 1B: Gemini ouvindo o áudio. Já está integrado e não instala nada, mas modelo de linguagem não é relógio: os tempos vêm aproximados, às vezes na casa do segundo, e podem ser inventados. Além disso, depende do Gemini estar no ar (e ele caiu várias vezes nesta semana).
- 1C: API paga de transcrição (Deepgram, AssemblyAI, ElevenLabs Scribe). Tempos bons e rápidos, mas custa por minuto, exige chave e manda sua voz para fora, contra o "gratuito por padrão" do [PURPOSE](https://github.com/Edugiyuu/InstaSearch/blob/3eef5d4/docs/PURPOSE.md).
- 1D: alinhador forçado de verdade (WhisperX, Montreal Forced Aligner). É o mais preciso, mas traz Python, PyTorch e gigabytes de dependências para um projeto Node.
- 1E: só detectar as pausas com o ffmpeg (`silencedetect`) e encaixar as cenas nelas. Não instala nada e melhora os cortes, mas não resolve a legenda palavra por palavra.

### 2. Qual modelo do Whisper

- **2A (escolhida): `small`** (~470 MB). Bom em português e rápido o bastante no processador. Como o texto vem do roteiro (escolha 3), o Whisper só precisa acertar *quando*, não a grafia.
- 2B: `base` (~140 MB): mais rápido e leve, erra mais palavras, e o alinhamento perde pontos de apoio.
- 2C: `medium` (~1,5 GB): melhor transcrição, várias vezes mais lento, sem ganho real de tempo para quem já tem o texto.

### 3. Qual texto aparece na legenda

- **3A (escolhida): o texto do roteiro, com os tempos do Whisper.** O app casa as palavras transcritas com as do roteiro (alinhamento de sequências, do mesmo tipo que o `diff` usa) e passa o tempo de uma para a outra. Palavras que o Whisper errou ("Sukuna" → "Sucuna") ou pulou pegam o tempo pelas vizinhas. Nomes saem sempre com a grafia certa.
- 3B: o texto que o Whisper ouviu. Mostra exatamente o que foi falado, mas erra nomes próprios (o problema clássico com animes) e obriga a corrigir a legenda à mão, contra o editor automático ([0011](0011-editor-automatico.md)).

### 4. O que passa a seguir a voz

- **4A (escolhida): a legenda e os cortes.** Cada cena começa quando a primeira palavra dela é falada e termina quando começa a próxima. As palavras-chave (quadrinho/limpa), a legenda completa e o corte da imagem ficam todos no tempo da fala.
- 4B: só a legenda completa. Muda menos coisa, mas a imagem continua cortando no tempo estimado, fora do ritmo da fala.

### 5. Quando e onde roda

- **5A (escolhida): sozinho, em segundo plano, quando o áudio é enviado** (no mesmo esquema da fila de catalogação do [0017](0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)). O backend converte o áudio para WAV de 16 kHz com o ffmpeg que já vem com o Remotion, roda o Whisper e grava as palavras com tempo no projeto (`transcript`). O alinhamento com o roteiro fica no `timeline.ts` do frontend, então a prévia e o render usam o mesmo código ([0012](0012-render-em-processo-separado.md)), e mudar o roteiro pelo chat realinha na hora, sem transcrever de novo.
- 5B: um botão "Sincronizar legenda" na revisão. Dá controle, mas é um passo manual a mais que você teria que lembrar sempre.

**Sem prévia falsa:** enquanto a transcrição não termina (ou se ela falhar), o vídeo usa o tempo estimado de hoje, e a revisão diz isso ("legenda com tempo estimado; sincronizando com a sua voz…"). Se boa parte do áudio não bater com o roteiro (você improvisou), a revisão avisa quantos trechos ficaram com tempo estimado.

**Instalação:** na primeira vez, o backend baixa o whisper.cpp e o modelo para `backend/tools/whisper/` (fora do git). O cartão de Configurações passa a mostrar o estado real (não instalado, baixando, pronto) com um botão para instalar antes.

**Como ficou no código:** `backend/src/services/shorts/transcription.ts` (instala, converte e transcreve), a fila em `projects.ts` (`transcript` no projeto), `frontend/src/video/align.ts` (casa o roteiro com as palavras ouvidas) e `timeline.ts` (cada cena começa na primeira palavra; `wordStarts` para a legenda completa). No primeiro teste, num áudio de 57,8 s, 119 de 120 palavras bateram e a transcrição levou 69 s no processador; o tempo estimado de antes errava o início das cenas em até 1,65 s.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação.

## Consequências

- **Ganhamos:** legenda e cortes no ritmo real da sua fala, sem custo e sem mandar o áudio para fora; nomes sempre com a grafia do roteiro; o chat pode mudar cenas sem perder a sincronia.
- **Custa:** ~500 MB de download na primeira vez (programa + modelo `small`); alguns segundos de processamento por áudio enviado; no Windows ficamos presos ao whisper.cpp 1.5.5 (o pacote não tem binário para Windows acima de 1.6.0); um campo novo no projeto (`transcript`) e o algoritmo de alinhamento para manter.
- **Fica para depois:** atualizar o roteiro a partir do que foi falado (quando você improvisa), e usar as pausas da fala para sugerir onde cortar as cenas.
- **Revisar quando:** os tempos do Whisper ficarem visivelmente fora em falas rápidas (aí avaliar o 1D), ou a voz passar a ser gerada por TTS que já devolve o tempo de cada palavra (o ElevenLabs faz isso), o que dispensaria a transcrição.
