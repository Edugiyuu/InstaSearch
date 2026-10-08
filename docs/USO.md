# Como usar: do tema ao Short

O InstaSearch é um **editor automático**: a IA escreve o roteiro e monta o vídeo com as suas imagens; você revisa, resolve o que falta e pede mudanças por texto. Este guia segue o caminho de um vídeo. A especificação completa está em [AUTO_EDIT.md](AUTO_EDIT.md); a IA por trás de cada passo, em [AI.md](AI.md).

```
Novo vídeo ─► Roteiro e voz ─► Montagem (automática) ─► Revisão ─► Salvar ou publicar
                                                          │
                                                          └─► Trocar imagem (só se faltar)
```

## 1. Novo vídeo (`/novo`)

- Escreva o **tema** ("Por que o Luffy nunca mata ninguém?").
- Escolha o **estilo** (Comentário de anime, Curiosidades, Ranking…), a **duração** (15 a 40 s) e o **tom**. Os tons ficam na **Biblioteca → Tons** ([ADR 0019](decisions/0019-roteiro-com-argumento-e-tons-proprios.md)):
  - Vêm 4 com o app: **Polêmico**, **Curioso**, **Mistério** e **Papo reto**. Para mudar um, **Duplicar e editar** cria uma cópia sua.
  - **+ Novo tom** (na biblioteca ou direto nos chips do Novo vídeo): escreva o tom à mão ou descreva para a IA ("advogado de defesa: defende um personagem odiado como num tribunal…") e, se quiser, cole um roteiro de que você gosta como exemplo. A IA sugere nome, resumo e a instrução; você revisa e salva.
  - Cada vídeo guarda uma cópia do tom usado: editar ou apagar o tom depois não muda vídeos antigos.
