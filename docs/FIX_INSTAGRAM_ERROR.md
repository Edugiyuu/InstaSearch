# 🔧 Como Configurar Instagram OAuth - Passo a Passo Detalhado

## ⚠️ AVISO IMPORTANTE: Basic Display API Descontinuada

**A Instagram Basic Display API foi descontinuada em 4 de dezembro de 2024.**

Agora você deve usar a **Instagram Graph API** para conectar sua conta.

## ✅ Solução Completa - Instagram Graph API

### 📋 Pré-requisitos

- Conta do Facebook/Meta
- Página do Facebook vinculada
- Conta Instagram **Business** ou **Creator** (não funciona com conta pessoal)
- Conta Instagram vinculada à Página do Facebook

### 1️⃣ Converter sua Conta Instagram para Business/Creator

**No app do Instagram:**
1. Vá em **Configurações** → **Conta**
2. Toque em **Mudar para Conta Profissional**
3. Escolha **Creator** ou **Business**
4. Vincule à sua Página do Facebook

### 2️⃣ Acessar Meta for Developers

1. Vá para https://developers.facebook.com/
2. Faça login com sua conta Facebook
3. Clique em **"My Apps"** no canto superior direito

### 3️⃣ Criar App

1. Clique em **"Create App"**
2. Escolha tipo: **"Business"**
3. Preencha:
   - **App Name:** InstaSearch (ou qualquer nome)
   - **App Contact Email:** seu email
   - **Business Account:** selecione ou crie uma
4. Clique **"Create App"**

### 4️⃣ IMPORTANTE: Adicionar Instagram Graph API

No dashboard do seu app:

1. Role até a seção **"Add Products"**
2. Procure por **"Instagram Graph API"** (NÃO Basic Display!)
3. Clique em **"Set Up"** (botão azul)

> ✅ **ATENÇÃO:** Use **Instagram Graph API**, não Basic Display API (descontinuada)!

### 5️⃣ Configurar OAuth Redirect URI

1. No dashboard do app, vá em **App Settings** → **Basic**

2. Role até **"App Domains"** e adicione:
   ```
   localhost
   ```

3. Em **"Privacy Policy URL"** adicione:
   ```
   http://localhost:3000/privacy
   ```

4. Role até **"Add Platform"** e clique

5. Escolha **"Website"**

6. Em **"Site URL"** adicione:
   ```
   http://localhost:3000
   ```

7. Clique em **"Save Changes"**

### 6️⃣ Configurar Instagram Graph API Settings

1. No menu lateral, vá em **Instagram Graph API** → **Settings**

2. Em **"Valid OAuth Redirect URIs"** adicione:
   ```
   http://localhost:3000/api/instagram/callback
   ```

3. Clique em **"Save Changes"**

### 7️⃣ Copiar Credenciais

1. No menu lateral, vá em **Settings** → **Basic**

2. Você verá:
   - **App ID** (é o seu CLIENT_ID)
   - **App Secret** (clique em "Show" para ver)

3. Copie ambos valores

### 8️⃣ Adicionar Permissões Necessárias

1. No menu lateral, vá em **Instagram Graph API** → **Permissions**

2. Solicite as seguintes permissões:
   - ✅ `instagram_basic` - Ler perfil e mídia
   - ✅ `instagram_content_publish` - Publicar conteúdo
   - ✅ `pages_show_list` - Listar páginas
   - ✅ `pages_read_engagement` - Ler engajamento

3. Clique em **"Submit"** para cada permissão

### 9️⃣ Conectar Instagram Business Account

**MUITO IMPORTANTE** - Sem isso não funciona!

1. No menu lateral, vá em **Instagram Graph API** → **Tools**

2. Em **"User Token Generator"**, selecione:
   - Sua **Página do Facebook**
   - Marque as permissões necessárias

3. Clique em **"Generate Token"**

4. Autorize o acesso no popup

5. Sua conta Instagram Business estará conectada

### 7️⃣ Atualizar o arquivo .env

Abra o arquivo `backend/.env` e atualize:

```env
INSTAGRAM_CLIENT_ID=SEU_INSTAGRAM_APP_ID_AQUI
INSTAGRAM_CLIENT_SECRET=SEU_INSTAGRAM_APP_SECRET_AQUI
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
```

### 8️⃣ Reiniciar o Backend

```bash
# Pare o servidor (Ctrl+C)
# Inicie novamente
cd backend
npm run dev
```

### 9️⃣ Testar Novamente

1. Abra http://localhost:5173/settings
2. Clique em **"Conectar Instagram"**
3. Agora deve funcionar! ✅

---

## 🐛 Troubleshooting

### Ainda dá erro?

**Checklist Instagram Graph API:**
- [ ] Sua conta Instagram é **Business** ou **Creator**?
- [ ] Instagram está vinculado à Página do Facebook?
- [ ] Criou o app no Meta for Developers?
- [ ] Adicionou o produto **"Instagram Graph API"**?
- [ ] Configurou OAuth Redirect URI?
- [ ] Adicionou o domínio localhost?
- [ ] Solicitou as permissões necessárias?
- [ ] Conectou a Instagram Business Account nas Tools?
- [ ] Copiou o **App ID** correto?
- [ ] Reiniciou o backend depois de atualizar o .env?

### Erro: "Redirect URI Mismatch"

Certifique-se que a URI está **EXATAMENTE** igual:
- No `.env`: `http://localhost:3000/api/instagram/callback`
- No Meta Developers: `http://localhost:3000/api/instagram/callback`
- Sem espaços, sem barra no final, http (não https)

### Erro: "User Not a Tester"

1. Vá em **Roles** → **Instagram Testers**
2. Verifique se sua conta está na lista
3. Abra o Instagram no celular
4. **Settings** → **Apps and Websites** → **Tester Invites**
5. Aceite o convite

### App está em "Development Mode"?

No topo do dashboard do app, deve mostrar:
- **"Development Mode"** - OK para testes
- Se mostrar precisa de revisão, ignore por enquanto

---

## 📸 Checklist Visual

Quando estiver tudo certo, você deve ver:

**No Meta for Developers:**
```
Instagram Graph API
├── ✅ Product adicionado
├── ✅ OAuth Redirect URI configurado
├── ✅ Permissões solicitadas
└── ✅ Instagram Business Account conectado

Settings → Basic
├── ✅ App ID copiado
├── ✅ App Secret copiado
└── ✅ App Domains configurado
```

**No Terminal do Backend:**
```
ENV LOADED: { CLIENT_ID: '2643038532731282', HAS_SECRET: true }
Instagram Auth Config: {
  clientId: '2643038532731282',
  hasSecret: true,
  redirectUri: 'http://localhost:3000/api/instagram/callback'
}
```

---

## ✅ Próximo Passo

Depois de configurar tudo corretamente:

1. Reinicie o backend
2. Vá em http://localhost:5173/settings
3. Clique em "Conectar Instagram"
4. Autorize o app
5. Você será redirecionado de volta conectado! 🎉

---

**Precisa de ajuda?** Tire um screenshot da página do Instagram Basic Display e me mostre!
