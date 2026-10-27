# 0038 — Redesign do frontend: linha de produção

**Status:** Aceita · **Data:** 2026-10-25 · Substitui em parte o [0037](0037-efeitos-da-cena-na-frente-e-chat-secundario.md) (onde ficam o chat e os avisos na Revisão)

## Contexto

O usuário pediu o frontend inteiro refeito, "mais clean e mais interativo, mais fácil de usar na hora de criar vídeos, sem muita informação desnecessária", sem tirar nenhuma feature, e primeiro no Figma, em 3 versões.

Hoje o app tem 12 telas e um menu lateral com 8 itens (Início, Projetos, Ideias, Biblioteca, Estilos, Calendário, Configurações e as ferramentas antigas). Para saber o que fazer com um vídeo, o usuário abre Projetos, acha o vídeo, lê a etapa e decide o passo. Criar passa por duas telas (Início e Novo vídeo). A Revisão mostra tudo de uma vez: cenas, 4 linhas de efeitos, ajustes do vídeo inteiro e o chat.

As 3 versões ficaram no Figma, na página "Redesign · 3 versões". As versões A e B foram apagadas depois da escolha; a C ficou, com um mapa (C0) de onde fica cada feature de hoje.

## Decisão

**Versão C, "linha de produção":** o app é organizado pelas etapas de um vídeo, e cada vídeo mostra o botão do próximo passo.

1. **Trilho de ícones** de 76px no lugar do menu lateral: **+** (novo vídeo), Painel, Ideias, Agenda, Números, Biblioteca; embaixo, Configurações e a conta. Estilos sai do menu e entra na Biblioteca.
2. **Painel** (`/`): um quadro com as colunas Ideias → Roteiro → Falta voz → Revisar → Agendado → Publicado. A coluna vem da etapa do próprio vídeo (não se arrasta cartão), e cada cartão tem um botão do próximo passo ("Subir voz", "Resolver", "Publicar"). Substitui o Início e os Projetos.
3. **Novo vídeo como paleta** (Ctrl K): o tema, o estilo, a duração e o tom numa caixa só, as ideias para usar, "Escrever o roteiro" (Enter) e "Fazer tudo sozinho" (Shift Enter, o [0026](0026-criacao-autonoma-de-videos.md)).
4. **Roteiro em modo foco:** o texto como um documento, as ações da cena no cursor e a voz numa barra fixa embaixo.
5. **Revisão como checklist "Antes de publicar":** Imagens, Voz, Efeitos, Som e música, Legenda. Cada item abre o conserto num painel à direita (a troca de imagem, os efeitos da cena com ✨ Auto). "Publicar" acende quando tudo fica verde.
6. **Publicar** com os horários sugeridos como botões (Agora, Hoje 19:00, outro dia).
7. **Ideias** em cartões com o **debate ao lado**, e **Números** (o desempenho) em tela própria, com cada vídeo numa barra contra a mediana.
8. **Biblioteca como porta de entrada:** 7 cartões (Estilos, Tons, Figurinhas, Efeitos sonoros, Músicas, Bordões, Episódios), cada um abrindo a tela de hoje daquela coleção.

O que muda no 0037: a lista do que falta volta (agora como checklist, e não como a coluna "Precisa de você"), e o chat sai da barra embaixo para o pé da coluna do checklist, abrindo a mesma gaveta. O resto do 0037 continua: os efeitos da cena à vista, com ✨ Auto primeiro, hover que toca no player e "usar em todas as cenas". O [0011](0011-editor-automatico.md) também continua: a IA monta, sem linha do tempo nem trilhas, sem dados de mentira.

A implementação vai em **uma tarefa por tela**, cada uma com seu commit, nesta ordem: (1) trilho de ícones e Biblioteca como porta de entrada; (2) Painel; (3) paleta de novo vídeo; (4) roteiro em modo foco; (5) Revisão em checklist; (6) Publicar; (7) Ideias com o debate ao lado; (8) Números. Até a tarefa de cada tela, a tela de hoje continua no ar.

## Alternativas consideradas

- **A · Guiada:** uma decisão por vez, os padrões já escolhidos e o avançado recolhido em pílulas e gavetas, com menu de 4 itens. A mais simples para quem chega, mas mantém a navegação por páginas: para saber o que falta em cada vídeo, ainda é preciso abrir cada um.
- **B · Estúdio:** menu no topo e cada vídeo num estúdio só, com abas Roteiro, Vídeo e Publicar, e a montagem acontecendo dentro dele. Junta roteiro, imagem e efeitos no mesmo cartão, mas é a maior mudança de código (Roteiro, Montagem, Revisão e Trocar imagem viram uma tela) e não ajuda a cuidar de vários vídeos ao mesmo tempo.
- **Manter as telas e só limpar:** menos texto e menos bordas. Barato, mas não resolve o "o que eu faço agora com cada vídeo", que é o que mais custa no dia a dia.

## Consequências

- **Ganhamos:** a home responde "o que falta em cada vídeo" e já tem o botão; criar fica numa caixa só; a Revisão diz o que impede publicar; o menu cai de 8 itens para 5.
- **Perdemos / custa:** 8 tarefas de frontend. O Painel lê a etapa de cada vídeo de dados que hoje ficam espalhados (projeto, posts agendados, métricas), e um vídeo sem etapa clara cai na coluna errada. Quem estava acostumado com o menu lateral com nomes perde os rótulos grandes (o trilho tem rótulos pequenos). Estilos fica a um clique a mais.
- **Revisar quando:** se o Painel ficar cheio demais (muitos publicados empurrando o resto), ou se o checklist esconder um ajuste que o usuário usava sempre.

## Adendo (2026-10-25)

O Painel ficou **sem a coluna Ideias**, a pedido do usuário, para sobrar espaço para os vídeos: as 5 colunas são Roteiro → Falta voz → Revisar → Agendado → Publicado. As ideias continuam a um clique, no item Ideias do trilho e nos atalhos da paleta de novo vídeo.

## Adendo: o Painel foi desfeito (2026-10-25)

Depois de usar, o usuário achou que o Painel "ficou ruim" e pediu para desfazer só ele. O **Início** e os **Projetos** voltam como eram antes da etapa 2, e o trilho ganha os dois itens (Início e Projetos) no lugar do Painel. O resto do redesign continua: o trilho, a Biblioteca como porta de entrada, a paleta (o "Começar →" do Início abre a paleta já preenchida), o roteiro em modo foco e a Revisão em checklist. O ponto 2 da decisão (o Painel) e o adendo anterior (a coluna Ideias) deixam de valer.

## Adendo: o palco do debate (2026-10-26)

Na etapa 7, o debate ficou numa coluna fixa de 400px ao lado das ideias, e o usuário achou o chat "minúsculo": a conversa, os temas e a revisão do roteiro dividiam pouco espaço, com uma rolagem dentro da outra. O debate passa a abrir num **palco em tela cheia**: o placar (os temas, com o voto de cada IA) à esquerda, a conversa grande no centro (com o veto, o resultado e a revisão embaixo) e os bastidores (a fila dos vídeos e o "como funciona") à direita. Na tela Ideias fica um cartão com o status do último debate, um ponto "ao vivo" e os botões para abrir o palco ou começar um debate; as ideias ganham a largura toda. As regras do debate (ADR 0027, 0030 e 0034) não mudam.
