# 🎥 Publicar Reels - Sistema de Upload e Merge de Vídeos

## 📋 Visão Geral

Sistema completo para upload, junção (merge) e publicação de vídeos no Instagram como Reels. Permite enviar até 3 vídeos, opcionalmente mesclá-los em um único vídeo, e publicar diretamente no Instagram com legenda e hashtags.

## ✨ Funcionalidades

### 1. Upload de Vídeos
- **Múltiplos Arquivos**: Suporte para 1-3 vídeos por upload
- **Formatos Suportados**: MP4, MOV, AVI, MKV
- **Limite de Tamanho**: 50MB por arquivo
- **Duração Máxima**: 30 segundos por vídeo
- **Validação Automática**: Verifica formato, tamanho e duração antes do processamento

### 2. Merge de Vídeos
- **FFmpeg Integration**: Processamento profissional de vídeo
- **Concatenação Sequencial**: Junta vídeos na ordem de upload
- **Otimização Automática**: 
  - Resolução: 1080x1920 (9:16 - formato Instagram)
  - Frame Rate: 30fps
  - Codec: libx264
  - Qualidade: Balanceada para Instagram

### 3. Publicação no Instagram
- **Upload para Cloudinary**: Vídeos hospedados temporariamente em CDN
- **Instagram Graph API**: Integração oficial v18.0
- **Reels Container**: Criação de mídia com caption e hashtags
- **Processamento Assíncrono**: Polling até vídeo estar pronto
- **Publicação Automática**: Envio direto para feed + reels

### 4. Interface Drag-and-Drop
- **Área de Upload Visual**: Arraste e solte vídeos
- **Prévia de Vídeos**: Lista com duração e tamanho
- **Formulário de Publicação**: Caption + hashtags customizáveis
- **Feedback em Tempo Real**: Loading states e mensagens de sucesso/erro

## 🏗️ Arquitetura

### Backend

```
┌─────────────────────────────────────────┐
│       VideoController                   │
│  ┌─────────────────────────────────┐   │
│  │ POST /api/videos/upload         │   │
│  │ POST /api/videos/merge          │   │
│  │ POST /api/videos/publish-reel   │   │
│  │ DELETE /api/videos/:filename    │   │
│  └─────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────┐
│          VideoService                    │
│  ┌──────────────────────────────────┐   │
│  │ validateVideo()                  │   │
│  │ mergeVideos() - FFmpeg concat    │   │
│  │ optimizeVideo() - 1080x1920      │   │
│  │ deleteFile()                     │   │
│  └──────────────────────────────────┘   │
└──────────────┬───────────────────────────┘
               │
        ┌──────┴──────┐
        ▼             ▼
┌───────────────┐ ┌──────────────────┐
│   Cloudinary  │ │ Instagram Graph  │
│   (Storage)   │ │   API v18.0      │
└───────────────┘ └──────────────────┘
```

### Frontend

```
┌─────────────────────────────────────┐
│      VideoPublish.tsx               │
│  ┌──────────────────────────────┐  │
│  │ Dropzone (drag-and-drop)     │  │
│  │ VideoList (preview + delete) │  │
│  │ MergeButton (2-3 videos)     │  │
│  │ PublishForm (caption + tags) │  │
│  └──────────────────────────────┘  │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│     useVideoPublish Hook            │
│  ┌──────────────────────────────┐  │
│  │ uploadVideos()               │  │
│  │ mergeVideos()                │  │
│  │ publishReel()                │  │
│  │ deleteVideo()                │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 🔧 Configuração

### 1. Instalar FFmpeg

**Windows:**
```powershell
# Via Chocolatey
choco install ffmpeg

# Ou baixar manualmente de https://ffmpeg.org/download.html
```

**macOS:**
```bash
brew install ffmpeg
```

**Linux:**
```bash
sudo apt install ffmpeg  # Debian/Ubuntu
sudo yum install ffmpeg  # RedHat/CentOS
```

### 2. Configurar Cloudinary

1. Crie conta gratuita em: https://cloudinary.com/users/register_free
2. Acesse Dashboard e copie as credenciais
3. Adicione no `.env`:

```env
CLOUDINARY_CLOUD_NAME=seu_cloud_name
CLOUDINARY_API_KEY=sua_api_key
CLOUDINARY_API_SECRET=seu_api_secret
```

### 3. Conectar Instagram

Certifique-se de ter uma conta Instagram conectada via OAuth ou token manual (veja [INSTAGRAM_QUICKSTART.md](INSTAGRAM_QUICKSTART.md))

## 📡 API Endpoints

### POST /api/videos/upload

Upload de 1-3 vídeos.

**Request:**
```
Content-Type: multipart/form-data

