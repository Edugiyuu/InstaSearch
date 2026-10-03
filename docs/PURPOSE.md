# Propósito do InstaSearch

## Em uma frase

**Do tema ao Short, com você no controle:** você dá um assunto, escolhe um estilo e grava a voz; o app escreve o roteiro, monta o vídeo com a sua biblioteca de imagens, coloca legendas, anotações e efeitos, mostra a prévia ao vivo e publica.

## O problema

Shorts narrados (comentário de anime, games, filmes, curiosidades, explicações, rankings, histórias) são um formato enorme, com muitos estilos de edição diferentes. O primeiro que estudamos, o de comentário de anime ([AUTO_EDIT.md](AUTO_EDIT.md#exemplo-detalhado-comentario-anime)), mostra o quanto isso dá trabalho:

- uma imagem nova a cada 0,7 a 1,5s, ou seja, **de 25 a 40 imagens num Short de até 40 segundos**;
- legendas de 1 a 2 palavras, setas, X vermelho, emojis, memes de reação;
- efeitos sonoros e música sincronizados com a narração.

Fazer isso à mão no CapCut leva horas. E a parte mais cansativa **não é editar, é conseguir as imagens**: buscar, baixar e organizar dezenas delas para cada vídeo.

As ferramentas que automatizam esse formato costumam ser pagas e **gerar tudo por IA** (voz, imagens, vídeo). O resultado parece genérico, e no nicho de anime nem funciona direito, porque geradores de imagem não sabem desenhar ou bloqueiam personagens protegidos.

## A solução

### 1. Editar é com o app

Roteiro, sincronização com a voz, batidas visuais, legendas, anotações e efeitos sonoros são automáticos. Você confere numa **prévia ao vivo no navegador** e ajusta clicando, arrastando ou pedindo em texto ("coloca um X na cena da energia vermelha").

### 2. Estilos plugáveis

Cada estilo (comentário de anime, explicativo, curiosidades, história com gameplay de fundo, ranking...) é um arquivo de configuração: ritmo, tipos de cena, legendas, efeitos e tom do roteiro. Você duplica e ajusta, ou cria um a partir de um vídeo de referência. Assim o app acompanha as tendências sem precisar reescrever código.

### 3. O gargalo das imagens vira uma biblioteca

- **Biblioteca pessoal que cresce com o uso:** cada imagem usada é catalogada pela IA (personagem, emoção, regiões como o rosto) e reaproveitada nos próximos vídeos.
- **Uma imagem rende várias cenas:** plano aberto, close no rosto, detalhe, versão P&B.
- **Lista de busca:** o que faltar vira uma lista do que procurar. Você só arrasta as imagens.

Meta: depois de uns 10 vídeos do mesmo nicho, **no máximo 10 a 15 imagens novas por vídeo**.

```
 Você decide                         O app faz
 ───────────                         ─────────
 o tema e o estilo            ──►    roteiro (editável) no tom do estilo
 a voz (ElevenLabs, mic)      ──►    transcrição + batidas no ritmo do estilo
 imagens que faltam           ──►    escolhe material da biblioteca, recortes, cenas, setas, memes, sfx
 o que mudar na prévia        ──►    aplica na hora (prévia ao vivo)
 quando publicar              ──►    render + Instagram / MP4 para Shorts e TikTok
```

Especificação completa: [AUTO_EDIT.md](AUTO_EDIT.md).

### Dois modos, um motor

| Modo | Entrada | Para quem |
|---|---|---|
| **Narrado** (principal) | Tema + estilo + voz + biblioteca de imagens | Canais de comentário: anime, games, filmes, curiosidades, explicações |
| **Gravado** (secundário) | Vídeo seu falando para a câmera | Quem aparece: cortes, legendas e anotações automáticos |

### E o "Search"?

Depois de publicar, o app mede o desempenho de cada vídeo e cruza com as escolhas feitas (estilo, gancho, duração, ritmo, tema) para sugerir os próximos temas. Essa parte vem depois da edição ([ROADMAP](ROADMAP.md)).

## Para quem é

| Perfil | O que ganha |
|---|---|
| **Canal faceless de nicho** (anime, games, filmes) | Um Short no padrão dos grandes canais em minutos, com a sua voz e o seu material |
| **Educador / divulgador** | Explicações narradas, ilustradas e legendadas sem saber editar |
| **Pequeno negócio** | Fotos de produto + narração viram um Reel |
| **Quem grava a si mesmo** | Modo gravado com legendas e cortes automáticos |
| **Desenvolvedor** | Projeto full-stack real (React, Remotion, IA, FFmpeg) para estudar e estender |

## Princípios

1. **Você decide, a IA executa.** Nada é publicado sem passar pela prévia.
2. **Seu material primeiro.** Sua voz, suas imagens, sua biblioteca. Gerar por IA é opcional.
3. **A biblioteca é o patrimônio do canal.** Cada vídeo deixa o próximo mais rápido de fazer.
4. **Gratuito por padrão.** O motor (Remotion, Whisper, FFmpeg) roda local e de graça para uso pessoal. Só custa o que você escolher (ElevenLabs, geração de imagem).
5. **Sem prender a um fornecedor.** LLM, visão, voz, transcrição e geração de imagem ficam atrás de *providers* trocáveis.
6. **Self-hosted e privado.** Projetos, biblioteca, tokens e métricas ficam na sua máquina.
7. **Só APIs oficiais.** Nada de scraping ou automação que viole os termos das plataformas.
8. **PT-BR primeiro.**

## O que o InstaSearch NÃO é

- **Não é um gerador de vídeo por IA.** Ele não depende de Grok, Sora ou Veo: **monta e edita** a partir do seu material. Esses geradores custam caro (cerca de US$ 0,50 a 4 por clipe de 8s) e mudam de regras com frequência.
- **Não é uma fábrica de vídeos sem revisão.**
- **Não é um bot de crescimento** (seguir, curtir ou comentar automaticamente).
- **Não é um scraper nem um banco de imagens.** A biblioteca é sua, local, e não é redistribuída.
- **Não é um SaaS.** Cada pessoa roda a sua instância.

## Direitos autorais

O app é uma ferramenta de edição. Usar personagens, artes ou cenas protegidas é decisão e responsabilidade de quem publica. Comentário com narração própria reduz o risco, mas as plataformas podem remover vídeos ou bloquear a monetização. Detalhes em [AUTO_EDIT.md](AUTO_EDIT.md#direitos-autorais).

## Por que mudamos de rumo

A ideia original era analisar perfis de referência e gerar vídeos com o Grok Imagine. Na prática:

- A análise de referência nunca teve fonte de dados: não havia scraper, e scraping viola os termos.
- A "integração" com o Grok era só um link com o prompt preenchido.
- O Grok deixou de ser gratuito, e gerar vídeo por API é caro para quem posta todo dia.

O que funcionava bem era **montar e publicar** (FFmpeg, legenda por IA, publicação, agendamento). O novo propósito expande essa base para o formato de Short narrado.

## Como medimos sucesso

- Do tema ao vídeo pronto: **menos de 15 minutos**, contando a gravação da voz e a busca das imagens que faltarem.
- Imagens novas por vídeo depois de 10 vídeos no nicho: **no máximo 15**.
- Até 3 rodadas de ajuste na prévia para chegar num resultado publicável.
- Custo do motor para uso pessoal: **R$ 0**.
