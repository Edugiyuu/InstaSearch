# YouTube (enviar Shorts)

O modal **Publicar** envia o MP4 do Short direto para o seu canal pela YouTube Data API v3. A conexão é por OAuth do Google: você autoriza uma vez e o app guarda o `refresh_token` em `backend/data/youtube/account.json` (fica só no seu computador).

## 1. Criar o cliente OAuth no Google Cloud

1. Entre em <https://console.cloud.google.com/> e crie um projeto (ex.: "InstaSearch").
2. **APIs e serviços → Biblioteca**: ative a **YouTube Data API v3** e a **YouTube Analytics API** (a segunda é para as métricas da tela Ideias).
3. **APIs e serviços → Tela de consentimento OAuth** (Google Auth Platform):
   - Tipo de usuário: **Externo**.
   - Preencha nome do app e e-mail.
   - Em **Público-alvo → Usuários de teste**, adicione o e-mail da conta Google dona do canal.
   - Pode deixar o app em modo **Teste**.
4. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**:
   - Tipo: **Aplicativo da Web**.
   - URI de redirecionamento autorizado: `http://localhost:3000/api/youtube/callback`
5. Copie o **ID do cliente** e a **chave secreta**.

## 2. Configurar o backend

No `backend/.env`:

```env
YOUTUBE_CLIENT_ID=seu-id.apps.googleusercontent.com
YOUTUBE_CLIENT_SECRET=sua-chave-secreta
YOUTUBE_REDIRECT_URI=http://localhost:3000/api/youtube/callback
FRONTEND_URL=http://localhost:5173
```

Reinicie o backend.

## 3. Conectar o canal

**Configurações → YouTube → + Conectar canal**. O Google pede para escolher a conta e autorizar; depois volta para Configurações com o nome do canal.

Como o app está em modo Teste, o Google mostra o aviso "O Google não verificou este app". Clique em **Continuar** (é o seu próprio app).

## Métricas (tela Ideias)

A tela **Ideias** mostra como cada Short se saiu ([ADR 0021](decisions/0021-ideias-a-partir-do-desempenho.md)):

- **Data API** (permissão `youtube.readonly`): visualizações, curtidas e comentários dos 50 Shorts mais recentes (vídeos de até 3 minutos).
- **YouTube Analytics API** (permissão `yt-analytics.readonly`): tempo médio assistido, % assistida, compartilhamentos e visualizações engajadas (`engagedViews`, a contagem antiga dos Shorts, antes de abril de 2025).

**Canal conectado antes de 07/10/2026?** Ele não tem a permissão nova. Configurações mostra **↻ Conectar de novo**; é só autorizar outra vez. Sem isso, a tela Ideias mostra só os números da Data API.

A Analytics API tem **2 a 3 dias de atraso**: um Short novo pode aparecer sem retenção nos primeiros dias. Ler métricas gasta pouco da cota (umas 5 unidades por coleta, contra ~1.600 de um envio).

## Limites e avisos

- ⚠️ **Vídeos de apps não verificados ficam privados.** O Google trava como **privado** todo vídeo enviado pela API por projetos que não passaram pela auditoria da YouTube API (regra de 2020). Para publicar como público direto pelo app, peça a auditoria em <https://support.google.com/youtube/contact/yt_api_form>. Até lá, envie e mude a visibilidade no YouTube Studio.
- **Cota da API:** 10.000 unidades por dia por projeto; cada envio gasta cerca de 1.600 (uns 6 vídeos por dia).
- **Token de teste expira em 7 dias.** Com o app em modo Teste, o Google invalida o `refresh_token` depois de 7 dias. Quando isso acontecer, o app pede para conectar de novo. Publicar o app (sem precisar de verificação para uso próprio) remove esse limite.
- O vídeo vira Short sozinho: é vertical e tem menos de 3 minutos. O app ainda põe `#Shorts` na descrição e usa as hashtags da legenda como tags.