videos: File[]  // 1 a 3 arquivos de vídeo
```

**Response:**
```json
{
  "success": true,
  "data": {
    "videos": [
      {
        "filename": "video_1738710530123_456789.mp4",
        "originalName": "meu-video.mp4",
        "path": "/data/videos/temp/video_1738710530123_456789.mp4",
        "size": 15728640,
        "duration": 12.5
      }
    ],
    "count": 1,
    "totalDuration": 12.5
  }
}
```

**Validações:**
- Formato: .mp4, .mov, .avi, .mkv
- Tamanho: Máximo 50MB por arquivo
- Duração: Máximo 30 segundos por vídeo
- Quantidade: 1 a 3 vídeos

---

### POST /api/videos/merge

Juntar múltiplos vídeos em um único arquivo.

**Request:**
```json
{
  "filenames": [
    "video_1738710530123_456789.mp4",
    "video_1738710530456_123456.mp4"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "filename": "merged_1738710600000.mp4",
    "path": "/data/videos/output/merged_1738710600000.mp4"
  }
}
```

**Notas:**
- Mínimo: 2 vídeos
- Máximo: 3 vídeos
- Vídeos originais são deletados após merge bem-sucedido
- Processamento via FFmpeg com codec libx264
- Saída otimizada para Instagram (1080x1920, 30fps)

---

### POST /api/videos/publish-reel

Publicar reel no Instagram.

**Request:**
```json
{
  "filename": "merged_1738710600000.mp4",
  "caption": "Confira meu novo reel! 🎥",
  "hashtags": "video instagram reels viral"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "mediaId": "17924567890123456",
    "message": "Reel publicado com sucesso!"
  }
}
```

**Fluxo de Publicação:**
1. Upload do vídeo para Cloudinary (CDN público)
2. Criação de container de mídia no Instagram (Graph API)
3. Polling até vídeo ser processado (max 30 tentativas, 2s cada)
4. Publicação do reel no feed + reels
5. Deleção do arquivo local temporário

**Hashtags:**
- Separadas por espaço na request
- Automaticamente formatadas com `#` se não tiverem
- Adicionadas ao final da caption

---

### DELETE /api/videos/:filename

Deletar arquivo temporário.

**Request:**
```
DELETE /api/videos/video_1738710530123_456789.mp4
```

**Response:**
```json
{
  "success": true,
  "message": "Arquivo deletado com sucesso"
}
```

## 💻 Uso no Frontend

### Página Video Publish

Acesse via: http://localhost:5173/video-publish

**Fluxo de Trabalho:**

1. **Upload (1 vídeo):**
   - Arraste ou clique para selecionar 1 vídeo
   - Aguarde validação automática
   - Preencha caption e hashtags
   - Clique em "📱 Publicar no Instagram"

2. **Upload + Merge (2-3 vídeos):**
   - Arraste ou clique para selecionar 2-3 vídeos
   - Aguarde validação automática
   - Clique em "🎬 Juntar Vídeos"
   - Aguarde processamento do merge
   - Preencha caption e hashtags
   - Clique em "📱 Publicar no Instagram"

### Hook useVideoPublish

```typescript
import { useVideoPublish } from '../hooks/useVideoPublish';

function MyComponent() {
  const {
    videos,
    mergedVideo,
    isLoading,
    error,
    successMessage,
    needsMerge,
    canPublish,
    totalDuration,
    uploadVideos,
    mergeVideos,
    publishReel,
    deleteVideo,
    reset
  } = useVideoPublish();

  // Upload
  const handleUpload = async (files: File[]) => {
    await uploadVideos(files);
  };

  // Merge
  const handleMerge = async () => {
    await mergeVideos();
  };

  // Publish
  const handlePublish = async (caption: string, hashtags: string) => {
    await publishReel(caption, hashtags);
  };

  return (
    // ... sua UI
  );
}
```

