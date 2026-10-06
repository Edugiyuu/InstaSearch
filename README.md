# InstaSearch

**Do tema ao Short, com você no controle.**
Você dá um assunto, por exemplo *"Sukuna nunca teve energia vermelha?"*, e grava a voz (ElevenLabs, microfone...). O app escreve o roteiro e monta o Short no **estilo** que você escolher. No estilo comentário de anime, por exemplo, isso significa uma imagem nova a cada segundo, legendas de 1 a 2 palavras, setas, X vermelho, memes e efeitos sonoros. Também há explicativo, curiosidades, história com gameplay de fundo, ranking e os estilos que você mesmo criar. Depois mostra a **prévia ao vivo**, aplica os seus ajustes e publica.

> Self-hosted · em PT-BR · motor gratuito para uso pessoal · você usa as suas próprias chaves · sem depender de um único fornecedor de IA

---

## Como funciona

```
 Tema + estilo ─► Roteiro (IA) ─► Sua voz ─► Batidas visuais ─► Biblioteca + lista de busca ─► Prévia ao vivo ⟲ ajustes ─► Render ─► Publicar
```

| Etapa | Quem faz |
|---|---|
| Roteiro (editável) e botão "copiar narração" para o ElevenLabs | IA |
| Voz | **Você**: ElevenLabs, microfone ou TTS local opcional |
| Transcrição e divisão em batidas visuais, no ritmo do estilo (ex.: uma troca a cada 0,7 a 1,5s) | App (Whisper local) |
| Escolher imagem, recorte, tipo de cena (tela cheia, "prova", meme, versus), setas, figurinhas de reação e efeitos sonoros | App + IA, usando a **sua biblioteca** |
| Imagens que faltam | **Você** arrasta, a partir da lista do que procurar |
| Prévia e ajustes ("troca a imagem da batida 7", "coloca um X aqui") | Ao vivo no navegador |
| Render e publicação no Instagram / MP4 para Shorts e TikTok | App |

### Estilos

