# Pipeline de Vídeo

Este documento explica como um vídeo chega a ser publicado e o que já existe no código hoje. O fluxo principal planejado (tema → roteiro → voz → batidas → biblioteca → prévia ao vivo → render com Remotion) está especificado em [AUTO_EDIT.md](AUTO_EDIT.md).

## Visão geral

```
 Modo narrado (principal)                    Modo gravado (secundário)
 tema → roteiro → voz + imagens + sfx        vídeo seu falando para a câmera
              │                                          │
              └──────────────┬───────────────────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Edição automática + prévia   │  📋 planejado (AUTO_EDIT.md)
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Junção + 9:16 (FFmpeg)    ✅ │  ← hoje: clipes já editados
              └──────────────┬───────────────┘
                             ▼
              ┌──────────────────────────────┐
              │ Legenda do post por IA    ✅ │
              └──────────────┬───────────────┘
                 ┌───────────┴────────────┐
                 ▼                        ▼
         Publicar agora ✅          Agendar ✅ (SCHEDULER.md)
         Exportar MP4 📋 (Shorts/TikTok)
```

## Modo narrado

É o fluxo principal: você dá o tema, a IA escreve o roteiro em cenas, você grava a voz (ElevenLabs, microfone) e envia imagens e efeitos sonoros. O app sincroniza tudo com a narração, aplica movimento, transições, legendas e efeitos, e mostra a prévia para ajustes. Especificação completa: [AUTO_EDIT.md](AUTO_EDIT.md).

O antigo **gerador de prompts para IA de vídeo** (aba "Prompts de Vídeo") vai ser reaproveitado como **gerador de roteiro em cenas**. Os estilos e o suporte a diálogos que ele já tem servem de base.

## Modo gravado

Para quem aparece no vídeo. O mesmo motor de edição trata trechos do seu vídeo como "cenas":

- corta silêncios (`silencedetect`) e vícios de fala;
- remove takes repetidos (quando você erra e repete a frase, fica a última versão);
- aplica legendas animadas, zooms de ênfase, efeitos sonoros e música, com a mesma prévia e os mesmos ajustes do modo narrado.

Dicas de gravação:
- Grave na vertical (9:16).
- Use microfone de lapela ou fique perto do celular. A transcrição depende do áudio.
- Errou? Pause e **repita a frase inteira**.

**Hoje** dá para subir de 1 a 3 clipes já editados, juntar e publicar (veja abaixo).

## O que já funciona

### 1. Upload: `POST /api/videos/upload`

| Regra | Valor atual |
|---|---|
| Quantidade | 1 a 3 arquivos por envio (campo `videos`) |
| Formatos | `.mp4`, `.mov`, `.avi`, `.mkv` |
| Tamanho | até 50MB por arquivo |
| Duração | até 30s por arquivo |

Os arquivos vão para `backend/data/videos/temp/`. O backend valida cada um com `ffprobe` e retorna `filename`, `size` e `duration`.

> Esses limites foram pensados para clipes já editados. A edição automática vai ter um upload próprio por projeto (voz) e pela biblioteca (imagens, clipes, efeitos). Veja [AUTO_EDIT.md](AUTO_EDIT.md#endpoints-propostos).

### 2. Junção e formatação: `POST /api/videos/merge`

```json
{ "filenames": ["video_A.mp4", "video_B.mp4"] }
```

O FFmpeg concatena os vídeos na ordem enviada e padroniza a saída:

- 1080x1920 (9:16), escalando e **cortando** para preencher, sem barras pretas;
- H.264 (`libx264`) + AAC, 30fps.

A saída fica em `backend/data/videos/output/`.

### 3. Legenda do post por IA: `POST /api/videos/analyze-for-caption`

```json
{ "filename": "merged_123.mp4", "style": "realistic" }
```

O backend extrai 3 frames do vídeo, envia ao Gemini junto com o estilo e recebe uma legenda contextual. Os frames temporários são apagados em seguida.

### 4. Publicação: `POST /api/videos/publish-reel`

```json
{ "filename": "merged_123.mp4", "caption": "Texto do post", "hashtags": "#dica #reels" }
```

Fluxo:
1. Envia o MP4 para o **Cloudinary** (pasta `instagram-reels`). A Graph API exige uma URL pública para o vídeo.
2. Cria o container de mídia (`media_type: REELS`, `share_to_feed: true`).
3. Consulta `status_code` até o Instagram terminar de processar (até 30 tentativas).
4. Publica e retorna o ID e o link do Reel.

### 5. Remover arquivo: `DELETE /api/videos/:filename`

## Limitações conhecidas

- **Música:** Reels publicados pela API não podem usar a biblioteca de músicas do Instagram. Use trilhas livres ou adicione a música pelo app depois, editando o post.
- **Cloudinary acumula arquivos:** os vídeos enviados não são apagados depois da publicação. Limpar a pasta `instagram-reels` periodicamente, ou implementar a exclusão automática (está no roadmap), evita estourar o plano gratuito.
- **Sem limpeza local automática:** `cleanupOldFiles()` existe em `videoService.ts`, mas não é chamada em lugar nenhum. A pasta `data/videos/` cresce até ser limpa à mão.
- **Lógica de publicação duplicada:** existe em `videoController.ts` e em `instagramGraphService.publishReel()`. Deve ser unificada.
- **Uma conta só:** a publicação usa a primeira conta conectada.

## Pré-requisitos

- **FFmpeg** no PATH (`ffmpeg -version` precisa funcionar). No Windows, prefira a build *full* do [gyan.dev](https://www.gyan.dev/ffmpeg/builds/). A edição automática renderiza com o Remotion, que traz o próprio FFmpeg.
- **Cloudinary** configurado no `.env` (veja [SETUP.md](SETUP.md)).
- **Conta Instagram conectada** (veja [INSTAGRAM.md](INSTAGRAM.md)).
