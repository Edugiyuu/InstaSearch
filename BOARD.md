# Board

O que está sendo feito, o que vem depois e o que já foi entregue. Como funciona no [ADR 0014](docs/decisions/0014-board-em-arquivo-e-commit-por-tarefa.md); a visão de longo prazo fica no [CONTRIBUTING.md](CONTRIBUTING.md#estado-atual-e-próximos-passos).

**Regras:** no máximo **1 tarefa em "Fazendo"**. Ideia nova no meio do trabalho vai para o Backlog. Cada tarefa termina num commit próprio, que também atualiza este arquivo. A ordem das listas é a prioridade: a primeira de "A fazer" é a próxima.

## Fazendo



## A fazer

- [ ] Clipes do YouTube nos momentos marcantes: o roteiro marca 1 ou 2 cenas, a montagem busca, baixa e escolhe o trecho com visão (ADR 0029)
- [ ] Corrigir os 18 erros antigos do `tsc` no backend: variáveis não usadas e funções sem `return` em todos os caminhos (hoje o `npm run build` do backend falha)
- [ ] Adicionar `.gitattributes` para padronizar as quebras de linha (LF/CRLF)
- [ ] Remover a dependência `openai`, que não é usada (pendência do [ADR 0006](docs/decisions/0006-remover-openai.md))
- [ ] Efeitos da cena na frente, etapa 2: ajustes finos (intensidade e velocidade do movimento, força e duração da transição, cor e "quando entra" do destaque, quanto o zoom aproxima e desenhar a área) ([ADR 0037](docs/decisions/0037-efeitos-da-cena-na-frente-e-chat-secundario.md))

## Backlog

- [ ] O `debate.test.ts` não roda: o Jest não carrega o `nanoid` (só ESM) que o `debate.ts` importa ("Must use import to load ES Module"); mapear o `nanoid` no Jest ou isolar as funções puras do debate

- [ ] Ligar a tier list (`TIER_LIST_ON` em `formats.ts`) e, se quiser testar sem depender do debate, um jeito de começar uma série na tela Ideias (ADR 0036)
- [ ] A personagem é achada por palavra, e "Todo" (Aoi Todo, de JJK) bate com "todo mundo" no tema de outros vídeos: hoje o vídeo da Makima conta como "o vídeo mais recente do Todo", e ele descansa sem motivo (talvez só nomes com maiúscula no tema, ou só no título; ADR 0028 e 0033)
- [ ] Mostrar o gasto real de tokens: o log do Claude Code conta só a entrada fora do cache ("4 tokens de entrada"); somar o cache (lido e criado) e mostrar o total por debate e por vídeo, para saber quanto cada etapa gasta do plano
- [ ] "↻ Buscar de novo na web" troca todas as imagens sem desfazer (a montagem não entra no `undo` do projeto) e não pede confirmação; num projeto com todas as cenas travadas, não faz nada e não avisa
- [ ] Uns 12 projetos antigos têm todas as imagens travadas pelo "Preencher automático" de antes do [ADR 0022](docs/decisions/0022-imagens-da-web-e-controles-da-cena.md), e não dá para separar das que o usuário escolheu
- [ ] Personagem pelo apelido acha o errado no AniList: "Mob" vira "Mob no Haha" (a mãe dele), porque o nome procurado bate palavra por palavra; aí o Danbooru não traz nenhuma fanart do Mob (o nome completo, "Shigeo Kageyama", funciona)
- [ ] O `npx tsc --noEmit -p backend` (e `-p frontend`) da Definição de Pronto não roda da raiz: o TypeScript está só em `backend/` e `frontend/`, e o `npx` sai sem checar nada; trocar no CLAUDE.md por `npm --prefix backend exec tsc -- --noEmit` (ou parecido)
- [ ] Decidir se a aba Vídeos (episódios divididos em cenas) sai também: sem a escolha na biblioteca, a montagem não usa mais as cenas sozinha; hoje elas só aparecem na tela Trocar imagem, e não há nenhum vídeo enviado
- [ ] Figurinha automática combina pouco: escolhe só pelas etiquetas da reação, sem olhar a obra do vídeo (num vídeo da Tatsumaki, "chocado" pegou "guria sorrindo", e 6 de 8 reações ficaram sem figurinha); talvez preferir as do assunto, como o pop-up já faz
- [ ] 5 imagens da biblioteca sem largura e altura (o `imageSize` com ffprobe falhou nelas; uma é um JPEG salvo como `.webp`): sem a medida, o enquadramento e a moldura usam o plano B
- [ ] Configurar o ESLint no frontend: não há arquivo de configuração, então o `npm run lint` falha antes de analisar qualquer arquivo
- [ ] Configurar o Jest no frontend (timeline do vídeo e `video/align.ts`)
- [ ] IA: desistir do Gemini mais cedo quando a rede falha (hoje espera ~60 s antes de passar para o Claude; alternativa 1B do [ADR 0017](docs/decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md))
- [ ] Migrar `@google/generative-ai` → `@google/genai`
- [ ] Remover os logs que imprimem `INSTAGRAM_CLIENT_ID`
- [ ] Criptografar os tokens em `data/instagram_accounts/`
- [ ] Apagar o vídeo do Cloudinary depois de publicar
- [ ] Validar os ids que vêm da URL antes de virarem nome de arquivo em todas as rotas (hoje `/shorts/projects/..%2F…` chega ao `FileStorage`; as ideias já validam)
- [ ] Instagram: ler a expiração real do token (`/debug_token`) em vez de estimar 60 dias
- [ ] Instagram: trocar sozinho para um token de Página, que não expira
- [ ] Instagram: unificar o OAuth (Instagram Login × Facebook Login) ou remover o fluxo quebrado
- [ ] Unificar a publicação das telas antigas (`videoController`) com a do `instagramGraphService.publishReel`
- [ ] Agendar o `cleanupOldFiles()` sem apagar vídeos de posts pendentes
- [ ] Decidir o destino de `backend/data/virtual_characters/` (sobra de uma funcionalidade abandonada)
- [ ] Remover as "Ferramentas antigas" (telas, controllers e hooks da primeira versão) ou decidir quais ficam

## Feito

- [x] 2026-10-19 · Brainstorm do debate sabe quais formatos estão bloqueados (só 2 de 12 ideias passaram: quase todas eram "opinião com provas", o formato de um dos 2 últimos vídeos) (ADR 0036)
- [x] 2026-10-18 · Efeitos da cena na frente, etapa 1: na Revisão, movimento (com "parado"), entrada (a transição de cada corte: corte seco, flash branco ou preto, tremida, zoom rápido), zoom em (as áreas marcadas na imagem) e destaque ficam com as opções à vista, com prévia no player ao passar o mouse e "usar em todas as cenas"; imagem, fundo, som e figurinha em pop-up; o chat só troca uma escolha se o pedido cita a cena e fala do efeito, e fica numa barra que abre como gaveta ([ADR 0037](docs/decisions/0037-efeitos-da-cena-na-frente-e-chat-secundario.md) e adendo)
- [x] 2026-10-17 · Formatos de vídeo: opinião, X contra Y, E se…, mito ou verdade e antes e depois, cada um com a sua estrutura no roteiro e na revisão; o código não repete o formato dos 2 últimos vídeos. A tier list em série (quadro com S a D, um personagem por vídeo, animação na palavra "aqui", fileira na Revisão e no chat) ficou pronta, mas desligada por enquanto ([ADR 0036](docs/decisions/0036-formatos-de-video-e-tier-list.md))
- [x] 2026-10-17 · Revisão do roteiro com até 3 reescritas (até 4 versões): a última crítica da Estrategista vira uma versão nova, em vez de só aparecer na Revisão ([adendo ao ADR 0034](docs/decisions/0034-revisao-do-roteiro-pelas-ias.md))
- [x] 2026-10-16 · Temas sem a fórmula "X é mais que visual": o brainstorm proíbe o ângulo e pede outros jeitos de fanservice com opinião (ranking, comparação, ship, melhor e pior design), e o debate recusa ângulo repetido (adendo ao [ADR 0028](docs/decisions/0028-variedade-nos-temas-do-debate.md))
- [x] 2026-10-16 · Buscas de imagem que dá para achar: fala abstrata ("é a número 1", "humana até no erro") pede o personagem em fanart, cosplay ou cena marcante, e não uma situação que quase não existe em imagem ("ranking com a Fubuki em primeiro"); fanart e cosplay levam o nome da obra na busca (adendo ao [ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-15 · Revisão do roteiro pelas IAs: depois do acordo (e no "Criar sozinho"), a Roteirista escreve com o gancho e o porquê combinados e a Estrategista revisa coesão, sentido, estrutura, o tema e os fatos (até 4 buscas), com até 2 reescritas; o código confere a aprovação e a contagem de palavras; sem aprovação, o vídeo segue e os pontos aparecem em "📝 Revisão do roteiro"; o "Por que este tema" ficou com 1 ou 2 frases ([ADR 0034](docs/decisions/0034-revisao-do-roteiro-pelas-ias.md))
- [x] 2026-10-15 · Volta de personagens que deram views no debate: uma vaga (🔁 volta) para uma personagem de vídeo acima da mediana, com assunto novo, livre da janela de 3 vídeos e da regra da obra; não pode ser a do último vídeo e descansa se o vídeo mais recente dela ficou abaixo da mediana; qualquer personagem descansa com 3 dos últimos 8 vídeos ([ADR 0033](docs/decisions/0033-volta-de-personagens-que-deram-views.md))
- [x] 2026-10-14 · Bordões personalizáveis: texto depois do clique e modelos (YouTube, Instagram, TikTok, Canal), áudio no "se inscreve", música do vídeo por baixo, animação de entrada e de clique, duração, texto do montado (animação e posição) e liga/desliga de foto, nome, frase e botão (ADR 0032)
- [x] 2026-10-14 · Apagar um projeto limpa a tela Ideias: a ideia dele sai de "Viraram vídeo" e vira descartada ("o vídeo foi apagado"), para a IA não sugerir o mesmo tema; o debate perde o "Abrir o vídeo" e a fila do "Criar sozinho" esquece o job. Ao subir, o servidor confere as que ficaram de antes (eram 14)
- [x] 2026-10-14 · Tons só com "Editar": os 4 que vêm com o app viram arquivos em `data/tones/` (mesmos ids) e são editados no lugar, sem cópia; continuam sem poder ser apagados ([ADR 0031](docs/decisions/0031-tons-editados-no-lugar.md))
- [x] 2026-10-14 · Temas com "tchan" no debate: opinião forte e polêmica, pelo menos metade com fanservice (de preferência personagens mulheres, só adultas), nada com cara de notícia; e o "🔥 em alta" vale para o tema, não para a obra (adendo ao [ADR 0028](docs/decisions/0028-variedade-nos-temas-do-debate.md))
- [x] 2026-10-13 · Debate em rodadas: se as duas recusam os 4 temas (ou as 6 falas acabam sem acordo), vêm 4 novos, até 3 rodadas; depois do acordo, 5 s para você vetar o tema (elas seguem debatendo os outros) e "■ Parar debate" ([ADR 0030](docs/decisions/0030-debate-em-rodadas-com-veto.md))
- [x] 2026-10-13 · Mais fanart nas imagens: a IA de visão vê 6 sugestões por cena (3 da web e 3 fanarts do Danbooru) e prefere arte bem desenhada e chamativa (e ousada, com "Imagens sugestivas" ligada) ; a tela Trocar imagem alterna web e fanart (adendo ao [ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-13 · Opção "Imagens sugestivas" em Configurações (desligada por padrão: Bing rígido e Danbooru só "geral"; ligada: Bing moderado e Danbooru "sensível"), no lugar do `BING_SAFESEARCH` do `.env`
- [x] 2026-10-13 · Danbooru traz imagens "gerais" e "sensíveis" (só "gerais" com `BING_SAFESEARCH=strict`; questionável e explícito nunca), e a documentação diz que o Bing não aceita `off` pela internet (fica no moderado)
- [x] 2026-10-13 · Busca segura do Bing em "moderada" (era `strict`, que cortava até imagens sugestivas), configurável por `BING_SAFESEARCH` no `.env` (off | moderate | strict); o Danbooru continua só "geral"
- [x] 2026-10-13 · Imagens só da web: a montagem e o chat buscam na web (sem `matchBeats`, a escolha por palavras e o ajuste "Quem escolhe as imagens"), "↻ Buscar de novo na web" na Revisão, sem a aba Imagens; a catalogação ficou porque marca o zoom ([ADR 0022](docs/decisions/0022-imagens-da-web-e-controles-da-cena.md), 1B)
- [x] 2026-10-13 · Variedade nos temas do debate: o código tira as ideias que repetem a personagem dos 3 últimos vídeos ou uma obra com 2 dos 4 últimos, 4 temas de obras diferentes em ordem sorteada, marcas 🔥 em alta / 🕰️ atemporal e uma 🎲 aposta do nicho, e as IAs pesam a variedade ([ADR 0028](docs/decisions/0028-variedade-nos-temas-do-debate.md))
- [x] 2026-10-11 · Debate das IAs: "🗣️ Debater e criar um vídeo" faz duas Sonnet 5.5 (Estrategista × Roteirista) debaterem 4 temas de um brainstorm delas num chat ao vivo, até 6 falas, com o acordo conferido pelos votos; com acordo, criam o vídeo e o projeto mostra "Por que este tema" ([ADR 0027](docs/decisions/0027-debate-das-ias-antes-de-criar.md))
- [x] 2026-10-10 · Criar sozinho: "🤖 Criar sozinho" na ideia e "🤖 Criar um vídeo sozinho" no alto da tela Ideias (brainstorm próprio de uma ideia, nas obras do canal, sem repetir assunto), fila de um por vez com a etapa na tela, roteiro → montagem → imagens, parando em "falta gravar a voz", com "Continuar" se parar ([ADR 0026](docs/decisions/0026-criacao-autonoma-de-videos.md))
- [x] 2026-10-10 · ADR da criação autônoma: sem voz sintética (a voz é a única parte à mão), só por botão, ideias guardadas ou do brainstorm, imagens preenchidas e parada na Revisão ([ADR 0026](docs/decisions/0026-criacao-autonoma-de-videos.md))
- [x] 2026-10-10 · Figurinhas: pop-up "😮 Figurinha" na cena (Automático, Nenhuma ou uma da biblioteca, com miniaturas; aparece mesmo sem reação e o chat respeita) e ajuste "Figurinhas: Nenhuma / Poucas / Muitas" do vídeo ([ADR 0022](docs/decisions/0022-imagens-da-web-e-controles-da-cena.md), 2C)
- [x] 2026-10-10 · Volume dos efeitos sonoros no pop-up do som: "Todos os efeitos" (o vídeo, 75% de início) e "Esta cena" (0 a 200%, multiplica o do vídeo; volta a 100% quando o som da cena muda)
- [x] 2026-10-09 · Variações (chibi, versão mulher, outro traço) mais frequentes no roteiro: cerca de 1 cena a cada 3, e a variação é o tipo mais comum (adendo ao [ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-09 · Imagens do assunto certo: a obra do vídeo (`subject`) vai na busca e nas duas IAs que escolhem (web e biblioteca), lugar não vira mais personagem, "mangá" só quando a obra tem mangá, memes sobre o tema e prompts para qualquer tema, não só anime ([ADR 0024](docs/decisions/0024-imagens-do-assunto-do-video.md))
- [x] 2026-10-09 · Fundo da cena: pop-up com 5 opções (Automático, Tela cheia, Inteira, Moldura no quadriculado, Moldura sobre a imagem), com miniaturas feitas com a imagem da cena ([ADR 0022](docs/decisions/0022-imagens-da-web-e-controles-da-cena.md), 4A)
- [x] 2026-10-09 · Documentação enxuta: README de visão geral, guias em `docs/` (uso, instalação, arquitetura), CONTRIBUTING e 15 diagramas em SVG; saem 14 docs antigos e os scripts de teste manual ([ADR 0023](docs/decisions/0023-documentacao-enxuta-com-diagramas.md))
- [x] 2026-10-08 · Revisão: controles da cena (trocar imagem, enquadramento, som) numa linha sob a faixa de cenas, com menus, sem rolar ([ADR 0022](docs/decisions/0022-imagens-da-web-e-controles-da-cena.md))
- [x] 2026-10-08 · Token do Instagram fora do código: `add-token.js` lê do argumento ou do `.env`, e o token antigo foi invalidado na Meta
- [x] 2026-10-08 · Editor de tom: campos não encolhem mais quando o modal passa da altura da tela
- [x] 2026-10-07 · Tela Ideias: brainstorm a partir das métricas, dos comentários e da web, com as provas de cada ideia, ajuste por pedido, banco em `data/ideas/` e "Criar vídeo" ([ADR 0021](docs/decisions/0021-ideias-a-partir-do-desempenho.md))
- [x] 2026-10-07 · Métricas dos vídeos publicados na tela Ideias: `views` no Instagram, retenção no YouTube, Graph API v23.0, fotos com 1, 7 e 28 dias e comparação com a mediana ([ADR 0021](docs/decisions/0021-ideias-a-partir-do-desempenho.md))
- [x] 2026-10-07 · ADR das ideias a partir do desempenho no Instagram e no YouTube ([ADR 0021](docs/decisions/0021-ideias-a-partir-do-desempenho.md))
- [x] 2026-10-07 · Enquadramento por cena na revisão: automático, tela cheia ou inteira (adendo ao [ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-07 · Imagens específicas (a IA olha antes de escolher), memes e zoom na medida ([ADR 0020](docs/decisions/0020-imagens-especificas-memes-e-zoom.md))
- [x] 2026-10-06 · Roteiro com argumento (até 4 buscas, mostradas na tela) e tons próprios na biblioteca ([ADR 0019](docs/decisions/0019-roteiro-com-argumento-e-tons-proprios.md))
- [x] 2026-10-06 · Legenda e cortes no tempo da voz, com o Whisper local ([ADR 0018](docs/decisions/0018-legenda-sincronizada-com-a-voz.md))
- [x] 2026-10-06 · Troca de imagem sem esperar a catalogação e chat que acerta a cena ([ADR 0017](docs/decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md))
- [x] 2026-10-06 · Jest no backend, com os primeiros testes ([ADR 0015](docs/decisions/0015-framework-de-testes.md))
- [x] 2026-10-06 · Bordões de abertura e de final na biblioteca, escolhidos na edição ([ADR 0016](docs/decisions/0016-bordoes-de-abertura-e-final.md))
- [x] 2026-10-05 · Workflow: board em arquivo e commit por tarefa (ADR 0014)
- [x] 2026-10-05 · ADRs em `docs/decisions/` e `CLAUDE.md`
- [x] 2026-10-05 · Render MP4, publicação no YouTube/Instagram e busca de imagens
