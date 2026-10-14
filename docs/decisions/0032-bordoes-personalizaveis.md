# 0032 — Bordões personalizáveis: botão, áudio, animações e o que aparece

**Status:** Aceita · **Data:** 2026-10-14 · Complementa o [0016](0016-bordoes-de-abertura-e-final.md)

## Contexto

No [0016](0016-bordoes-de-abertura-e-final.md), o bordão "se inscreve" tinha uma animação fixa: foto, nome, frase e o cursor clicando no botão, que **sempre** virava "INSCRITO". O usuário trocou o texto do botão para "Siga-me" e, depois do clique, aparecia "Inscrito" do mesmo jeito. Ele também queria pôr um áudio nesse bordão, escolher as animações e esconder partes ("a opção de esconder o nome ou algo assim, seja criativo").

## Decisão

O usuário escolheu, entre as opções propostas:

- **Botão:**
  - **Texto depois do clique** (`afterButton`). Vazio, o app adivinha pelo texto do botão ("SIGA-ME" → "SEGUINDO", "INSCREVA-SE" → "INSCRITO", e "FEITO ✓" se não reconhecer).
  - **Modelos prontos** (`buttonStyle`): YouTube (vermelho, Inscreva-se → Inscrito), Instagram (gradiente, Seguir → Seguindo), TikTok (rosa, Seguir → Seguindo) e Canal (amarelo do app). Um clique preenche o texto, o depois do clique e as cores. Depois do clique, o botão fica cinza, como nas redes.
- **Áudio:**
  - **Um áudio seu no "se inscreve"**, no mesmo campo `file` do montado (o app sabe pela extensão se o arquivo é foto ou áudio). Com áudio, o bordão dura o tempo dele, mas no mínimo 2 s, para caber o clique.
  - **A música do vídeo continua por baixo** (`music`): ela entra já na abertura e segue no final, baixinha (10%) quando o bordão tem som próprio. Sem o campo, vale o de antes: a música toca por baixo só de um bordão sem som.
- **Animações:**
  - **Entrada** (`entrance`): pulo (o de antes), deslizar, zoom ou tremida. As partes entram uma depois da outra.
  - **Clique** (`click`): cursor (o de antes), dedo (um toque de celular, com uma onda saindo do botão), pulsar (o botão pulsa e se clica sozinho) ou sem clique (o botão fica parado e não muda).
  - **Duração** de 2 a 6 s, quando não há áudio (antes, sempre 2,5 s).
  - **Texto do montado** (`textAnim`, `textPosition`): pula, é digitado letra a letra ou fica tremendo; em cima, no meio ou embaixo.
- **O que aparece** (`show`): foto, nome, frase e botão, cada um com sua chave. As partes que sobram ficam centralizadas na tela: para isso, o "se inscreve" deixou as posições fixas e passou a usar uma coluna centralizada, e o cursor e o dedo ficam presos ao botão.

Os campos são opcionais, e o que falta vale o de antes: os bordões que já existem continuam iguais. O backend aceita só os valores das listas, e o resto ele ignora.

## Alternativas consideradas

- **Só o texto depois do clique:** resolvia o "Siga-me → Inscrito", mas não o resto do pedido.
- **Cor livre do botão, ícone no botão, formato da foto, fundo próprio e confete no clique:** foram propostos e ficaram de fora por escolha do usuário. Cabem depois sem mudar o formato dos dados.
- **Som do clique da biblioteca de efeitos:** proposto e não escolhido; o áudio do bordão cobre o caso de uma fala.
- **Um editor de animação livre** (quadros e curvas): contraria o editor automático do [0011](0011-editor-automatico.md). Opções prontas dão variedade sem virar linha do tempo.

## Consequências

- **Ganhamos:** um final do jeito do canal, em qualquer rede, sem editar fora do app; e a prévia na biblioteca é a mesma cena do MP4.
- **Perdemos / custa:** mais opções no painel do bordão; o "se inscreve" passou a ser montado em coluna, então as distâncias entre as partes mudaram um pouco em relação às de antes.
- **Revisar quando:** o usuário sentir falta das opções que ficaram de fora, ou quiser bordões no meio do vídeo (o "Revisar quando" do 0016).
