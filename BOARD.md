# Board

O que está sendo feito, o que vem depois e o que já foi entregue. Como funciona no [ADR 0014](docs/decisions/0014-board-em-arquivo-e-commit-por-tarefa.md); a visão de longo prazo fica no [CONTRIBUTING.md](CONTRIBUTING.md#estado-atual-e-próximos-passos).

**Regras:** no máximo **1 tarefa em "Fazendo"**. Ideia nova no meio do trabalho vai para o Backlog. Cada tarefa termina num commit próprio, que também atualiza este arquivo. A ordem das listas é a prioridade: a primeira de "A fazer" é a próxima.

## Fazendo



## A fazer

- [ ] Temas mais apelativos no debate: opinião forte e polêmica, com fanservice (de preferência personagens mulheres), em vez de temas com cara de notícia ("o episódio X dividiu os fãs"); e o "🔥 em alta" só para o que está acontecendo agora (o passado do Gaara, coisa antiga, veio marcado "em alta")
- [ ] Clipes do YouTube nos momentos marcantes: o roteiro marca 1 ou 2 cenas, a montagem busca, baixa e escolhe o trecho com visão (ADR 0029)
- [ ] Corrigir os 18 erros antigos do `tsc` no backend: variáveis não usadas e funções sem `return` em todos os caminhos (hoje o `npm run build` do backend falha)
- [ ] Adicionar `.gitattributes` para padronizar as quebras de linha (LF/CRLF)
- [ ] Remover a dependência `openai`, que não é usada (pendência do [ADR 0006](docs/decisions/0006-remover-openai.md))

## Backlog

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
