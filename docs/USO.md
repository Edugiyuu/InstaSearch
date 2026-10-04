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
- Já tem o texto? Marque **"Já tenho o texto da narração"** e cole. A IA só divide em cenas, sem mudar o texto.
- **Gerar roteiro** chama a IA (Gemini, ou o Claude Haiku se o Gemini estiver fora).

O atalho do Início (tema + estilo + "Começar") abre esta tela já preenchida.

## 2. Roteiro e voz (`/projeto/:id/roteiro`)

- Cada cena mostra a **legenda** (amarela), a **fala** e o que a imagem precisa mostrar. Tudo é editável; o ✕ tira a cena.
- **Peça uma mudança** no campo do topo ("gancho mais polêmico", "tira a parte do Kaido").
- **Sua voz:** copie a narração, grave (celular, ElevenLabs) e suba o áudio. A duração do áudio passa a ditar o tempo dos cortes. Dá para montar sem áudio e subir depois.
- **Montar automaticamente →**

## 3. Montagem (`/projeto/:id/montagem`)

Você não faz nada aqui. O app:

1. Escolhe uma imagem da biblioteca para cada cena (ver "Quem escolhe as imagens" abaixo).
2. Troca emojis por **figurinhas** da sua biblioteca quando alguma combina com a reação da cena.
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

A legenda completa usa um tempo **estimado** por palavra (proporcional ao tamanho da palavra dentro da cena). Ela fica exata quando a transcrição (Whisper) entrar.

### Quem escolhe as imagens

- **IA lê o roteiro** (padrão): a IA recebe a narração inteira e o catálogo da biblioteca (nome, personagens, etiquetas, descrição, áreas marcadas) e escolhe uma imagem por cena. Ela leva em conta quem é o assunto de cada fala, evita repetir imagem em cenas seguidas, prefere as menos usadas, diz em qual área dar zoom e explica cada escolha. Quando nada serve, a cena fica marcada como faltando, em vez de receber uma imagem errada. Gasta 1 chamada de IA por montagem; com mais de 120 imagens, só as melhores candidatas de cada cena vão para a IA.
- **Por palavras**: compara as palavras da cena com as etiquetas das imagens, sem IA. É a reserva automática se a IA não responder.

## 5. Trocar imagem (`/projeto/:id/imagens`)

Uma cena por vez ("Cena 1 de 3"):

- À esquerda, como a cena está agora; à direita, **Cole a imagem aqui**: Ctrl+V de uma imagem copiada, arrastar um arquivo, colar um link ou clicar para escolher.
- **Procurar no Google ↗** abre a busca de imagens com a descrição da cena.
- Embaixo, imagens da sua biblioteca que combinam.
- Toda imagem nova vai para a biblioteca, já catalogada, e serve para os próximos vídeos.
- **Manter a parecida** aceita a imagem provisória; **Próxima cena →** segue.

## 6. Salvar ou publicar

- **Salvar para depois** (topo da revisão ou no modal Publicar): o vídeo fica em **Projetos → Salvos**, pronto para publicar quando você quiser.
- **Publicar**: o modal gera a legenda do post com hashtags (dá para editar, copiar e gerar outra).
- ⚠️ **O arquivo MP4 ainda não é gerado.** A prévia já é a composição final; o render com o Remotion no backend é o próximo passo do [ROADMAP](ROADMAP.md). Até lá, o botão de publicar fica desligado.

## Biblioteca (`/biblioteca`)

Quatro abas. Tudo fica em `backend/data/` no seu computador.

| Aba | Para quê | Dicas |
|---|---|---|
| **Imagens** | As imagens das cenas | A IA cataloga cada uma: quem aparece, etiquetas, descrição e áreas de zoom (caixas amarelas). Corrija personagens e etiquetas à mão quando precisar. Busca em linguagem natural ("sukuna sorrindo no mangá") |
| **Figurinhas** | Reações que entram no lugar dos emojis | Use PNG com fundo transparente. A IA etiqueta a reação com sinônimos ("chocado, surpreso, espantado"). Sem figurinha que combine, o vídeo usa o emoji |
| **Efeitos sonoros** | Sons dos cortes | A montagem procura pelo nome e pelas etiquetas: whoosh, boom, impacto, pop, ding, erro, risada, suspense, glitch, click. Nomeie os arquivos assim (`whoosh_01.mp3`). Os cartões no topo mostram quais tipos você já tem |
| **Músicas** | Fundo do vídeo | A montagem escolhe pelo clima do estilo (tensa, animada, calma). Cole o link de um **Reel, TikTok ou Short** para pegar o áudio |

Para pegar áudio de links, instale o [yt-dlp](https://github.com/yt-dlp/yt-dlp) uma vez e reinicie o backend:

```bash
pip install yt-dlp
```

Alguns links do Instagram exigem login e podem falhar. Músicas com direitos autorais podem ser silenciadas pelo Instagram ou pelo YouTube.

## Estilos (`/estilos`)

Cada estilo aparece como um frame de Short. Os ajustes são em palavras simples: velocidade dos cortes, setas/X/emojis, legenda, música, tipo de imagem e "Algo mais para a IA saber?". **Como fica** mostra o seu vídeo mais recente com os ajustes do estilo. Mudar um estilo que vem com o app salva uma cópia sua. **Usar no próximo vídeo** abre o Novo vídeo com ele.

## Configurações (`/configuracoes`)

Mostra o Instagram conectado e o estado de cada IA: Gemini (com a hora em que a cota volta, se tiver acabado), Claude API e Claude Code do seu plano. Como configurar cada uma: [AI.md](AI.md).
