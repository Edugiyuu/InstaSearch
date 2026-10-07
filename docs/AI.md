# Inteligência Artificial no InstaSearch

Onde a IA é usada, como configurar o Gemini e como o app passa para o **Claude Sonnet 5.5** (esforço médio) quando o Gemini cai ou acaba a cota grátis. Substitui o antigo `GEMINI_SETUP.md`.

## Onde a IA é usada

| Recurso | Status | Entrada → saída | Código |
|---|---|---|---|
| Roteiro | ✅ | tema + estilo + tom (da biblioteca) + duração → título, narração e cenas (legenda, o que a imagem mostra, efeito, efeito sonoro, figurinha) | `shortsAI.generateScript` |
| Dividir uma narração pronta em cenas | ✅ | texto do usuário → cenas, sem mudar o texto | `shortsAI.generateScript` (com `narration`) |
| "Peça um ajuste" | ✅ | cenas numeradas como na tela + cena aberta + pedido → cenas novas + resposta; o app desfaz mudanças fora das cenas citadas ([ADR 0017](decisions/0017-troca-de-imagem-rapida-e-chat-na-cena-certa.md)) | `shortsAI.adjustBeats`, `sceneEdits` |
| Escolher as imagens das cenas | ✅ | roteiro inteiro + catálogo da biblioteca → uma imagem por cena, com motivo e área de zoom | `shortsAI.pickImagesWithAI` |
| Catalogar imagens e figurinhas | ✅ | imagem → nome, personagens, etiquetas, descrição, áreas (rosto, mão…). Na troca de imagem de uma cena, roda em segundo plano (fila em `library.ts`) | `shortsAI.catalogImage` |
| Catalogar efeitos sonoros e músicas | ✅ (só Gemini) | áudio → nome e etiquetas | `shortsAI.catalogSound` |
| Legenda do post | ✅ | título + narração → legenda + hashtags (com reserva no Claude, via `llm.askJson`) | `aiService.generateCaption` |
| Legenda a partir de frames, análise de perfil, hashtags | ✅ legado | ver "Ferramentas antigas" | `aiService.ts` |
| Transcrição da voz (Whisper) | ✅ (local) | áudio → palavras com tempo; o roteiro é casado com elas no frontend ([ADR 0018](decisions/0018-legenda-sincronizada-com-a-voz.md)) | `transcription.ts`, `video/align.ts` |

Regra de projeto: **a IA sugere e o usuário aprova.** Nada é publicado sem passar pela revisão.

Gasto típico por vídeo: 1 chamada para o roteiro, 1 para escolher as imagens, 1 por "Peça um ajuste" e 1 por imagem nova catalogada (só uma vez por imagem).

### Pesquisa na web (só no roteiro)

Ao escrever um roteiro do zero, a IA **pesquisa na web antes de escrever**, para achar argumento e não inventar nomes, capítulos ou acontecimentos ([ADR 0019](decisions/0019-roteiro-com-argumento-e-tons-proprios.md)). Com 2 buscas só para confirmar fatos, os roteiros saíam sem prova; agora:

- Só no **roteiro escrito do zero**. Com "Já tenho o texto da narração", nos ajustes, na catalogação e na escolha de imagens, não pesquisa.
- Até **4 buscas** (`MAX_SEARCHES` em `llm.ts`), atrás das provas da tese: acontecimentos, capítulo ou episódio, números, falas.
- O roteiro pede a estrutura gancho → tese → 2 provas concretas (3 se couber) → conclusão → chamada para comentar, com no máximo ~2,6 palavras por segundo.
- As buscas são **contadas de verdade** e guardadas com o texto de cada uma (`AiCredit.queries`), e a tela mostra as duas coisas.
- Só a busca; a IA não abre páginas inteiras.

| Provedor | Como pesquisa | Limite |
|---|---|---|
| Gemini | Busca do Google embutida (*grounding*); as buscas vêm em `webSearchQueries` | o Gemini decide; a instrução pede até 4 (num teste ele fez 5, e a tela mostra 5) |
| Claude API | ferramenta `web_search_20260209`; cada busca é um bloco `server_tool_use` | `max_uses: 4` |
| Claude Code | ferramenta `WebSearch` (sem `WebFetch`); saída `stream-json` para ler cada busca | `--max-turns 6`; se passar do limite, responde de novo sem pesquisar |

Exemplo real ("Qual é a verdadeira idade do Gojo?"): 1 busca, ~28 s, e o roteiro saiu com a idade e o aniversário certos.

### Quem fez cada parte

O app guarda qual IA respondeu e mostra na tela:

- **Roteiro:** selo abaixo do título ("Roteiro: Gemini 2.5 Flash · 4 buscas na web") e, embaixo, o que foi buscado. O mesmo aparece no cartão "Quem fez" da revisão.
- **Revisão:** cartão "Quem fez", com quem escreveu o roteiro e quem escolheu as imagens. Cada resposta do "Peça um ajuste" tem o nome da IA embaixo.
- **Montagem:** as etapas dizem quem escreveu e quem escolheu as imagens.

