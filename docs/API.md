# API Documentation - InstaSearch

## 📡 Visão Geral

A API do InstaSearch segue os princípios REST e utiliza JSON para todas as requisições e respostas.

**Base URL**: `http://localhost:3000/api`

**Autenticação**: Bearer Token (JWT)

## 🔐 Autenticação

### POST /auth/login

Autentica um usuário e retorna um JWT token.

**Request**:
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_123",
      "email": "usuario@email.com",
      "name": "Usuário"
    }
  }
}
```

### POST /auth/register

Registra um novo usuário.

**Request**:
```json
{
  "name": "Novo Usuário",
  "email": "novo@email.com",
  "password": "senha123"
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "user_124",
      "email": "novo@email.com",
      "name": "Novo Usuário"
    }
  }
}
```

### POST /auth/refresh

Renova o access token usando o refresh token.

**Request**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 👤 Perfis de Referência

### POST /profiles

Adiciona um novo perfil de referência para análise.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "username": "perfil_referencia",
  "tags": ["tecnologia", "inovação"]
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "profile_123",
    "username": "perfil_referencia",
    "status": "pending",
    "tags": ["tecnologia", "inovação"],
    "addedAt": "2026-01-30T10:00:00Z"
  }
}
```

### GET /profiles

Lista todos os perfis de referência.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): 'pending', 'analyzing', 'completed', 'error'
- `tags` (string, optional): filtro por tags

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profiles": [
      {
        "id": "profile_123",
        "username": "perfil_referencia",
        "fullName": "Perfil de Referência",
        "bio": "Bio do perfil...",
        "metrics": {
          "followers": 150000,
          "following": 500,
          "posts": 320
        },
        "status": "completed",
        "tags": ["tecnologia", "inovação"],
        "lastAnalyzed": "2026-01-30T09:00:00Z",
        "addedAt": "2026-01-29T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 15,
      "pages": 2
    }
  }
}
```

### GET /profiles/:id

Obtém detalhes de um perfil específico.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "profile_123",
    "username": "perfil_referencia",
    "fullName": "Perfil de Referência",
    "bio": "Bio do perfil...",
    "profilePicUrl": "https://...",
    "isVerified": true,
    "category": "Technology",
    "metrics": {
      "followers": 150000,
      "following": 500,
      "posts": 320
    },
    "reels": {
      "count": 45,
      "avgLikes": 15000,
      "avgComments": 450,
      "avgViews": 250000
    },
    "status": "completed",
    "tags": ["tecnologia", "inovação"],
    "lastAnalyzed": "2026-01-30T09:00:00Z",
    "addedAt": "2026-01-29T10:00:00Z"
  }
}
```

### DELETE /profiles/:id

Remove um perfil de referência.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Profile deleted successfully"
}
```

### POST /profiles/:id/refresh

Força uma nova análise do perfil.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "profile_123",
    "status": "analyzing",
    "message": "Analysis started"
  }
}
```

---

## 📊 Análises

### POST /analysis/start

Inicia uma nova análise baseada nos perfis selecionados.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "profileIds": ["profile_123", "profile_124"],
  "type": "comprehensive",
  "options": {
    "includeHashtags": true,
    "includeTrends": true,
    "includeEngagementPatterns": true
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "analysis_456",
    "profileIds": ["profile_123", "profile_124"],
    "status": "processing",
    "estimatedTimeMinutes": 5,
    "createdAt": "2026-01-30T10:00:00Z"
  }
}
```

### GET /analysis/:id

Obtém os resultados de uma análise.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "analysis_456",
    "profileIds": ["profile_123", "profile_124"],
    "status": "completed",
    "results": {
      "themes": [
        {
          "name": "Tecnologia",
          "frequency": 0.65,
          "keywords": ["IA", "tecnologia", "inovação", "futuro"]
        },
        {
          "name": "Educação",
          "frequency": 0.35,
          "keywords": ["tutorial", "aprender", "dica", "conhecimento"]
        }
      ],
      "contentTypes": [
        {
          "type": "Tutorial",
          "percentage": 45,
          "avgEngagement": 18500
        },
        {
          "type": "Entretenimento",
          "percentage": 35,
          "avgEngagement": 22000
        },
        {
          "type": "Informativo",
          "percentage": 20,
          "avgEngagement": 15000
        }
      ],
      "engagementPatterns": {
        "bestPostingTimes": [
          {"day": "Tuesday", "hour": 18, "score": 0.92},
          {"day": "Thursday", "hour": 19, "score": 0.89}
        ],
        "optimalDuration": {
          "min": 15,
          "max": 30,
          "unit": "seconds"
        },
        "topHashtags": [
          {"tag": "tecnologia", "count": 85, "avgEngagement": 17500},
          {"tag": "ia", "count": 67, "avgEngagement": 19000}
        ]
      },
      "viralPatterns": [
        {
          "pattern": "Hook nos primeiros 3 segundos",
          "examples": ["profile_123_reel_45", "profile_124_reel_23"],
          "successRate": 0.78
        },
        {
          "pattern": "Uso de música trending",
          "examples": ["profile_123_reel_52"],
          "successRate": 0.65
        }
      ],
      "insights": [
        "Conteúdo educativo tem 30% mais engajamento quando postado às terças-feiras",
        "Reels entre 15-30 segundos têm melhor performance",
        "Uso de perguntas no início do vídeo aumenta retenção em 45%"
      ],
      "recommendations": [
        "Foque em tutoriais curtos (15-20 segundos)",
        "Poste terças e quintas entre 18h-20h",
        "Use hooks questionadores nos primeiros 3 segundos",
        "Inclua músicas em alta na plataforma"
      ]
    },
    "createdAt": "2026-01-30T10:00:00Z",
    "completedAt": "2026-01-30T10:05:23Z"
  }
}
```

