# 0019 — Roteiro com argumento e tons próprios

**Status:** Aceita · **Data:** 2026-10-06

## Contexto

O usuário acha os roteiros fracos e **sem argumento**, e quer criar os próprios tons. Hoje:

**Pesquisa.** Ao escrever do zero, a IA pode buscar na web até `MAX_SEARCHES = 2` vezes (`backend/src/services/shorts/llm.ts`). Mas a instrução (`RESEARCH_NOTE`) pede para buscar **só para confirmar fatos de que ela não tem certeza** ("não busque o que você já sabe"). A busca é uma checagem, não uma coleta de argumentos. Então subir o limite, sozinho, pode não mudar nada: a IA continua achando que já sabe e busca pouco. No log de 06/10, um roteiro saiu com **0 buscas** (Claude Code) e outro com **3** (Gemini, acima do limite de 2, porque o Gemini não tem um limite rígido, só a instrução).

O prompt do roteiro (`generateScript` em `shortsAI.ts`) pede gancho, tom e número de palavras, mas **não pede uma estrutura de argumento**: tese, provas concretas, conclusão.

**Quantas buscas.** O número já aparece, discreto, no selo "Roteiro: Gemini · 3 buscas na web" (telas Roteiro e Revisão). Dois problemas: não diz **o que** foi buscado, e no Claude Code o número é **estimado** pelo número de turnos (`num_turns - 1`), não contado, o que contraria o "sem dados de mentira" do [0011](0011-editor-automatico.md).

**Tons.** São 4 fixos no código: os chips em `NewVideo.tsx` e a instrução completa de cada um em `TONE_GUIDE` (`shortsAI.ts`). Criar um tom novo exige mexer no código.

## Decisão

O usuário escolheu a recomendação do Claude nas cinco escolhas: **1B, 2B, 3A, 4A e 5A**. Também decidido por ele: **até 4 buscas**, **mostrar na tela quantas buscas a IA fez** e **tons criados por ele ou pela IA, salvos na biblioteca**. 

### 1. O que as buscas procuram

- 1A: só subir o limite para 4. Uma linha, mas a instrução continua "confirme só o que não sabe", e a IA tende a não usar as buscas a mais.
- **1B (escolhida): até 4 buscas para achar argumento, e o roteiro com estrutura de argumento.** A instrução passa a ser: busque provas para a tese (fatos, capítulo ou episódio, números, falas) e confirme o que for afirmar. O prompt do roteiro pede gancho → tese → 2 ou 3 provas concretas, cada uma numa cena → conclusão que responde ao gancho → chamada para comentar. Continua valendo "não afirme o que não conseguiu confirmar".
- 1C: duas etapas, primeiro um **dossiê** (a IA pesquisa e devolve os fatos com a fonte), depois o roteiro escrito a partir dele, com o dossiê visível na tela. É o mais transparente e o que mais segura argumento, mas são duas chamadas de IA e o dobro do tempo para gerar. Fica como próximo passo se o 1B não bastar.

### 2. Como mostrar as buscas

- 2A: só destacar o número que já existe.
- **2B (escolhida): o número e o que foi buscado**, na tela do roteiro ("Pesquisou 4 vezes: 'mahito shibuya nanami', 'junpei morte capítulo'…"). O número passa a ser **contado** nos três provedores: o Gemini devolve as buscas (`webSearchQueries`), a API do Claude devolve cada chamada de busca, e o Claude Code passa a ler as chamadas de `WebSearch` da saída em vez de estimar pelos turnos.

### 3. Onde ficam os tons

- **3A (escolhida): aba "Tons" na Biblioteca**, ao lado de Bordões, como o usuário pediu. Cada tom tem nome, uma frase de resumo (aparece no chip) e a instrução completa para a IA. Os 4 de hoje viram **tons embutidos**; para mudar um, duplica e edita, no mesmo esquema dos Estilos. Dados em `data/tones/` (JSON, [0002](0002-armazenamento-em-json.md)).
- 3B: dentro de Estilos. Os estilos já têm "algo mais para a IA saber", mas misturar tom com estilo impede combinar qualquer estilo com qualquer tom (Comentário de anime + Mistério, por exemplo).
- 3C: um campo de texto livre no Novo vídeo, sem salvar. O mais simples, mas o tom bom se perde e precisa ser reescrito a cada vídeo.

### 4. Como a IA cria um tom

- **4A (escolhida): a partir de uma descrição sua**, com um exemplo opcional (um roteiro ou uma fala de que você gosta, colado como texto). A IA devolve nome, resumo e instrução; você revisa, ajusta e salva ([0011](0011-editor-automatico.md): a IA sugere, o usuário aprova). Dá para criar na Biblioteca ou direto no Novo vídeo, por um "+ Novo tom" ao lado dos chips.
- 4B: a partir do link de um vídeo de que você gosta: o app baixa o áudio (o yt-dlp já é usado nos sons), transcreve com o Whisper ([0018](0018-legenda-sincronizada-com-a-voz.md)) e a IA extrai o tom da fala. Reaproveita o que já existe, mas é mais lento e depende do yt-dlp. Fica para depois.
- 4C: a IA inventa tons sozinha a partir do tema. Pode trazer variedade, mas o tom é a voz do canal; tons sem pedido tendem a ser genéricos.

### 5. O projeto guarda o tom como

- **5A (escolhida): o id do tom e uma cópia da instrução** no momento em que o roteiro é gerado. Editar o tom depois não muda vídeos antigos, e apagar um tom não quebra projetos.
- 5B: só o id. Mais simples, mas um projeto antigo "muda de tom" se o tom for editado, e quebra se ele for apagado.

**Como ficou no código:** `MAX_SEARCHES = 4` e a instrução nova em `llm.ts`, que também conta as buscas e guarda o texto delas nos três provedores (`AiCredit.queries`); a estrutura de argumento e o limite de palavras em `generateScript`; os tons em `tones.ts` (embutidos + `data/tones/`), `suggestTone` em `shortsAI.ts`, o editor `ToneEditor` e a aba Tons na Biblioteca; o projeto guarda `toneId` e `toneGuide`.

**Primeiros testes (06/10):** com o tom "Advogado de defesa" (sugerido pela IA), o Gemini fez 5 buscas (acima do pedido de 4, porque ele não tem limite rígido; a tela mostra 5), e o roteiro saiu com acusação, provas A, B e C e veredito. Saiu também com 117 palavras para 30 s e com um detalhe errado (pôs no Incidente de Shibuya algo que aconteceu antes). O limite virou "no máximo N palavras", com a 3ª prova só se couber, e o teste seguinte ficou com 75 palavras e 4 buscas. Os erros de detalhe são o sinal para o dossiê (1C), se continuarem.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação.

## Consequências

- **Ganhamos:** roteiros que sustentam uma tese com provas que dá para conferir; transparência sobre o que a IA pesquisou; tons do jeito do canal, sem mexer no código.
- **Custa:** gerar o roteiro fica mais lento (até 4 buscas, ~10 a 20 s a mais) e gasta mais no Claude (cada busca conta); uma aba e um tipo de dado novos (`Tone`); migrar os projetos que guardam o tom pelo nome ("Polêmico") para o tom embutido correspondente.
- **Revisar quando:** os roteiros continuarem sem argumento mesmo com as buscas (aí ir para o dossiê, 1C), ou o usuário quiser tons tirados de vídeos de outros canais (4B).
