# 0037 — Efeitos da cena na frente, chat secundário

**Status:** Aceita · **Data:** 2026-10-17 · Substitui em parte o [0011](0011-editor-automatico.md) (a regra "sem painel por cena") e o ponto 3 do [0022](0022-imagens-da-web-e-controles-da-cena.md) (onde ficam os controles da cena)

## Contexto

O usuário quer customizar melhor os efeitos: "os efeitos de transição como tremer, o branco de uma cena pra outra, o zoom em áreas específicas". Para isso, quer "tirar o chat do meio, deixar ele como secundário".

Hoje, na tela Revisão:

- **Movimento** (`beat.motion`: zoom in, zoom out, tremer, deslizar), **foco do zoom** (`beat.focus`, a área que a catalogação marcou na imagem, como "rosto") e **destaque** (`beat.effect`: seta, X, círculo, emoji) são escolhidos pela IA no roteiro (`shortsAI.ts`). Para mudar, só pelo chat: "na cena 3, treme em vez de zoom". O usuário espera a IA e confere se ela acertou a cena.
- **O flash branco** entre cenas não é escolhido por ninguém: sai do ritmo do vídeo (`ShortVideo.tsx`: no "frenético" em todo corte, no "rápido" a cada 4 cenas). Não dá para pôr numa cena nem tirar de outra, nem pelo chat.
- **Intensidade e velocidade** do movimento (quanto treme, quanto aproxima, em quanto tempo) são fixas no código.
- O que já tem controle na cena (0022, 3B): imagem, fundo, som e figurinha, numa linha de botões abaixo da faixa de cenas. O chat ("✨ Peça um ajuste") ocupa a coluna do meio, que é o lugar de destaque.

O [0011](0011-editor-automatico.md) proibiu "linha do tempo, trilhas ou painel por cena" porque a primeira versão parecia um editor manual. O [0022](0022-imagens-da-web-e-controles-da-cena.md) recusou um cartão "Esta cena" ao lado do player (3A) porque "tira o chat, o caminho principal do 0011, do lugar de destaque". Este ADR faz exatamente isso, então precisa dizer o que muda e o que se perde. O resto do 0011 continua: a IA monta, nada é publicado sem revisão, sem linha do tempo nem trilhas, sem dados de mentira.

As telas da proposta estão no Figma, à direita das atuais: **01c** (a Revisão nova), **01d a 01g** (os pop-ups de Movimento, Transição, Foco do zoom e Destaque) e **01h** (o chat aberto como gaveta).

## Decisão

O usuário escolheu a recomendada em todos os pontos: **1A, 2A, 3A e 4A**.

### 1. Onde ficam os efeitos e o chat

- **1A (recomendada): efeitos na frente, chat numa barra embaixo** (Figma 01c e 01h).
  - **Esquerda:** o player e, abaixo dele, os ajustes do vídeo inteiro em chips com pop-up (ritmo, efeitos, legenda, música, figurinhas, bordões). Esses ajustes saem do cartão "Ajustes rápidos".
  - **Centro, no alto:** a faixa de cenas. Entre duas miniaturas aparece um ícone da **transição** (│ corte seco, ⚡ flash, 〰 tremida, ⊕ zoom), clicável. Cada miniatura mostra os ícones dos efeitos da cena.
  - **Centro:** "Efeitos da cena 3", com 8 cartões: Movimento, Transição de entrada, Foco do zoom, Destaque, Imagem, Fundo, Som e Figurinha. Cada cartão mostra o valor atual e quem escolheu ("✨ a IA escolheu" ou "✋ você escolheu"), e abre um pop-up. No alto do painel: "↺ Voltar ao que a IA fez" e "Copiar para outras cenas".
  - **Embaixo:** o chat vira uma barra de uma linha, com o campo, a última resposta, "Desfazer" e "Conversa (3)". A conversa abre como **gaveta** à direita, por cima dos cartões, sem tirar o player da tela.
  - Saem as colunas "O que a IA montou" e "Precisa de você" como estão hoje. As informações delas cabem no painel da cena (a cena sem imagem mostra o aviso no cartão Imagem) e num resumo na barra de cima; o desenho disso fica para a implementação.
- **1B: manter a linha de botões do 0022 e só pôr mais botões nela** (Movimento, Transição, Foco, Destaque). É a menor mudança e o chat fica onde está. Mas a linha passa de 4 para 8 botões e deixa de caber numa tela de notebook, e cada botão mostra só o valor, sem prévia nem "quem escolheu".
- **1C: abas no centro, "Efeitos" e "Conversa".** Os dois ficam grandes, mas nunca juntos: para ver a resposta da IA depois de mexer num efeito, troca de aba.

### 2. Os pop-ups dos efeitos

Todos seguem o mesmo molde dos pop-ups de Fundo e Figurinha (0022): opções lado a lado, a primeira é **Automático (o que a IA fez)**, e embaixo "Aplicar a: Só esta cena / Todas as cenas / Cenas com [personagem]" e "Pronto".