### GET /analysis

Lista todas as análises realizadas.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): 'processing', 'completed', 'failed'

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "analyses": [
      {
        "id": "analysis_456",
        "profileCount": 2,
        "status": "completed",
        "createdAt": "2026-01-30T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 5,
      "pages": 1
    }
  }
}
```

### GET /analysis/profile/:profileId

Lista todas as análises de um perfil específico.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": [
    {
      "id": "analysis_456",
      "status": "completed",
      "createdAt": "2026-01-30T10:00:00Z"
    }
  ]
}
```

---

## 💡 Geração de Conteúdo

### POST /content/generate

Gera novas ideias de conteúdo baseadas em análises.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "analysisId": "analysis_456",
  "count": 10,
  "preferences": {
    "contentType": ["tutorial", "entertainment"],
    "duration": {"min": 15, "max": 30},
    "tone": "casual",
    "topics": ["tecnologia", "IA"]
  }
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "jobId": "gen_job_789",
    "status": "processing",
    "estimatedTimeMinutes": 3
  }
}
```

### GET /content

Lista todo o conteúdo gerado.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): 'draft', 'approved', 'scheduled', 'published'
- `sortBy` (string, optional): 'createdAt', 'scheduledFor'

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "content": [
      {
        "id": "content_101",
        "idea": {
          "title": "5 Truques de IA que Você Precisa Saber",
          "description": "Tutorial rápido sobre ferramentas de IA",
          "hook": "Você está usando IA do jeito errado! Veja isso..."
        },
        "script": "Hook: Você está usando IA do jeito errado...\n[Script completo]",
        "hashtags": ["#IA", "#tecnologia", "#tutorial", "#dicas"],
        "estimatedDuration": 25,
        "status": "draft",
        "score": 8.5,
        "createdAt": "2026-01-30T10:10:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 10,
      "pages": 1
    }
  }
}
```

### GET /content/:id

Obtém detalhes de um conteúdo específico.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "content_101",
    "analysisId": "analysis_456",
    "idea": {
      "title": "5 Truques de IA que Você Precisa Saber",
      "description": "Tutorial rápido sobre ferramentas de IA que vão facilitar sua vida",
      "hook": "Você está usando IA do jeito errado! Veja isso...",
      "targetAudience": "Profissionais de tecnologia, estudantes"
    },
    "script": {
      "hook": "Você está usando IA do jeito errado! Veja isso...",
      "body": "[Script detalhado com timing]",
      "cta": "Salve esse post e compartilhe com quem precisa!",
      "estimatedDuration": 25
    },
    "visualSuggestions": [
      "Começar com tela preta e texto chamativo",
      "Transições rápidas entre exemplos",
      "Usar split screen para antes/depois"
    ],
    "hashtags": ["#IA", "#tecnologia", "#tutorial", "#dicas", "#produtividade"],
    "musicSuggestions": [
      {
        "name": "Original Sound - Trending",
        "reason": "Alta no momento, combina com tutorial"
      }
    ],
    "status": "draft",
    "score": 8.5,
    "metadata": {
      "basedOnProfiles": ["profile_123", "profile_124"],
      "similarContent": ["content_98", "content_87"]
    },
    "createdAt": "2026-01-30T10:10:00Z"
  }
}
```

### PUT /content/:id

Edita um conteúdo gerado.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "idea": {
    "title": "5 Truques de IA que Você DEVE Saber"
  },
  "script": "Script editado...",
  "hashtags": ["#IA", "#tecnologia", "#tutorial"]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "content_101",
    "updated": true
  }
}
```

