# InstaSearch Backend API

## Rotas Disponíveis

### Health Check
- `GET /api/health` - Verificar status da API

### Dashboard
- `GET /api/dashboard/overview` - Visão geral (estatísticas)

### Perfis
- `GET /api/profiles` - Listar perfis
- `GET /api/profiles/stats` - Estatísticas de perfis
- `GET /api/profiles/:id` - Detalhes de um perfil
- `POST /api/profiles` - Adicionar novo perfil
- `DELETE /api/profiles/:id` - Remover perfil
- `POST /api/profiles/:id/refresh` - Forçar nova análise

### Análises
- `POST /api/analysis/start` - Iniciar nova análise
- `GET /api/analysis` - Listar análises
- `GET /api/analysis/stats` - Estatísticas de análises
- `GET /api/analysis/:id` - Detalhes de uma análise
- `GET /api/analysis/profile/:profileId` - Análises de um perfil

### Conteúdo
- `POST /api/content/generate` - Gerar novo conteúdo
- `GET /api/content` - Listar conteúdo
- `GET /api/content/stats` - Estatísticas de conteúdo
- `GET /api/content/:id` - Detalhes de um conteúdo
- `PUT /api/content/:id` - Editar conteúdo
- `POST /api/content/:id/approve` - Aprovar conteúdo
- `DELETE /api/content/:id` - Deletar conteúdo

### Postagens
- `POST /api/posts/schedule` - Agendar postagem
- `GET /api/posts` - Listar postagens
- `GET /api/posts/upcoming` - Próximas postagens
- `GET /api/posts/:id` - Detalhes de uma postagem
- `GET /api/posts/:id/stats` - Estatísticas de uma postagem
- `PUT /api/posts/:id` - Atualizar postagem agendada
- `DELETE /api/posts/:id` - Cancelar postagem

### Scheduler (Agendamento Automático)
- `GET /api/scheduler/status` - Status do scheduler e próximos posts
- `POST /api/scheduler/publish/:id` - Publicar post agendado imediatamente
- `PUT /api/scheduler/reschedule/:id` - Reagendar um post
- `DELETE /api/scheduler/cancel/:id` - Cancelar agendamento

### Instagram (Autenticação e Conexão)
- `GET /api/instagram/auth-url` - Gerar URL de autorização OAuth
- `GET /api/instagram/callback` - Callback OAuth após autorização
- `POST /api/instagram/connect-token` - Conectar conta com token manual
- `GET /api/instagram/account` - Buscar conta Instagram conectada
- `DELETE /api/instagram/account` - Desconectar conta Instagram
- `POST /api/instagram/account/refresh` - Atualizar dados da conta