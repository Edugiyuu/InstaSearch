import './AIAnalysisModal.css';

interface ProfileAnalysis {
  overview: string;
  contentThemes: string[];
  targetAudience: string;
  postingFrequency: string;
  engagementPattern: string;
  recommendations: string[];
}

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ProfileAnalysis | null;
  username: string;
  onGenerateContent?: () => void;
}

export function AIAnalysisModal({
  isOpen,
  onClose,
  analysis,
  username,
  onGenerateContent,
}: AIAnalysisModalProps) {
  if (!isOpen || !analysis) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content ai-analysis-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🤖 Análise de IA - @{username}</h2>
          <button className="close-button" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Visão Geral */}
          <section className="analysis-section">
            <h3>📊 Visão Geral</h3>
            <p className="overview-text">{analysis.overview}</p>
          </section>

          {/* Temas de Conteúdo */}
          <section className="analysis-section">
            <h3>🎯 Temas de Conteúdo</h3>
            <div className="themes-list">
              {analysis.contentThemes.map((theme, index) => (
                <span key={index} className="theme-badge">
                  #{index + 1} {theme}
                </span>
              ))}
            </div>
          </section>

          {/* Público-Alvo */}
          <section className="analysis-section">
            <h3>👥 Público-Alvo</h3>
            <p className="audience-text">{analysis.targetAudience}</p>
          </section>

          {/* Frequência de Postagem */}
          <section className="analysis-section">
            <h3>📅 Frequência de Postagem</h3>
            <p className="frequency-text">{analysis.postingFrequency}</p>
          </section>

          {/* Padrão de Engajamento */}
          <section className="analysis-section">
            <h3>📈 Padrão de Engajamento</h3>
            <p className="engagement-text">{analysis.engagementPattern}</p>
          </section>

          {/* Recomendações */}
          <section className="analysis-section">
            <h3>💡 Recomendações</h3>
            <ul className="recommendations-list">
              {analysis.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </section>
        </div>

        <div className="modal-footer">
          {onGenerateContent && (
            <button className="btn-primary" onClick={onGenerateContent}>
              ✨ Gerar Sugestões de Conteúdo
            </button>
          )}
          <button className="btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