### POST /content/:id/approve

Aprova um conteúdo para publicação.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "content_101",
    "status": "approved"
  }
}
```

### DELETE /content/:id

Deleta um conteúdo gerado.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Content deleted successfully"
}
```

---

## 📅 Publicações

### POST /posts/schedule

Agenda uma publicação no Instagram.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "contentId": "content_101",
  "scheduledFor": "2026-01-31T18:00:00Z",
  "media": {
    "type": "reel",
    "videoUrl": "https://...",
    "thumbnailUrl": "https://..."
  },
  "caption": "5 Truques de IA que Você Precisa Saber 🤖✨\n\n#IA #tecnologia",
  "location": null
}
```

**Response** (201 Created):
```json
{
  "success": true,
  "data": {
    "id": "post_202",
    "contentId": "content_101",
    "status": "scheduled",
    "scheduledFor": "2026-01-31T18:00:00Z",
    "createdAt": "2026-01-30T10:15:00Z"
  }
}
```

### GET /posts

Lista todas as publicações.

**Headers**:
```
Authorization: Bearer {token}
```

**Query Parameters**:
- `page` (number, default: 1)
- `limit` (number, default: 10)
- `status` (string, optional): 'scheduled', 'published', 'failed'

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "posts": [
      {
        "id": "post_202",
        "contentId": "content_101",
        "status": "published",
        "scheduledFor": "2026-01-31T18:00:00Z",
        "publishedAt": "2026-01-31T18:00:15Z",
        "instagramPostId": "18123456789",
        "metrics": {
          "likes": 1250,
          "comments": 43,
          "views": 15000,
          "shares": 89,
          "saves": 234
        },
        "lastUpdated": "2026-01-31T20:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 3,
      "pages": 1
    }
  }
}
```

### GET /posts/:id

Obtém detalhes de uma publicação.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "post_202",
    "contentId": "content_101",
    "status": "published",
    "scheduledFor": "2026-01-31T18:00:00Z",
    "publishedAt": "2026-01-31T18:00:15Z",
    "instagramPostId": "18123456789",
    "instagramUrl": "https://www.instagram.com/reel/...",
    "caption": "5 Truques de IA que Você Precisa Saber...",
    "metrics": {
      "likes": 1250,
      "comments": 43,
      "views": 15000,
      "shares": 89,
      "saves": 234,
      "reach": 12500,
      "impressions": 18000
    },
    "metricsHistory": [
      {
        "timestamp": "2026-01-31T19:00:00Z",
        "likes": 250,
        "views": 3000
      },
      {
        "timestamp": "2026-01-31T20:00:00Z",
        "likes": 750,
        "views": 8000
      }
    ],
    "lastUpdated": "2026-01-31T20:00:00Z"
  }
}
```

### GET /posts/:id/stats

Obtém estatísticas detalhadas de uma publicação.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "post_202",
    "metrics": {
      "engagement": {
        "rate": 0.085,
        "total": 1616
      },
      "likes": 1250,
      "comments": 43,
      "views": 15000,
      "shares": 89,
      "saves": 234,
      "reach": 12500,
      "impressions": 18000
    },
    "demographics": {
      "topCountries": ["BR", "US", "PT"],
      "topCities": ["São Paulo", "Rio de Janeiro"],
      "ageRanges": {
        "18-24": 0.35,
        "25-34": 0.45,
        "35-44": 0.15,
        "45+": 0.05
      },
      "gender": {
        "male": 0.60,
        "female": 0.38,
        "other": 0.02
      }
    },
    "performance": {
      "comparedToAverage": {
        "likes": 1.25,
        "comments": 1.15,
        "views": 1.35
      },
      "peakTime": "2026-01-31T19:30:00Z",
      "growthRate": "high"
    }
  }
}
```

### PUT /posts/:id

Atualiza uma publicação agendada.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "scheduledFor": "2026-02-01T18:00:00Z",
  "caption": "Nova legenda atualizada..."
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "id": "post_202",
    "updated": true
  }
}
```

### DELETE /posts/:id

Cancela uma publicação agendada.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Post cancelled successfully"
}
```