## 🎨 Estilos CSS

Variáveis disponíveis em `VideoPublish.css`:

- `.dropzone` - Área de drag-and-drop
- `.video-card` - Card de vídeo individual
- `.btn-primary` - Botão de merge/publicar
- `.btn-secondary` - Botão de ação secundária
- `.spinner` - Loading spinner grande
- `.spinner-small` - Loading spinner pequeno (botões)

## 📊 Limitações e Considerações

### Instagram API
- **Formato**: Apenas vídeos verticais (9:16) ou quadrados
- **Duração**: 3s - 90s (reels)
- **Resolução Mínima**: 500x888 pixels
- **Taxa de Bits**: Máximo 8 Mbps
- **Formato de Áudio**: AAC, 48kHz

### Cloudinary (Plano Gratuito)
- **Armazenamento**: 25 GB
- **Bandwidth**: 25 GB/mês
- **Transformações**: 25 créditos/mês
- **Uploads**: Ilimitados

### FFmpeg
- **Processamento**: ~1-5s por vídeo (depende do hardware)
- **Memória**: Requer ~200-500MB RAM durante processamento
- **CPU**: Uso intenso durante merge (1-2 cores)

## 🐛 Troubleshooting

### Erro: "FFmpeg não encontrado"
```
Solução: Instale FFmpeg e adicione ao PATH do sistema
Windows: choco install ffmpeg
macOS: brew install ffmpeg
Linux: sudo apt install ffmpeg
```

### Erro: "Cloudinary upload failed"
```
Solução: Verifique credenciais no .env
- CLOUDINARY_CLOUD_NAME
- CLOUDINARY_API_KEY
- CLOUDINARY_API_SECRET

Teste em: https://cloudinary.com/console
```

### Erro: "Instagram API error: Invalid media URL"
```
Solução: Certifique-se que o vídeo está publicamente acessível
Cloudinary deve retornar URL com HTTPS (secure_url)
Verifique logs do backend para URL gerada
```

### Erro: "Video processing timeout"
```
Solução: Vídeo muito grande ou Instagram congestionado
- Reduza tamanho/duração do vídeo (< 30s recomendado)
- Tente novamente em alguns minutos
- Verifique qualidade da internet
```

### Vídeo publicado mas não aparece no feed
```
Possíveis causas:
- Instagram ainda processando (aguarde 1-5 minutos)
- Violação de direitos autorais (música, conteúdo)
- Conta em modo restrito/shadowban

Verifique no app Instagram:
Perfil > Reels > deve aparecer em até 5 minutos
```

## 📚 Referências

- [Instagram Graph API - Publishing](https://developers.facebook.com/docs/instagram-api/guides/content-publishing)
- [FFmpeg Documentation](https://ffmpeg.org/documentation.html)
- [Cloudinary Upload API](https://cloudinary.com/documentation/upload_videos)
- [React Dropzone](https://react-dropzone.js.org/)

## 🔐 Segurança

### Boas Práticas Implementadas:
- ✅ Validação de formato de arquivo no backend
- ✅ Limite de tamanho (50MB) por arquivo
- ✅ Limite de quantidade (máx 3 vídeos)
- ✅ Validação de duração (máx 30s por vídeo)
- ✅ Deleção automática de arquivos temporários
- ✅ Tokens armazenados apenas em .env (nunca no frontend)
- ✅ CORS configurado apenas para localhost (desenvolvimento)

### Para Produção:
- [ ] Implementar autenticação JWT
- [ ] Rate limiting por usuário
- [ ] Scan de malware em uploads
- [ ] Watermarking de vídeos
- [ ] HTTPS obrigatório
- [ ] Cloudinary signed uploads

## 🚀 Próximas Melhorias

- [ ] Preview de vídeo antes do upload
- [ ] Edição básica (trim, crop, filtros)
- [ ] Agendamento de publicação
- [ ] Múltiplas contas Instagram
- [ ] Análise de métricas pós-publicação
- [ ] Templates de caption/hashtags
- [ ] Upload de thumbnail customizado
- [ ] Suporte a legendas (SRT)
