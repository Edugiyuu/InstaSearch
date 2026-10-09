# 0024 — Imagens do assunto do vídeo

**Status:** Aceita · **Data:** 2026-10-09

## Contexto

Num vídeo sobre a 2ª temporada de *Cyberpunk: Edgerunners* (projeto `short_x5C2IWbMGd`), as imagens vieram de outras obras: Jujutsu Kaisen e Sakamoto Days em "algo mais sangrento e cru", meninas de Uma Musume em "Ele não muda tudo", e a lista de episódios de Miraculous Ladybug em "São dez episódios". O app é para Shorts sobre qualquer tema, não só anime, mas a busca e as IAs nunca sabiam **de que** era o vídeo. Quatro causas:

1. **A busca não leva a obra.** O roteiro escreve o que a cena mostra ("cena violenta com sangue, mangá"), e isso ia assim para o Bing. O título ("Edgerunners 2 muda tudo?") só servia para desempatar nomes no AniList.
2. **Lugar virava personagem.** Sem personagens na cena, `guessNames` pegava as palavras com maiúscula: "Night City" virou "Night" (Danbooru: `fate/stay_night`) e "City" (AniList: Gold City, de Uma Musume). E o Danbooru, sem personagem, buscava só as etiquetas da cena (`cityscape`, `night`), que trazem a cidade de qualquer anime.
3. **"Mangá" em tudo.** O estilo do canal prefere painéis de mangá, então a IA punha ", mangá" em toda busca, e a busca punha os painéis de mangá na frente. Edgerunners é um anime original: não há mangá para achar.
4. **As IAs que escolhem não sabiam o tema.** A da web ouvia "um Short sobre anime e mangá"; a da biblioteca, só o título. Nas cenas sem personagem, qualquer imagem passava ("✓ sangue perfurante", "✓ olho colorido"), e a descrição "lista de episódios da 6ª temporada" combinava com "lista de episódios da temporada".

O roteiro também ilustrava a frase em vez do assunto ("muda o foco" → um olho em close com neon).

O usuário também lembrou que um meme sobre o tema, de vez em quando, engaja. O [ADR 0020](0020-imagens-especificas-memes-e-zoom.md) já tem memes, mas só "do personagem ou daquele momento", então as cenas sem personagem nunca ganhavam um.

## Decisão

**O vídeo tem um assunto, e ele guia a busca e a escolha.**

- **`subject` no projeto.** O roteiro devolve a obra, pessoa, jogo, time ou marca, com o nome que se busca na internet ("Cyberpunk: Edgerunners"), ou vazio quando o vídeo não é sobre nada específico.
- **A busca leva o assunto** quando o texto da cena não o cita ("Night City visto de cima" → "… Cyberpunk: Edgerunners"). Meme e fanart não levam: o meme de reação ("this is fine meme") não é da obra, e o meme da obra já a cita.
- **Nada de adivinhar nome quando a IA já disse que a cena não tem ninguém.** Lista de personagens vazia = nenhum personagem; adivinhar pelas maiúsculas só vale para o texto digitado à mão na tela de troca. O Danbooru só busca quando há personagem.
- **"Mangá" vem do texto da cena, não do estilo.** O roteiro só escreve "mangá" quando a obra tem mangá; jogo, filme, série ou pessoa real pedem cena, print ou foto.
- **As duas IAs que escolhem (web e biblioteca) recebem o assunto**, com a regra: imagem de outra obra ou pessoa é pior que nenhuma, mesmo que mostre a coisa pedida. A exceção é o meme de reação. A catalogação passa a escrever na descrição de que obra é a imagem.
- **O roteiro pede imagens que existem no assunto** (personagem, lugar, cena, pôster, logo), e não uma imagem genérica que ilustra a frase.
- **Memes sobre o tema:** o "twist" pode ser o meme do personagem, da obra ou daquele momento, ou um meme famoso de reação que combina com a fala. A variação (chibi, versão mulher) só entra em cenas que mostram o personagem.
- **Os prompts deixam de dizer "anime e mangá"**: o app é para Shorts sobre qualquer tema.

Projetos antigos não têm `subject`: as IAs usam o tema no lugar, e a busca não acrescenta nada.

## Alternativas consideradas

- **Só pedir no prompt que cada busca cite a obra:** não muda o código, mas depende da IA lembrar em todas as 20 cenas, e as IAs que escolhem continuariam sem saber o tema.
- **Usar o título ou o tema como assunto:** já existem, mas "Edgerunners 2 muda tudo? Entenda o novo anime da Netflix!" numa busca do Bing atrapalha mais do que ajuda, e o título nem sempre cita a obra.
- **Tirar o AniList e o Danbooru:** eles acham a arte certa quando a cena tem personagem (`lucy_(cyberpunk)`), então ficam; o problema era só chamá-los sem personagem.

## Consequências

- **Ganhamos:** as sugestões são da obra do vídeo (no teste, "Night City visto de cima" passou a trazer só Cyberpunk, sem Uma Musume nem Fate); a IA recusa imagem de outra série em vez de aceitar porque "combina"; temas fora de anime não ganham painel de mangá.
- **Perdemos / custa:** mais cenas podem ficar sem imagem, porque a regra é mais dura (melhor faltar que errar, como no 0020); projetos antigos só melhoram em parte, até ganharem o `subject`.
- **Revisar quando:** um vídeo sobre duas obras (uma comparação, um crossover) precisar das duas; aí `subject` vira uma lista.

**Como ficou no código:** `subject` em `ShortProject` (`types.ts`) e no `generateScript`; `subjectOf` em `projects.ts`, repassado a `matchBeats`/`pickImagesWithAI`, `pickWebImagesWithAI` e `adjustBeats`; em `imageSearch.ts`, `mentions` (a busca já cita a obra?), `characters` vazio sem `guessNames`, o `mangaFirst` só pelo texto e o Danbooru só com personagem; o parâmetro `characters` da busca da tela de troca (ausente = adivinhar, vazio = ninguém).