- Já tem o texto? Marque **"Já tenho o texto da narração"** e cole. A IA só divide em cenas, sem mudar o texto.
- **Gerar roteiro** chama a IA (Gemini, ou o Claude Sonnet 5.5 se o Gemini estiver fora). Antes de escrever, ela pesquisa na web (até 4 buscas) provas para a ideia central, e o roteiro segue a estrutura gancho → tese → provas concretas → conclusão → chamada para comentar. Abaixo do título aparece **quantas buscas ela fez e o que buscou** ([ADR 0019](decisions/0019-roteiro-com-argumento-e-tons-proprios.md)). Confira as provas: a IA ainda pode errar um detalhe.
- O nome da IA que escreveu aparece num selo abaixo do título do roteiro e no cartão **Quem fez** da revisão ([detalhes](AI.md#quem-fez-cada-parte)).

O atalho do Início (tema + estilo + "Começar") abre esta tela já preenchida. As **ideias guardadas** (tela Ideias) aparecem como atalho acima do tema: um clique preenche tema, estilo, tom e duração.

## 2. Roteiro e voz (`/projeto/:id/roteiro`)

- Cada cena mostra a **legenda** (amarela), a **fala** e o que a imagem precisa mostrar. Tudo é editável; o ✕ tira a cena.
- **Peça uma mudança** no campo do topo ("gancho mais polêmico", "tira a parte do Kaido").
- **Sua voz:** copie a narração, grave (celular, ElevenLabs) e suba o áudio. A duração do áudio passa a ditar o tempo dos cortes. Dá para montar sem áudio e subir depois.
- **Montar automaticamente →**

## 3. Montagem (`/projeto/:id/montagem`)

Você não faz nada aqui. O app:

1. Escolhe uma imagem da biblioteca para cada cena (ver "Quem escolhe as imagens" abaixo). Numa cena que pede um personagem, só entra imagem em que esse personagem foi **conferido** (catalogado pela IA ou escrito por você); se a IA escolher outro personagem, o app recusa e a cena fica como "falta imagem" ([ADR 0020](decisions/0020-imagens-especificas-memes-e-zoom.md)).
2. Coloca **figurinhas** da sua biblioteca nas cenas de reação, quando alguma combina. O vídeo não desenha emojis: sem figurinha que combine, a cena fica sem reação.
3. Coloca **efeitos sonoros** nos cortes: whoosh nas setas, erro nos X, pop nas figurinhas, boom no gancho, click nas provas.
4. Escolhe uma **música** que combina com o clima do estilo.

A tela mostra cada decisão ("“NARUTO” → naruto e sakura · Naruto e Sakura juntos") e abre a revisão sozinha.

## 4. Revisão (`/projeto/:id`)

- **Prévia ao vivo** (Remotion Player): é a composição final, com zoom, setas, X, círculos, figurinhas, legenda, efeitos sonoros e música. Cenas sem imagem aparecem como **FALTA IMAGEM**.
- A barra abaixo do vídeo mostra as cenas: vermelho = sem imagem, laranja = imagem parecida. Clique para pular. Para abrir direto numa cena: `/projeto/:id?cena=3`.
- **✨ Peça um ajuste**: escreva o que quer mudar. A IA altera as cenas e a montagem preenche só as cenas novas. **Desfazer** volta a versão anterior.
  - Cite cenas pelo número que aparece na tela ("na cena 6 põe um X", "cenas 3 e 4", "sexta cena", "última cena"); "esta cena" é a que está aberta na prévia. Quando o pedido cita cenas, só elas mudam: se a IA mexer em outra, o app desfaz.
  - A resposta termina dizendo o que de fato mudou ("Mudei a cena 6."), conferido pelo app, e não só o que a IA diz que fez ([ADR 0017](decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)).
- **Precisa de você**: cenas sem imagem ou com imagem parecida → **Resolver agora**.
- **Ajustes rápidos:**

| Ajuste | Opções | O que faz |
|---|---|---|
| Quem escolhe as imagens | IA lê o roteiro / Por palavras | Ver abaixo. "↻ Escolher de novo" refaz a escolha (as imagens que você escolheu à mão ficam) |
| Ritmo | Calmo · Normal · Rápido · Frenético | A IA junta ou divide cenas, sem mudar a narração |
| Efeitos | Poucos · Na medida · Muitos | A IA ajusta a quantidade de setas, X, círculos e reações |
| Legenda | Quadrinho · **Completa** · Limpa · Sem legenda | Quadrinho = 1 a 3 palavras-chave amarelas; **Completa = todas as palavras da fala**, em blocos de até 4, com a palavra falada acendendo em amarelo; Limpa = texto branco discreto |
| Música | as músicas da biblioteca · Sem música | A música toca baixinho quando tem voz |
| Bordão de abertura | Nenhum · seus bordões | Toca antes da narração, com o som dele; a narração, as cenas e a música começam depois. Vídeos novos já vêm com o bordão marcado como padrão. Crie em **Biblioteca → Bordões** |
| Bordão do final | Nenhum · seus bordões | Entra depois da última cena. Se o final tem som próprio (clipe ou montado com áudio), a música para quando ele começa |

### Controles da cena

Logo abaixo da barra de cenas fica uma linha com os controles da cena que está tocando (clique numa cena na barra para ir até ela). Cada botão mostra o valor atual e abre um menu pequeno ali mesmo; o menu fecha ao escolher, ao clicar fora, com Esc ou ao trocar de cena ([ADR 0022](decisions/0022-imagens-da-web-e-controles-da-cena.md)):

- **🖼 Trocar:** abre a tela "Trocar imagem" da cena.
- **⛶ Enquadramento** (ex.: "Auto · inteira"): ver "Enquadramento" na seção 5.
- **🔊 Efeito sonoro** (ex.: "🔊 fahhh") e **▶**, que toca o som da cena.

### Efeitos sonoros de cada cena

No menu **🔊**, escolha:

- **Automático**: a montagem escolhe pelo tipo de efeito (whoosh nas setas, erro nos X, pop nas figurinhas, boom no gancho), procurando pelo nome e pelas etiquetas dos sons.
- **Sem som**: a cena fica sem efeito.
- **Qualquer efeito da sua biblioteca** ("fahhh", "vine boom"…): toca nessa cena. O ▶ ao lado de cada um ouve o som sem escolher.

O que você escolhe fica travado: montar de novo ou pedir ajustes não troca. Na barra de cenas, um pontinho laranja marca as cenas com som.

O chat também troca: "põe o fahhh no X", "tira o som da cena 3", "vine boom no final". Ele recebe a lista dos seus efeitos e usa o nome exato.

**Legenda e cortes no tempo da sua voz** ([ADR 0018](decisions/0018-legenda-sincronizada-com-a-voz.md)): quando você envia a voz, o app transcreve o áudio com o Whisper, no seu computador e em segundo plano, e casa o que ouviu com o roteiro. Cada cena começa quando a primeira palavra dela é falada, e na legenda completa cada palavra acende quando é dita. O texto continua o do roteiro, então nomes saem com a grafia certa mesmo que o Whisper ouça "Sucuna".

- Na primeira vez, o app baixa o Whisper e o modelo `small` (~490 MB) para `backend/tools/whisper/`. Dá para baixar antes em Configurações → Transcrição da voz.
- Transcrever leva mais ou menos o tempo do áudio (no processador). Enquanto isso, e se falhar, o vídeo usa o tempo **estimado** (proporcional ao número de palavras), e a revisão diz isso em "O que a IA montou".
- Se você improvisar e a fala não bater com o roteiro, a revisão diz quantas palavras ficaram com tempo estimado.
- Projetos de antes: em "O que a IA montou", **sincronizar com a voz**.

### Quem escolhe as imagens

- **IA lê o roteiro** (padrão): a IA recebe a narração inteira e o catálogo da biblioteca (nome, personagens, etiquetas, descrição, áreas marcadas) e escolhe uma imagem por cena. Ela leva em conta quem é o assunto de cada fala, evita repetir imagem em cenas seguidas, prefere as menos usadas, diz em qual área dar zoom e explica cada escolha. Quando nada serve, a cena fica marcada como faltando, em vez de receber uma imagem errada. Gasta 1 chamada de IA por montagem; com mais de 120 imagens, só as melhores candidatas de cada cena vão para a IA.
- **Por palavras**: compara as palavras da cena com as etiquetas das imagens, sem IA. É a reserva automática se a IA não responder.

## 5. Trocar imagem (`/projeto/:id/imagens`)

Uma cena por vez ("Cena 1 de 3"):

- À esquerda, como a cena está agora.
- À direita, **Sugestões para esta cena**: a tela já abre com imagens da internet buscadas a partir do que a cena precisa mostrar e dos personagens dela. **Clique em uma** e pronto: ela é baixada, entra na cena e a tela passa para a próxima, em poucos segundos. A IA cataloga a imagem na biblioteca depois, em segundo plano ([ADR 0017](decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)); enquanto isso, ela aparece como "catalogando…".
  - **Mangá**: painéis reais do mangá achados na internet (Bing Imagens, sem chave). A busca usa o nome completo do personagem, a série e as etiquetas da cena em inglês ("Satoru Gojou jujutsu kaisen smile blindfold manga panel"). Em estilos de mangá (ex.: Comentário de anime) eles aparecem **primeiro**; nos outros, depois dos resultados gerais.
  - **Internet**: resultados gerais do Bing Imagens (sem chave) para o texto da cena: prints, wallpapers, fanarts, sites de notícia.
  - **Danbooru**: ilustrações, páginas de mangá e prints, **só as classificadas como "geral"**, sem crossovers com outras séries. A busca é **específica da cena**: a IA escreve no roteiro etiquetas para cada cena (`hands_in_pockets`, `smirk`, `from_below`…) e as palavras do texto também viram filtros ("mão no bolso", "calmo", "de costas", "olhos de perto", "mangá"…; "sem venda" não vira "venda"). As imagens que batem com a cena aparecem primeiro.
  - **Arte oficial** (AniList): o retrato oficial de cada personagem. O nome é desempatado pela série: "Sakura" num vídeo de Naruto é a Sakura Haruno, "Sukuna" é o de Jujutsu Kaisen (não o do Touhou), "Yuta" é o Yuuta Okkotsu (não o Yutaka).
  - Imagens que já estão na sua biblioteca não aparecem de novo.
  - **Google** (opcional): resultados do Google Imagens, se você colocar a `SERPER_API_KEY` (ver abaixo). O Google Imagens só funciona com JavaScript, então sem a chave o app usa o Bing.
  - Não gostou? **↻ Outras opções** traz outras imagens para a mesma cena (cada clique, uma leva nova). Ou mude o texto da busca ("Goku sorrindo criança") e clique em **Buscar**. **Ver mais** mostra o resto.
- **✨ Preencher as N cenas automaticamente** (no topo): busca as sugestões de cada cena que falta, separa as 4 melhores e **a IA olha as miniaturas** (umas 5 cenas por chamada) para escolher a que mostra o personagem certo; a ação pedida é preferência, o personagem é obrigatório. Se nenhuma mostra o personagem, a cena fica para você, em vez de entrar uma imagem errada. Só os personagens que a IA viu vão para a biblioteca ([ADR 0020](decisions/0020-imagens-especificas-memes-e-zoom.md)). O mesmo botão está no cartão "Precisa de você" da revisão.
- **Enquadramento** (no botão ⛶ da linha da cena, na revisão): **Automático** (imagem larga inteira sobre o fundo desfocado; em pé, tela cheia), **Tela cheia** (corta para ocupar a tela) ou **Inteira** (sempre a imagem toda). Vale na prévia e no MP4 ([ADR 0020](decisions/0020-imagens-especificas-memes-e-zoom.md)).
- **Memes e variações:** o roteiro marca algumas cenas (piada, virada, reação; cerca de 1 a cada 4 ou 5) com um meme ("polnareff wheelchair meme") ou uma variação do personagem (versão mulher, chibi). O preenchimento automático procura isso primeiro, e na tela de troca aparece o botão **😂 Buscar o meme** (ou **✨ Buscar a variação**). Uma busca com "meme", "fanart", "genderswap" ou "chibi" mostra os resultados da web primeiro, não os painéis do mangá. Peça "mais memes" ou "sem memes" no chat.
- **Tem outra imagem? Cole aqui**: Ctrl+V de uma imagem copiada, arrastar um arquivo, colar um link ou clicar para escolher. **Google ↗** abre o Google Imagens numa aba.
- Embaixo, imagens da sua biblioteca que combinam.
- Toda imagem nova vai para a biblioteca e é catalogada em segundo plano; serve para os próximos vídeos.
- **Manter a parecida** aceita a imagem provisória; **Próxima cena →** segue.

A busca não gasta IA (só a catalogação da imagem escolhida gasta 1 chamada). Bing, AniList e Danbooru funcionam sem chave.

**Resultados do Google (opcional).** Crie uma conta grátis em [serper.dev](https://serper.dev) (dá 2.500 buscas), copie a chave e coloque no `backend/.env`:

```env
SERPER_API_KEY=sua_chave
```

Reinicie o backend. Cada cena aberta gasta 1 busca.

## 6. Salvar ou publicar

- **Salvar para depois** (topo da revisão ou no modal Publicar): o vídeo fica em **Projetos → Salvos**, pronto para publicar quando você quiser.
- **Publicar**: o modal gera a legenda do post com hashtags (dá para editar, copiar e gerar outra) e, ao abrir, já começa a gerar o **MP4** (1080×1920, 30 fps) com a mesma composição da prévia. O primeiro render demora mais (prepara o pacote do Remotion e baixa o Chrome Headless Shell); os seguintes só renderizam. Se o vídeo não mudou, o MP4 guardado é reaproveitado.
  - **⬇ Baixar MP4**: salva o arquivo com o título do projeto.
  - **Publicar no Instagram**: Reels com a legenda acima. Precisa da conta conectada e do Cloudinary no `backend/.env` (o Instagram só aceita vídeo por URL pública; o arquivo é apagado do Cloudinary depois).
  - **Enviar ao YouTube**: Short com título, privacidade (público, não listado ou privado) e a legenda como descrição. Precisa conectar o canal em Configurações; ver [YOUTUBE.md](YOUTUBE.md).
  - Depois de publicar, o projeto vai para **Publicados** e o modal mostra o link do post.

## Biblioteca (`/biblioteca`)

Uma aba para cada tipo de material. Tudo fica em `backend/data/` no seu computador.

| Aba | Para quê | Dicas |
|---|---|---|
| **Imagens** | As imagens das cenas | A IA cataloga cada uma: quem aparece, etiquetas, descrição e áreas de zoom (caixas amarelas). Corrija personagens e etiquetas à mão quando precisar. Busca em linguagem natural ("sukuna sorrindo no mangá") |
| **Figurinhas** | As reações das cenas (o vídeo não usa emoji) | Use PNG com fundo transparente. A IA etiqueta a reação com sinônimos ("chocado, surpreso, espantado"). Sem figurinha que combine, a cena fica sem reação |
| **Efeitos sonoros** | Sons dos cortes | A montagem procura pelo nome e pelas etiquetas: whoosh, boom, impacto, pop, ding, erro, risada, suspense, glitch, click. Nomeie os arquivos assim (`whoosh_01.mp3`). Na revisão você escolhe o efeito de cada cena |
| **Músicas** | Fundo do vídeo | A montagem escolhe pelo clima do estilo (tensa, animada, calma). Cole o link de um **Reel, TikTok ou Short** para pegar o áudio |
| **Bordões** | O que abre ou fecha o vídeo ([ADR 0016](decisions/0016-bordoes-de-abertura-e-final.md)) | Três tipos: **clipe pronto** (um vídeo seu já com o som, ex.: a dança com o "se ligaa"; mkv/avi são convertidos), **montado** (imagem ou cena da biblioteca + um áudio seu + texto na tela; dura o tempo do áudio) e **se inscreve** (foto, @, frase e o botão sendo clicado, 2,5 s; **Usar a do Instagram** copia a foto e o @). A prévia é a mesma cena que vai para o vídeo. Marque um padrão de abertura e um de final para os vídeos novos; em cada vídeo, troque na revisão. Fica em `backend/data/bordoes/` |

Para pegar áudio de links, instale o [yt-dlp](https://github.com/yt-dlp/yt-dlp) uma vez e reinicie o backend:

```bash
pip install yt-dlp
```

Alguns links do Instagram exigem login e podem falhar. Músicas com direitos autorais podem ser silenciadas pelo Instagram ou pelo YouTube.

## Ideias (`/ideias`)

O que gravar em seguida, a partir do que funcionou nos seus vídeos ([ADR 0021](decisions/0021-ideias-a-partir-do-desempenho.md)). Duas abas:

- **Desempenho:** cada Reel e Short publicado, com visualizações, quanto é assistido, compartilhamentos + salvamentos por mil, curtidas e comentários. O destaque é a comparação com a **mediana dos seus últimos vídeos na mesma idade** ("2,4× a sua mediana, aos 7 dias"): o app tira uma foto dos números quando o vídeo faz 1, 7 e 28 dias, sozinho, e o botão **Atualizar métricas** coleta na hora. Com menos de 10 vídeos medidos, a tela avisa que ainda é cedo para tirar padrão. Precisa do Instagram e/ou do YouTube conectados com as permissões de métricas ([INSTAGRAM.md](INSTAGRAM.md#métricas-dos-reels-tela-ideias), [YOUTUBE.md](YOUTUBE.md#métricas-tela-ideias)).
- **Ideias:** **Gerar ideias** (com um assunto opcional, "algo de Chainsaw Man") pede um lote de 6 para a IA. Ela lê o desempenho dos vídeos, os comentários mais curtidos do público e as ideias que você já guardou ou descartou, e pesquisa na web o que está acontecendo agora. Cada ideia traz tema, gancho, estilo, tom, duração, **o porquê** e as provas: os seus vídeos (com o número real), os comentários e o que achou na web. Ideia sem prova sua diz que veio só da pesquisa.
  - **Guardar** leva a ideia para o banco; **Descartar** pede um motivo ("já fiz", "não curto"), que a IA lê nos próximos lotes para não repetir.
  - **Peça um ajuste** troca o lote inteiro: "mais polêmicas", "só de One Piece", "junta a 2 com a 5" (os números são os dos cartões).
  - **Criar vídeo** abre o Novo vídeo preenchido; quando o projeto nasce, a ideia passa para **Viraram vídeo**.
  - As ideias novas que você não guardar são trocadas no próximo brainstorm.

## Estilos (`/estilos`)

Cada estilo aparece como um frame de Short. Os ajustes são em palavras simples: velocidade dos cortes, setas/X/figurinhas, legenda, música, tipo de imagem e "Algo mais para a IA saber?". **Como fica** mostra o seu vídeo mais recente com os ajustes do estilo. Mudar um estilo que vem com o app salva uma cópia sua. **Usar no próximo vídeo** abre o Novo vídeo com ele.

## Configurações (`/configuracoes`)

O antigo **Seu canal** (final do vídeo) virou um bordão "se inscreve" em **Biblioteca → Bordões**; os dados foram migrados sozinhos na primeira vez que o backend leu os bordões.

Mostra o Instagram conectado e o estado de cada IA: Gemini (com a hora em que a cota volta, se tiver acabado), Claude API e Claude Code do seu plano. Como configurar cada uma: [AI.md](AI.md).
