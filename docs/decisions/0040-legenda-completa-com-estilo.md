# 0040 — Legenda completa ou palavra por palavra, com tamanho e animação

**Status:** Aceito · **Data:** 2026-10-30

## Contexto

Desde o [ADR 0018](0018-legenda-sincronizada-com-a-voz.md) havia quatro modos de legenda: `quadrinho` (1 a 3 palavras-chave em amarelo gigante, tiradas do `text` da cena), `completa` (todas as palavras da fala, a falada acendendo no tempo da voz), `limpa` (a frase inteira em branco, sem destaque) e `sem`. O modo vinha do estilo escolhido no Novo vídeo — "Comentário de anime" nascia `quadrinho`, "Edit" nascia `sem` —, então quase todo vídeo começava no modo errado e o usuário trocava à mão.

Na prática ele usa duas coisas: a legenda completa e a legenda de uma palavra por vez. As outras duas (`quadrinho`, `limpa`) eram escolha morta.

Do outro lado faltava estilo no que ele usa: a palavra falada só trocava de cor e crescia 12%, fixo no código, com fonte fixa em 92 px. "Ele só muda do nada", nas palavras dele.

## Decisão

A legenda tem **dois modos** — `completa` (o bloco de palavras na tela, a falada acendendo em amarelo) e `palavra` (uma palavra por vez, sozinha e maior) — mais o desliga (`sem`), para um vídeo que vai ser legendado fora do app. E ganha dois ajustes **por vídeo**, na Revisão:

- **Tamanho:** pequena (76 px), média (92 px, o de hoje) ou grande (118 px). O tamanho também muda quantas palavras cabem no bloco (5, 4 ou 3), o contorno preto e a sombra, que passam a ser calculados da fonte. Palavra por palavra, a fonte é 35% maior, porque uma palavra sozinha cabe maior.
- **Animação da palavra falada:** `destaque`, `pop`, `salto` e `placa`.

As quatro animações não foram inventadas: saíram do que os apps de legenda de Short (Submagic, CapCut, VideoCaptions, Exemplary) oferecem e do que os guias de 2026 recomendam, pesquisados na web antes de implementar. O mesmo vale para as regras de desenho que a legenda passa a seguir:

| O que a pesquisa diz | O que o código faz |
|---|---|
| O destaque palavra a palavra ("karaokê") é o estilo mais recomendado; a versão atual é discreta, com 3 a 5% de aumento ou só a troca de cor | `destaque` é o padrão: cor de destaque + 4% |
| O "pop"/"scale-up" sai de ~80% e passa um pouco de 1,0 com mola, sem ficar quicando | `pop`: 0,84 → 1 com mola de ~200 ms (a mola passa ~10% do ponto) |
| O "bounce" entra de 30 a 50% da altura abaixo do lugar, com a opacidade subindo na primeira metade | `salto`: entra 35% abaixo, opacidade em 4 quadros |
| O estilo Hormozi põe a palavra falada numa plaquinha de cor | `placa`: retângulo amarelo, texto escuro e sem contorno |
| 2 a 5 palavras por tela (ou 1 a 4, palavra a palavra); fonte pesada em caixa alta com contorno; **uma** cor de destaque por vídeo; faixa no meio da tela, nunca no quarto de baixo, que a interface do app cobre; animação curta (100 a 200 ms); "movimento sobre movimento cansa de ler" | 5/4/3 palavras por bloco ou 1; amarelo único; `top: 1180` (61% a ~75% da altura); entradas de 200 a 300 ms; o `destaque` existe justamente para imagem agitada |

O efeito **máquina de escrever** ficou de fora de propósito: a fala corre a 120–150 palavras por minuto e a letra-a-letra fica para trás; os guias só o recomendam para cartela de abertura.

Os ajustes ficam **só na Revisão**: `ShortStyle` perde o campo `caption`, e todo projeto novo nasce completa, média e `destaque`. Projetos antigos com `quadrinho` ou `limpa` passam a `completa` na leitura (`migrateSettings`), e uma animação que não existe mais volta a ser a padrão.

## Alternativas consideradas