| Pop-up | Opções | Ajustes finos |
|---|---|---|
| **Movimento** (01d) | Automático, Parado, Zoom in, Zoom out, Tremer, Deslizar | Intensidade (leve, média, forte) e velocidade (devagar, normal, rápido) |
| **Transição de entrada** (01e) | Automático, Corte seco, Flash branco, Flash preto, Tremida, Zoom rápido | Força (leve, média, forte) e duração (instantânea, rápida, lenta) |
| **Foco do zoom** (01f) | As áreas que a IA marcou na imagem (rosto, mão…), Imagem inteira, ou desenhar uma área com o mouse | Quanto aproxima (leve, médio, forte, close) e a miniatura de começo → fim da cena |
| **Destaque** (01g) | Automático, Nenhum, Círculo, Seta, X, Emoji | Cor e quando entra (no começo, numa palavra da fala, no fim) |

- **"Parado"** é um movimento novo (hoje toda cena se mexe). **Transição** é um campo novo na cena; sem valor, vale a regra de hoje (o ritmo decide), então os projetos antigos não mudam. **"Quando entra numa palavra"** usa os tempos das palavras da legenda ([0018](0018-legenda-sincronizada-com-a-voz.md)).
- **A área desenhada** vira uma região da própria cena (`beat.focusRegion`), e não da imagem, porque a imagem pode ser trocada.

**Entrega:**
- **2A (recomendada): em duas etapas.** Primeiro, escolher **o efeito** (as opções de cada pop-up, a transição por cena e as áreas que a IA marcou). Depois, numa tarefa própria, **os ajustes finos** (intensidade, velocidade, força, duração, cor, "quando entra" e desenhar a área). A primeira etapa já resolve o pedido (tremer, flash, zoom no lugar certo) e dá para testar antes de pôr mais botões.
- **2B: tudo de uma vez.** Uma tarefa grande, mais difícil de revisar e de testar.

### 3. A IA e o chat diante de uma escolha do usuário

O que o usuário escolhe fica **travado** na cena, como o som e a figurinha (`motionLocked`, `transitionLocked`, `focusLocked`, `effectLocked`): a montagem e o "↻ Buscar de novo na web" não trocam.

- **3A (recomendada): o pedido explícito vence.** O chat não mexe num efeito travado, **a não ser** que o pedido fale daquela cena e daquele efeito ("tira o tremor da cena 3"). Aí ele muda, e a trava continua, agora com o valor novo. Um pedido geral ("mais efeitos", "mais calmo") pula as cenas travadas e diz quais pulou.
- **3B: o chat nunca mexe num efeito travado**, como na figurinha (0022). Mais previsível, mas "tira o tremor da cena 3" passa a não funcionar se o tremor foi escolhido à mão, e o usuário precisa lembrar disso.

### 4. A prévia ao passar o mouse

O 0011 proíbe prévia falsa. Então:

- **4A (recomendada): o player de verdade mostra a opção.** Ao passar o mouse numa opção, o player pula para a cena e toca com aquele efeito (ou os 2 segundos em volta do corte, na transição), sem salvar. Ao sair do pop-up sem escolher, volta ao que estava. O Remotion já recebe as cenas como dados, então basta passar a cena com o valor provisório.
- **4B: miniaturas animadas em CSS nas opções.** Mais bonitas, mas são uma imitação do efeito, e não o que o render faz; é a "prévia falsa" que o 0011 proíbe.

As opções mostram a imagem parada da cena e um ícone; o movimento de verdade fica no player.

## Alternativas consideradas

- **Não fazer nada e melhorar o chat** (entender melhor "treme a cena 3"): continua lento (espera a IA a cada ajuste) e não resolve o flash, que hoje nem o chat controla.
- **Editor com linha do tempo** (CapCut): é o que o 0011 recusou e continua recusado. Esta proposta não tem trilhas nem arrasto no tempo: cada efeito é uma escolha entre poucas opções, a partir do que a IA fez.

## Consequências

- **Ganhamos:** os efeitos que mais aparecem no vídeo (movimento, transição, zoom, destaque) mudam num clique, com a prévia real, sem esperar a IA; o flash vira uma escolha por corte, e não um efeito colateral do ritmo; o usuário vê o que a IA escolheu e o que ele escolheu.
- **Perdemos / custa:**
  - **Do 0011:** a regra "sem painel por cena" cai. O app passa a parecer mais um editor, e o risco é o usuário gastar tempo ajustando cada cena, o que o 0011 queria evitar. O "Automático" em todo pop-up, o "Voltar ao que a IA fez" e a ausência de linha do tempo seguram isso, mas não eliminam.
  - **Do 0022:** o chat sai do lugar de destaque. Pedidos que só o texto resolve ("final mais polêmico", "troca a música") ficam a um clique a mais, e quem não conhece o app pode nem ver que pode conversar com a IA.
  - Campos novos na cena (transição, travas dos efeitos, ajustes finos e a área desenhada), que o roteiro, a montagem, o chat (`shortsAI.ts`) e o render precisam conhecer; a tela Revisão é refeita quase toda.
- **Revisar quando:** o usuário passar mais tempo nos cartões do que gastava pedindo ao chat, ou parar de usar o chat por não achá-lo.
