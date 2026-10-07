# 0021 — Ideias de vídeo a partir do que funcionou no seu Instagram e YouTube

**Status:** Aceita · **Data:** 2026-10-07

## Contexto

Hoje o tema de cada vídeo sai da cabeça do usuário: ele abre o Novo vídeo e escreve. O app não sabe quais vídeos deram certo nem o que o público pede. Esse é o "Search" do nome, planejado na Fase 4 do [ROADMAP](../ROADMAP.md#fase-4-ciclo-de-aprendizado-o-search) e nunca começado.

O usuário quer duas coisas, nesta ordem:

1. **Agora:** um *brainstorm* de ideias baseado no próprio Instagram e no próprio YouTube.
2. **Depois:** que o sistema **crie vídeos sozinho, sem publicar**, para ele revisar. Isso fica para outro ADR (ver o fim deste), mas as escolhas daqui precisam servir de base para ele.

**O que já existe e ajuda:**

- Cada projeto guarda onde foi publicado (`published.instagram.id` e `published.youtube.id`, em `types.ts`) e as escolhas que o formaram (tema, estilo, tom, duração, roteiro, batidas). Ou seja, dá para ligar o número de visualizações à decisão que o gerou, sem adivinhar.
- O agendador (`schedulerService.ts`) já roda a cada minuto e pode coletar métricas.
- A IA do roteiro já faz até 4 buscas na web e mostra o que buscou ([0019](0019-roteiro-com-argumento-e-tons-proprios.md)).

**O que está quebrado ou falta:**

- **Instagram:** `getMediaInsights` (`instagramGraphService.ts`) pede `impressions`, `plays` e `video_views`, métricas que a Meta **descontinuou em abril de 2025**; a métrica unificada agora é `views`. A Graph API está fixada em `v18.0`, versão antiga. E o login não pede a permissão `instagram_manage_insights`, sem a qual as métricas não vêm: será preciso **conectar o Instagram de novo** uma vez. Métricas só existem para conta profissional (criador ou empresa).
- **YouTube:** a permissão `youtube.readonly` (já pedida) dá visualizações, curtidas e comentários de cada vídeo. **Retenção** (quanto do Short as pessoas assistem, `averageViewPercentage`) e **visualizações engajadas** (`engagedViews`, a contagem antiga dos Shorts) só vêm pela YouTube Analytics API, com a permissão `yt-analytics.readonly`: também exige **conectar o canal de novo**.
- **YouTube privado:** os vídeos enviados pelo app ficam privados até a auditoria da API ([YOUTUBE.md](../YOUTUBE.md#limites-e-avisos)). Enquanto o usuário não mudar a visibilidade no Studio, esses vídeos não têm visualizações para medir.
- **Vídeos antigos**, feitos fora do app, não têm projeto. Têm só legenda/título, data e números.

**Restrições do projeto:** só APIs oficiais, sem *scraping* ([PURPOSE](../PURPOSE.md#princípios), princípio 7); a IA sugere e o usuário aprova, sem dados de mentira ([0011](0011-editor-automatico.md)); dados em JSON ([0002](0002-armazenamento-em-json.md)).

## Decisão

O usuário pediu para seguir a recomendação do Claude nas cinco escolhas: **1B, 2B, 3B, 4B e 5B**. A criação autônoma fica para o ADR 0022, escrito depois que o banco de ideias estiver funcionando (ver o fim deste).

### 1. De onde vêm as ideias

- 1A: **só o desempenho dos seus vídeos.** "Os vídeos de teoria sobre JJK foram 3× a sua mediana; mais disso." Simples, mas só recombina o que você já fez: não traz assunto novo.
- **1B (recomendada): o desempenho + os comentários do seu público + o que está acontecendo agora.** Os comentários (pelas APIs oficiais: o do Instagram o app já lê em `getMediaComments`; o do YouTube é uma leitura nova) são a fonte mais direta de pedidos: "faz do Sukuna", "e o Toji?". O "agora" vem das buscas na web que a IA já faz (episódio novo, capítulo vazado, filme anunciado), mostradas na tela como no [0019](0019-roteiro-com-argumento-e-tons-proprios.md). Cada ideia diz de onde veio.
- 1C: **1B + perfis de referência** (canais grandes do nicho), pela Business Discovery API da Meta e pelas buscas públicas do YouTube. Oficial, mas a Business Discovery só mostra curtidas e comentários (não visualizações) de contas profissionais, e o YouTube cobra cota por busca. Fica para depois, quando os seus próprios dados não bastarem.

### 2. O que conta como "funcionou"

- 2A: **visualizações brutas.** Fácil de entender, mas engana: um vídeo de quando o perfil tinha metade dos seguidores parece fraco, e um viral isolado domina tudo.
- **2B (recomendada): cada vídeo comparado com a mediana dos seus últimos vídeos na mesma plataforma**, com os números reais ao lado. Visualizações (`views` no Instagram, `engagedViews` no YouTube), retenção, e compartilhamentos + salvamentos por visualização (o sinal de que o vídeo foi além de "passou pelo feed"). A tela mostra "2,4× a sua mediana · 12.300 visualizações · 61% assistido", nunca uma nota inventada sem explicar de onde veio. Com menos de ~10 vídeos medidos, a tela avisa que **ainda é pouco para tirar padrão**, em vez de fingir certeza.
- 2C: **uma nota única calculada pela IA.** Esconde o porquê; contraria o "sem dados de mentira".

### 3. Quando coletar as métricas

- 3A: **só por botão** ("Atualizar métricas"). Sem nada rodando sozinho, mas os números de um vídeo mudam muito nos primeiros dias, e sem foto em datas fixas não dá para comparar um vídeo de ontem com um de mês passado.
- **3B (recomendada): o agendador coleta sozinho, com fotos em idades fixas** (1, 7 e 28 dias depois de publicar), mais o botão para atualizar na hora. Comparar vídeos na mesma idade é justo. Cabe na cota: ler métricas custa pouco (no YouTube, 1 unidade por pedido, contra ~1.600 de um envio). Também é a base de que a criação autônoma vai precisar. Custa: o backend precisa estar ligado (a mesma ressalva do [SCHEDULER.md](../SCHEDULER.md)); se não estiver, a foto é tirada assim que ele subir, com a idade real anotada.
- 3C: **coletar só na hora de gerar ideias.** Mais simples, mas cada brainstorm fica lento (dezenas de pedidos às APIs) e a história do vídeo se perde.

### 4. Onde as ideias ficam

- 4A: **sugestões no Novo vídeo**, geradas na hora e descartadas depois. Nada novo para guardar, mas uma ideia boa que você não usou hoje some.
- **4B (recomendada): uma tela "Ideias", com um banco de ideias salvo** em `data/ideas/`. Cada ideia tem: tema, gancho, estilo, tom e duração sugeridos, e o **porquê** com as provas (os vídeos e comentários que a sustentam, com link). Estados: *nova*, *guardada*, *descartada*, *virou vídeo* (ligada ao projeto). "Criar vídeo" abre o Novo vídeo já preenchido; o usuário confere e gera ([0011](0011-editor-automatico.md)). O Novo vídeo ganha uma linha com as 3 ideias guardadas mais fortes. Esse banco é exatamente a **fila** que a criação autônoma vai consumir.
- 4C: **ideias como cartões no `BOARD.md`.** O board é do desenvolvimento do app, não do conteúdo do canal; misturar os dois bagunça os dois.

### 5. Como é o *brainstorm*

- 5A: **um lote de uma vez** ("Gerar 10 ideias"). Rápido, mas sem como direcionar.
- **5B (recomendada): lote + pedidos para refinar**, no mesmo esquema do "Peça um ajuste": "mais polêmicas", "só de Chainsaw Man", "algo para o episódio de domingo", "junta a ideia 2 com a 5". Uma semente opcional antes de gerar ("quero falar do Gojo"). Descartar uma ideia com um motivo ("já fiz", "não curto") fica guardado e entra no próximo lote, para a IA não repetir.
- 5C: **um chat livre.** Mais flexível, mas as ideias se perdem no meio da conversa e não viram cartões que dá para guardar.

### O que muda no código

- `instagramGraphService.ts`: métrica `views` no lugar das descontinuadas, versão da Graph API atualizada, permissão `instagram_manage_insights` no login.
- `youtubeService.ts`: permissão `yt-analytics.readonly` e leitura de visualizações engajadas e retenção.
- Novo `services/insights/` (coleta e fotos por idade, em `data/metrics/`) e `services/ideas/` (geração, refino, banco em `data/ideas/`), seguindo `routes → controllers → services → storage`.
- Tela Ideias no frontend (`página → hook → api`) e a linha de ideias no Novo vídeo.
- Os vídeos antigos (fora do app) entram com o que têm: a IA lê a legenda/título e deduz o tema, marcado como **deduzido** na tela.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não serem a recomendação.

## Consequências

- **Ganhamos:** o tema deixa de depender só da memória do usuário; cada ideia vem com as provas; o app começa a aprender com cada vídeo publicado; e o banco de ideias vira a fila da criação autônoma.
- **Custa:** reconectar Instagram e YouTube uma vez (permissões novas); duas pastas de dados novas; o agendador passa a fazer chamadas às APIs; cada brainstorm é uma chamada de IA com buscas (mais lenta e com custo no Claude, como no [0019](0019-roteiro-com-argumento-e-tons-proprios.md)). No YouTube, enquanto os vídeos ficarem privados, só o Instagram alimenta as ideias.
- **Revisar quando:** as ideias saírem genéricas ou repetidas (sinal para 1C, perfis de referência), ou houver vídeos suficientes para padrões mais finos (gancho, ritmo das batidas, horário).

## Próximo passo: criação autônoma, sem publicar (ADR 0022)

Fica para um ADR próprio porque tem decisões grandes e independentes destas. Ele vem **depois** de implementar este: com o banco de ideias e as métricas rodando, dá para decidir com dados reais quantos rascunhos por dia valem a pena e quais ideias a fila deve pegar primeiro. Ideia de fluxo: o app pega uma ideia guardada → escreve o roteiro → narra → monta com a biblioteca → renderiza → deixa um **rascunho autônomo** esperando revisão. **Nunca publica.** Perguntas que esse ADR precisa responder:

- **A voz.** Hoje a narração é do usuário. Sem ela, o vídeo autônomo precisa de voz sintética (ElevenLabs ou uma voz local), ou o app prepara tudo e para no "falta gravar a voz". É a maior decisão, e mexe no "seu material primeiro" do [PURPOSE](../PURPOSE.md#princípios).
- **Imagens que faltam.** Usar as sugestões da internet já buscadas ([0017](0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)) sozinho, ou parar e pedir.
- **Quanto e quando.** Quantos rascunhos por dia, em que horário, com qual limite de custo de IA.
- **Relação com o [0011](0011-editor-automatico.md).** Ele rejeitou "totalmente automático, sem revisão". A criação autônoma mantém a revisão, mas a aprovação passa do meio do processo (aprovar o roteiro, a montagem) para o fim (aprovar o vídeo pronto). O ADR 0022 precisa dizer isso claramente e, se for o caso, complementar o 0011.