- **Manter os quatro modos antigos e só acrescentar os ajustes:** o menu ficaria com combinações que ele não usa, e os estilos continuariam começando no modo errado. Dois componentes de render para manter, sem ganho.
- **Inventar as animações (giro, tremida, karaokê com preenchimento da esquerda para a direita):** foi a primeira tentativa, e o usuário pediu para refazer com base no que o mercado faz. Animação boa de legenda é um padrão conhecido, não criatividade: as presets dos apps existem porque funcionam, e inventar significa competir com elas sem dados.
- **Guardar tamanho e animação também no estilo (ou só nele):** seria menos cliques para quem sempre quer o mesmo, mas o estilo já decide ritmo, efeitos, música e tipo de imagem, e ele prefere decidir a legenda vendo a prévia — foi a escolha dele.
- **Deixar a IA escolher a animação pelo clima do vídeo:** sem um sinal claro do que é "mais agitado", a escolha sairia aleatória. O chat da Revisão já troca o ajuste quando ele pede ("legenda maior", "palavra por palavra").

## Consequências

- **Ganhamos:** os dois jeitos que ele usa, com ajustes que dão estilo sem mexer no código, seguindo o que os apps de legenda fazem. Um componente de render a menos (`Caption`, dos modos `quadrinho` e `limpa`).
- **Perdemos / custa:** o `quadrinho` (palavra-chave gigante tirada do `text` da cena, em vez da fala) não existe mais; o campo `text` da batida continua no roteiro, agora só para a montagem e a capa do projeto. Os estilos ficam com uma linha a menos.
- **Revisar quando:** se os apps de legenda mudarem o padrão (a pesquisa é de 2026), ou se um formato novo pedir legenda em cima da tela, e aí a posição também viraria ajuste.

## Fontes

- [TikTok Caption Styles Ranked by Watch Time (2026) — Blitzcut](https://blitzcutai.com/blog/video-caption-styles-ranked)
- [Best Caption Styles for Shorts, Reels & TikTok (2026) — Recapo](https://recapo.ai/blog/best-caption-styles-for-shorts/)
- [How I Style Karaoke Captions for Reels and TikTok in DaVinci Resolve — xere.my](https://xere.my/journal/karaoke-captions-reels-tiktok-davinci-resolve/)
- [Bounce caption style — VideoCaptions.AI](https://www.videocaptions.ai/caption-styles/bounce)
- [How to make Alex Hormozi captions — Submagic](https://submagic.co/blog/how-to-make-alex-hormozi-captions)
- [Caption Styles for TikTok, Reels and Shorts — Exemplary](https://exemplary.ai/caption-styles)

## Adendo (2026-11-02): o bloco fecha na frase e na pausa, não a cada N palavras

O modo **Completa** quebrava as palavras a cada N fixas (`Math.floor(current / chunk) * chunk`, com N = 5, 4 ou 3 conforme o tamanho). Com uma fala de 5 palavras e N = 4, "Nami? É só a navegadora." virava **"NAMI? É SÓ A"** e depois **"NAVEGADORA."**: a pergunta ficava colada no começo da resposta, e a resposta sozinha no bloco seguinte.

Agora o bloco fecha quando acontece o primeiro destes:

- a palavra termina em `.`, `!`, `?` ou `…` (fim de frase);
- a pausa até a palavra seguinte chega a **0,45 s**;
- o bloco já ocupa **1,6 s** de fala;
- o bloco chegou ao teto de palavras do tamanho escolhido — o N de antes, que continua existindo.

A pausa é o intervalo entre o fim de uma palavra e o começo da seguinte, como o Whisper marcou (`wordStarts` e `wordEnds` novos no `TimedBeat`). O [ADR 0041](0041-corte-da-voz-no-silencio-real.md) mostrou que essas marcas erram por dezenas de milissegundos; lá isso cortava a voz no meio da palavra, aqui não muda nada, porque o limite é 450 ms — dez vezes maior que o erro. Medir o silêncio real com o `silencedetect` daria uma precisão que esta decisão não usa, ao custo de levar os silêncios até o componente.

Os limites de 0,45 s e 1,6 s vêm da [skill AutoMontage-Agent](https://github.com/mcdenil-skills/AutoMontage-Agent) (`docs/STEP-04-captions.md`), que monta Reels com Remotion e agrupa por pausa, duração e número de palavras. O fim de frase é acréscimo nosso: a legenda mostra o texto do roteiro, que tem pontuação, então a regra vale também nos vídeos sem transcrição, onde o tempo das palavras é estimado.

Nas 633 batidas dos projetos de hoje, 343 têm mais de 4 palavras (as únicas que chegam a ter mais de um bloco); dessas, 34 têm fim de frase no meio e 68 têm uma pausa de 0,45 s ou mais. Ou seja, cerca de um quarto das batidas com vários blocos muda de corte; o resto continua igual.

**Alternativa descartada:** quebrar só na pontuação, sem a pausa. Metade dos casos reais ("Mano, a Robin é muito", com 0,55 s antes de "a") não tem pontuação nenhuma no meio — é a entonação, não a escrita, que separa.
