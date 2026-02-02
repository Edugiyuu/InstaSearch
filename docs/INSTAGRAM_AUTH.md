# 📷 Configuração da Autenticação Instagram

Este guia explica como configurar a autenticação OAuth do Instagram usando **Instagram Graph API** para conectar sua conta ao InstaSearch.

## ⚠️ AVISO IMPORTANTE

**A Instagram Basic Display API foi descontinuada em 4 de dezembro de 2024.**

Este projeto agora usa a **Instagram Graph API**, que requer:
- Conta Instagram **Business** ou **Creator** (não funciona com conta pessoal)
- Página do Facebook vinculada
- App aprovado no Meta for Developers

## 📋 Pré-requisitos

- Conta do Facebook/Meta Developers
- Página do Facebook criada
- Conta do Instagram convertida para Business ou Creator
- Instagram vinculado à Página do Facebook

## 🚀 Passo a Passo

### 1. Criar Aplicativo no Meta for Developers

1. Acesse [Meta for Developers](https://developers.facebook.com/)
2. Faça login com sua conta do Facebook
3. Clique em **"My Apps"** → **"Create App"**
4. Selecione o tipo **"Business"**
5. Preencha os dados:
   - **App Name:** InstaSearch (ou qualquer nome)
   - **App Contact Email:** seu email
   - **Business Account:** selecione ou crie uma
6. Clique em **"Create App"**

### 2. Adicionar Produto Instagram Graph API

1. No dashboard do app, vá em **"Add Products"**
2. Encontre **"Instagram Graph API"** e clique em **"Set Up"**
3. Siga as instruções de configuração

### 3. Configurar OAuth e Permissões

1. Vá em **App Settings** → **Basic**
2. Adicione em **App Domains**:
   ```
   localhost
   ```
3. Clique em **Add Platform** → **Website**
4. Em **Site URL** adicione:
   ```
   http://localhost:3000
   ```

5. Vá em **Instagram Graph API** → **Settings**
6. Em **Valid OAuth Redirect URIs** adicione:
   ```
   http://localhost:3000/api/instagram/callback
   https://seudominio.com/api/instagram/callback
   ```

7. Clique em **Save Changes**

### 4. Conectar Instagram Business Account

1. Vá em **Instagram Graph API** → **Tools**
2. Em **User Token Generator**, selecione sua Página
3. Marque as permissões:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_show_list`
   - `pages_read_engagement`
4. Clique em **Generate Token**
5. Autorize o acesso

### 5. Obter Credenciais

1. No menu **"Instagram Basic Display"** → **"Basic Display"**
2. Copie as credenciais:
   - **Instagram App ID** (Client ID)
   - **Instagram App Secret** (Client Secret)

### 6. Configurar Variáveis de Ambiente

1. No backend do projeto, copie o arquivo `.env.example`:
   ```bash
   cd backend
   cp .env.example .env
   ```

2. Edite o arquivo `.env` e adicione suas credenciais:
   ```env
   INSTAGRAM_CLIENT_ID=seu_instagram_app_id_aqui
   INSTAGRAM_CLIENT_SECRET=seu_instagram_app_secret_aqui
   INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
   ```

### 7. Adicionar Testadores

1. No dashboard, vá em **"Roles"** → **"Instagram Testers"**
2. Clique em **"Add Instagram Testers"**
3. Digite o username da sua conta Instagram
4. No Instagram:
   - Vá em **Settings** → **Apps and Websites** → **Tester Invites**
   - Aceite o convite

## 🔧 Como Usar

### 1. Iniciar os Servidores

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 2. Conectar Conta

1. Acesse http://localhost:5173/settings
2. Clique em **"Conectar Instagram"**
3. Você será redirecionado para o Instagram
4. Autorize o aplicativo
5. Você será redirecionado de volta para o app conectado!

## 📊 O que é Armazenado

Quando você conecta sua conta, o sistema armazena:

```typescript
{
  id: "igacc_xxxxx",
  userId: "default_user",
  username: "seu_username",
  accessToken: "token_de_acesso", // criptografado
  expiresAt: "2026-04-01T...",
  profile: {
    name: "Seu Nome",
    followersCount: 1234,
    followsCount: 567,
    mediaCount: 89
  },
  status: "connected"
}
```

## 🔐 Segurança

- ✅ Tokens são armazenados localmente em arquivos JSON
- ✅ Tokens NÃO são expostos para o frontend
- ✅ Tokens são renovados automaticamente antes de expirar
- ✅ Sistema verifica expiração em cada requisição

## 🔄 Renovação de Token

Os tokens do Instagram expiram após 60 dias. O sistema:

1. Verifica a expiração antes de cada uso
2. Renova automaticamente se estiver perto de expirar (< 7 dias)
3. Atualiza o token no storage
4. Marca como "expired" se a renovação falhar

## 📝 Escopos Disponíveis

### Instagram Graph API (Atual)
- `instagram_basic` - Acesso básico ao perfil e mídia
- `instagram_content_publish` - Publicar fotos/vídeos/stories
- `instagram_manage_comments` - Gerenciar comentários
- `instagram_manage_insights` - Ver métricas e insights
- `pages_show_list` - Listar páginas do Facebook
- `pages_read_engagement` - Ler engajamento da página
- `business_management` - Gerenciar conta business

### ❌ Basic Display API (Descontinuada)
- Não use mais! Foi descontinuada em 4 de dezembro de 2024

## 🐛 Troubleshooting

### Erro: "Redirect URI Mismatch"
- Verifique se a URI está exatamente igual no Meta Developers
- Não use trailing slash: ✗ `/callback/` ✓ `/callback`

### Erro: "Invalid Client ID"
- Confirme que copiou o Client ID correto
- Verifique se não há espaços extras no `.env`

### Erro: "User Not a Tester"
- Adicione sua conta como testador no dashboard
- Aceite o convite no Instagram

### Token Expira Rápido
- Certifique-se de usar Instagram Basic Display (tokens de 60 dias)
- Não use tokens de curta duração

## 🔗 Links Úteis

- [Meta for Developers](https://developers.facebook.com/)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [OAuth Redirect Flow](https://developers.facebook.com/docs/instagram-basic-display-api/guides/getting-access-tokens-and-permissions)

## 📞 Suporte

Se tiver problemas:
1. Verifique os logs no console do backend
2. Verifique se as variáveis de ambiente estão corretas
3. Confirme que sua conta está como testador
4. Revise as configurações no Meta Developers

---

**Nota:** Este sistema usa Instagram Graph API para produção. Você precisa de:
- Conta Instagram **Business** ou **Creator**
- Página do Facebook vinculada
- App aprovado (modo Development OK para testes)
