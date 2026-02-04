# 🎬 Guia de Geração de Prompts de Vídeo IA

## 📖 Visão Geral

O InstaSearch possui um sistema de geração de prompts otimizados para ferramentas de IA de vídeo, especialmente o **Grok Video** (https://grok.com/imagine). 

Ao invés de integrar diretamente com APIs de vídeo (que custam $95-500/mês + taxas por vídeo), geramos **prompts profissionais** que você pode usar em qualquer ferramenta de IA de vídeo.

---

## 🎯 Por Que Usar Prompts?

### Vantagens:
✅ **100% Gratuito** - Usa Google Gemini API (1.500 requisições/dia)  
✅ **Flexível** - Use em Grok, Runway, Pika, ou qualquer ferramenta IA  
✅ **Otimizado** - Prompts profissionais com especificações técnicas  
✅ **Rápido** - Gera prompts em 2-3 segundos  
✅ **Personalizado** - Baseado no seu perfil, conteúdo ou tópicos  

### Por Que Não Integração Direta?
❌ APIs de vídeo são caras ($95-500/mês + $0.10-0.50/vídeo)  
❌ Complexidade de implementação  
❌ Limites de uso e qualidade  
❌ Dependência de um único fornecedor  

---

## 🚀 Como Funciona

### 1. Escolha a Fonte de Conteúdo

Você pode gerar prompts baseados em 3 opções:

#### 📱 Meu Perfil Instagram
- Usa dados do seu perfil conectado
- Analisa seu nicho, estilo e audiência
- Gera prompts alinhados com sua marca

#### 💡 Ideia de Conteúdo
- Seleciona uma ideia salva na página "Content"
- Transforma a ideia em prompt de vídeo
- Mantém contexto e objetivo original

#### ✍️ Tópico Customizado
- Digite qualquer tópico em texto livre
- Exemplo: "dicas de produtividade", "receitas veganas"
- Máxima flexibilidade

---

### 2. Escolha a Duração

#### ⏱️ 8 Segundos
- Gera **1 prompt** otimizado
- Ideal para: transições, hooks, clipes curtos
- Grok Video gera vídeos de 7-8 segundos por prompt

#### ⏱️ 16 Segundos
- Gera **2 prompts sequenciais**
- Parte 1 + Parte 2 com continuidade narrativa
- Você cola os 2 prompts em sequência no Grok
- Total: ~16 segundos de vídeo

> **Limitação do Grok:** O Grok Video atualmente gera vídeos de 7-8 segundos por prompt. Para vídeos mais longos, a IA gera 2 prompts que contam uma história contínua.

---

### 3. Escolha o Estilo Visual

Temos **14 estilos visuais** para diferentes necessidades:

| Estilo | Descrição | Melhor Para |
|--------|-----------|-------------|
| 🎬 **Cinematic** | Cinematográfico profissional | Narrativas, storytelling |
| 📸 **Realistic** | Fotorrealista natural | Demonstrações, tutoriais |
| 🎨 **Animated** | Animação moderna | Conteúdo educativo |
| ⚪ **Minimalist** | Minimalista e limpo | Citações, mensagens |
| 😂 **Meme** | Meme culture, viral | Humor, entretenimento |
| 🤪 **Nonsense** | Surreal, absurdo | Comédia, experimental |
| 🎭 **Comedy** | Humor situacional | Sketches, piadas |
| ✨ **Aesthetic** | Visual artístico harmonioso | Lifestyle, moda, arte |
| ⚡ **Dramatic** | Alto contraste, impactante | Histórias emocionais |
| 📚 **Educational** | Didático, explicativo | Tutoriais, dicas |
| 📼 **Retro** | Vintage, anos 80/90 | Nostalgia, throwback |
| 🚀 **Futuristic** | Sci-fi, cyberpunk | Tech, inovação |
| 🌀 **Abstract** | Arte abstrata | Experimentos visuais |
| 🔥 **Trendy** | Tendências atuais | Viral content, trends |

---

### 4. Adicione Diálogos/Falas (Opcional) 💬

**NOVO!** Especifique quem fala e o que fala no vídeo:

#### Exemplo: Comidas Falantes 🍕🍔

```json
[
  {
    "speaker": "Pizza",
    "text": "Eu sou a melhor comida do mundo!",
    "timing": "início"
  },
  {
    "speaker": "Hambúrguer",
    "text": "Nem vem, eu sou mais saboroso!",
    "timing": "meio"
  },
  {
    "speaker": "Narrador",
    "text": "E a batalha continua...",
    "timing": "final"
  }
]
```

#### Como Funciona:
- O prompt visual descreve expressões faciais e movimentos labiais
- Personagens/objetos "falam" através de animações visuais
- Perfeito para humor, narrativas criativas ou educação

#### Campos:
- **speaker** (obrigatório): Quem está falando
- **text** (obrigatório): O que a pessoa/objeto fala  
- **timing** (opcional): Quando acontece (início/meio/final)

---

### 5. Gere e Use o Prompt

1. **Clique em "Gerar Prompts"**
   - A IA analisa seu conteúdo
   - Gera 1 ou 2 prompts otimizados
   - Inclui especificações técnicas (9:16, etc.)

2. **Copie o Prompt**
   - Botão "📋 Copiar Prompt" em cada card
   - Ou clique em "🚀 Criar no Grok" para abrir direto

3. **Use no Grok Video**
   - Vá para https://grok.com/imagine
   - Cole o prompt
   - Clique em "Generate Video"
   - Para 16s: cole Parte 1, gere vídeo, depois Parte 2

---

## 📝 Exemplos de Prompts Gerados

### Exemplo 1: Cinematic (8s)
```
A cinematic 9:16 vertical video showing a modern workspace with soft morning light. 
Camera slowly pans across a minimalist desk with laptop, coffee, and plants. 
Professional color grading with warm tones. Shot on cinema camera with shallow depth of field.
```

### Exemplo 2: Meme (8s)
```
A chaotic 9:16 vertical meme video with bold text overlay "ME TRYING TO BE PRODUCTIVE". 
Shows cat knocking things off desk in fast motion. Meme fonts, high contrast colors, 
zooms and shakes. Internet culture aesthetic.
```

### Exemplo 3: Storytelling (16s - Parte 1)
```
PART 1: A cinematic 9:16 vertical video opening on a person staring at empty notebook, 
frustrated. Soft dramatic lighting. Camera slowly zooms in on their worried expression. 
Muted colors, professional color grading. Cinema-quality footage.
```

### Exemplo 3: Storytelling (16s - Parte 2)
```
PART 2: Continue the story - same person now smiling, writing energetically. 
Camera pans to reveal colorful sticky notes and organized workspace. 
Lighting brightens, warm tones return. Ends with satisfied look to camera. 
9:16 vertical format, cinematic quality.
```

---

## 🎬 Ferramenta Alvo: Grok Video

### O Que é Grok Video?
- Ferramenta de IA de vídeo da xAI (empresa do Elon Musk)
- Acesse em: https://grok.com/imagine
- Gera vídeos curtos (7-8 segundos) baseados em texto

### Como Usar:
1. **Login:** Faça login no Grok (conta X/Twitter)
2. **Imagine:** Vá para a aba "Imagine"
3. **Prompt:** Cole o prompt gerado pelo InstaSearch
4. **Generate:** Clique em "Generate Video"
5. **Aguarde:** Processamento leva ~30-60 segundos
6. **Download:** Baixe o vídeo quando pronto

### Limitações do Grok:
- ⏱️ **Duração:** 7-8 segundos por prompt (por isso geramos 2 para 16s)
- 📐 **Formato:** Suporta 9:16 (Stories/Reels)
- 🎨 **Qualidade:** Depende da clareza do prompt
- 🔒 **Acesso:** Precisa de conta X/Twitter

---

## 🛠️ Outras Ferramentas de IA de Vídeo

Você pode usar os prompts gerados em qualquer ferramenta:

### Alternativas Populares:

#### **Runway ML**
- 🌐 https://runwayml.com
- 💰 $12-95/mês
- 🎬 Vídeos de até 16 segundos

#### **Pika Labs**
- 🌐 https://pika.art
- 💰 $10-70/mês
- 🎬 Efeitos especiais avançados

#### **Stability AI Video**
- 🌐 https://stability.ai
- 💰 $20-100/mês
- 🎬 Alta qualidade

#### **Google Veo 3.1**
- 🌐 Google AI Studio
- 💰 Preços variados
- 🎬 Nova versão em desenvolvimento

---

## 💡 Dicas para Prompts Melhores

### ✅ Faça:
- Use os prompts **exatamente como gerados** (já estão otimizados)
- Teste **diferentes estilos** para ver qual combina mais
- Para 16s, cole os **2 prompts em sequência**
- Experimente o mesmo prompt em **diferentes ferramentas**

### ❌ Evite:
- Não edite prompts manualmente (pode perder otimização)
- Não misture estilos diferentes no mesmo vídeo
- Não use prompts de 16s como um único prompt (cole em sequência)

---

## 🔧 Integração com Content

### Botão "🎬 Gerar Prompt de Vídeo"

Na página **Content**, cada ideia salva tem um botão para gerar prompts:

1. **Abrir Content:** Vá para "💡 Content"
2. **Escolher Ideia:** Veja suas ideias salvas
3. **Gerar Prompt:** Clique em "🎬 Gerar Prompt de Vídeo"
4. **Automático:** A página Video Prompts abre com contexto pré-preenchido
5. **Escolher Duração e Estilo:** Customize e gere

---

## 📊 API Endpoints

### POST /api/video-prompts/generate

Gera prompts de vídeo.

**Request:**
```json
{
  "contentId": "content_abc123",  // Opcional
  "topic": "dicas de produtividade",  // Opcional
  "useMyProfile": true,  // Opcional
  "duration": 8,  // 8 ou 16
  "style": "cinematic",  // Ver lista de estilos
  "dialogues": [  // Opcional - NOVO!
    {
      "speaker": "Pizza",
      "text": "Eu sou a melhor comida!",
      "timing": "início"
    },
    {
      "speaker": "Hambúrguer",
      "text": "Mentira, eu sou melhor!",
      "timing": "meio"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "prompts": ["..."],
    "context": "Video baseado em: ...",
    "tips": ["Use o prompt exatamente...", "..."],
    "grokUrl": "https://grok.com/imagine?prompt=..."
  }
}
```

### GET /api/video-prompts/styles

Retorna lista de estilos disponíveis.

---

## 🎯 Casos de Uso

### 1. Creator de Conteúdo
- **Objetivo:** Criar Reels consistentes com sua marca
- **Como:** Use "Meu Perfil" + estilo "Cinematic"
- **Resultado:** Prompts alinhados com seu nicho

### 2. Agência de Marketing
- **Objetivo:** Testar diferentes estilos para cliente
- **Como:** Use "Tópico Customizado" + vários estilos
- **Resultado:** Portfolio de opções criativas

### 3. Educador
- **Objetivo:** Criar conteúdo educativo visual
- **Como:** Use "Ideia de Conteúdo" + estilo "Animated"
- **Resultado:** Vídeos didáticos e envolventes

### 4. Entretenimento
- **Objetivo:** Conteúdo viral e engraçado
- **Como:** Use "Tópico Customizado" + estilo "Meme"
- **Resultado:** Vídeos com potencial viral

### 5. Comidas/Objetos Falantes (NOVO!) 🍕💬
- **Objetivo:** Criar personagens animados que conversam
- **Como:** Use "Tópico Customizado" + estilo "Animated" ou "Comedy" + adicionar diálogos
- **Exemplo:**
  ```json
  {
    "topic": "batalha entre comidas",
    "duration": 16,
    "style": "animated",
    "dialogues": [
      {"speaker": "Pizza", "text": "Eu sou a rainha da festa!", "timing": "início"},
      {"speaker": "Hambúrguer", "text": "Só se for da festa dos perdedores!", "timing": "meio"},
      {"speaker": "Sorvete", "text": "Vocês dois são quentes demais, eu sou a melhor!", "timing": "final"}
    ]
  }
  ```
- **Resultado:** Vídeo com comidas animadas conversando, expressões faciais e gestos

---

## ❓ FAQ

### P: Preciso pagar algo?
**R:** Não! O sistema usa Google Gemini (1.500 requisições/dia gratuitas). Você só paga se usar ferramentas de vídeo pagas como Runway.

### P: Funciona em português?
**R:** Sim! A IA entende tópicos em português e gera prompts otimizados (geralmente em inglês para melhor compatibilidade com ferramentas IA).

### P: Posso editar os prompts?
**R:** Pode, mas não recomendamos. Os prompts já estão otimizados com especificações técnicas. Editar pode reduzir a qualidade.

### P: Por que 2 prompts para 16s?
**R:** O Grok Video gera 7-8 segundos por prompt. Para vídeos mais longos, você gera 2 vídeos em sequência.

### P: Funciona com outras ferramentas além do Grok?
**R:** Sim! Os prompts são genéricos e funcionam em Runway, Pika, Stability AI, etc.

### P: Quantos prompts posso gerar por dia?
**R:** Limite de 1.500 requisições/dia (Google Gemini). Na prática, uso ilimitado para usuários individuais.

---

## 🐛 Troubleshooting

### Erro: "Nenhuma conta conectada"
- **Solução:** Conecte seu Instagram em Settings → Conexão com Instagram

### Erro: "Ideia de conteúdo não encontrada"
- **Solução:** Verifique se o contentId existe na página Content

### Prompt Muito Genérico
- **Solução:** Use "Meu Perfil" ao invés de tópico customizado para prompts mais personalizados

### Vídeo do Grok Não Ficou Bom
- **Solução:** 
  1. Teste outro estilo visual
  2. Tente gerar o prompt novamente
  3. Experimente outra ferramenta (Runway, Pika)

### Deep Link Não Funcionou
- **Solução:** O prompt foi copiado para clipboard automaticamente. Acesse https://grok.com/imagine manualmente e cole.

---

## 📚 Recursos Adicionais

- **Documentação da API:** [docs/API.md](./API.md)
- **Guia de Instalação:** [docs/SETUP.md](./SETUP.md)
- **Conexão Instagram:** [docs/INSTAGRAM_AUTH.md](./INSTAGRAM_AUTH.md)
- **Progresso do Projeto:** [PROGRESS.md](../PROGRESS.md)

---

## 🎉 Conclusão

O sistema de Video Prompts do InstaSearch é a forma mais **rápida**, **gratuita** e **flexível** de criar vídeos com IA para seu Instagram. 

**Próximos Passos:**
1. Conecte seu Instagram em Settings
2. Vá para "🎬 Video Prompts"
3. Gere seu primeiro prompt
4. Crie um vídeo no Grok Video
5. Poste no Instagram! 🚀

---

**Documentação gerada em: 3 de Fevereiro de 2026**