Um estilo é um arquivo de configuração: ritmo dos cortes, tipos de cena, legendas, movimentos, efeitos sonoros e tom do roteiro. Você pode duplicar um estilo e ajustar, ou (no futuro) gerar um a partir de um vídeo de referência. Veja [o catálogo](docs/AUTO_EDIT.md#estilos).

### O gargalo é conseguir as imagens, não editar

Os Shorts têm no máximo 40 segundos, mas os estilos de cortes rápidos usam de 25 a 40 imagens em cada um. Por isso o app tem uma **biblioteca pessoal que cresce com o uso**. Cada imagem é catalogada pela IA (personagem, emoção, onde fica o rosto), reaproveitada em outros vídeos e recortada de vários jeitos (aberto, close, detalhe). Depois de alguns vídeos no mesmo nicho, você só busca as poucas imagens que faltam.

O app **não gera vídeo por IA** (Grok, Sora, Veo): ele **monta e edita** a partir do seu material, com [Remotion](https://www.remotion.dev/) (React). Também há um **modo gravado** para quem aparece na câmera.

Detalhes em [docs/AUTO_EDIT.md](docs/AUTO_EDIT.md) e o propósito completo em [docs/PURPOSE.md](docs/PURPOSE.md).

## O que funciona hoje

| Funcionalidade | Status |
|---|---|
| Conectar conta Instagram Business/Creator (token ou OAuth) | ✅ Funciona |
| Ver perfil, reels e insights da sua conta | ✅ Funciona |
| Upload de 1 a 3 clipes, junção e formatação 1080x1920 com FFmpeg | ✅ Funciona |
| Legenda do post gerada por IA a partir de frames do vídeo (Gemini) | ✅ Funciona |
| Publicação direta de Reels (via Cloudinary + Graph API) | ✅ Funciona |
| Agendamento com publicação automática | ✅ Funciona (o backend precisa estar rodando no horário) |
| **Tema → roteiro (IA) → voz → montagem automática → prévia ao vivo (Remotion Player)** | ✅ Funciona ([guia](docs/USO.md)) |
| A IA escolhe as imagens lendo o roteiro inteiro, ou escolha por palavras | ✅ Funciona |
| "Peça um ajuste" em linguagem natural, com desfazer | ✅ Funciona |
| Biblioteca: imagens e figurinhas catalogadas por IA, efeitos sonoros e músicas (áudio de Reels/TikTok/Shorts por link) | ✅ Funciona |
| Setas, X, círculos, figurinhas, efeitos sonoros, música e legenda completa palavra por palavra | ✅ Funciona (tempo das palavras estimado até a transcrição entrar) |
| Reserva de IA: Gemini → Claude Sonnet 5.5 (API ou Claude Code do plano Pro/Max) | ✅ Funciona ([AI.md](docs/AI.md)) |
| Salvar o vídeo para publicar depois | ✅ Funciona |
| Render do MP4 e publicação direto do projeto | 📋 Próximo passo |
| Gerador de prompts para IA de vídeo | ⚠️ Legado |
| Análise de perfis de referência | 🚧 Interface existe, mas ainda não coleta dados (vai usar a Business Discovery API) |
| Geração de ideias de conteúdo a partir de análises | 🚧 Endpoint ainda é um stub |
| Modo gravado (corte de silêncios e takes) | 📋 Planejado |
| Ciclo de aprendizado (métricas → ideias) | 📋 Planejado |

Status detalhado e próximos passos em [docs/ROADMAP.md](docs/ROADMAP.md).

## Começando

### Pré-requisitos

- Node.js 20+
- FFmpeg instalado e no PATH
- Conta Instagram **Business ou Creator** vinculada a uma Página do Facebook
- App no [Meta for Developers](https://developers.facebook.com/)
- Chave da API do [Google Gemini](https://aistudio.google.com/app/apikey) (há um nível gratuito com limites). Opcional: [Claude Code](https://code.claude.com) logado com um plano Pro/Max, ou uma chave da API da Anthropic, como reserva quando a cota do Gemini acabar
- Opcional: [yt-dlp](https://github.com/yt-dlp/yt-dlp) (`pip install yt-dlp`) para pegar áudio de Reels, TikToks e Shorts
- Conta [Cloudinary](https://cloudinary.com/) (o plano gratuito basta para uso pessoal)

### Instalação

```bash
git clone https://github.com/Edugiyuu/InstaSearch.git
cd InstaSearch

cd backend
npm install
cp .env.example .env   # preencha as chaves

cd ../frontend
npm install
cp .env.example .env
```

### Executando

```bash
# Terminal 1
cd backend && npm run dev     # http://localhost:3000

# Terminal 2
cd frontend && npm run dev    # http://localhost:5173
```

Depois abra **Configurações** no app e conecte sua conta. O guia completo de instalação está em [docs/SETUP.md](docs/SETUP.md) e o de conexão com o Instagram em [docs/INSTAGRAM.md](docs/INSTAGRAM.md).

## Quanto custa

O motor de edição (Remotion, Whisper e FFmpeg locais) é **gratuito para uso pessoal**, e Gemini e Cloudinary têm planos gratuitos. Só custa o que você escolher: por exemplo, o plano do ElevenLabs para a voz ou um gerador de imagens. Veja a tabela completa em [docs/COSTS.md](docs/COSTS.md).

## Stack

- **Backend:** Node.js, Express, TypeScript, armazenamento em arquivos JSON
- **Frontend:** React 18, Vite, TypeScript, CSS puro
- **Vídeo:** FFmpeg (fluent-ffmpeg) hoje; Remotion (composição em React, prévia ao vivo e render) para a edição automática
- **IA:** Google Gemini, com o Claude Sonnet 5.5 de reserva (API ou Claude Code com o plano Pro/Max)
- **Integrações:** Instagram Graph API, Cloudinary

Arquitetura em [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) e endpoints em [docs/API.md](docs/API.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [PURPOSE.md](docs/PURPOSE.md) | Propósito, público, princípios e o que o projeto **não** é |
| [ROADMAP.md](docs/ROADMAP.md) | O que está pronto, o que falta e a ordem de construção |
| [SETUP.md](docs/SETUP.md) | Instalação, variáveis de ambiente e solução de problemas |
| [INSTAGRAM.md](docs/INSTAGRAM.md) | Conectar a conta: app Meta, token, permissões e erros comuns |
| [VIDEO_PIPELINE.md](docs/VIDEO_PIPELINE.md) | O que já funciona: upload, junção, legenda e publicação; modo gravado |
| [USO.md](docs/USO.md) | **Como usar o fluxo tema → Short**, tela por tela: roteiro, montagem, revisão, biblioteca, estilos |
| [AUTO_EDIT.md](docs/AUTO_EDIT.md) | Especificação do fluxo tema → Short (roteiro, batidas, biblioteca, tipos de cena, prévia, Remotion) |
| [SCHEDULER.md](docs/SCHEDULER.md) | Agendamento e publicação automática |
| [AI.md](docs/AI.md) | Onde a IA é usada, Gemini e a reserva automática com o Claude Sonnet 5.5 (API ou plano Pro) |
| [COSTS.md](docs/COSTS.md) | O que é grátis, o que é pago e quanto custa |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Estrutura do código e decisões técnicas |
| [BOARD.md](BOARD.md) | **O que está sendo feito agora**, o que vem depois e o que já foi entregue |
| [decisions/](docs/decisions/README.md) | **ADRs:** o porquê de cada decisão importante, as alternativas e o que custa |
| [API.md](docs/API.md) | Referência dos endpoints |
| [FIGMA.md](docs/FIGMA.md) | Prototipar telas no Figma com IA (desenhar e ler designs via MCP) |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Como contribuir |

## Segurança: leia antes de usar

- Os tokens do Instagram ficam em **arquivos JSON sem criptografia** em `backend/data/`. Não exponha essa pasta, não faça commit dela e não rode o backend aberto na internet sem autenticação. Criptografar os tokens está no roadmap.
- O backend **não tem autenticação nem rate limiting**. Ele foi feito para rodar em `localhost`.
- Nunca coloque tokens ou chaves no código. Use o `.env`, que já está no `.gitignore`.

## Avisos

- Use de acordo com os [Termos da Plataforma Meta](https://developers.facebook.com/terms/) e as regras do Instagram.
- **Direitos autorais:** usar personagens e artes protegidas (anime, filmes, jogos) é responsabilidade de quem publica. As plataformas podem remover vídeos ou bloquear a monetização. Veja [AUTO_EDIT.md](docs/AUTO_EDIT.md#direitos-autorais).
- Reels publicados pela API **não podem usar músicas da biblioteca do Instagram**. Use trilhas livres de direitos.
- **Licença do Remotion:** gratuito para pessoas físicas, organizações sem fins lucrativos e empresas com até 3 funcionários. Empresas maiores precisam de uma [licença paga](https://www.remotion.dev/license) para usar a edição automática.

## Licença

[MIT](LICENSE)