O selo é azul para o Gemini e laranja para o Claude, e diz "reserva, o Gemini estava fora" quando o Claude entrou no lugar dele. Os dados ficam no projeto em `ai.script`, `ai.images` e em `history[].ai` (`provider`, `model`, `fallback`, `searches`, `at`). Vídeos criados antes disso não têm selo.

## Provedores e reserva automática

Todas as chamadas do fluxo de Shorts passam por um único módulo, [`backend/src/services/shorts/llm.ts`](../backend/src/services/shorts/llm.ts). Ele tenta os provedores em ordem e, se um falhar por **cota (429), sobrecarga (5xx) ou rede**, passa o mesmo pedido para o próximo:

```
Gemini (grátis)  ──falhou──►  Claude API (Sonnet 5.5, com chave)  ──falhou──►  Claude Code (Sonnet 5.5, seu plano Pro/Max)
```

| Provedor | Quando entra | Modelo | Custo | Precisa de |
|---|---|---|---|---|
| **Gemini** | sempre primeiro | `GEMINI_MODEL` (padrão `gemini-2.5-flash`) | grátis com limite diário (em out/2026: 20 pedidos/dia no `gemini-2.5-flash`) | `GEMINI_API_KEY` |
| **Claude API** | se o Gemini falhar | `claude-sonnet-5-5` (fixo), esforço médio | pago por uso, centavos por vídeo | `ANTHROPIC_API_KEY` (créditos no Console, separado do plano Pro) |
| **Claude Code** | se os anteriores falharem | `claude-sonnet-5-5` (fixo), esforço médio | conta no limite do seu plano Pro/Max, sem cobrança extra | Claude Code instalado e logado, `CLAUDE_CODE=on` |

Detalhes do comportamento:

- **Pausa por cota.** Quando o Gemini responde 429, o app lê o "tente de novo em…" do erro e deixa o Gemini de lado até esse horário. Os pedidos vão direto para o Claude, sem gastar uma tentativa a cada vez. A primeira resposta certa do Gemini depois disso tira a pausa.
- **Áudio só no Gemini.** O Claude não ouve áudio. Sem o Gemini, efeitos sonoros e músicas ficam com as etiquetas tiradas do nome do arquivo (`whoosh_01.mp3` → `whoosh`).
- **Imagens funcionam nos três.** Na API o Claude recebe a imagem em base64; no Claude Code ela vai para uma pasta temporária que só aquele pedido pode ler e que é apagada logo depois.
- **Log.** O terminal do backend mostra quem respondeu cada pedido, por exemplo:
  ```
  ⚠️ Gemini indisponível (...) Usando o Claude.
  Claude Code: 26.4s na IA · 2 tokens de entrada, 4036 de saída
  🤖 Respondido por Claude Code do plano (claude-sonnet-5-5) — reserva
  ```
- **Configurações.** A tela mostra o estado de cada provedor (com a hora em que a cota do Gemini volta) sem gastar nenhuma chamada. O botão "Testar conexão" é o único que chama o Gemini.

### Variáveis (`backend/.env`)

```env
GEMINI_API_KEY=sua_chave
GEMINI_MODEL=gemini-2.5-flash

# Claude API (opcional, pago por uso)
ANTHROPIC_API_KEY=

# Claude Code com o seu plano Pro/Max (opcional)
CLAUDE_CODE=on
# CLAUDE_CODE_PATH=C:\caminho\para\claude.cmd   # só se o comando não estiver no PATH

# auto (padrão) = Gemini → Claude API → Claude Code
# gemini | claude | claude-code = usa só aquele
LLM_PROVIDER=auto
```

O `.env` só é lido quando o backend inicia: **reinicie o backend depois de mudar**.

## Configurando o Gemini

1. Crie uma chave em [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey).
2. Coloque `GEMINI_API_KEY` e `GEMINI_MODEL` no `backend/.env`.
3. Teste com `node scripts/test-gemini.js` (na pasta `backend`) ou no botão "Testar conexão" das Configurações.

