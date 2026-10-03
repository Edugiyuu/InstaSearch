# Edição Automática: do tema ao Short

> **Status:** 📋 Especificação. Ainda não implementado. Este documento é o guia de construção.

## Em uma frase

Você dá um **tema** e escolhe um **estilo**. O app escreve o roteiro; você grava a **voz** (ElevenLabs ou microfone). O app monta o Short naquele estilo (cortes rápidos com memes, explicativo calmo, história com gameplay de fundo, ranking...), usando principalmente a **sua biblioteca de imagens**. A prévia roda **ao vivo no navegador**, você ajusta o que quiser e publica.

## O gargalo é conseguir as imagens, não editar

Os vídeos têm **no máximo 40 segundos**. Mesmo assim, nos estilos de cortes rápidos a imagem troca a cada 0,7 a 1,5s, o que dá **de 25 a 40 imagens ou clipes por vídeo**. Editar dá para automatizar por completo; juntar essas imagens toda vez é o que cansa. Por isso o sistema é construído em volta de três ideias:

1. **Biblioteca pessoal que cresce com o uso.** Toda imagem que você usa fica guardada e catalogada (personagem, emoção, descrição, regiões como o rosto). No próximo vídeo sobre o Sukuna, metade do material já está lá.
2. **Uma imagem rende várias cenas.** A IA localiza as regiões interessantes (rosto, mão, corpo inteiro) e o app usa recortes diferentes da mesma imagem: plano aberto, close no rosto, detalhe.
3. **Lista de busca por cena.** O que faltar vira uma lista ("Sukuna sorrindo, mangá, P&B"). Você só procura e arrasta, e a imagem vai para a cena e para a biblioteca.

Meta: depois de uns 10 vídeos do mesmo nicho, precisar de **no máximo 10 a 15 imagens novas por vídeo**. Alguns estilos (ex.: história com gameplay de fundo) quase não precisam de imagens.

## Estilos

Um **estilo** é um **arquivo de configuração**, não código espalhado. Ele define o ritmo, os tipos de cena usados, as legendas, os movimentos, os efeitos sonoros e até o tom do roteiro. Os componentes Remotion (cenas e camadas) são as peças; o estilo diz como combinar essas peças. Criar um estilo novo quase sempre é só combinar peças que já existem com outros parâmetros. Só um visual realmente novo exige um componente novo.

### O que um estilo define

```ts
interface Style {
  id: string                     // "comentario-anime"
  name: string
  description: string

  // De onde vêm as batidas (trocas de visual)
  rhythm:
    | { source: 'words'; wordsPerBeat: [min: number, max: number]; minSec: number; maxSec: number }
    | { source: 'sentences'; minSec: number; maxSec: number }    // uma troca por frase
    | { source: 'music'; everyNBeats: number }                   // edit musical: corta na batida da música

  // Fundo contínuo opcional (ex.: gameplay atrás de tudo)
  background?: { kind: 'clip-loop' | 'image' | 'color'; tags?: string[]; value?: string }

  // Quais cenas e com que frequência (o planejador respeita os pesos)
  scenes: Partial<Record<'FullImage' | 'Evidence' | 'Versus' | 'Meme' | 'Clip' | 'TitleCard' | 'TextCard', number>>

  motion: { default: Motion; allowed: Motion[]; intensity: 'calma' | 'media' | 'forte' }
  filters: Filter[]
  transitions: { kind: 'cut' | 'fade' | 'whip' | 'zoom' | 'slide'; durationSec: number }

  captions: {
    style: string                // 'quadrinho' | 'limpo' | 'neon' | 'karaoke' | ...
    wordsPerChunk: [number, number]
    position: 'centro' | 'inferior' | 'superior'
    uppercase: boolean
    highlight: { color: string; emoji: boolean }
  }

  layers: { allowed: LayerType[]; perBeatMax: number; frequency: number } // 0–1

  sfx: { on: 'sceneTypeChange' | 'everyCut' | 'layerIn' | 'emphasis' | 'beforeReveal'; tag: string; volume: number }[]
  music: { tags: string[]; volume: number; duck: boolean }

  // Instruções extras para a IA
  scriptGuidance: string         // tom, tamanho das frases, tipo de gancho
  plannerGuidance: string        // como escolher cenas e anotações nesse estilo
}
```

