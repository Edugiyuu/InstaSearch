# Agendamento e Publicação Automática

## Como funciona

- O `SchedulerService` (`backend/src/services/schedulerService.ts`) inicia junto com o backend.
- **A cada 1 minuto**, ele procura posts com `status: 'scheduled'` e `scheduledFor <= agora`.
- Para cada um:
  1. lê o vídeo **local** indicado em `media.videoUrl`;
  2. envia ao Cloudinary;
  3. publica como Reel pela Graph API;
  4. marca o post como `published` (com `instagramPostId` e `instagramUrl`) ou `failed` (com `error`);
  5. se o post veio de um conteúdo (`contentId`), marca o conteúdo como publicado.

```
Agendar (Calendário)
        │  POST /api/posts/schedule
        ▼
 data/posts/*.json  (status: scheduled)
        │
        ▼  a cada 1 min
 SchedulerService ──► Cloudinary ──► Graph API ──► status: published | failed
```

## ⚠️ Limitações importantes

- **O backend precisa estar rodando no horário agendado.** Com o PC desligado ou o terminal fechado, o post fica pendente e só é publicado na próxima vez que o backend subir (o agendador verifica ao iniciar). Para agendar 24/7, rode o backend numa VPS ou num computador sempre ligado.
- **O arquivo de vídeo precisa continuar existindo** em `backend/data/videos/` até a publicação. Não apague essas pastas com posts pendentes.
- **Não há nova tentativa automática.** Um post com falha fica `failed`. Corrija o problema e use **Publicar agora** ou reagende.
- Usa a primeira conta Instagram conectada.

## Interface

**Calendário** (`Calendar.tsx`):
- visão mensal e em lista;
- cores: 🔵 agendado · 🟢 publicado · 🔴 falhou;
- ações: **Publicar agora**, **Editar**, **Cancelar**;
- indicador de status do agendador.

**Modal de agendamento** (`ScheduleModal.tsx`), aberto pelo Calendário:
- legenda (até 2.200 caracteres);
- data e hora (no mínimo 5 minutos no futuro);
- conteúdo vinculado (opcional).

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/posts/schedule` | Agenda: `{ caption, scheduledFor, media: { type: 'reel', videoUrl }, contentId? }` |
| GET | `/api/posts` | Lista (`?status=scheduled\|published\|failed`) |
| GET | `/api/posts/upcoming` | Próximos agendados (`?limit=10`) |
| GET | `/api/posts/:id` | Detalhe |
| PUT | `/api/posts/:id` | Edita (somente posts `scheduled`) |
| DELETE | `/api/posts/:id` | Remove o agendamento |
| GET | `/api/scheduler/status` | `{ running, checkIntervalMinutes, upcomingPosts, nextScheduled }` |
| POST | `/api/scheduler/publish/:id` | Publica agora |
| PUT | `/api/scheduler/reschedule/:id` | `{ scheduledFor }` |
| DELETE | `/api/scheduler/cancel/:id` | Cancela |

`scheduledFor` usa o formato ISO 8601 (ex.: `2026-10-10T18:00:00-03:00`).

## Configuração

- **Intervalo:** é o parâmetro do construtor, em minutos (`new SchedulerService(1)`), no fim de `schedulerService.ts`.
- **Desligar:** comente `schedulerService.start()` em `backend/src/index.ts`.

## Melhorias planejadas

- Nova tentativa com espera crescente (*backoff*) em falhas temporárias.
- Notificação de falha na interface.
- Sugestão de melhor horário com base nos insights de audiência da conta (`online_followers`).
- Rodar em Docker numa VPS com um único comando.
