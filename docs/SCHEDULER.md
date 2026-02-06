# Sistema de Agendamento Automático

## 📅 Visão Geral

O InstaSearch possui um sistema completo de agendamento automático de postagens para Instagram. O sistema permite agendar posts para publicação futura e os publica automaticamente na hora certa.

## 🚀 Funcionalidades

### Backend

#### 1. Scheduler Service (`schedulerService.ts`)
- **Verificação Automática**: Verifica posts agendados a cada 1 minuto
- **Publicação Automática**: Publica posts quando chega a hora agendada
- **Graceful Shutdown**: Para corretamente quando o servidor é desligado
- **Logging Completo**: Registra todas as ações do scheduler

#### 2. Endpoints da API

**GET `/api/scheduler/status`**
```json
{
  "success": true,
  "data": {
    "running": true,
    "checkIntervalMinutes": 1,
    "upcomingPosts": 5,
    "nextScheduled": "2026-02-07T10:00:00Z"
  }
}
```

**POST `/api/scheduler/publish/:id`**
- Publica um post agendado imediatamente
- Útil para publicações urgentes

**PUT `/api/scheduler/reschedule/:id`**
```json
{
  "scheduledFor": "2026-02-08T15:00:00Z"
}
```

**DELETE `/api/scheduler/cancel/:id`**
- Cancela um agendamento

#### 3. Endpoints de Posts

**POST `/api/posts/schedule`**
```json
{
  "contentId": "content_xxx", // Opcional
  "caption": "Minha legenda incrível! #hashtag",
  "scheduledFor": "2026-02-07T10:00:00Z",
  "media": {
    "type": "reel",
    "videoUrl": "https://..."
  }
}
```

**GET `/api/posts/upcoming?limit=10`**
- Retorna próximos posts agendados

**PUT `/api/posts/:id`**
- Atualiza post agendado (apenas posts com status 'scheduled')

**DELETE `/api/posts/:id`**
- Cancela agendamento

### Frontend

#### 1. Página Calendar (`Calendar.tsx`)

**Visualizações Disponíveis:**
- 📅 **Calendário**: Visualização mensal com posts em cada dia
- 📋 **Lista**: Visualização detalhada por data

**Funcionalidades:**
- Navegação entre meses
- Status visual do scheduler
- Publicação imediata de posts
- Cancelamento de agendamentos
- Filtros e buscas

#### 2. Modal de Agendamento (`ScheduleModal.tsx`)

**Campos Disponíveis:**
- Seleção de conteúdo aprovado (opcional)
- Legenda (até 2200 caracteres)
- Data e hora (mínimo 5 minutos no futuro)
- Tipo de mídia (Reel ou Post)
- URL do vídeo/imagem

**Validações:**
- Data deve ser futura
- Legenda obrigatória
- Limite de caracteres

#### 3. Hook `usePosts`

```typescript
const { 
  posts, 
  loading, 
  error, 
  schedulePost,
  deletePost,
  updatePost,
  fetchUpcoming 
} = usePosts()

// Agendar novo post
await schedulePost({
  caption: "Minha legenda",
  scheduledFor: "2026-02-07T10:00:00Z",
  media: { type: "reel" }
})
```

## 🔄 Fluxo de Funcionamento

### 1. Agendamento
```
Usuário → Modal de Agendamento → API → PostStorage → Banco de Dados
```

### 2. Publicação Automática
```
Scheduler (verifica a cada 1min)
  ↓
Filtra posts com scheduledFor <= agora
  ↓
Para cada post:
  - Publica no Instagram (via Graph API)
  - Atualiza status para 'published'
  - Registra métricas iniciais
  - Atualiza conteúdo relacionado
```

### 3. Tratamento de Erros
- Se a publicação falhar, status vira 'failed'
- Erro é registrado no post
- Log completo é gerado
- Conteúdo não é atualizado

## 🎨 Interface do Usuário

### Status do Scheduler
```
🟢 Scheduler: Ativo
   3 post(s) agendado(s)
```

### Visualização de Calendário
- **Dia Atual**: Destaque visual
- **Outros Meses**: Opacidade reduzida
- **Posts por Dia**: Indicadores coloridos
  - 🔵 Azul: Agendado
  - 🟢 Verde: Publicado
  - 🔴 Vermelho: Falhou

### Ações Disponíveis
- 🚀 **Publicar Agora**: Publica imediatamente
- 📝 **Editar**: Modifica agendamento
- 🗑️ **Cancelar**: Remove agendamento

