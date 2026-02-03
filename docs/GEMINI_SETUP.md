# 🤖 Configuração do Google Gemini API

## Objetivo
Este guia mostra como obter e configurar sua chave da Google Gemini API para usar os recursos de IA no InstaSearch de forma **100% GRATUITA**.

## ✨ Por que Google Gemini?

- ✅ **100% Gratuito** - Tier gratuito permanente
- ✅ **1,500 requests/dia** - Muito generoso (15 RPM)
- ✅ **Alta qualidade** - Gemini 1.5 Flash é excelente
- ✅ **Rápido e confiável** - Infraestrutura do Google
- ✅ **Suporte a português** - Ótimo para nosso caso
- ✅ **Sem cartão de crédito** - Não precisa cadastrar

## ⚠️ Segurança
- **NUNCA** compartilhe sua chave da API com ninguém
- **NUNCA** faça commit da chave no Git
- A chave fica apenas no arquivo `.env` (já está no `.gitignore`)

## 📝 Passo a Passo

### 1. Criar Conta no Google AI Studio

1. Acesse: https://ai.google.dev
2. Clique em **"Get API key in Google AI Studio"**
3. Faça login com sua conta Google
4. Você será redirecionado para: https://aistudio.google.com/app/apikey

### 2. Obter Chave da API

1. Na página do Google AI Studio, clique em **"Create API Key"**
2. Selecione um projeto do Google Cloud ou crie um novo
3. Clique em **"Create API key in new project"** (recomendado)
4. **COPIE A CHAVE** que apareceu
5. Guarde em local seguro (você pode vê-la depois)

### 3. Configurar no Projeto

1. Abra o arquivo `backend/.env`
2. Adicione a configuração do Gemini:
   ```env
   # Google Gemini AI (100% gratuito)
   GEMINI_API_KEY=sua_chave_aqui
   GEMINI_MODEL=gemini-1.5-flash
   ```

Exemplo completo:
```env
# Google Gemini AI Configuration
GEMINI_API_KEY=AIzaSyDXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
GEMINI_MODEL=gemini-1.5-flash
```

### 4. Instalar Dependência

O SDK do Google Gemini será instalado automaticamente quando você rodar:

```bash
cd backend
npm install
```

Ou instale manualmente:
```bash
npm install @google/generative-ai
```

### 5. Verificar Configuração

Execute o script de teste:
```bash
cd backend
node scripts/test-gemini.js
```

Você deve ver:
```
✅ Variável GEMINI_API_KEY encontrada
📊 Modelo configurado: gemini-1.5-flash
🔗 Conectando ao Google Gemini...
✅ Resposta do Gemini: OK
✨ SUCESSO! Google Gemini API configurada corretamente.
```

## 🎯 Modelos Disponíveis

### Gemini 1.5 Flash (Recomendado)
```env
GEMINI_MODEL=gemini-1.5-flash
```
- ✅ **Mais rápido**
- ✅ **Gratuito: 15 RPM (1,500/dia)**
- ✅ Excelente para análise de conteúdo
- ✅ Ótimo custo-benefício

### Gemini 1.5 Pro
```env
GEMINI_MODEL=gemini-1.5-pro
```
- ✅ **Melhor qualidade**
- ⚠️ **Gratuito: 2 RPM (limitado)**
- ✅ Para análises mais complexas
- ℹ️ Use apenas quando precisar de qualidade máxima

### Gemini 1.0 Pro
```env
GEMINI_MODEL=gemini-1.0-pro
```
- ✅ **Versão legada**
- ✅ **Gratuito: 60 RPM**
- ⚠️ Menos avançado que 1.5
- ℹ️ Não recomendado (use 1.5 Flash)

## 💰 Limites do Tier Gratuito

### Gemini 1.5 Flash (Recomendado):
- **15 requisições por minuto**
- **1,500 requisições por dia**
- **1 milhão tokens por minuto**
- **Perfeito para InstaSearch!**

### Estimativa de Uso:
- Análise de perfil: ~1 request = ~2,000 tokens
- Análise de reel: ~1 request = ~1,000 tokens
- Geração de caption: ~1 request = ~500 tokens
- Geração de conteúdo: ~1 request = ~1,500 tokens

**Com 1,500 requests/dia, você pode fazer:**
- 200+ análises completas por dia
- Muito mais do que você vai usar! 🎉

## 🔧 Configuração do .env

Template completo para `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development

# Storage
DATA_DIR=./data

# Google Gemini AI (100% gratuito)
# Obtenha sua chave em: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=sua_chave_aqui
GEMINI_MODEL=gemini-1.5-flash

# Instagram API
INSTAGRAM_CLIENT_ID=seu_app_id
INSTAGRAM_CLIENT_SECRET=seu_app_secret
INSTAGRAM_REDIRECT_URI=http://localhost:3000/api/instagram/callback
INSTAGRAM_ACCESS_TOKEN=seu_token_de_acesso

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Logging
LOG_LEVEL=debug
```

## ✅ Teste Rápido

Após configurar, teste a conexão:

```bash
cd backend
node -e "
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
model.generateContent('Responda apenas OK').then(r => console.log('✅ Gemini:', r.response.text())).catch(e => console.error('❌ Erro:', e.message));
"
```

## 🔗 Links Úteis

- **Google AI Studio:** https://aistudio.google.com
- **Obter API Key:** https://aistudio.google.com/app/apikey
- **Documentação:** https://ai.google.dev/docs
- **Pricing (Free Tier):** https://ai.google.dev/pricing
- **Modelos Disponíveis:** https://ai.google.dev/models/gemini
- **Exemplos:** https://ai.google.dev/examples

## ❓ Problemas Comuns

### "API key not valid"
- Verifique se copiou a chave completa
- Certifique-se que não tem espaços extras
- Verifique se o arquivo `.env` está no diretório `backend/`
- Tente gerar uma nova chave

### "Resource has been exhausted"
- Você atingiu o rate limit (15 RPM para Flash)
- Aguarde 1 minuto e tente novamente
- Considere adicionar delay entre requisições

### "Model not found"
- Verifique o nome do modelo no `.env`
- Modelos válidos: `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-1.0-pro`
- Use sempre `gemini-1.5-flash` (recomendado)

### Biblioteca não encontrada
```bash
cd backend
npm install @google/generative-ai
```

## 🎉 Benefícios vs OpenAI

| Recurso | Google Gemini | OpenAI |
|---------|---------------|--------|
| **Custo** | ✅ 100% Gratuito | ❌ Pago ($0.01/1k tokens) |
| **Rate Limit** | ✅ 1,500/dia | ⚠️ Pago por uso |
| **Qualidade** | ✅ Excelente | ✅ Excelente |
| **Velocidade** | ✅ Rápido | ✅ Rápido |
| **Setup** | ✅ Sem cartão | ❌ Requer cartão após trial |
| **Português** | ✅ Ótimo | ✅ Ótimo |

## 🚀 Próximos Passos

Após configurar o Google Gemini, você está pronto para:
1. ✅ Implementar o `AIService.ts`
2. ✅ Criar análises de perfis com IA
3. ✅ Gerar conteúdo automaticamente
4. ✅ Analisar reels e extrair insights

---

**Documentação criada em:** 2 de Fevereiro de 2026  
**Projeto:** InstaSearch v1.0  
**IA:** Google Gemini 1.5 Flash (100% gratuito)
