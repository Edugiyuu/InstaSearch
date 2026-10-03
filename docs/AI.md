# Inteligência Artificial no InstaSearch

Este documento cobre onde a IA é usada, como configurar o Gemini e o plano para suportar outros provedores. Ele substitui o antigo `GEMINI_SETUP.md`.

## Onde a IA é usada

| Recurso | Status | Entrada → saída | Arquivo |
|---|---|---|---|
| Legenda do post a partir do vídeo | ✅ | 3 frames + estilo → legenda | `aiService.generateCaptionFromVideo` |
| Análise do seu perfil | ✅ | bio + posts recentes → temas, público, pontos fortes | `aiService.analyzeProfile` (aba Meu Perfil) |
| Legenda a partir de uma ideia | ✅ | ideia + tom → legenda + hashtags | `aiService.generateCaption` |
| Análise de hashtags | ✅ | lista → classificação e sugestões | `aiService.analyzeHashtags` |
| Sugestões de conteúdo | ✅ (sem tela dedicada) | análise de perfil → ideias com roteiro | `aiService.generateContentSuggestions` |
| Prompts para IA de vídeo | ⚠️ legado | tema/estilo → prompts | `aiService.generateVideoPrompt`, vai virar o gerador de roteiro |
| Roteiro | 📋 | tema + tom + duração → cenas (narração, dicas visuais, ênfase) | ver [AUTO_EDIT.md](AUTO_EDIT.md#2-roteiro-ia) |
| Catalogação da biblioteca | 📋 | imagem/clipe → personagens, tags, descrição, **regiões (caixas)** | roda uma vez por arquivo; as regiões alimentam recortes e setas. Ver [AUTO_EDIT.md](AUTO_EDIT.md#catalogação-automática) |
| Planejador de batidas | 📋 | batidas + 5 a 10 candidatos da biblioteca por batida → `EditPlan` (tipo de cena, material, recorte, anotações, sfx) e lista de busca | ver [AUTO_EDIT.md](AUTO_EDIT.md#4-batidas-visuais-automático) |
| Ajustes em linguagem natural | 📋 | plano + pedido → patch | "coloca um X na cena da energia vermelha" |
| Geração de imagem (opcional) | 📋 | dica visual → imagem | provider plugável |
| Ciclo de aprendizado | 📋 | métricas dos seus Reels → próximas ideias | ver [ROADMAP.md](ROADMAP.md) |

Regra de projeto: **a IA sugere e o usuário aprova.** Nenhuma saída de IA é publicada sem passar pela interface.

## Configurando o Gemini

1. Acesse [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey) e crie uma chave.
2. No `backend/.env`:
   ```env
   GEMINI_API_KEY=sua_chave
   GEMINI_MODEL=gemini-2.5-flash
   ```
3. Teste:
   ```bash
   cd backend
   node scripts/test-gemini.js
   ```
4. Com o backend rodando, `GET /api/ai/health` informa se o serviço está ativo.

### Custos e limites

- O Gemini tem um **nível gratuito**, mas os limites (requisições por minuto e por dia) **mudaram várias vezes** e foram reduzidos ao longo de 2025. Não conte com números fixos: consulte a [página de limites](https://ai.google.dev/gemini-api/docs/rate-limits) e a de [preços](https://ai.google.dev/gemini-api/docs/pricing).
- No nível gratuito, o Google pode usar os dados enviados para melhorar os produtos. Se isso for um problema, ative o faturamento.
- O InstaSearch faz **poucas chamadas por vídeo**: 1 para o roteiro, 1 ou 2 para o planejador e 1 por pedido de ajuste. A catalogação gasta 1 chamada de visão por imagem **nova** e fica em cache; com a biblioteca crescendo, esse custo cai. Para uso pessoal, o nível gratuito ou um custo de centavos por mês costuma bastar.

### Modelos

Use um modelo da família **Flash**: é rápido, barato e aceita imagens, o que a legenda por frames exige. Os modelos *Pro* são desnecessários para as tarefas atuais. Os nomes mudam com frequência; confira a [lista oficial](https://ai.google.dev/gemini-api/docs/models).

### Erros comuns

| Erro | Solução |
|---|---|
| `API key not valid` | Chave errada ou com espaços. Gere outra |
| `Resource has been exhausted` / 429 | Limite atingido. Espere ou ative o faturamento |
| `models/... is not found` | Nome de modelo descontinuado. Atualize `GEMINI_MODEL` |
| Resposta não é um JSON válido | O modelo saiu do formato pedido. Tente de novo; o roadmap prevê saída estruturada com validação |

## Provedores plugáveis (planejado)

Hoje o código chama o SDK do Gemini direto. O plano é isolar tudo atrás de interfaces, para que trocar de provedor seja só configuração:

```ts
interface LLMProvider {
  generateText(prompt: string, opts?: { json?: boolean; images?: Buffer[] }): Promise<string>
}
interface TranscriptionProvider { transcribe(audioPath: string): Promise<Word[]> }
interface TTSProvider { synthesize(text: string, voice?: string): Promise<{ audioPath: string }> }
interface ImageGenProvider { generate(prompt: string, opts?: { aspect: '9:16' | '1:1' }): Promise<{ imagePath: string }> }
```

| Tipo | Padrão (grátis) | Alternativas |
|---|---|---|
| LLM (roteiro, plano, ajustes) | Gemini Flash (nível gratuito) | Ollama local (Llama, Qwen, Gemma), OpenAI, Claude |
| Visão (catalogar imagens, detectar regiões) | Gemini Flash (retorna caixas delimitadoras) | Ollama com modelo de visão |
| Transcrição | whisper.cpp local | Gemini (áudio), APIs pagas |
| Voz | **Upload do seu áudio** (ElevenLabs, microfone) | ElevenLabs via API, Piper local |
| Geração de imagem | desligada (você envia as imagens) | Gemini/Imagen, Flux, Stable Diffusion local |

Configuração prevista:

```env
LLM_PROVIDER=gemini        # gemini | ollama | openai | anthropic
IMAGE_GEN_PROVIDER=none    # none | gemini | flux | sd-local
ELEVENLABS_API_KEY=        # opcional
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:7b
```

### Dívidas técnicas relacionadas

- O pacote `@google/generative-ai` foi substituído pelo SDK `@google/genai`. É preciso migrar.
- O pacote `openai` está no `package.json`, mas não é usado. Remover, ou reaproveitar no provider OpenAI.
- Os prompts estão como strings dentro de `aiService.ts` (cerca de 860 linhas). Mover para arquivos de template facilita ajustar e testar.
- As respostas JSON são extraídas do texto. Usar o modo de saída estruturada (JSON schema) e validar com zod.
