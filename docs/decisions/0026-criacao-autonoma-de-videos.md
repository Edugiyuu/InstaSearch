# 0026 — Criação autônoma de vídeos, sem publicar

**Status:** Aceita · **Data:** 2026-10-10 · Responde ao "próximo passo" do [0021](0021-ideias-a-partir-do-desempenho.md) e complementa o [0011](0011-editor-automatico.md)

## Contexto

Hoje, cada vídeo passa por cinco paradas em que o usuário precisa estar presente:

1. escolhe a ideia (tela Ideias, [0021](0021-ideias-a-partir-do-desempenho.md)) e clica em "Criar vídeo";
2. espera o roteiro (`createProject` → `generateScript`, com pesquisa) e o aprova;
3. **grava a voz** e sobe o áudio, e o Whisper sincroniza a legenda ([0018](0018-legenda-sincronizada-com-a-voz.md));
4. espera a montagem e, nas cenas sem imagem, clica em "Preencher automaticamente" (web + visão, [0020](0020-imagens-especificas-memes-e-zoom.md));
5. revisa e publica.

As peças para fazer isso sozinho já existem: o brainstorm e o banco de ideias, a escrita do roteiro, a montagem e o preenchimento de imagens com visão. O 0021 apontou a voz como a maior decisão. O cartão "Voz" em Configurações (ElevenLabs, Piper) é um esboço, nunca foi ligado.

O usuário pediu que este seja o próximo passo: a IA cria os vídeos sozinha.

**O que não muda:** o app **nunca publica sozinho**, pelo [0011](0011-editor-automatico.md) ("nada é publicado sem revisão") e pelo 0021.

## Decisão

O usuário escolheu **1A, 2A, 3B, 4A e 5A**. Ele não seguiu a recomendação do Claude na voz (1B), no agendamento (2C) nem na origem das ideias (3A).

Em uma frase: **um botão faz tudo, menos a voz.** O app escolhe a ideia (ou faz um brainstorm), escreve o roteiro, monta, preenche as imagens e deixa o projeto esperando a gravação. A voz é a única parte feita à mão.

### 1. A voz

- **1A (escolhida pelo usuário): sem voz sintética, o vídeo para em "falta gravar a voz".** "Vai ser a única parte que vai ser necessário mão humana, o resto é autônomo." O app monta com o tempo estimado. Quando o usuário sobe a voz, o Whisper ajusta a legenda e os cortes, como hoje. As imagens são por cena e não dependem do tempo, então não é preciso montar de novo.
- 1B (era a recomendação): voz sintética do Gemini, pela chave que já existe. Custa centavos por vídeo e tem cota grátis em *preview*, mas a voz deixaria de ser a do canal.
- 1C: ElevenLabs. É a voz mais natural e clona a do usuário, mas o plano grátis não permite uso comercial, e o pago custa uns US$ 5 a 6 por mês.
- 1D: Piper ou Kokoro, locais e grátis. As vozes em português soam robóticas.

### 2. Quando cria

- **2A (escolhida pelo usuário): só por um botão.** Nada roda sozinho num horário.
- 2B: agendado, N rascunhos por dia.
- 2C (era a recomendação): o botão primeiro, o agendamento depois.

### 3. De quais ideias

- **3B (escolhida pelo usuário): também do brainstorm automático.** Há dois botões:
  - **"🤖 Criar sozinho"** em cada ideia (nova ou guardada): usa aquela;
  - **"🤖 Criar um vídeo sozinho"**, no alto da tela Ideias: o app escolhe a primeira ideia guardada (a mais antiga, como numa fila). Sem guardadas, pega a primeira do último brainstorm. Sem nenhuma, **faz um brainstorm** e pega a primeira.
- 3A (era a recomendação): só as ideias guardadas, para o tema continuar sendo escolha do usuário.

### 4. Imagens que faltam

- **4A (escolhida, era a recomendação): preencher sozinho e avisar.** Depois da montagem, roda o "Preencher automaticamente". As cenas que ainda ficarem sem imagem vão para o "Precisa de você" da Revisão. O vídeo nunca trava esperando.
- 4B: só entregar quando todas as cenas tiverem imagem.

### 5. Até onde vai

- **5A (escolhida, era a recomendação): para na Revisão, sem renderizar.** A prévia do Remotion já é o vídeo final ([0009](0009-remotion-para-composicao.md)), e o MP4 é feito ao publicar, como hoje.
- 5B: renderizar o MP4 também.

### O fluxo

`🤖 → (brainstorm) → ideia → roteiro com pesquisa → montagem → preencher imagens → projeto "falta gravar a voz" → o usuário grava → Whisper → Revisão → publicar`

- Um vídeo por vez, numa fila em memória (como a do Whisper): o roteiro com pesquisa e a visão gastam cota de IA, e duas montagens juntas disputariam o limite.
- A tela Ideias mostra cada vídeo em andamento e a etapa real ("escrevendo o roteiro…", "procurando imagens…"), sem prévia falsa ([0011](0011-editor-automatico.md)). Quando o projeto existe, o cartão leva até ele.
- O projeto guarda `autopilot: { stage, error?, ideaId? }`, o que mostra "🤖 criado sozinho" em Projetos e na Revisão. Se uma etapa falha (cota, rede) ou o servidor reinicia no meio, o projeto fica com o que deu certo e mostra o erro com **"Continuar"**, que segue da etapa onde parou.
- A ideia usada vira "feita" e fica ligada ao projeto, como no "Criar vídeo" manual.

