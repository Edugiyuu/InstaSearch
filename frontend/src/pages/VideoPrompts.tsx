import { useState, useEffect } from 'react';
import { useVideoPrompts, Dialogue } from '../hooks/useVideoPrompts';
import { useSearchParams } from 'react-router-dom';
import './VideoPrompts.css';

const VideoPrompts = () => {
  const [searchParams] = useSearchParams();
  const contentId = searchParams.get('contentId');

  const {
    result,
    styles,
    durations,
    loading,
    error,
    generatePrompt,
    fetchStyles,
    copyToClipboard,
    openInGrok
  } = useVideoPrompts();

  const [source, setSource] = useState<'profile' | 'content' | 'topic'>(
    contentId ? 'content' : 'profile'
  );
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(8);
  const [style, setStyle] = useState('cinematic');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Estados para diálogos
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [newSpeaker, setNewSpeaker] = useState('');
  const [newText, setNewText] = useState('');
  const [newTiming, setNewTiming] = useState<string>('');
  const [showDialogues, setShowDialogues] = useState(false);

  useEffect(() => {
    fetchStyles();
  }, [fetchStyles]);

  const handleGenerate = async () => {
    try {
      const params: any = {
        duration,
        style
      };

      if (source === 'profile') {
        params.useMyProfile = true;
      } else if (source === 'content' && contentId) {
        params.contentId = contentId;
      } else if (source === 'topic' && topic.trim()) {
        params.topic = topic.trim();
      } else {
        return;
      }

      // Adicionar diálogos se houver
      if (dialogues.length > 0) {
        params.dialogues = dialogues;
      }

      await generatePrompt(params);
    } catch (err) {
      // Error já está no state
    }
  };

  const handleAddDialogue = () => {
    if (newSpeaker.trim() && newText.trim()) {
      const dialogue: Dialogue = {
        speaker: newSpeaker.trim(),
        text: newText.trim(),
      };
      
      if (newTiming) {
        dialogue.timing = newTiming;
      }

      setDialogues([...dialogues, dialogue]);
      setNewSpeaker('');
      setNewText('');
      setNewTiming('');
    }
  };

  const handleRemoveDialogue = (index: number) => {
    setDialogues(dialogues.filter((_, i) => i !== index));
  };

  const handleCopy = async (text: string, index: number) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    }
  };

  const handleOpenGrok = (prompt: string) => {
    openInGrok(prompt);
  };

  return (
    <div className="video-prompts">
      <div className="video-prompts-header">
        <h1>🎬 Gerador de Prompts de Vídeo IA</h1>
        <p>Crie prompts otimizados para Grok Video, Runway ML e outras ferramentas de IA</p>
      </div>

      {!result && (
        <div className="video-prompts-form">
          <div className="form-section">
            <label>📌 Fonte do Conteúdo</label>
            <div className="source-tabs">
              <button
                className={`source-tab ${source === 'profile' ? 'active' : ''}`}
                onClick={() => setSource('profile')}
              >
                📱 Meu Perfil Instagram
              </button>
              <button
                className={`source-tab ${source === 'topic' ? 'active' : ''}`}
                onClick={() => setSource('topic')}
              >
                💡 Tópico Customizado
              </button>
              {contentId && (
                <button
                  className={`source-tab ${source === 'content' ? 'active' : ''}`}
                  onClick={() => setSource('content')}
                >
                  📝 Ideia de Conteúdo
                </button>
              )}
            </div>

            {source === 'topic' && (
              <div className="topic-input">
                <textarea
                  placeholder="Ex: Dicas de produtividade para freelancers, Tutorial de fotografia para iniciantes..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  rows={3}
                />
              </div>
            )}

            {source === 'profile' && (
              <div className="info-box">
                <p>ℹ️ O prompt será gerado baseado no seu perfil Instagram conectado, incluindo bio, temas de conteúdo e público-alvo.</p>
              </div>
            )}

            {source === 'content' && contentId && (
              <div className="info-box">
                <p>ℹ️ O prompt será gerado baseado na ideia de conteúdo selecionada, incluindo título, descrição e script.</p>
              </div>
            )}
          </div>

          <div className="form-section">
            <label>⏱️ Duração do Vídeo</label>
            <div className="duration-selector">
              {durations.map((dur) => (
                <button
                  key={dur.value}
                  className={`duration-option ${duration === dur.value ? 'active' : ''}`}
                  onClick={() => setDuration(dur.value)}
                >
                  <span className="duration-value">{dur.label}</span>
                  <span className="duration-prompts">{dur.prompts} prompt{dur.prompts > 1 ? 's' : ''}</span>
                  <span className="duration-desc">{dur.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <label>🎨 Estilo Visual</label>
            <div className="style-grid">
              {styles.map((s) => (
                <button
                  key={s.id}
                  className={`style-card ${style === s.id ? 'active' : ''}`}
                  onClick={() => setStyle(s.id)}
                >
                  <h3>{s.name}</h3>
                  <p className="style-description">{s.description}</p>
                  <span className="style-best-for">Ideal para: {s.bestFor}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-section">
            <div className="dialogues-header">
              <label>💬 Diálogos/Falas (Opcional)</label>
              <button
                className="btn-toggle-dialogues"
                onClick={() => setShowDialogues(!showDialogues)}
              >
                {showDialogues ? '➖ Esconder' : '➕ Adicionar Diálogos'}
              </button>
            </div>

            {showDialogues && (
              <div className="dialogues-section">
                <p className="dialogues-info">
                  💡 Adicione falas para personagens, objetos ou narradores. Perfeito para vídeos de humor, educação ou narrativas criativas!
                </p>

                <div className="dialogue-form">
                  <div className="dialogue-inputs">
                    <input
                      type="text"
                      placeholder="Quem fala? (ex: Pizza, Narrador...)"
                      value={newSpeaker}
                      onChange={(e) => setNewSpeaker(e.target.value)}
                      className="input-speaker"
                    />
                    <input
                      type="text"
                      placeholder="O que fala?"
                      value={newText}
                      onChange={(e) => setNewText(e.target.value)}
                      className="input-text"
                    />
                    <select
                      value={newTiming}
                      onChange={(e) => setNewTiming(e.target.value)}
                      className="input-timing"
                    >
                      <option value="">Quando? (opcional)</option>
                      <option value="início">Início</option>
                      <option value="meio">Meio</option>
                      <option value="final">Final</option>
                    </select>
                    <button
                      className="btn-add-dialogue"
                      onClick={handleAddDialogue}
                      disabled={!newSpeaker.trim() || !newText.trim()}
                    >
                      ➕ Adicionar
                    </button>
                  </div>
                </div>

                {dialogues.length > 0 && (
                  <div className="dialogues-list">
                    <h4>Diálogos Adicionados ({dialogues.length}):</h4>
                    {dialogues.map((dialogue, index) => (
                      <div key={index} className="dialogue-item">
                        <div className="dialogue-content">
                          <span className="dialogue-speaker">👤 {dialogue.speaker}:</span>
                          <span className="dialogue-text">"{dialogue.text}"</span>
                          {dialogue.timing && (
                            <span className="dialogue-timing">⏱️ {dialogue.timing}</span>
                          )}
                        </div>
                        <button
                          className="btn-remove-dialogue"
                          onClick={() => handleRemoveDialogue(index)}
                          title="Remover diálogo"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {dialogues.length === 0 && (
                  <div className="dialogues-empty">
                    <p>Nenhum diálogo adicionado ainda.</p>
                    <p className="example-text">
                      <strong>Exemplo:</strong> Pizza → "Eu sou a melhor comida!" → início
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            className="btn-generate"
            onClick={handleGenerate}
            disabled={loading || (source === 'topic' && !topic.trim())}
          >
            {loading ? '⏳ Gerando...' : '✨ Gerar Prompts'}
          </button>

          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="video-prompts-result">
          <div className="result-header">
            <div>
              <h2>✅ Prompts Gerados!</h2>
              <p className="result-context">{result.context}</p>
            </div>
            <button className="btn-back" onClick={() => window.location.reload()}>
              🔄 Gerar Novo
            </button>
          </div>

          <div className="prompts-container">
            {result.prompts.map((prompt, index) => (
              <div key={index} className="prompt-card">
                <div className="prompt-header">
                  <h3>
                    {result.prompts.length > 1 ? `Parte ${index + 1}` : 'Prompt'}
                    <span className="prompt-duration">{prompt.duration}s</span>
                  </h3>
                  <div className="prompt-specs">
                    {prompt.technicalSpecs.aspectRatio} • {prompt.technicalSpecs.fps}fps
                  </div>
                </div>

                <div className="prompt-content">
                  <p>{prompt.prompt}</p>
                </div>

                <div className="prompt-actions">
                  <button
                    className="btn-copy"
                    onClick={() => handleCopy(prompt.prompt, index)}
                  >
                    {copiedIndex === index ? '✅ Copiado!' : '📋 Copiar'}
                  </button>
                  
                  {index === 0 && (
                    <button
                      className="btn-grok"
                      onClick={() => handleOpenGrok(prompt.prompt)}
                    >
                      🚀 Criar no Grok
                    </button>
                  )}
                </div>

                {result.prompts.length > 1 && index === 0 && (
                  <div className="prompt-note">
                    ⚠️ Gere esta parte primeiro no Grok, depois gere a Parte 2 para continuidade
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="tips-section">
            <h3>💡 Dicas para Melhores Resultados</h3>
            <ul>
              {result.tips.map((tip, index) => (
                <li key={index}>{tip}</li>
              ))}
            </ul>
          </div>

          <div className="grok-link">
            <p>
              <strong>🔗 Link do Grok:</strong>
              <a href={result.grokUrl} target="_blank" rel="noopener noreferrer">
                {result.grokUrl.substring(0, 60)}...
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoPrompts;
