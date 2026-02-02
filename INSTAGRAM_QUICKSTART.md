# 🚀 Quick Start - Conexão com Instagram

## ⚠️ IMPORTANTE: Instagram Graph API

**A Basic Display API foi descontinuada em 4/12/2024.**

Agora você precisa usar **Instagram Graph API** que requer:
- ✅ Conta Instagram **Business** ou **Creator**
- ✅ Página do Facebook vinculada
- ❌ NÃO funciona com conta pessoal

## Como Conectar sua Conta do Instagram

### 1️⃣ Converter para Business/Creator

**No app do Instagram:**
1. Configurações → Conta
2. "Mudar para Conta Profissional"
3. Escolha Business ou Creator
4. Vincule à sua Página do Facebook

### 2️⃣ Configurar Credenciais

1. Acesse [Meta for Developers](https://developers.facebook.com/) e crie um app
2. Configure **Instagram Graph API** (NÃO Basic Display!)
3. Copie o arquivo `.env.example` para `.env` no backend:
   ```bash
   cd backend
   cp .env.example .env
   ```
4. Adicione suas credenciais no `.env`:
   ```env
   INSTAGRAM_CLIENT_ID=seu_app_id
   INSTAGRAM_CLIENT_SECRET=seu_app_secret
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
   ```

> 📖 **Guia Completo:** Veja [INSTAGRAM_AUTH.md](INSTAGRAM_AUTH.md) para instruções detalhadas

### 2️⃣ Iniciar os Servidores

```bash
# Terminal 1 - Backend
cd backend
npm install
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm install
npm run dev
```

### 3️⃣ Conectar no App

1. Abra http://localhost:5173
2. Vá em **Settings** (⚙️)
3. Clique em **"📷 Conectar Instagram"**
4. Autorize o app no Instagram
5. Pronto! Você será redirecionado de volta conectado ✅

## 🎯 O que Você Pode Fazer Agora

### ✅ Conta Conectada
- Ver informações do perfil (nome, username, avatar)
- Ver métricas (seguidores, seguindo, posts)
- Atualizar dados do perfil
- Desconectar a conta

### 🔄 Renovação Automática
O sistema automaticamente:
- Verifica se o token está expirando
- Renova o token antes de expirar (< 7 dias)
- Mantém sua conta sempre conectada

### 🔐 Segurança
- Tokens são armazenados localmente
- Não são expostos para o frontend
- Criptografia no armazenamento

## 📁 Novos Arquivos Criados

### Backend
```
backend/
├── .env.example                                    # Template de variáveis
├── src/
│   ├── controllers/
│   │   └── instagramAuthController.ts             # 5 endpoints OAuth
│   ├── services/
│   │   ├── instagramAuthService.ts                # Lógica OAuth
│   │   └── storage/
│   │       └── InstagramAccountStorage.ts         # Armazenamento
│   └── routes/
│       └── api.ts                                  # +5 rotas Instagram
```

### Frontend
```
frontend/
├── src/
│   ├── hooks/
│   │   └── useInstagram.ts                        # Hook de conexão
│   └── pages/
│       ├── Settings.tsx                            # UI atualizada
│       └── Settings.css                            # Estilos novos
```

### Documentação
```
├── INSTAGRAM_AUTH.md                               # Guia completo OAuth
└── PROGRESS.md                                     # Atualizado
```

## 🌐 Endpoints da API

### Instagram OAuth
```
GET    /api/instagram/auth-url      # Gerar URL OAuth
GET    /api/instagram/callback      # Receber callback
GET    /api/instagram/account       # Buscar conta conectada
DELETE /api/instagram/account       # Desconectar conta
POST   /api/instagram/account/refresh  # Atualizar dados
```

## 📸 Interface

A página de Settings agora mostra:

**Quando NÃO conectado:**
```
┌─────────────────────────────────────┐
│  Status da Conexão                  │
│  Conecte sua conta do Instagram     │
│                                      │
│         [📷 Conectar Instagram]     │
└─────────────────────────────────────┘
```

**Quando CONECTADO:**
```
┌─────────────────────────────────────────┐
│  [Avatar]  @username                    │
│            Nome Completo                │
│            ✓ Conectado                  │
│                                         │
│  ┌─────┬─────────┬──────┐             │
│  │1.2K │  345    │ 89   │             │
│  │Segui│Seguindo │Posts │             │
│  └─────┴─────────┴──────┘             │
│                                         │
│  Conectado em: 01/02/2026 14:30       │
│  Token expira: 01/04/2026 14:30       │
│                                         │
│  [🔄 Atualizar]  [✗ Desconectar]      │
└─────────────────────────────────────────┘
```

## 🐛 Problemas Comuns

### "Redirect URI Mismatch"
✅ Verifique se a URI no Meta Developers está igual ao `.env`

### "Invalid Client ID"  
✅ Confirme que copiou as credenciais corretas

### "User Not a Tester"
✅ Adicione sua conta como testador no dashboard do Meta

## 📚 Próximos Passos

Agora que sua conta está conectada, você pode:

1. **Publicar Conteúdo** - Use o token para postar no Instagram
2. **Buscar Métricas** - Obter dados de alcance e engajamento
3. **Automatizar Posts** - Agendar publicações automáticas
4. **Analisar Perfil** - Usar IA para analisar seu conteúdo

---

**Precisa de Ajuda?** Veja [INSTAGRAM_AUTH.md](INSTAGRAM_AUTH.md) para o guia completo!
