# 🔑 Como Gerar Token do Instagram Corretamente

## ❌ Problema Atual
O token que você está gerando retorna erro:
```
Invalid OAuth access token - Cannot parse access token
```

Isso acontece porque o token gerado não está vinculado corretamente ao Instagram Business Account.

## ✅ Solução: Gerar Token Correto

### Passo 1: Verificar Configuração

**Sua conta Instagram deve ser:**
- ✅ Conta Business ou Creator (não pessoal)
- ✅ Vinculada a uma Página do Facebook

**Para verificar/vincular:**
1. Abra Instagram no celular
2. Vá em **Configurações** → **Conta** → **Mudar para Conta Profissional**
3. Vincule à sua Página do Facebook

### Passo 2: Usar o Graph API Explorer

1. Acesse: https://developers.facebook.com/tools/explorer/

2. **No topo da página:**
   - Selecione seu **App** (InstaSearch ou o nome que você criou)
   - Em "User or Page", selecione sua **PÁGINA DO FACEBOOK** (não seu perfil pessoal)

3. **Adicionar Permissões:**
   - Clique em "Permissions"
   - Busque e marque:
     - `instagram_basic`
     - `instagram_content_publish`
     - `instagram_manage_comments`
     - `instagram_manage_insights`
     - `pages_show_list`
     - `pages_read_engagement`

4. **Gerar Token:**
   - Clique em **"Generate Access Token"**
   - Autorize todas as permissões

5. **IMPORTANTE - Obter Instagram Business Account ID:**
   - No campo de query, cole:
     ```
     me?fields=instagram_business_account
     ```
   - Clique em "Submit"
   - Você verá algo como:
     ```json
     {
       "instagram_business_account": {
         "id": "17841400008460056"
       },
       "id": "123456789"
     }
     ```
   - **Copie o ID do `instagram_business_account`** (17841400008460056)

6. **Testar o Token com o Instagram ID:**
   - Mude a query para:
     ```
     17841400008460056?fields=id,username,name,media_count
     ```
   - Substitua `17841400008460056` pelo seu Instagram Business Account ID
   - Clique em "Submit"
   - Se retornar seus dados, o token está correto!

### Passo 3: Copiar e Usar o Token

**Se o teste funcionou:**

1. Copie o **Access Token** que aparece no topo
2. Cole no arquivo `backend/add-token.js`
3. **TAMBÉM ADICIONE o Instagram Business Account ID** no script

Vou atualizar o script agora para usar o Instagram Business Account ID correto!

---

## 🐛 Se continuar dando erro

### Erro: "Cannot parse access token"

**Causa:** Token não está associado ao Instagram Business

**Solução:**
1. Verifique se sua conta Instagram está como Business/Creator
2. Verifique se está vinculada à Página do Facebook
3. No Graph Explorer, certifique-se de selecionar a **PÁGINA** (não seu perfil)
4. Gere um novo token

### Erro: "instagram_business_account not found"

**Causa:** A Página não tem Instagram vinculado

**Solução:**
1. Vá em sua Página do Facebook
2. Configurações → Instagram
3. Conecte sua conta Instagram Business

### Erro: "Permissions error"

**Causa:** Faltam permissões

**Solução:**
1. No Graph Explorer, clique em "Get Token" → "Get Page Access Token"
2. Selecione sua página
3. Marque TODAS as permissões do Instagram
4. Gere novo token

---

## 📱 Verificação Rápida

Execute este comando para verificar se o token está correto:

```bash
curl "https://graph.facebook.com/v18.0/me?fields=instagram_business_account&access_token=SEU_TOKEN_AQUI"
```

Deve retornar:
```json
{
  "instagram_business_account": {
    "id": "ALGUM_ID"
  },
  "id": "ID_DA_PAGINA"
}
```

Se retornar erro, o token está incorreto.

---

**Me envie:**
1. O novo token gerado
2. O Instagram Business Account ID

Vou atualizar o script com essas informações!