Os estilos ficam em dois lugares:
- `video/src/styles/`: estilos que vêm com o app;
- `data/styles/`: os seus. Você duplica um estilo, ajusta numa tela de edição e salva.

Ao gerar um vídeo, você escolhe o estilo e pode **sobrescrever** parâmetros só naquele projeto (ex.: "este com cortes mais lentos").

### Catálogo inicial

| Estilo | Ritmo | Visual | Legenda | Precisa de muitas imagens? |
|---|---|---|---|---|
| `comentario-anime` | 2–4 palavras (0,7–1,5s) | Tela cheia, prova, memes, setas e X | Quadrinho amarela, 1–2 palavras, centro | **Sim** (25–40 por vídeo) |
| `explicativo` | Por frase (3–6s) | Ken Burns lento, poucas anotações | Limpa, 3–5 palavras, embaixo | Pouco (8–12 por vídeo) |
| `curiosidades` | 4–8 palavras (1,5–3s) | Imagens reais ou Pexels, zoom, flash na revelação | Grande, centro, destaque colorido | Médio |
| `historia-com-fundo` | Fundo contínuo + card do post no início | Gameplay ou vídeo satisfatório em loop atrás de tudo | Palavra por palavra, enorme, centro | **Quase nada** |
| `ranking` | Por item | `TitleCard` com número, contagem regressiva, transição forte entre itens | Grande, centro | Médio (1–3 por item) |
| `edit-musical` | Batida da música (sem narração) | Cortes e efeitos sincronizados com o ritmo | Opcional | Sim |
| `gravado` | Trechos do seu vídeo | Você na câmera + zooms de ênfase | Grande, centro | Não |

### Exemplo detalhado: `comentario-anime`

Baseado no Short *"Sukuna NUNCA teve ENERGIA VERMELHA? 😨❌"* (canal Time Trends, 62s), analisado quadro a quadro:

| Elemento | Como aparece | Como vira recurso aqui |
|---|---|---|
| Ritmo | Imagem nova a cada 0,7 a 1,5s, nunca parado | `rhythm: { source: 'words', wordsPerBeat: [2, 4] }` |
| Legenda | 1 a 2 palavras, amarela, fonte de quadrinho com contorno preto grosso, no centro | `captions.style: 'quadrinho'`, `wordsPerChunk: [1, 2]` |
| Imagem em tela cheia | Prints, mangá e fanart cortados para 9:16, às vezes em P&B | Cena `FullImage` (peso alto), filtro `bw` |
| "Prova" | Fundo cinza quadriculado + print emoldurado (tweet, grade de artes) | Cena `Evidence` |
| Anotações | Seta vermelha, X vermelho, adesivo chibi, emoji 🤔 | Camadas `Arrow`, `Cross`, `Sticker`, `Emoji` (`frequency` cerca de 0,3) |
| Meme | Vídeo de reação com caixa branca de texto no topo | Cena `Meme` |
| Clipes | Trechos de vídeo, como alguém desenhando | Cena `Clip` |
| Logo | Logo do anime sobreposto | Camada `Logo` |

### Criar um estilo a partir de um vídeo de referência (planejado)

Você sobe um vídeo de referência (um arquivo seu, já que o app não baixa vídeos do YouTube nem do Instagram). O app então:
1. mede o ritmo de cortes com detecção de cena (`ffmpeg scdet`);
2. transcreve e calcula quantas palavras aparecem por legenda;
3. analisa alguns frames com visão: posição, cor e fonte aproximada das legendas, tipos de cena (tela cheia, emoldurada, fundo contínuo), anotações;
4. gera um **rascunho de estilo** para você ajustar e salvar.

É o mesmo processo usado para criar o `comentario-anime`, só que automatizado.

## Por que Remotion e não só FFmpeg

