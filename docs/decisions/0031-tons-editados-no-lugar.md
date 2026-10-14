# 0031 — Tons editados no lugar, sem "duplicar e editar"

**Status:** Aceita · **Data:** 2026-10-14 · Substitui, no [0019](0019-roteiro-com-argumento-e-tons-proprios.md) (escolha 3A), o "para mudar um tom embutido, duplica e edita"

## Contexto

No [0019](0019-roteiro-com-argumento-e-tons-proprios.md), os 4 tons que vêm com o app (Polêmico, Curioso, Mistério e Papo reto) ficavam no código e não mudavam. Na aba Tons, o botão deles era "Duplicar e editar": salvar criava uma cópia, como "Polêmico (meu)", e o original continuava lá. O usuário: "em tons eu só quero editar".

Duas saídas foram consideradas:
- **A) uma versão do usuário por cima do original**, com o mesmo id e um botão "Voltar ao original";
- **B) os 4 viram tons comuns**, em `data/tones/`.

## Decisão

**B**, escolhida pelo usuário: "só quero editar, não duplicar".

- **Na primeira vez, os 4 são gravados em `data/tones/`**, com os ids de sempre (`polemico`, `curioso`, `misterio`, `papo-reto`): os projetos e as ideias guardam o tom pelo id, então nada se perde. Depois disso, valem os arquivos; o texto do código só serve para gravar um que estiver faltando (`seed` em `tones.ts`, uma vez por servidor).
- **Editar muda o próprio tom**, sem cópia e sem "(meu)" no nome, em todos os tons. Um id desconhecido vira um tom novo, e não um arquivo com o nome que chegou na requisição.
- **Os 4 continuam sem poder ser apagados.** O app usa o "Curioso" como padrão de um vídeo sem tom e o "Polêmico" nas ideias. O cartão diz "vem com o app, editado por você" depois de uma edição.
- **Os vídeos não mudam:** cada projeto guarda uma cópia da instrução do tom (`toneGuide`), como antes.

## Alternativas consideradas

- **A) uma versão por cima do original:** guarda o texto de fábrica e permite voltar a ele. Custa um botão a mais e dois lugares para o mesmo tom, e o usuário não pediu para voltar.
- **Deixar como estava:** a cópia protege o original, mas obriga o usuário a ter "Polêmico" e "Polêmico (meu)" lado a lado.

## Consequências

- **Ganhamos:** um botão só, "Editar", que faz o que diz, e uma lista sem cópias.
- **Perdemos / custa:** o texto original de um tom editado some (só fica no código, em `BUILT_IN_TONES`, e no git). Uma melhoria futura nesse texto não chega a quem já tem o arquivo.
- **Revisar quando:** o usuário sentir falta de voltar ao texto original (aí, a alternativa A).