## Adendo (2026-10-10): o botão geral faz o próprio brainstorm

Ao testar, o usuário criou dois vídeos com o botão geral, e os dois eram sobre a Tatsumaki: "Tatsumaki: ousada de verdade" e "O segredo de Tatsumaki". O motivo: a regra da 3B acima pegava a ideia **guardada** mais antiga e, sem ela, a primeira do **último brainstorm do usuário**, que ele tinha feito com o tema "Tatsumaki". O botão só repetia o tema que o usuário escolheu. O que ele queria com a 3B: "é pra ela mesma ter as ideias, usando o brainstorm".

A 3B continua escolhida. Muda como o botão geral escolhe:

- **"🤖 Criar um vídeo sozinho" sempre faz um brainstorm próprio, sem tema** (`brainstormOne` em `ideas.ts`), e pede **uma** ideia só, a melhor: um lote de 6 gastaria mais para usar uma.
- **Nas obras que o canal já fala, com um assunto ainda não feito.** Para "manter o público alvo", nas palavras do usuário. A primeira correção pedia "outra obra" para variar, e a IA escolheu um anime da temporada que o canal nunca tratou ("Firefly Wedding"), que o usuário nem conhecia. Agora o pedido leva três listas:
  - **os títulos dos vídeos feitos à mão**, que dizem as obras do canal. Não uso o campo `subject` ([0024](0024-imagens-do-assunto-do-video.md)) porque os projetos antigos não o têm. Os criados sozinhos ficam fora dessa lista, para um tema escolhido pela IA não virar "obra do canal";
  - **todos os títulos já feitos**, para não repetir o assunto;
  - **os 3 mais recentes**, para variar a obra dentro das do canal, se der. É o que evita cinco vídeos seguidos sobre a Tatsumaki.
- **O lote de ideias novas da tela não muda.** O brainstorm comum troca as ideias novas que o usuário não guardou; o próprio, não. A ideia dele já nasce guardada e vira "feita" quando o vídeo nasce, então aparece em "Viraram vídeo" com as provas.
- **As ideias da tela continuam com o "🤖 Criar sozinho" no cartão.** É assim que o usuário usa uma ideia dele.

O custo: cada clique no botão geral gasta um brainstorm com pesquisa, além do roteiro e da visão. E o canal não cresce para obras novas por este botão: para isso, o caminho é o brainstorm com tema e o "Criar sozinho" do cartão.

## Relação com o 0011

O 0011 rejeitou "totalmente automático, sem revisão". Esta decisão **complementa** o 0011, e não o substitui. A regra "a IA sugere e o usuário aprova" continua. O que muda é onde fica a aprovação:
- **O tema**, na 3B, pode ser escolhido pela IA, quando o usuário usa o botão geral sem ideias guardadas.
- **O roteiro e a montagem** deixam de esperar o usuário. Ele vê o roteiro ao gravar a voz, que é um bom ponto de revisão: se algo estiver errado, ele conserta em "Roteiro e voz" antes de gravar.
- **Publicar** continua sendo só do usuário.

O que a decisão original perde: um roteiro ruim ou um tema fraco custa um projeto inteiro (as chamadas de IA e o tempo de montagem), e não uma tela.

## Alternativas consideradas

As alternativas de cada escolha estão na seção acima, com o motivo de não terem sido escolhidas.

## Consequências

- **Ganhamos:** de cinco paradas por vídeo para duas (gravar a voz e revisar); a voz continua sendo a do canal, então o "seu material primeiro" dos princípios do projeto fica de pé; o caminho é o mesmo da criação manual (`createProject`, `assemble`, `autoFillImages`), e uma melhoria numa etapa vale para os dois.
- **Perdemos / custa:**
  - Não é autonomia total: sem a voz, o vídeo não fica pronto. Com muitos projetos esperando a gravação, eles se acumulam em Projetos.
  - O tempo das cenas é estimado até a voz chegar. O tom e o ritmo da gravação mudam os cortes, e a prévia antes da voz não é o vídeo final.
  - Com a 3B, o app pode escolher um tema fraco. Cada vídeo gasta um brainstorm com pesquisa (quando não há ideias), o roteiro com pesquisa e umas 4 chamadas de visão.
  - A fila é em memória: o que estava esperando na fila se perde se o servidor reiniciar (o que já tinha começado vira "Continuar").
  - Um campo novo no projeto (`autopilot`), um serviço e duas rotas novas.
- **Revisar quando:** os projetos começarem a se acumular esperando voz (aí volta a 1B, a voz sintética, como opção); os temas escolhidos pela IA forem descartados com frequência (aí voltar à 3A); ou o usuário quiser os vídeos sem clicar (aí o agendamento da 2B, com um limite por dia).