Os limites do nível grátis mudam com frequência e caíram muito em 2025–2026; confira a [página de limites](https://ai.google.dev/gemini-api/docs/rate-limits). No nível grátis o Google pode usar os dados enviados para melhorar os produtos. O app desliga o "thinking" do Gemini (`thinkingBudget: 0`): o roteiro sai em segundos em vez de mais de um minuto.

## Usando o Claude Code com o plano Pro/Max

O plano Pro **não inclui** a API (a chave de API é cobrada à parte, no Console). Mas o Pro inclui o **Claude Code**, que tem um modo não interativo (`claude -p`). O backend chama esse comando no seu computador e usa o seu login.

1. Instale:
   ```bash
   npm install -g @anthropic-ai/claude-code
   ```
2. Entre com a conta do plano (abre o navegador):
   ```bash
   claude auth login
   ```
   Confira com `claude auth status` (deve mostrar `"loggedIn": true` e `"authMethod": "claude.ai"`).
3. No `backend/.env`, coloque `CLAUDE_CODE=on` e reinicie o backend.

Como cada pedido roda (`askClaudeCode` em `llm.ts`):

| Opção | Por quê |
|---|---|
| `--model claude-sonnet-5-5` | Sabe muito mais sobre animes e erra menos fatos que o Haiku 4.5, que às vezes inventava coisas sem noção no roteiro |
| `--effort medium` (`low` ao catalogar e escolher imagens) | O Sonnet 5.5 pensa antes de responder; o esforço médio é o equilíbrio entre qualidade e gasto do plano. Um roteiro de 30 s leva ~30 s e ~4 mil tokens de saída (o raciocínio conta junto) |
| `--system-prompt` curto | O prompt padrão do Claude Code é feito para programar e é grande; o curto deixa cada pedido com ~1.500 tokens de entrada |
| `--tools ""` (ou só `Read` na catalogação) | Sem acesso a arquivos, terminal ou internet |
| `--strict-mcp-config`, `--disable-slash-commands`, `--disallowedTools mcp__*` | Não carrega MCP, skills nem comandos |
| `--no-session-persistence` | Os pedidos não ficam salvos no histórico do Claude Code |
| `ANTHROPIC_API_KEY` removida do ambiente do processo | Garante que a cobrança vai para o plano, e não para a API |
| `--output-format json` | O backend lê o campo `result` e registra tempo e tokens no log |

Cuidados:

- **Uso pessoal.** O plano é individual. Se o app um dia atender outras pessoas, use a chave de API.
- **Conta no seu limite.** Os pedidos dividem o limite de uso com o claude.ai e o Claude Code.
- **Mais lento que o Gemini:** ~6 s para o programa iniciar mais o tempo da resposta (~30 s num roteiro).
- **Gasta mais do plano que o Haiku:** o Sonnet consome o limite mais rápido. Para economizar, troque `DEFAULT_EFFORT` para `'low'` em `llm.ts`.

## Usando a Claude API

1. Crie a chave e compre créditos em [platform.claude.com](https://platform.claude.com) (Settings → API Keys / Billing).
2. Coloque `ANTHROPIC_API_KEY` no `backend/.env` e reinicie o backend.

O app usa o SDK oficial (`@anthropic-ai/sdk`), modelo `claude-sonnet-5-5` com `output_config.effort: "medium"` (`low` ao catalogar e escolher imagens), em streaming para respostas longas não estourarem o tempo limite. O Sonnet 5.5 custa US$ 2 / US$ 10 por milhão de tokens de entrada / saída: alguns centavos por roteiro. Se o Claude recusar um pedido por segurança, o app mostra uma mensagem pedindo para reformular o tema.

## Erros comuns

| Mensagem no app | O que fazer |
|---|---|
| "A cota grátis do Gemini acabou por hoje…" | Espere a hora mostrada nas Configurações, ou ligue o Claude Code (`CLAUDE_CODE=on`) ou a Claude API |
| "O Claude Code não está instalado…" | `npm install -g @anthropic-ai/claude-code` e reinicie o backend. Se instalou em outro lugar, use `CLAUDE_CODE_PATH` |
| "O Claude Code não está logado…" | Rode `claude auth login` num terminal |
| "A ANTHROPIC_API_KEY do backend/.env é inválida." | Gere outra chave no Console |
| "Nenhuma IA configurada…" | Coloque pelo menos `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` ou `CLAUDE_CODE=on` |
| "A IA não respondeu direito…" | Resposta fora do formato JSON. Tente de novo |
| `models/... is not found` (Gemini) | Nome de modelo descontinuado. Atualize `GEMINI_MODEL` |

## Próximos passos

| Tipo | Hoje | Planejado |
|---|---|---|
| LLM | Gemini → Claude Sonnet 5.5 (API ou plano) | Ollama local como reserva grátis |
| Transcrição | whisper.cpp 1.5.5 local, modelo `small`, em segundo plano ao enviar a voz | tempo por palavra vindo do TTS, se a voz passar a ser gerada |
| Voz | upload do seu áudio | ElevenLabs via API, Piper local |
| Geração de imagem | desligada (você envia as imagens) | opcional, plugável |

Dívidas técnicas:

- As telas antigas ainda usam `aiService.ts` direto com o Gemini, sem a reserva do Claude.
- O pacote `@google/generative-ai` foi substituído pelo `@google/genai`. É preciso migrar.
- O pacote `openai` está no `package.json`, mas não é usado.
- As respostas JSON são extraídas do texto. Saída estruturada com validação (zod) deixaria mais robusto.
