# Como usar: do tema ao Short

O InstaSearch é um **editor automático**: a IA escreve o roteiro e monta o vídeo com as suas imagens; você revisa, resolve o que falta e pede mudanças por texto. Este guia segue o caminho de um vídeo. A especificação completa está em [AUTO_EDIT.md](AUTO_EDIT.md); a IA por trás de cada passo, em [AI.md](AI.md).

```
Novo vídeo ─► Roteiro e voz ─► Montagem (automática) ─► Revisão ─► Salvar ou publicar
                                                          │
                                                          └─► Trocar imagem (só se faltar)
```

## 1. Novo vídeo (`/novo`)

- Escreva o **tema** ("Por que o Luffy nunca mata ninguém?").
- Escolha o **estilo** (Comentário de anime, Curiosidades, Ranking…), a **duração** (15 a 40 s) e o **tom**.
  - **Polêmico:** opinião forte que divide e termina com uma pergunta para a pessoa escolher um lado nos comentários.
  - **Curioso:** um fato que pouca gente sabe, com um detalhe surpreendente por cena.
  - **Mistério:** promete uma resposta no gancho e só revela no final, para segurar até o fim.
  - **Papo reto:** fala direto com quem assiste, como um amigo, sem enrolação.

  A instrução completa que cada tom manda para a IA fica em `TONE_GUIDE` ([shortsAI.ts](../backend/src/services/shorts/shortsAI.ts)).
