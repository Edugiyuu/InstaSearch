# Conectando o Instagram

Guia único para conectar sua conta ao InstaSearch. Ele substitui os antigos `INSTAGRAM_QUICKSTART`, `INSTAGRAM_AUTH`, `GERAR_TOKEN_INSTAGRAM` e `FIX_INSTAGRAM_ERROR`.

## Requisitos

- Conta Instagram **Business ou Creator**. Conta pessoal não funciona com a API.
- A conta precisa estar **vinculada a uma Página do Facebook**.
- Um app criado no [Meta for Developers](https://developers.facebook.com/). O modo *Development* basta para uso próprio.

O InstaSearch usa a **Instagram Graph API via Facebook Login** (`graph.facebook.com`). A antiga Basic Display API foi descontinuada em dezembro de 2024.

## Passo 1: preparar a conta

1. No app do Instagram: **Configurações → Tipo de conta e ferramentas → Mudar para conta profissional** (Creator ou Business).
2. Vincule a uma Página do Facebook. Se não tiver uma, crie, porque ela é obrigatória para a API.
3. Confirme o vínculo na Página: **Configurações → Contas vinculadas → Instagram**.

## Passo 2: criar o app na Meta

1. Em [developers.facebook.com/apps](https://developers.facebook.com/apps/), clique em **Criar app** e escolha o tipo **Business** (ou o caso de uso "Gerenciar mensagens e conteúdo no Instagram").
2. Adicione o produto **Instagram** (Graph API).
3. Em **Configurações → Básico**, copie o **ID do App** e a **Chave Secreta**. Eles só são necessários para o fluxo OAuth (veja abaixo).

## Passo 3: gerar o token (método recomendado)

1. Abra o [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Selecione o seu app.
3. Em **Permissões**, adicione:

   | Permissão | Para quê |
   |---|---|
   | `instagram_basic` | Ler perfil e mídias |
   | `instagram_content_publish` | Publicar Reels |
   | `instagram_manage_insights` | Ler métricas (alcance, plays, salvamentos) |
   | `instagram_manage_comments` | Ler comentários |
   | `pages_show_list` | Encontrar a Página vinculada |
   | `pages_read_engagement` | Ler dados da Página |
   | `business_management` | Às vezes necessário para enxergar a Página |

4. Clique em **Generate Access Token** e autorize.
5. **Estenda o token**, porque o token do Explorer expira em cerca de 1 hora:
   - abra o [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/);
   - cole o token, clique em **Debug** e depois em **Extend Access Token**;
   - copie o token de **longa duração** (cerca de 60 dias).
6. Teste no Explorer com a consulta `me/accounts?fields=name,instagram_business_account`. Ela deve retornar sua Página com um `instagram_business_account.id`.

## Passo 4: conectar no app

1. Com backend e frontend rodando, abra `http://localhost:5173`.
2. Vá em **Configurações → Conectar com Token**.
3. Cole o token de longa duração e confirme.

O backend (`POST /api/instagram/connect-token`) vai:
1. listar suas Páginas (`/me/accounts`);
2. encontrar a conta Instagram Business vinculada;
3. buscar o perfil e salvar a conta em `backend/data/instagram_accounts/`.

## Método alternativo: OAuth (experimental)

Há um botão **Conectar Instagram** que usa OAuth (`/api/instagram/auth-url` → `/api/instagram/callback`). Ele precisa de `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` e `INSTAGRAM_REDIRECT_URI` no `.env`, e de `http://localhost:3000/api/instagram/callback` cadastrado como URI de redirecionamento válida no app.

> ⚠️ **Não recomendado por enquanto.** O OAuth usa os endpoints do *Instagram Login* (`api.instagram.com` / `graph.instagram.com`), enquanto o resto do app chama `graph.facebook.com`, que exige um token do *Facebook Login*. Um token obtido por esse fluxo pode não funcionar para publicar ou ler insights. Unificar os dois fluxos está no [ROADMAP](ROADMAP.md).

## Validade e renovação do token

- Um token de usuário de longa duração dura **cerca de 60 dias**. Gere outro e reconecte quando expirar.
- A data de expiração exibida em Configurações é **estimada** (data da conexão + 60 dias), não lida da Meta.
- A renovação automática no código (`instagramAuthService`) só se aplica a tokens do fluxo OAuth. **Tokens conectados manualmente não são renovados sozinhos.**
- Dica: um **token de Página** gerado a partir de um token de usuário de longa duração normalmente não expira. Implementar essa troca automaticamente está no roadmap.

## Onde o token fica guardado

Em `backend/data/instagram_accounts/*.json`, **em texto puro**. Essa pasta já está no `.gitignore`. Nunca coloque um token no código-fonte nem em scripts versionados.

## Erros comuns

| Erro | Causa provável | Solução |
|---|---|---|
| `Invalid OAuth access token - Cannot parse access token` | Token incompleto, expirado ou de outro app | Gere de novo no Explorer e estenda no Debugger |
| `Error validating access token: Session has expired` | Token de curta duração (cerca de 1h) | Use **Extend Access Token** |
| `instagram_business_account` não aparece | Instagram não vinculado à Página, ou conta pessoal | Refaça o Passo 1 |
| `/me/accounts` retorna lista vazia | Faltam permissões de página, ou a Página não foi selecionada ao autorizar | Adicione `pages_show_list` e `business_management`, gere o token de novo e marque a Página |
| `(#10) Application does not have permission` | Falta `instagram_content_publish` ou `instagram_manage_insights` | Adicione a permissão e gere um novo token |
| `Redirect URI mismatch` (OAuth) | URI no `.env` diferente da cadastrada | Devem ser idênticas, sem barra no final |
| Publicação fica "processando" e falha | Vídeo fora das especificações de Reels ou URL do Cloudinary inacessível | Confira formato, duração e as credenciais do Cloudinary |

## Verificação rápida pelo terminal

```bash
curl "https://graph.facebook.com/v18.0/me/accounts?fields=name,instagram_business_account&access_token=SEU_TOKEN"
```

Se retornar a sua Página com `instagram_business_account`, o token serve para o InstaSearch.

## Limites da API

- Há um **limite de publicações via API por conta a cada 24h**. Confira o valor atual na [documentação de publicação de conteúdo](https://developers.facebook.com/docs/instagram-platform/content-publishing).
- A versão da Graph API fixada no código é a `v18.0`. Quando uma versão é desativada, a Meta redireciona as chamadas para a versão mais antiga ainda suportada. Atualizar a versão está no roadmap.

## Próximo: dados de outros perfis (planejado)

A análise de perfis de referência vai usar a **Business Discovery API**, que é oficial e não depende de scraping:

```
GET /{seu-ig-user-id}?fields=business_discovery.username(perfil_alvo){
  followers_count,media_count,
  media{caption,like_count,comments_count,timestamp,media_type,permalink}
}
```

Limitação: só funciona para perfis **Business/Creator** e não retorna visualizações de Reels de terceiros.
