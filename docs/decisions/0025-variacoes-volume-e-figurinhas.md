# 0025 — Mais variações, volume dos efeitos e figurinha na cena

**Status:** Aceita · **Data:** 2026-10-10 · Complementa o [0020](0020-imagens-especificas-memes-e-zoom.md) (dose dos memes e variações) e o [0022](0022-imagens-da-web-e-controles-da-cena.md) (como ficou a figurinha, 2C)

## Contexto

Depois de editar os vídeos da Tatsumaki (09/10), o usuário pediu três coisas de uma vez:

1. **Mais variações.** Ele gostou da sugestão "✨ Buscar a variação: “tatsumaki chibi fanart”" na tela Trocar imagem. Pelo [0020](0020-imagens-especificas-memes-e-zoom.md), o roteiro marcava um meme ou uma variação (`twist`) em cerca de 1 cena a cada 4 ou 5, e só nos momentos de piada. Num vídeo de 19 cenas, eram umas 4 marcações, poucas delas variações.
2. **Volume dos efeitos sonoros.** O volume era fixo em 75% na composição (`ShortVideo.tsx`). Um efeito que já vem alto do arquivo "estourava", e o único jeito de mudar era trocar o som.
3. **Figurinha à mão.** "Só quem consegue fazer isso é a IA": a figurinha só mudava pelo chat. O [0022](0022-imagens-da-web-e-controles-da-cena.md) já tinha decidido o 2C (ajuste do vídeo + escolha na cena), mas faltava fazer. O usuário pediu o pop-up igual ao do fundo da cena.

## Decisão

As três mudanças foram feitas em commits separados (`bb66544`, `7814edd`, `41a53be`), na ordem da menor para a maior.

### 1. Variações: cerca de 1 cena a cada 3

- O `TWIST_RULE` (`shortsAI.ts`), usado no roteiro e no chat, passa de 1 a cada 4 ou 5 batidas para **cerca de 1 a cada 3**.
- A **variação** (chibi, versão mulher, outro traço) vira o tipo mais comum e **não precisa de momento de piada**: basta a cena mostrar o personagem. O meme continua nas piadas, viradas e reações.
- O prompt ganhou o exemplo "tatsumaki chibi fanart", porque a IA tende a copiar o exemplo (antes só havia o genderswap).

### 2. Volume: o do vídeo × o da cena

- O pop-up do som ganhou dois controles: **Todos os efeitos** (`settings.sfxVolume`, 0 a 100%, começa em 75%) e **Esta cena** (`beat.sfxVolume`, 0 a 200%, 100% = igual aos outros).
- O volume final é a **multiplicação** dos dois (`sfxVolume` em `timeline.ts`). A prévia e o render usam a mesma função. Acima de 100%, o Remotion amplifica.
- O ajuste da cena foi acertado para **aquele som**: quando o som muda (no pop-up, no chat ou na montagem), ele volta para 100%, como o fundo volta ao Automático quando a imagem muda.
- A tela muda na hora e só salva quando o controle para de mexer (*debounce* de 400 ms).

### 3. Figurinha: pop-up na cena e ajuste do vídeo

- **Na cena:** pop-up "😮" com miniaturas, numa **segunda linha** sob os controles (na primeira, já não cabia): Automático, Nenhuma ou uma figurinha da biblioteca, com as do assunto do vídeo primeiro.
- **A figurinha não substitui o efeito.** Ela é desenhada fora dele (`<Sticker>`), então a cena pode ter seta e figurinha, e o Automático devolve a cena como a IA fez.
- **A escolha fica travada** (`stickerLocked`): a montagem, o ajuste do vídeo e **o chat** não mexem nela. Para trocar, o caminho é o pop-up.
- **No vídeo**, "Figurinhas" (`settings.stickers`):
  - **Nenhuma** tira as automáticas na hora, sem IA;
  - **Poucas** (o padrão) deixa onde a IA pôs uma reação;
  - **Muitas** pede ao chat reações em cerca de 1 cena a cada 3.

## Alternativas consideradas

- **Variações por um ajuste rápido** ("Memes: poucos / médio / muitos", a 3B do 0020): dá controle direto, mas é mais um botão. O pedido foi "mais", e não um controle, e o chat já aceita "menos variações" num vídeo só.
- **Volume só do vídeo inteiro:** é o mais simples, mas um efeito que já vem alto do arquivo continua alto.
- **Volume só por cena:** para baixar todos, seria preciso mexer cena por cena. Um volume próprio na cena (em vez de multiplicar) teria o mesmo problema: baixar o do vídeo não mexeria nas cenas ajustadas.
- **Figurinha trocando o efeito para reação**, que era o texto do 0022 ("a cena ganha a reação"): numa cena com seta, a seta sumiria, e voltar ao Automático não teria como recuperá-la.
- **Chat destravando a figurinha quando muda a reação da cena:** foi a primeira versão. No teste, o "Muitas" pôs uma reação na cena em que o usuário tinha escolhido uma figurinha, e apagou a escolha sem ele ter pedido nada sobre aquela cena.
- **"Poucas" e "Nenhuma" sempre pela IA, como o ajuste "Efeitos":** gastaria uma chamada para algo que o servidor resolve sozinho (tirar ou devolver as automáticas).
- **Figurinha na mesma linha dos outros controles:** era o 3B do 0022 ("uma linha só"). Com cinco botões, os rótulos viravam "T…" e "vine…".

## Consequências

- **Ganhamos:** vídeos com mais variações, que é o que o usuário quer ver; volume e figurinha resolvidos em um clique, sem esperar a IA; a figurinha escolhida não se perde em nenhum caminho.
- **Perdemos / custa:**
  - A frequência das variações é um pedido à IA, e não uma regra que o código confere: pode vir um pouco mais ou um pouco menos.
  - A linha de controles da cena virou duas. O 3B do 0022 pedia uma linha só, e a Revisão fica mais perto de um editor manual (o mesmo custo que o 0022 já assumia).
  - Uma figurinha travada só sai pelo pop-up: "tira a figurinha da cena 3" no chat não a remove.
  - O ▶ do pop-up toca no máximo a 100%, porque o `<audio>` do navegador não amplifica. O vídeo amplifica de verdade.
  - **A figurinha automática combina pouco:** ela é escolhida pelas etiquetas da reação, sem olhar a obra do vídeo. Com a biblioteca de hoje (figurinhas de JoJo e JJK), o "Muitas" num vídeo da Tatsumaki pôs 8 reações, e só 2 ganharam figurinha. Está no Backlog.
- **Revisar quando:** o usuário pedir menos variações ou reclamar de variações forçadas (voltar à dose do 0020, ou fazer a 3B); a figurinha automática continuar errando a obra mesmo com figurinhas dela na biblioteca; ou a Revisão ganhar mais um controle por cena (aí repensar o 0011, como o 0022 já previa).
