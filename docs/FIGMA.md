# Design no Figma com IA

Este guia mostra como o Claude (ou outro agente com MCP) **desenha telas direto no Figma** para validar ideias antes de programar, e depois **lê o design de volta** para implementar. As duas ferramentas abaixo são gratuitas e rodam localmente.

| Ferramenta | Papel | Precisa de código de canal? |
|---|---|---|
| [claude-talk-to-figma-mcp](https://github.com/arinspunk/claude-talk-to-figma-mcp) | **Escreve** no Figma: cria frames, textos, formas, componentes | Sim |
| [figma-mcp-free](https://github.com/slashdoodleart/figma-mcp-free) | **Lê** do Figma: estrutura, estilos, screenshots, tokens (design → código) | Não |

Fluxo sugerido:

```
ideia ─► Claude desenha no Figma (talk-to-figma) ─► você ajusta à mão ─► Claude lê o design (mcp-free) ─► implementa no frontend
```

## Pré-requisitos

- **Figma Desktop** (os plugins de desenvolvimento não rodam no navegador).
- **Bun** (`bun --version`) para o talk-to-figma. O Node funciona como alternativa (`npm run socket`).
- Os dois repositórios clonados e com build. Neste ambiente eles ficam em `D:\GitHub\claude-talk-to-figma-mcp` e `D:\GitHub\figma-mcp-free`.
- Os servidores MCP configurados no cliente (Claude Code / Claude Desktop). Os instaladores de cada projeto (`scripts/setup.sh` / `install.ps1`) fazem isso.

## Desenhar no Figma (claude-talk-to-figma-mcp)

### 1. Subir o servidor WebSocket

```bash
cd D:/GitHub/claude-talk-to-figma-mcp
bun run socket
```

Saída esperada: `WebSocket server running on port 3055`. Deixe esse terminal aberto. O status pode ser conferido em `http://localhost:3055/status`.

### 2. Importar o plugin (só na primeira vez)

No Figma Desktop: **Menu → Plugins → Development → Import plugin from manifest** e selecione:

```
D:\GitHub\claude-talk-to-figma-mcp\src\claude_mcp_plugin\manifest.json
```

### 3. Conectar

1. Abra um arquivo de design no Figma.
2. Rode o plugin: **Plugins → Development → Claude Talk to Figma Plugin**.
3. O plugin mostra um **ID de canal** (o código em negrito na caixa verde).
4. Passe o código para o agente: *"Conecta no Figma, canal `abc123`"*. O agente chama `join_channel` com esse ID.

A partir daí o agente pode criar e editar elementos. O código muda a cada vez que o plugin é aberto.

## Ler o design (figma-mcp-free)

1. Importe o plugin (só na primeira vez): **Plugins → Development → Import plugin from manifest** → `D:\GitHub\figma-mcp-free\plugin\manifest.json`.
2. Rode o plugin **Figma MCP Free** no arquivo. Ele conecta sozinho ao servidor MCP local, sem código de canal.
3. Selecione um frame e peça ao agente para ler (`get_design_context`, `get_screenshot`, `get_variable_defs`).

## Problemas comuns

| Problema | Solução |
|---|---|
| Plugin não conecta / "disconnected" | Confira se o `bun run socket` está rodando e se a porta 3055 está livre (`netstat -ano \| findstr 3055`) |
| Agente diz que não está no canal | Passe o ID de canal de novo. Ele muda quando o plugin é reaberto |
| Plugin não aparece no menu | Ele só existe no **Figma Desktop**, depois de importar o `manifest.json` |
| Fontes trocadas no design | O plugin só usa fontes instaladas ou disponíveis no Figma. Peça para usar Inter/Roboto ou instale a fonte |

## Protótipo do InstaSearch

As telas do fluxo tema → Short ([AUTO_EDIT.md](AUTO_EDIT.md)) foram prototipadas no Figma com o fluxo acima, na página **"InstaSearch · Edição automática"**. O Figma é a **base visual**, não uma especificação pixel a pixel. O `frontend/` implementa o fluxo com dados reais (uma tela por rota, ver [ROADMAP.md](ROADMAP.md) e o guia [USO.md](USO.md)). Telas que dependiam só de dados de exemplo (Desempenho, Primeira configuração, Estilo por referência) saíram do app até terem backend.

### Telas

| Frame | Tela | O que mostra |
|---|---|---|
| `01 · Revisão automática` | Revisão | A IA já montou o vídeo: prévia 9:16 grande, **"Peça um ajuste"** em linguagem natural (com histórico, desfazer e sugestões), resumo do que a IA montou, **"Precisa de você"** (cenas sem imagem) e ajustes rápidos que mudam o vídeo todo (ritmo, efeitos, legenda). Não há linha do tempo nem inspetor por cena |
| `02 · Início` | Início | Criação rápida (tema + estilo + "Gerar roteiro"), projetos recentes com status, estatísticas da biblioteca (meta de imagens novas por vídeo) e próximas publicações |
| `03 · Novo vídeo` | Tema e estilo | Stepper do fluxo, campo de tema, **catálogo de estilos** (com ritmo e quantas imagens cada um exige), duração (15 / 20 / 30 / 40s, **máximo de 40s**), tom e atalho "já tenho a narração" |
| `04 · Roteiro e voz` | Roteiro | Cenas editáveis (gancho, contexto, argumento, revelação, CTA) com dicas visuais; painel de voz com **Copiar narração**, upload do áudio e progresso (transcrição → batidas → material) |
| `04b · Montagem automática` | Montagem | Depois que a narração chega, o app monta tudo sozinho: etapas (transcrição, cenas, imagens, efeitos, música), prévia aparecendo e "o que a IA está decidindo" ao vivo. O usuário não faz nada aqui |
| `05 · Trocar imagem` | Trocar imagem | Aberta pelo card "Precisa de você" da revisão. **Uma cena por vez** ("Cena 1 de 3"): à esquerda o frame do vídeo como está agora (imagem provisória), à direita um quadro grande "Cole a imagem aqui" com a busca pronta e o botão "Procurar no Google"; embaixo, outras imagens da biblioteca. Botões "Manter a parecida" e "Próxima cena" |
| `06 · Biblioteca` | Biblioteca | Busca em linguagem natural, botão "Importar imagens", filtros em chips (tipo e personagem), grade de miniaturas grandes com "usada em N vídeos" e painel da imagem: quem aparece, do que se trata (etiquetas que a IA criou e você corrige) e as áreas marcadas para zoom. Ação principal: "Usar em um vídeo" |
| `07 · Estilos` | Estilos | Galeria visual (cada estilo mostrado como um frame de Short) e ajustes em palavras simples: velocidade dos cortes, setas/X/emojis, legenda, música, tipo de imagem e "algo mais para a IA saber?". Prévia "Como fica" atualiza na hora; ação principal: "Usar no próximo vídeo". Mudar um estilo embutido salva uma cópia sua |
| `08 · Calendário` | Calendário | Mês com posts agendados, publicados, com falha e **horário sugerido** |
| `09 · Configurações` | Configurações | Instagram, IA (provedor/modelo/chave), voz e transcrição, mídia e render, sistema (FFmpeg, Remotion, agendador, licença) |
| `10 · Publicar` | Modal | Sobre a revisão: progresso do render, legenda do post gerada pela IA, destino (Instagram / baixar MP4), agora ou agendado, aviso sobre música |
| `11 · Projetos` | Projetos | Lista de todos os vídeos com busca, filtros por status (rascunho, aguardando voz, material pendente, prévia pronta, agendado, publicado), etapa atual do fluxo e ações |
| `12 · Desempenho` | Desempenho | Plays, retenção, seguidores e vídeos publicados; tabela por vídeo; **"o que funcionou"** (gancho, duração, estilo, horário) e **próximos temas sugeridos** |
| `13 · Primeira configuração` | Assistente | Checklist da primeira execução: ferramentas de vídeo, Whisper, chave de IA, Instagram/Cloudinary (opcional), **biblioteca inicial** e estilo principal |
| `14 · Criar estilo por referência` | Estilo por referência | Upload de um Short de referência, etapas da análise, o que foi medido (ritmo, legenda, cenas, anotações, áudio), frames-chave e nome do novo estilo |

O menu lateral (Início, Novo vídeo, Projetos, Biblioteca, Estilos, Calendário, Desempenho, Configurações) é o mesmo em todas as telas, exceto no editor, que ocupa a tela inteira, e no assistente de primeira configuração. Cada item do menu tem a sua tela; o botão "Novo vídeo" abre o fluxo 03 → 04 → 04b → 01 → 10 (a 05 só abre se faltar imagem).

**Princípio:** o InstaSearch é um editor **automático**. A IA monta o vídeo e o usuário só revisa, resolve o que falta e pede ajustes por texto. As versões antigas do editor (linha do tempo, inspetor por cena) estão na área **"Arquivo"** do Figma, abaixo das telas, como referência do que *não* fazer.

### Tokens visuais

| Token | Cor | Uso |
|---|---|---|
| `--bg` | `#0F1115` | Fundo da aplicação |
| `--panel` | `#16181E` | Painéis, cards, menu |
| `--panel-2` | `#1C1F27` | Itens dentro de painéis |
| `--border` | `#262A33` | Bordas |
| `--text` | `#F2F5F7` | Texto principal |
| `--muted` | `#8C94A1` | Rótulos e texto secundário |
| `--accent` | `#FFD60A` | Ação principal, seleção, legenda "quadrinho" |
| `--danger` | `#F04545` | Batida pendente, falha |
| `--success` | `#4DCC80` | Publicado, conectado, imagens suficientes |
| `--voice` / `--music` / `--sfx` | `#338C73` / `#594DA6` / `#FA9940` | Trilhas da linha do tempo |

Tipografia: **Inter** (400 a 900). Raio: 8px em chips e itens, 10 a 14px em cards e botões.