- Já tem o texto? Marque **"Já tenho o texto da narração"** e cole. A IA só divide em cenas, sem mudar o texto.
- **Gerar roteiro** chama a IA (Gemini, ou o Claude Sonnet 5.5 se o Gemini estiver fora). Antes de escrever, ela confirma na web os fatos de que não tem certeza (no máximo 2 buscas).
- O nome da IA que escreveu aparece num selo abaixo do título do roteiro e no cartão **Quem fez** da revisão ([detalhes](AI.md#quem-fez-cada-parte)).

O atalho do Início (tema + estilo + "Começar") abre esta tela já preenchida.

## 2. Roteiro e voz (`/projeto/:id/roteiro`)

- Cada cena mostra a **legenda** (amarela), a **fala** e o que a imagem precisa mostrar. Tudo é editável; o ✕ tira a cena.
- **Peça uma mudança** no campo do topo ("gancho mais polêmico", "tira a parte do Kaido").
- **Sua voz:** copie a narração, grave (celular, ElevenLabs) e suba o áudio. A duração do áudio passa a ditar o tempo dos cortes. Dá para montar sem áudio e subir depois.
- **Montar automaticamente →**

## 3. Montagem (`/projeto/:id/montagem`)

Você não faz nada aqui. O app:

1. Escolhe uma imagem da biblioteca para cada cena (ver "Quem escolhe as imagens" abaixo).
2. Coloca **figurinhas** da sua biblioteca nas cenas de reação, quando alguma combina. O vídeo não desenha emojis: sem figurinha que combine, a cena fica sem reação.
3. Coloca **efeitos sonoros** nos cortes: whoosh nas setas, erro nos X, pop nas figurinhas, boom no gancho, click nas provas.
4. Escolhe uma **música** que combina com o clima do estilo.

A tela mostra cada decisão ("“NARUTO” → naruto e sakura · Naruto e Sakura juntos") e abre a revisão sozinha.

## 4. Revisão (`/projeto/:id`)

- **Prévia ao vivo** (Remotion Player): é a composição final, com zoom, setas, X, círculos, figurinhas, legenda, efeitos sonoros e música. Cenas sem imagem aparecem como **FALTA IMAGEM**.
- A barra abaixo do vídeo mostra as cenas: vermelho = sem imagem, laranja = imagem parecida. Clique para pular. Para abrir direto numa cena: `/projeto/:id?cena=3`.
- **✨ Peça um ajuste**: escreva o que quer mudar. A IA altera as cenas e a montagem preenche só as cenas novas. **Desfazer** volta a versão anterior.
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

### Efeitos sonoros de cada cena

Embaixo do vídeo, **🔊 Efeito sonoro desta cena** mostra o som da cena que está tocando (clique numa cena na barra para ir até ela). Escolha:

- **Automático**: a montagem escolhe pelo tipo de efeito (whoosh nas setas, erro nos X, pop nas figurinhas, boom no gancho), procurando pelo nome e pelas etiquetas dos sons.
- **Sem som**: a cena fica sem efeito.
- **Qualquer efeito da sua biblioteca** ("fahhh", "vine boom"…): toca nessa cena. ▶ ouve o som.

O que você escolhe fica travado: montar de novo ou pedir ajustes não troca. Na barra de cenas, um pontinho laranja marca as cenas com som.

O chat também troca: "põe o fahhh no X", "tira o som da cena 3", "vine boom no final". Ele recebe a lista dos seus efeitos e usa o nome exato.

A legenda completa usa um tempo **estimado** por palavra (proporcional ao tamanho da palavra dentro da cena). Ela fica exata quando a transcrição (Whisper) entrar.

### Quem escolhe as imagens

- **IA lê o roteiro** (padrão): a IA recebe a narração inteira e o catálogo da biblioteca (nome, personagens, etiquetas, descrição, áreas marcadas) e escolhe uma imagem por cena. Ela leva em conta quem é o assunto de cada fala, evita repetir imagem em cenas seguidas, prefere as menos usadas, diz em qual área dar zoom e explica cada escolha. Quando nada serve, a cena fica marcada como faltando, em vez de receber uma imagem errada. Gasta 1 chamada de IA por montagem; com mais de 120 imagens, só as melhores candidatas de cada cena vão para a IA.
- **Por palavras**: compara as palavras da cena com as etiquetas das imagens, sem IA. É a reserva automática se a IA não responder.

## 5. Trocar imagem (`/projeto/:id/imagens`)

Uma cena por vez ("Cena 1 de 3"):

- À esquerda, como a cena está agora.
- À direita, **Sugestões para esta cena**: a tela já abre com imagens da internet buscadas a partir do que a cena precisa mostrar e dos personagens dela. **Clique em uma** e pronto: ela é baixada, vai para a biblioteca (catalogada pela IA), entra na cena e a tela passa para a próxima.
  - **Mangá**: painéis reais do mangá achados na internet (Bing Imagens, sem chave). A busca usa o nome completo do personagem, a série e as etiquetas da cena em inglês ("Satoru Gojou jujutsu kaisen smile blindfold manga panel"). Em estilos de mangá (ex.: Comentário de anime) eles aparecem **primeiro**; nos outros, depois dos resultados gerais.
  - **Internet**: resultados gerais do Bing Imagens (sem chave) para o texto da cena: prints, wallpapers, fanarts, sites de notícia.
  - **Danbooru**: ilustrações, páginas de mangá e prints, **só as classificadas como "geral"**, sem crossovers com outras séries. A busca é **específica da cena**: a IA escreve no roteiro etiquetas para cada cena (`hands_in_pockets`, `smirk`, `from_below`…) e as palavras do texto também viram filtros ("mão no bolso", "calmo", "de costas", "olhos de perto", "mangá"…; "sem venda" não vira "venda"). As imagens que batem com a cena aparecem primeiro.
  - **Arte oficial** (AniList): o retrato oficial de cada personagem. O nome é desempatado pela série: "Sakura" num vídeo de Naruto é a Sakura Haruno, "Sukuna" é o de Jujutsu Kaisen (não o do Touhou), "Yuta" é o Yuuta Okkotsu (não o Yutaka).
  - Imagens que já estão na sua biblioteca não aparecem de novo.
  - **Google** (opcional): resultados do Google Imagens, se você colocar a `SERPER_API_KEY` (ver abaixo). O Google Imagens só funciona com JavaScript, então sem a chave o app usa o Bing.
  - Não gostou? **↻ Outras opções** traz outras imagens para a mesma cena (cada clique, uma leva nova). Ou mude o texto da busca ("Goku sorrindo criança") e clique em **Buscar**. **Ver mais** mostra o resto.
- **✨ Preencher as N cenas automaticamente** (no topo): busca e coloca a melhor sugestão em cada cena que falta, de uma vez. Prefere imagens que batem com a cena, em pé (vídeo vertical), com boa resolução, sem personagens a mais e sem repetir. Não gasta IA: as imagens entram na biblioteca com os personagens e a descrição da cena, e você pode catalogá-las depois. O mesmo botão está no cartão "Precisa de você" da revisão.
- **Tem outra imagem? Cole aqui**: Ctrl+V de uma imagem copiada, arrastar um arquivo, colar um link ou clicar para escolher. **Google ↗** abre o Google Imagens numa aba.
- Embaixo, imagens da sua biblioteca que combinam.
- Toda imagem nova vai para a biblioteca, já catalogada, e serve para os próximos vídeos.
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

## Estilos (`/estilos`)

Cada estilo aparece como um frame de Short. Os ajustes são em palavras simples: velocidade dos cortes, setas/X/figurinhas, legenda, música, tipo de imagem e "Algo mais para a IA saber?". **Como fica** mostra o seu vídeo mais recente com os ajustes do estilo. Mudar um estilo que vem com o app salva uma cópia sua. **Usar no próximo vídeo** abre o Novo vídeo com ele.

## Configurações (`/configuracoes`)

O antigo **Seu canal** (final do vídeo) virou um bordão "se inscreve" em **Biblioteca → Bordões**; os dados foram migrados sozinhos na primeira vez que o backend leu os bordões.

Mostra o Instagram conectado e o estado de cada IA: Gemini (com a hora em que a cota volta, se tiver acabado), Claude API e Claude Code do seu plano. Como configurar cada uma: [AI.md](AI.md).
