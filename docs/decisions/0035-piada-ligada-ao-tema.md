# 0035 — Uma piada ligada ao tema no roteiro

**Status:** Abandonada · **Data:** 2026-10-16 · Muda o pedido do roteiro (`generateScript`) e a revisão do [0034](0034-revisao-do-roteiro-pelas-ias.md)

> **Abandonada (2026-10-16):** o usuário leu os exemplos e não gostou: "não é que eu quero piadas, eu quero só vídeos diferentes". Os memes nas imagens ([0020](0020-imagens-especificas-memes-e-zoom.md)) ficam, porque ele gosta deles. O que ele quer é variedade nos vídeos, que fica para outra decisão.

## Contexto

Os roteiros saem sérios e repetitivos. Dos 15 últimos vídeos, 7 caíam na mesma fórmula ("ela é mais que o visual"), que já foi proibida nos temas (commit `be46d98`). O usuário: "é chato ficar repetindo as mesmas coisas (...) queria alguma piada relacionada ao tema, que faz sentido".

Hoje o roteiro tem humor só por acaso, quando o tom pede. O "twist" do [0020](0020-imagens-especificas-memes-e-zoom.md) põe memes nas **imagens**, não na **fala**.

## Decisão

*Proposta: o usuário escolhe no ponto 1. A recomendada vem primeiro.*

O roteiro ganha **uma piada por vídeo**: uma frase de 2 a 4 segundos, no meio do vídeo (para segurar quem está assistindo), sobre algo que o fã reconhece, dita com ironia, e que ainda ajude a defender a opinião do vídeo. O resto da estrutura (gancho → tese → provas → conclusão) continua igual.

### Os tipos de piada, com exemplos dos temas do canal

**Ironia com um traço conhecido da personagem**
- Tatsumaki: "A esper mais forte do mundo levanta um prédio inteiro, mas não alcança a prateleira de cima."
- Hancock: "Tem o Haki do Rei, derruba um exército só de olhar, e fica vermelha quando alguém fala 'Luffy'."
- Tsunade: "A Hokage mais forte, a melhor médica ninja e a pior apostadora do mundo. Ninguém é perfeito."

**Comparação absurda**
- Mitsuri: "Ela come por oito pessoas. É a única Hashira que dá prejuízo no restaurante e lucro na luta."
- Fubuki: "O Grupo Blizzard é basicamente um fã-clube com crachá."

**Virada no fim da frase**
- Hinata: "Esperou o Naruto por 700 capítulos. Tem gente que não espera nem o ônibus."
- Makima: "Ela controla presidentes, demônios e exércitos. Mas com o Denji bastou um 'bom garoto'."
- Yoruichi: "Passou metade do arco em forma de gato e ainda foi a personagem mais estilosa de Bleach."

**Tirada seca, para o tom sério ou de análise**
- Rangiku: "O Aizen planejou tudo por cem anos, mas esqueceu de planejar a Rangiku."

### O que não vale (a revisora reprova)
- **Genérica:** "isso é muito engraçado kkk".
- **Sem ligação com a obra:** "igual segunda-feira".
- **Fora de hora:** zoar um momento triste, como a morte do Gin no vídeo da Rangiku.
- **Com fato inventado:** a piada também passa pela conferência dos fatos do 0034.

### 1. Quando a piada entra
- **1A (recomendada).** Em todo vídeo, no jeito do tom: ironia ou virada no tom polêmico ou engraçado; tirada seca no sério. Num tema triste, a IA pode pular a piada.
- **1B.** Só quando o tom é polêmico ou engraçado.
- **1C.** Teste: em todo vídeo nos próximos 5, e o usuário decide vendo o resultado.

### 2. A revisão confere
A Estrategista do 0034 passa a conferir se a piada existe (ou se faz sentido não ter), se é ligada à obra e se não é nenhuma das que não valem acima. Uma piada ruim é motivo para reescrever.

## Alternativas consideradas

- **Pedir só "seja mais engraçado":** sem regra de onde e como, a IA espalha piadas genéricas ou não muda nada.
- **Piada nas imagens (mais memes):** já existe (0020) e não resolve a fala repetitiva.
- **Um ajuste na tela ("Piada: sim / não"):** dá controle, mas é mais uma opção; pode vir depois, se a 1A não agradar.

## Consequências

- **Ganhamos:** roteiros menos repetitivos, um momento que segura a retenção no meio e que dá vontade de comentar.
- **Perdemos / custa:**
  - Uma frase da narração vai para a piada, e sobra um pouco menos de espaço para as provas.
  - A IA pode errar o humor; a revisão segura parte disso.
- **Revisar quando:** as piadas ficarem repetitivas entre vídeos (a mesma piada de altura, de comida), ou a retenção cair no meio do vídeo.
