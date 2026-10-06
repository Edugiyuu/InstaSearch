# 0016 — Bordões de abertura e de final na biblioteca

**Status:** Aceita · **Data:** 2026-10-05

## Contexto

Os vídeos do canal têm uma marca registrada no começo: alguém dançando e a voz dizendo "se ligaa…". Hoje isso é feito à mão, fora do app. O que existe é um **final fixo** ("Seu canal", em Configurações: foto, nome, uma frase e o botão "INSCREVA-SE"), que se liga e desliga por vídeo em Revisão → Ajustes rápidos. Não há abertura, só cabe um final e ele não pode ser um clipe com som.

## Decisão

Criar **bordões** como um item novo da biblioteca, numa aba própria ("Bordões"), e escolher na edição (Revisão → Ajustes rápidos) qual bordão abre e qual fecha cada vídeo.

Um bordão pode ser de três tipos:

- **Clipe pronto:** um vídeo curto enviado com o som embutido (a dança com o "se ligaa"). O app só encaixa.
- **Montado:** uma imagem ou cena de vídeo da biblioteca, um áudio enviado (a sua fala) e um texto opcional na tela. A duração é a do áudio.
- **Se inscreve:** o final que hoje está em "Seu canal" (foto, nome, frase e botão), com 2,5 s. A seção sai de Configurações e os dados atuais viram o primeiro bordão desse tipo.

Regras:

- **Abertura entra antes da narração.** O bordão toca inteiro, com o som dele; a narração, as cenas e a música começam depois. O vídeo fica mais longo pela duração do bordão.
- **O final entra depois da última cena,** como o final atual.
- **Padrão + troca:** na biblioteca, um bordão é marcado como padrão de abertura e outro como padrão de final; vídeos novos já vêm com eles. Na edição, cada um vira uma lista com "Nenhum" e os bordões da biblioteca.
- **Dados:** os bordões ficam em `data/bordoes/` (JSON + arquivos, como o resto do app, ver [0002](0002-armazenamento-em-json.md)). O projeto troca `settings.outro: boolean` por `settings.intro` e `settings.outro` com o id do bordão (ou `null`). Projetos antigos com `outro: true` passam a apontar para o bordão "Se inscreve" migrado.
- A prévia e o render usam a mesma composição ([0009](0009-remotion-para-composicao.md), [0012](0012-render-em-processo-separado.md)): o bordão é mais uma `<Sequence>`, sem preview falso.

## Alternativas consideradas

- **Só clipe pronto:** o mais simples, mas obriga a editar fora do app toda vez que quiser mudar a frase ou a imagem do bordão.
- **Só montado no app:** perde a dança gravada com o som original, que é justamente o bordão atual.
- **Manter "Seu canal" em Configurações e os bordões à parte:** dois lugares para a mesma ideia (o que aparece no começo/fim do vídeo) e dois controles de final na edição.
- **Abertura por cima da narração:** o vídeo não fica mais longo, mas o som do bordão brigaria com a voz, e o "se ligaa" perderia o sentido.
- **A IA escolhe o bordão:** o bordão é marca do canal, quase sempre o mesmo; um padrão fixo resolve sem gastar chamada de IA. Pode voltar se houver bordões por tema.

## Consequências

- **Ganhamos:** a abertura sai pronta do app, dá para ter vários bordões e trocar por vídeo, e começo e fim ficam num lugar só.
- **Custa:** migração dos dados de "Seu canal" e do `settings.outro` dos projetos; a timeline passa a ter um deslocamento no começo (narração, cenas e música começam depois da abertura); o tempo do bordão conta nos limites de duração do Short.
- **Fica para depois:** gravar o áudio do bordão pelo navegador (por enquanto é envio de arquivo) e mais de um bordão por ponta.
- **Revisar quando:** o usuário quiser bordões no meio do vídeo ou que a IA varie o bordão pelo tema; aí isso deixa de ser "abertura/final" e vira outra decisão.
