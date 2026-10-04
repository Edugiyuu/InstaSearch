# Inteligência Artificial no InstaSearch

Onde a IA é usada, como configurar o Gemini e como o app passa para o **Claude Haiku 4.5** quando o Gemini cai ou acaba a cota grátis. Substitui o antigo `GEMINI_SETUP.md`.

## Onde a IA é usada

| Recurso | Status | Entrada → saída | Código |
|---|---|---|---|
| Roteiro | ✅ | tema + estilo + tom + duração → título, narração e cenas (legenda, o que a imagem mostra, efeito, efeito sonoro, figurinha) | `shortsAI.generateScript` |
| Dividir uma narração pronta em cenas | ✅ | texto do usuário → cenas, sem mudar o texto | `shortsAI.generateScript` (com `narration`) |
| "Peça um ajuste" | ✅ | cenas + pedido em português → cenas novas + resposta | `shortsAI.adjustBeats` |
| Escolher as imagens das cenas | ✅ | roteiro inteiro + catálogo da biblioteca → uma imagem por cena, com motivo e área de zoom | `shortsAI.pickImagesWithAI` |
| Catalogar imagens e figurinhas | ✅ | imagem → nome, personagens, etiquetas, descrição, áreas (rosto, mão…) | `shortsAI.catalogImage` |
| Catalogar efeitos sonoros e músicas | ✅ (só Gemini) | áudio → nome e etiquetas | `shortsAI.catalogSound` |
| Legenda do post | ✅ | título + narração → legenda + hashtags | `aiService.generateCaption` |
| Legenda a partir de frames, análise de perfil, hashtags | ✅ legado | ver "Ferramentas antigas" | `aiService.ts` |
| Transcrição da voz (Whisper) | 📋 | áudio → palavras com tempo | planejado; hoje o tempo das cenas é estimado |

Regra de projeto: **a IA sugere e o usuário aprova.** Nada é publicado sem passar pela revisão.

Gasto típico por vídeo: 1 chamada para o roteiro, 1 para escolher as imagens, 1 por "Peça um ajuste" e 1 por imagem nova catalogada (só uma vez por imagem).

## Provedores e reserva automática

Todas as chamadas do fluxo de Shorts passam por um único módulo, [`backend/src/services/shorts/llm.ts`](../backend/src/services/shorts/llm.ts). Ele tenta os provedores em ordem e, se um falhar por **cota (429), sobrecarga (5xx) ou rede**, passa o mesmo pedido para o próximo:

```
Gemini (grátis)  ──falhou──►  Claude API (Haiku 4.5, com chave)  ──falhou──►  Claude Code (Haiku 4.5, seu plano Pro/Max)
```

| Provedor | Quando entra | Modelo | Custo | Precisa de |
|---|---|---|---|---|
| **Gemini** | sempre primeiro | `GEMINI_MODEL` (padrão `gemini-2.5-flash`) | grátis com limite diário (em out/2026: 20 pedidos/dia no `gemini-2.5-flash`) | `GEMINI_API_KEY` |
| **Claude API** | se o Gemini falhar | `claude-haiku-4-5` (fixo) | pago por uso, centavos por vídeo | `ANTHROPIC_API_KEY` (créditos no Console, separado do plano Pro) |
| **Claude Code** | se os anteriores falharem | `claude-haiku-4-5` (fixo) | conta no limite do seu plano Pro/Max, sem cobrança extra | Claude Code instalado e logado, `CLAUDE_CODE=on` |

Detalhes do comportamento:

- **Pausa por cota.** Quando o Gemini responde 429, o app lê o "tente de novo em…" do erro e deixa o Gemini de lado até esse horário. Os pedidos vão direto para o Claude, sem gastar uma tentativa a cada vez. A primeira resposta certa do Gemini depois disso tira a pausa.
- **Áudio só no Gemini.** O Claude não ouve áudio. Sem o Gemini, efeitos sonoros e músicas ficam com as etiquetas tiradas do nome do arquivo (`whoosh_01.mp3` → `whoosh`).
- **Imagens funcionam nos três.** Na API o Claude recebe a imagem em base64; no Claude Code ela vai para uma pasta temporária que só aquele pedido pode ler e que é apagada logo depois.
- **Log.** O terminal do backend mostra quem respondeu cada pedido, por exemplo:
  ```
  ⚠️ Gemini indisponível (...) Usando o Claude.
  Claude Code: 11.8s na IA · 1426 tokens de entrada, 1559 de saída
  🤖 Respondido por Claude Code do plano (claude-haiku-4-5) — reserva
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
| `--model claude-haiku-4-5` | O modelo que menos gasta do limite do plano |
| `MAX_THINKING_TOKENS=0` | Sem "raciocínio": antes o Haiku gastava ~10 mil tokens para entregar um roteiro de ~1.500; agora ~1.500 e ~15 s em vez de ~70 s |
| `--system-prompt` curto | O prompt padrão do Claude Code é feito para programar e é grande; o curto deixa cada pedido com ~1.500 tokens de entrada |
| `--tools ""` (ou só `Read` na catalogação) | Sem acesso a arquivos, terminal ou internet |
| `--strict-mcp-config`, `--disable-slash-commands`, `--disallowedTools mcp__*` | Não carrega MCP, skills nem comandos |
| `--no-session-persistence` | Os pedidos não ficam salvos no histórico do Claude Code |
| `ANTHROPIC_API_KEY` removida do ambiente do processo | Garante que a cobrança vai para o plano, e não para a API |
| `--output-format json` | O backend lê o campo `result` e registra tempo e tokens no log |

Cuidados:

- **Uso pessoal.** O plano é individual. Se o app um dia atender outras pessoas, use a chave de API.
- **Conta no seu limite.** Os pedidos dividem o limite de uso com o claude.ai e o Claude Code.
- **Mais lento que o Gemini:** ~6 s para o programa iniciar mais o tempo da resposta.

## Usando a Claude API

1. Crie a chave e compre créditos em [platform.claude.com](https://platform.claude.com) (Settings → API Keys / Billing).
2. Coloque `ANTHROPIC_API_KEY` no `backend/.env` e reinicie o backend.

O app usa o SDK oficial (`@anthropic-ai/sdk`), modelo `claude-haiku-4-5`, sem parâmetros de esforço (o Haiku 4.5 não tem níveis de esforço). Se o Claude recusar um pedido por segurança, o app mostra uma mensagem pedindo para reformular o tema.

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
| LLM | Gemini → Claude Haiku (API ou plano) | Ollama local como reserva grátis |
| Transcrição | estimada pelo número de palavras | whisper.cpp local, para a legenda completa sincronizar palavra por palavra |
| Voz | upload do seu áudio | ElevenLabs via API, Piper local |
| Geração de imagem | desligada (você envia as imagens) | opcional, plugável |

Dívidas técnicas:

- As telas antigas ainda usam `aiService.ts` direto com o Gemini, sem a reserva do Claude.
- O pacote `@google/generative-ai` foi substituído pelo `@google/genai`. É preciso migrar.
- O pacote `openai` está no `package.json`, mas não é usado.
- As respostas JSON são extraídas do texto. Saída estruturada com validação (zod) deixaria mais robusto.