## ⚙️ Configuração

### Alterar Intervalo de Verificação

No `schedulerService.ts`:
```typescript
export const schedulerService = new SchedulerService(5) // 5 minutos
```

### Desabilitar Scheduler

No `index.ts`, comente:
```typescript
// schedulerService.start()
```

## 🔒 Segurança

### Validações Backend
- ✅ Data deve ser futura
- ✅ Campos obrigatórios validados
- ✅ Conteúdo deve existir (se fornecido)
- ✅ Apenas posts 'scheduled' podem ser editados
- ✅ Posts 'published' não podem ser deletados

### Validações Frontend
- ✅ Data mínima: 5 minutos no futuro
- ✅ Limite de caracteres na legenda
- ✅ Confirmação antes de ações destrutivas
- ✅ Mensagens de erro claras

## 📊 Estrutura de Dados

### Post Model
```typescript
interface Post {
  id: string
  contentId?: string
  instagramPostId?: string
  instagramUrl?: string
  status: 'scheduled' | 'published' | 'failed'
  caption: string
  media?: {
    type: 'reel' | 'post'
    videoUrl?: string
    imageUrl?: string
    thumbnailUrl?: string
  }
  metrics?: {
    likes: number
    comments: number
    views: number
    shares: number
    saves: number
    reach?: number
    impressions?: number
  }
  scheduledFor?: string
  publishedAt?: string
  lastUpdated: string
  error?: string
}
```

## 🚦 Estados do Post

1. **scheduled** (🔵 Azul)
   - Post aguardando publicação
   - Pode ser editado ou cancelado
   - Será publicado automaticamente

2. **published** (🟢 Verde)
   - Post já publicado no Instagram
   - Possui métricas
   - Não pode ser modificado

3. **failed** (🔴 Vermelho)
   - Publicação falhou
   - Contém mensagem de erro
   - Pode ser reagendado

## 🔮 Próximas Melhorias

- [ ] Integração real com Instagram Graph API
- [ ] Notificações push quando post é publicado
- [ ] Agendamento recorrente (todo dia X às Y horas)
- [ ] Visualização de métricas em tempo real
- [ ] Arrastar e soltar para reagendar
- [ ] Histórico de mudanças
- [ ] Aprovação em múltiplas etapas
- [ ] Templates de legendas
- [ ] Sugestão de melhores horários

## 📝 Exemplos de Uso

### Agendar um Post Simples
```typescript
await schedulePost({
  caption: "Check out our new product! 🚀 #launch",
  scheduledFor: "2026-02-07T14:00:00Z",
  media: {
    type: "post",
    imageUrl: "https://example.com/image.jpg"
  }
})
```

### Agendar um Reel com Conteúdo Aprovado
```typescript
await schedulePost({
  contentId: "content_abc123",
  caption: content.script.hook + "\n\n" + content.script.body,
  scheduledFor: "2026-02-08T18:00:00Z",
  media: {
    type: "reel",
    videoUrl: "https://example.com/video.mp4"
  }
})
```

### Publicar Imediatamente
```typescript
// Via endpoint específico
await fetch(`/api/scheduler/publish/${postId}`, {
  method: 'POST'
})
```

### Reagendar um Post
```typescript
await fetch(`/api/scheduler/reschedule/${postId}`, {
  method: 'PUT',
  body: JSON.stringify({
    scheduledFor: "2026-02-09T10:00:00Z"
  })
})
```

## 🐛 Troubleshooting

### Scheduler não está publicando posts

1. Verifique se o scheduler está rodando:
```bash
GET /api/scheduler/status
```

2. Verifique os logs do servidor:
```
🕐 Scheduler iniciado - verificando a cada 1 minuto(s)
📤 2 post(s) prontos para publicação
✅ Posts publicados: 2 sucesso, 0 falhas
```

3. Verifique se há conta do Instagram conectada:
```bash
GET /api/instagram/account
```

### Posts ficam como 'failed'

- Verifique se há uma conta do Instagram conectada
- Verifique se o token de acesso está válido
- Verifique os logs para ver o erro específico
- Certifique-se de que a mídia está acessível

### Interface não atualiza

- Clique em "Atualizar" no status do scheduler
- Recarregue a página
- Verifique o console do navegador para erros

## 📞 Suporte

Para dúvidas ou problemas, verifique:
- Logs do backend em `backend/logs/`
- Console do navegador (F12)
- Documentação da API em `/docs/API.md`