O estilo depende de **composição**: imagem emoldurada sobre textura, seta apontando para um ponto, caixa de texto de meme, legenda que "pula" na tela. Montar isso com filtros do FFmpeg é frágil e lento de iterar. O **[Remotion](https://www.remotion.dev/)** descreve o vídeo como componentes **React + TypeScript**, a mesma stack do projeto:

| Vantagem | Por que importa aqui |
|---|---|
| **Prévia ao vivo** (`@remotion/player`) | O plano de edição vira *props* do player. Trocou uma imagem, a prévia atualiza na hora, sem renderizar |
| Um componente por tipo de cena | `FullImage`, `Evidence`, `Meme`... são fáceis de criar, testar e reaproveitar |
| Render no servidor (`@remotion/renderer`) | O MP4 final é gerado pelo backend Node, com Chrome headless + FFmpeg embutidos (baixados automaticamente) |
| Ecossistema | `@remotion/captions` faz legendas no estilo TikTok (palavra por palavra); `@remotion/install-whisper-cpp` instala o Whisper e transcreve com timestamps por palavra |

**Licença:** o Remotion é gratuito para pessoas físicas, organizações sem fins lucrativos e empresas com até 3 funcionários. Empresas maiores precisam de uma licença paga. Isso vale para quem rodar o InstaSearch, e o README avisa. O FFmpeg do projeto continua sendo usado no pipeline de publicação e em pré-processamentos.

## O fluxo

```
 1 TEMA ─► 2 ROTEIRO ─► 3 VOZ ─► 4 BATIDAS ─► 5 MATERIAL ─► 6 PRÉVIA AO VIVO ─► 7 RENDER ─► 8 PUBLICAR
            (IA)         (você)    (auto)       (biblioteca      ⟲ ajustes          (servidor)   Reels / Shorts
                                                 + lista de busca)
```

### 1. Tema

Um campo de texto, mais opções: duração-alvo (15 / 20 / 30 / 40s; **máximo de 40s**, porque são vídeos curtos), tom (épico, curioso, engraçado, polêmico) e **[estilo](#estilos)**. O estilo também orienta o roteiro: um `ranking` gera itens numerados; uma `historia-com-fundo` gera uma narrativa em primeira pessoa.

### 2. Roteiro (IA)

O LLM escreve o roteiro em **cenas narrativas** (gancho, desenvolvimento, revelação, CTA). Cada cena traz a narração e dicas visuais:

```jsonc
{
  "title": "Sukuna NUNCA teve energia vermelha?",
  "scenes": [
    {
      "id": "c1",
      "narration": "Mano, o Sukuna nunca teve energia vermelha.",
      "visualHints": ["sukuna sorrindo P&B", "luta gojo vs sukuna colorida por fã"],
      "tone": "polêmico",
      "emphasis": ["nunca", "vermelha"]
    }
  ],
  "caption": "…",
  "hashtags": ["#jujutsukaisen", "#sukuna"]
}
```

Você edita o roteiro na tela. O botão **Copiar narração** copia o texto corrido para colar no ElevenLabs.

### 3. Voz

- **Upload do áudio** (padrão): o MP3/WAV gerado no ElevenLabs ou gravado no microfone.
- Opcionais: ElevenLabs via API (com a sua chave) e Piper (local, gratuito).
- Já tem a narração pronta sem roteiro? Suba o áudio direto e o roteiro é reconstruído a partir da transcrição.

O áudio é **transcrito com timestamps por palavra** (whisper.cpp local). Os nomes próprios do roteiro ("Sukuna", "Santuário Malevolente") entram como dica para o Whisper acertar a grafia.

### 4. Batidas visuais (automático)

A narração é dividida em **batidas** conforme o `rhythm` do estilo. No `comentario-anime` são 2 a 4 palavras (0,7 a 1,5s); no `explicativo`, uma frase. A divisão respeita pausas e pontuação. **Cada batida é uma troca de visual.**

```
0.00–0.85  "Mano, o Sukuna"      → batida b1
0.85–1.60  "nunca teve"          → batida b2
1.60–2.70  "energia vermelha"    → batida b3
```

O LLM então escolhe, para cada batida:
- o **tipo de cena**, dentro dos permitidos pelo estilo e respeitando os pesos;
- o **material**, escolhido entre candidatos da biblioteca pré-filtrados por busca de texto e tags, para manter o prompt pequeno;
- o **recorte** (aberto, rosto, detalhe) e o **movimento**;
- **anotações** (seta, X, emoji, adesivo) e **efeito sonoro**;
- quais palavras da legenda ganham destaque.

**Regra contra alucinação:** a IA só escolhe **IDs** (de batidas, assets e regiões). Os tempos vêm da transcrição e as coordenadas vêm das regiões detectadas.

### 5. Material: biblioteca + lista de busca

Para cada batida sem material bom na biblioteca, o app gera um **item na lista de busca**:

```
b7  "Gojo de olhos abertos, close"        [ arraste uma imagem aqui ]
b12 "reação de choque (meme)"             [ arraste ] · sugestões: memes/choque/ (3)
```

Ao arrastar, a imagem é catalogada automaticamente (próxima seção) e entra na biblioteca. Também dá para colar a imagem com Ctrl+V ou de uma URL.

Opcionais: geração por IA (para fundos e conceitos genéricos) e Pexels (temas do mundo real). Para personagens de anime, os geradores comerciais costumam bloquear ou errar. Veja [Direitos autorais](#direitos-autorais).

### 6. Prévia ao vivo e ajustes

A tela de edição usa o `@remotion/player` e o plano de edição atual. **Toda mudança aparece na hora:**

- uma **linha do tempo de batidas**, com miniatura, legenda e tipo de cena;
- clicar numa batida para trocar a imagem (biblioteca ou upload), mudar tipo de cena, recorte, filtro ou movimento;
- **arrastar a seta** na prévia para corrigir o ponto que ela aponta;
- mesclar ou dividir batidas, editar o texto da legenda e mudar a palavra em destaque;
- volumes de voz, música e efeitos;
- **pedidos em linguagem natural**: "troca a imagem da batida 7 por uma do Gojo sério", "coloca um X na cena da energia vermelha", "menos memes", "deixa a legenda vermelha quando falar Sukuna". O LLM devolve um *patch* no plano;
- **Desfazer / Refazer** (cada versão do plano fica salva).

### 7. Render final

O backend roda o `renderMedia()` do Remotion: MP4 1080x1920, 30fps, H.264/AAC, com volume normalizado. O progresso aparece na tela.

### 8. Publicar

Publicar ou agendar no Instagram pelo pipeline atual ([VIDEO_PIPELINE.md](VIDEO_PIPELINE.md)), ou **baixar o MP4** para YouTube Shorts e TikTok.

## Biblioteca de material

```
data/library/
├── index.json            # catálogo: tags, descrições, regiões, uso
├── characters/
│   ├── sukuna/
│   ├── gojo/
│   └── …
├── memes/                # imagens e clipes de reação, por emoção
│   ├── choque/
│   ├── risada/
│   └── triste/
├── stickers/             # PNG transparentes: chibis, emojis personalizados
├── backgrounds/          # texturas (quadriculado, papel, gradientes)
├── logos/
├── clips/                # trechos de vídeo
├── sfx/                  # whoosh/, impact/, pop/, riser/, glitch/
├── music/
└── fonts/
```

### Catalogação automática

Toda imagem nova passa uma vez pela IA de visão (Gemini). O resultado fica em cache no `index.json`:

```jsonc
{
  "id": "img_8f2a",
  "path": "characters/sukuna/sukuna_sorriso_pb.jpg",
  "kind": "image",
  "characters": ["sukuna"],
  "tags": ["sorriso", "mangá", "preto e branco", "ameaçador"],
  "description": "Sukuna sorrindo de forma ameaçadora, arte de mangá em P&B",
  "regions": [
    { "id": "face", "label": "rosto do Sukuna", "box": [0.31, 0.12, 0.72, 0.48] },
    { "id": "hand", "label": "mão direita", "box": [0.05, 0.55, 0.30, 0.80] }
  ],
  "size": [1080, 1920],
  "usage": { "count": 3, "lastUsedAt": "2026-10-02" }
}
```

- **Regiões** (caixas normalizadas de 0 a 1) servem para os recortes ("close no rosto") e para a **seta apontar sozinha**.
- **Uso** evita repetir as mesmas imagens em vídeos seguidos.
- Você pode corrigir as tags e os personagens à mão.
- Clipes de vídeo são catalogados por alguns frames, mais a duração.

### Variantes de recorte

Uma imagem gera várias cenas sem parecer repetida:

| Variante | Como |
|---|---|
| `full` | Imagem inteira cobrindo 9:16 (ou com fundo desfocado, se for horizontal) |
| `region:<id>` | Zoom na região (ex.: o rosto) |
| `kenburns` | Movimento lento de uma região para outra |
| `bw` / `tint` | Mesmo recorte com filtro (P&B, vermelho, dessaturado) |

## Tipos de cena (componentes Remotion)

| Componente | Uso | Parâmetros principais |
|---|---|---|
| `FullImage` | A maioria das batidas | `asset`, `crop`, `motion` (zoom-in/out, pan, shake), `filter` |
| `Evidence` | Provas: prints, tweets, grades de imagens | `asset`, `background` (quadriculado...), `frame` (cor da borda), `rotation` |
| `Versus` | "Gojo vs Sukuna": duas imagens lado a lado ou em diagonal | `left`, `right`, `divider` |
| `Meme` | Clipe ou imagem de reação + caixa de texto no topo | `asset`, `text`, `emoji` |
| `Clip` | Trecho de vídeo | `asset`, `start`, `end`, `muted` |
| `TitleCard` | Gancho, revelação ou número de ranking em texto grande | `text`, `background` |
| `TextCard` | Card de post/mensagem (estilo "história"): avatar, nome, texto | `title`, `author`, `body`, `theme` |

**Camadas** que podem ir sobre qualquer cena:

| Camada | Detalhe |
|---|---|
| `Caption` | Quantidade de palavras, posição e caixa definidas pelo estilo; entrada com "pop". Estilos visuais: `quadrinho` (amarela, contorno preto), `limpo`, `neon`, `karaoke` (palavra atual destacada). Palavras de destaque em outra cor ou com emoji |
| `Arrow` | Seta animada até uma `region` do asset (ou a uma coordenada ajustada na prévia) |
| `Cross` / `Circle` | X ou círculo vermelho sobre uma região |
| `Emoji` / `Sticker` | PNG ou emoji com entrada animada, num canto ou junto a uma região |
| `Logo` | Logo do anime, da biblioteca |
| `Flash` | Flash branco rápido nas revelações |

Fontes de legenda: usar fontes livres (ex.: **Bangers**, licença OFL, do Google Fonts) guardadas em `library/fonts/`.

## Áudio

- **Voz:** a faixa principal; todos os tempos derivam dela.
- **Música:** da `library/music/`, com *ducking* (volume mais baixo durante a fala).
- **Efeitos**, posicionados pelas regras `sfx` do estilo + escolhas da IA. Exemplo do `comentario-anime`:
  - `whoosh` quando o **tipo** de cena muda (não a cada corte, para não cansar);
  - `pop` quando entra um adesivo ou emoji;
  - `impact` com `Cross`, `Flash` ou uma palavra de ênfase forte;
  - `riser` antes de uma revelação.
- **Normalização** de volume no render final (cerca de −14 LUFS).

## Estrutura de dados

```ts
type Box = [x1: number, y1: number, x2: number, y2: number] // normalizado 0–1

type Crop = { kind: 'full' } | { kind: 'region'; regionId: string } | { kind: 'box'; box: Box }
type Motion = 'zoom-in' | 'zoom-out' | 'pan-left' | 'pan-right' | 'shake' | 'static'
type Filter = 'none' | 'bw' | 'red-tint' | 'desaturate'

type Visual =
  | { type: 'FullImage'; assetId: string; crop: Crop; motion: Motion; filter: Filter }
  | { type: 'Evidence'; assetId: string; background: string; frameColor: string; rotation: number }
  | { type: 'Versus'; left: string; right: string }
  | { type: 'Meme'; assetId: string; text: string; emoji?: string }
  | { type: 'Clip'; assetId: string; start: number; end: number; muted: boolean }
  | { type: 'TitleCard'; text: string; background: string }
  | { type: 'TextCard'; title: string; author?: string; body: string; theme: 'claro' | 'escuro' }

type Layer =
  | { type: 'Arrow'; target: { regionId: string } | { point: [number, number] } }
  | { type: 'Cross' | 'Circle'; target: { regionId: string } | { box: Box } }
  | { type: 'Emoji'; char: string; position: string }
  | { type: 'Sticker'; assetId: string; position: string }
  | { type: 'Logo'; assetId: string }
  | { type: 'Flash' }

interface Beat {
  id: string
  start: number              // segundos (vem dos timestamps da voz)
  end: number
  words: { text: string; start: number; end: number }[]
  caption: { text: string; highlight: string[] }
  visual: Visual | null      // null = pendente na lista de busca
  searchHint?: string        // o que procurar, se estiver pendente
  layers: Layer[]
  sfx: { assetId: string; offset: number; volume: number }[]
}

interface EditPlan {
  version: number            // incrementa a cada ajuste (desfazer/refazer)
  styleId: string                 // ex.: 'comentario-anime'
  styleOverrides?: Partial<Style> // ajustes só deste projeto
  fps: 30
  size: [1080, 1920]
  voice: { assetId: string; volume: number }
  music?: { assetId: string; volume: number; duck: boolean }
  beats: Beat[]
  meta: { title?: string; caption?: string; hashtags?: string[] }
}
```

O `EditPlan` é ao mesmo tempo o que fica salvo, o que o LLM edita e as *props* da composição Remotion. Um único formato atende à prévia, ao render e aos ajustes.

## Arquitetura

```
InstaSearch/
├── video/                     # NOVO: projeto Remotion (composições compartilhadas)
│   ├── src/
│   │   ├── Root.tsx           # registra a composição "Short" (1080x1920, 30fps)
│   │   ├── Short.tsx          # EditPlan → sequência de batidas + áudio
│   │   ├── scenes/            # FullImage, Evidence, Versus, Meme, Clip, TitleCard
│   │   ├── layers/            # Caption, Arrow, Cross, Circle, Emoji, Sticker, Logo, Flash
│   │   ├── styles/            # estilos embutidos (comentario-anime, explicativo...)
│   │   └── schema.ts          # tipos/zod do EditPlan (fonte única da verdade)
│   └── package.json
├── frontend/                  # importa video/src para o @remotion/player (prévia)
└── backend/
    └── src/services/edit/
        ├── projects.ts        # projeto = tema, roteiro, voz, plano (versões), status
        ├── jobs.ts            # transcrição, catalogação e render em background
        ├── script/            # tema → roteiro (LLM)
        ├── transcription/     # whisper.cpp (via @remotion/install-whisper-cpp)
        ├── beats/             # palavras → batidas
        ├── library/           # index.json, busca, catalogação por visão, variantes
        ├── planner/           # batidas + candidatos → EditPlan (LLM) · patches
        └── render/            # @remotion/bundler + @remotion/renderer → MP4
```

### Endpoints propostos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/projects` | Cria um projeto (tema + opções) |
| POST | `/api/projects/:id/script` | Gera ou regenera o roteiro |
| PUT | `/api/projects/:id/script` | Salva o roteiro editado |
| POST | `/api/projects/:id/voice` | Upload do áudio → transcrição → batidas (job) |
| POST | `/api/projects/:id/plan` | Gera o plano (escolhe cenas e material) e devolve a lista de busca |
| GET | `/api/projects/:id` | Projeto + plano atual + lista de busca + status dos jobs |
| PUT | `/api/projects/:id/plan` | Salva ajustes manuais (vira uma nova versão) |
| POST | `/api/projects/:id/edit` | `{ instruction }` → patch do LLM → nova versão |
| POST | `/api/projects/:id/undo` · `/redo` | Navega entre as versões |
| POST | `/api/projects/:id/render` | Render final (job) |
| GET | `/api/projects/:id/output` | MP4 |
| GET | `/api/library` | Busca (`?q=&character=&kind=&tag=`) |
| POST | `/api/library` | Upload, que dispara a catalogação |
| PATCH | `/api/library/:id` | Corrigir tags, personagens e regiões |
| GET | `/api/library/files/*` | Serve os arquivos para o player |

## Variáveis de ambiente (futuras)

```env
WHISPER_DIR=./tools/whisper      # instalado via @remotion/install-whisper-cpp
WHISPER_MODEL=small              # tiny | base | small | medium
ELEVENLABS_API_KEY=              # opcional
IMAGE_GEN_PROVIDER=none          # none | gemini | flux | sd-local
PEXELS_API_KEY=                  # opcional
REMOTION_CONCURRENCY=            # threads de render (padrão: automático)
```

## Ordem de construção

Cada marco entrega algo utilizável:

| Marco | Entrega |
|---|---|
| **M1: Protótipo** | Pacote `video/` com `FullImage`, `Evidence` e `Caption`, e o **conceito de estilo desde o início** (o `comentario-anime` como primeiro arquivo de estilo). Entrada: um áudio + uma pasta de imagens. Whisper → batidas de 2 a 4 palavras → imagens em ordem (alternando recortes) → **prévia no player** + render MP4. Ainda sem LLM |
| **M2: Biblioteca** | `data/library/` + catalogação por visão (tags, personagens, regiões) + busca + variantes de recorte |
| **M3: Roteiro e planejador** | Tema → roteiro; batidas + candidatos da biblioteca → `EditPlan` pelo LLM; **lista de busca** com arrastar e soltar |
| **M4: Anotações e memes** | `Arrow` (apontando para regiões), `Cross`, `Circle`, `Emoji`, `Sticker`, `Logo`, `Flash`, `Meme`, `Clip`, `Versus`, `TitleCard` |
| **M5: Áudio** | Biblioteca de SFX e música, regras `sfx` do estilo, ducking, normalização |
| **M6: Editor da prévia** | Linha do tempo de batidas, trocar material e tipo, arrastar a seta, dividir e mesclar batidas, desfazer |
| **M7: Ajustes em linguagem natural** | Pedido → patch → nova versão |
| **M8: Mais estilos** | `explicativo`, `curiosidades`, `historia-com-fundo`, `ranking` + tela de edição de estilos (duplicar, ajustar, salvar) |
| **M9: Estilo por referência** | Vídeo de referência → rascunho de estilo |
| **M10: Opcionais** | ElevenLabs via API, geração de imagem, Pexels, modo gravado, upload direto no YouTube |

O **M1** já mostra se o estilo funciona: você entra com a narração e uma pasta de imagens e recebe um Short legendado e sincronizado.

## Modo gravado (secundário)

O mesmo motor serve para vídeos em que você aparece: as "batidas" passam a ser trechos do seu vídeo (`Clip`), sem silêncios e sem takes repetidos, com as mesmas legendas, anotações e efeitos. Detalhes em [VIDEO_PIPELINE.md](VIDEO_PIPELINE.md#modo-gravado).

## Direitos autorais

Vídeos sobre animes, filmes e jogos usam material protegido (personagens, artes, cenas, logos).

- Conteúdo de **comentário e análise** é comum e muitas vezes tolerado, mas **não há garantia**: as plataformas podem remover o vídeo, bloquear a monetização ou aplicar *strikes*.
- Reduz o risco: narração própria com opinião (conteúdo transformador), muitas imagens curtas em vez de cenas longas do anime, e nada de trilha sonora oficial.
- A biblioteca é **local e privada**. O app não redistribui material.
- **Música:** só trilhas livres. A API do Instagram não permite usar músicas da biblioteca do app.
- **ElevenLabs:** confira se o seu plano permite uso comercial.

O InstaSearch é uma ferramenta de edição. A responsabilidade pelo material publicado é de quem publica.

## Riscos técnicos

| Risco | Mitigação |
|---|---|
| Whisper erra nomes próprios | Nomes do roteiro como dica inicial + correção da legenda na prévia |
| Visão erra regiões e a seta aponta errado | A seta é arrastável na prévia; a correção fica salva no `index.json` |
| Biblioteca pequena no começo, com imagens repetidas | Variantes de recorte + aviso quando a mesma imagem aparece mais de 2 vezes |
| Render lento em PCs fracos | Prévia não precisa de render (player); o render final roda em background com concorrência ajustável |
| Prompt grande com bibliotecas grandes | Pré-filtro por busca de texto e tags; o LLM vê só de 5 a 10 candidatos por batida |
| Licença do Remotion para empresas | Documentado no README; alternativa futura: renderizador próprio em FFmpeg para o subconjunto básico |