---

## 🎥 Publicação de Vídeos (Reels)

### POST /videos/upload

Upload de 1 a 3 vídeos para junção e publicação.

**Headers**:
```
Content-Type: multipart/form-data
```

**Request**:
```
videos: File[]  // 1 a 3 arquivos de vídeo
```

**Response** (200 OK):
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

**Validações**:
- Formato: .mp4, .mov, .avi, .mkv
- Tamanho: Máximo 50MB por arquivo
- Duração: Máximo 30 segundos por vídeo
- Quantidade: 1 a 3 vídeos

### POST /videos/merge

Juntar múltiplos vídeos em um único arquivo.

**Headers**:
```
Content-Type: application/json
```

**Request**:
```json
{
  "filenames": [
    "video_1738710530123_456789.mp4",
    "video_1738710530456_123456.mp4"
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "filename": "merged_1738710600000.mp4",
    "path": "/data/videos/output/merged_1738710600000.mp4"
  }
}
```

**Notas**:
- Mínimo: 2 vídeos
- Máximo: 3 vídeos
- Vídeos originais são deletados após merge bem-sucedido
- Processamento via FFmpeg (1080x1920, 30fps)

### POST /videos/publish-reel

Publicar reel no Instagram.

**Headers**:
```
Content-Type: application/json
```

**Request**:
```json
{
  "filename": "merged_1738710600000.mp4",
  "caption": "Confira meu novo reel! 🎥",
  "hashtags": "video instagram reels viral"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "mediaId": "17924567890123456",
    "message": "Reel publicado com sucesso!"
  }
}
```

**Fluxo**:
1. Upload do vídeo para Cloudinary (CDN público)
2. Criação de container de mídia no Instagram
3. Polling até vídeo ser processado (max 60s)
4. Publicação do reel
5. Deleção do arquivo local

### DELETE /videos/:filename

Deletar arquivo temporário.

**Headers**:
```
Content-Type: application/json
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Arquivo deletado com sucesso"
}
```

---

## ⚙️ Configurações

### GET /settings

Obtém configurações do usuário.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "instagram": {
      "connected": true,
      "username": "minha_conta",
      "accountId": "123456789"
    },
    "preferences": {
      "autoAnalyze": true,
      "notifyOnComplete": true,
      "defaultContentCount": 10
    },
    "limits": {
      "maxProfiles": 50,
      "maxAnalysesPerDay": 10,
      "maxGenerationsPerDay": 50
    }
  }
}
```

### PUT /settings

Atualiza configurações.

**Headers**:
```
Authorization: Bearer {token}
```

**Request**:
```json
{
  "preferences": {
    "autoAnalyze": false,
    "defaultContentCount": 15
  }
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Settings updated successfully"
}
```

---

## 📈 Dashboard e Estatísticas

### GET /dashboard/overview

Obtém visão geral do dashboard.

**Headers**:
```
Authorization: Bearer {token}
```

**Response** (200 OK):
```json
{
  "success": true,
  "data": {
    "profiles": {
      "total": 15,
      "active": 12,
      "analyzing": 2
    },
    "content": {
      "total": 87,
      "drafts": 10,
      "scheduled": 5,
      "published": 72
    },
    "performance": {
      "totalViews": 1250000,
      "totalLikes": 85000,
      "avgEngagementRate": 0.078,
      "topPost": {
        "id": "post_150",
        "views": 50000
      }
    },
    "recentActivity": [
      {
        "type": "analysis_completed",
        "message": "Análise de 2 perfis concluída",
        "timestamp": "2026-01-30T10:00:00Z"
      }
    ]
  }
}
```

---

## 🚨 Códigos de Erro

### 400 Bad Request
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "username",
        "message": "Username is required"
      }
    ]
  }
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to access this resource"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 429 Too Many Requests
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please try again later.",
    "retryAfter": 3600
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req_xyz123"
  }
}
```

---

## 📝 Notas

- Todas as datas seguem o formato ISO 8601 (UTC)
- Rate limits: 100 requisições por 15 minutos por IP
- Tokens JWT expiram em 7 dias
- Refresh tokens expiram em 30 dias
- Tamanho máximo de upload: 100MB
- Formatos de vídeo suportados: MP4, MOV
- Formatos de imagem suportados: JPG, PNG

---

**Documentação gerada em: 30/01/2026**
