# Custos

Princípio do projeto: **todo recurso essencial tem um caminho de custo zero.** A tabela abaixo mostra o caminho gratuito e as alternativas pagas.

> Preços e limites de terceiros mudam com frequência. Os valores aqui são **ordens de grandeza** (referência: 2026). Confirme sempre no site do serviço.

## Hoje

| Componente | Caminho gratuito | Limite do gratuito | Quando pagar |
|---|---|---|---|
| Servidor | Seu próprio PC | O PC precisa estar ligado para o agendador publicar | VPS de cerca de US$ 4–6/mês para agendar 24/7 |
| Processamento de vídeo | FFmpeg (local) | Sem limite | Nunca |
| Instagram Graph API | Gratuita | Limite diário de publicações por conta | Nunca |
| IA (legendas, análises) | Gemini, nível gratuito | Requisições/dia limitadas e variáveis | Uso intenso: centavos a poucos dólares por mês |
| Hospedagem temporária do vídeo | Cloudinary, plano Free | Créditos mensais (armazenamento + banda) | Se não apagar os vídeos publicados, o plano enche |

## Recursos planejados (fluxo tema → Reel)

| Componente | Caminho gratuito | Alternativa paga |
|---|---|---|
| Motor de edição (composição, prévia, render) | Remotion local: gratuito para pessoas físicas e empresas com até 3 funcionários | Licença de empresa do Remotion para empresas maiores |
| Biblioteca de imagens | Local, catalogada uma vez por imagem (Gemini, nível gratuito) | — |
| Transcrição e sincronização | whisper.cpp local | APIs de transcrição: centavos por minuto |
| Roteiro, descrição de imagens, ajustes, escolha de imagens | Gemini, nível gratuito; quando acaba, Claude Sonnet 5.5 pelo Claude Code do seu plano Pro/Max (sem custo extra, conta no limite) | Claude Sonnet 5.5 pela API: alguns centavos por vídeo. Ver [AI.md](AI.md) |
| **Voz** | Seu microfone · Piper local · plano gratuito do ElevenLabs (poucos minutos por mês e restrições de uso comercial) | Planos pagos do ElevenLabs, a partir de cerca de US$ 5/mês. Confira a licença comercial do plano |
| Imagens novas | As suas (busca manual guiada pela lista de busca) | Geração por IA: centavos por imagem via API, ou grátis com Stable Diffusion/Flux local (exige GPU) |
| Efeitos sonoros | Sua biblioteca · Pixabay Sound Effects · Freesound (confira a licença de cada arquivo) | Bibliotecas pagas |
| Música | Pixabay Music · YouTube Audio Library | Epidemic, Artlist |
| Imagens/vídeos de banco | API do Pexels (gratuita) | — |
| LLM local | Ollama (exige uma boa GPU ou paciência na CPU) | — |
| Hospedagem de mídia sem Cloudinary | Servir o arquivo pelo próprio backend via túnel (ex.: Cloudflare Tunnel) | — |

## Cenários

| Perfil | Configuração | Custo mensal estimado |
|---|---|---|
| Testando / uso pessoal | Voz no microfone ou Piper, suas imagens, PC ligado | **R$ 0** |
| Canal narrado frequente | ElevenLabs pago + suas imagens + planos gratuitos | **cerca de R$ 30–130** (quase tudo é o ElevenLabs) |
| Canal narrado agendando 24/7 | O anterior + VPS pequena | **+ cerca de R$ 25–35** |

## Por que não usamos IA geradora de vídeo

Gerar vídeo por API (Grok Imagine, Sora, Veo, Kling etc.) custa algo como **US$ 0,50 a 4 por clipe de 8s**, conforme o modelo e a qualidade. Um Reel de 16 a 30s, com algumas tentativas, sai facilmente por **R$ 10 a 50**. Postando todo dia, isso passa de **R$ 300/mês**, o que contradiz o princípio de custo zero. Detalhes em [PURPOSE.md](PURPOSE.md#por-que-mudamos-de-rumo).

Nada impede alguém de gerar um clipe numa dessas ferramentas e usá-lo como cena. O app só não depende delas.
