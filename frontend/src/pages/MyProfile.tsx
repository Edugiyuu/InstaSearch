import { useEffect, useState } from 'react'
import { useMyInstagram } from '../hooks/useMyInstagram'
import { useAI } from '../hooks/useAI'
import { AIAnalysisModal } from '../components/AIAnalysisModal'
import './MyProfile.css'

const MyProfile = () => {
  const { profile, media, reels, insights, loading, error, fetchAll } = useMyInstagram();
  const { analyzeProfile, loading: aiLoading, error: aiError } = useAI();
  const [activeTab, setActiveTab] = useState<'all' | 'reels'>('all');
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const formatNumber = (num: number | undefined) => {
    if (!num) return '0';
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const handleAnalyzeWithAI = async () => {
    if (!profile) return;

    const profileData = {
      username: profile.username,
      bio: profile.biography,
      followersCount: profile.followers_count,
      followingCount: profile.follows_count,
      postsCount: profile.media_count,
      posts: media.map(m => ({
        caption: m.caption,
        likesCount: m.like_count,
        commentsCount: m.comments_count,
        type: m.media_type === 'VIDEO' ? 'reel' : 'post'
      })).slice(0, 10) // Apenas últimos 10 posts
    };

    const result = await analyzeProfile(profileData);
    
    if (result) {
      setAiAnalysis(result);
      setShowAIModal(true);
    }
  };

  if (loading && !profile) {
    return (
      <div className="my-profile">
        <div className="loading">
          <div className="spinner"></div>
          <p>Carregando seus dados do Instagram...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-profile">
        <div className="error-message">
          <h3>⚠️ Erro</h3>
          <p>{error}</p>
          <button onClick={fetchAll} className="btn-refresh">
            🔄 Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="my-profile">
      <div className="profile-header">
        <h1>📱 Meu Perfil do Instagram</h1>
        <div className="header-actions">
          <button onClick={fetchAll} className="btn-refresh" disabled={loading}>
            {loading ? '⏳' : '🔄'} Atualizar
          </button>
          <button 
            onClick={handleAnalyzeWithAI} 
            className="btn-ai" 
            disabled={aiLoading || loading || !profile}
          >
            {aiLoading ? '⏳ Analisando...' : '🤖 Analisar com IA'}
          </button>
        </div>
      </div>

      {aiError && (
        <div className="ai-error-message">
          ⚠️ {aiError}
        </div>
      )}

      {/* AI Analysis Modal */}
      <AIAnalysisModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        analysis={aiAnalysis}
        username={profile?.username || ''}
      />

      {!profile && (
        <div className="empty-state">
          <h3>📱 Conecte seu Instagram</h3>
          <p>Vá em Configurações para conectar sua conta do Instagram.</p>
        </div>
      )}

      {profile && (
        <>
          {/* Profile Info Card */}
          <div className="profile-card">
        <div className="profile-avatar">
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt={profile.username} />
          ) : (
            <div className="avatar-placeholder">
              {profile.username?.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        
        <div className="profile-info">
          <h2>{profile.name}</h2>
          <p className="username">@{profile.username}</p>
          {profile.biography && <p className="bio">{profile.biography}</p>}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" className="website">
              🔗 {profile.website}
            </a>
          )}
        </div>

        <div className="profile-stats">
          <div className="stat">
            <span className="stat-value">{formatNumber(profile.media_count)}</span>
            <span className="stat-label">Posts</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(profile.followers_count)}</span>
            <span className="stat-label">Seguidores</span>
          </div>
          <div className="stat">
            <span className="stat-value">{formatNumber(profile.follows_count)}</span>
            <span className="stat-label">Seguindo</span>
          </div>
        </div>
      </div>

      {/* Insights Card */}
      {insights && (
        <div className="insights-card">
          <h3>📊 Insights da Conta</h3>
          <div className="insights-grid">
            {insights.impressions !== undefined && (
              <div className="insight-item">
                <span className="insight-icon">👁️</span>
                <div>
                  <div className="insight-value">{formatNumber(insights.impressions)}</div>
                  <div className="insight-label">Impressões</div>
                </div>
              </div>
            )}
            {insights.reach !== undefined && (
              <div className="insight-item">
                <span className="insight-icon">📍</span>
                <div>
                  <div className="insight-value">{formatNumber(insights.reach)}</div>
                  <div className="insight-label">Alcance</div>
                </div>
              </div>
            )}
            {insights.profile_views !== undefined && (
              <div className="insight-item">
                <span className="insight-icon">👤</span>
                <div>
                  <div className="insight-value">{formatNumber(insights.profile_views)}</div>
                  <div className="insight-label">Visitas ao Perfil</div>
                </div>
              </div>
            )}
            {insights.website_clicks !== undefined && (
              <div className="insight-item">
                <span className="insight-icon">🔗</span>
                <div>
                  <div className="insight-value">{formatNumber(insights.website_clicks)}</div>
                  <div className="insight-label">Cliques no Site</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Tabs */}
      <div className="media-section">
        <div className="media-header">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              📸 Todas as Postagens ({media.length})
            </button>
            <button 
              className={`tab ${activeTab === 'reels' ? 'active' : ''}`}
              onClick={() => setActiveTab('reels')}
            >
              🎬 Reels ({reels.length})
            </button>
          </div>
        </div>

        {/* Media Grid */}
        {(() => {
          const currentMedia = activeTab === 'all' ? media : reels;
          
          return currentMedia.length > 0 ? (
          <div className="media-grid">
            {currentMedia.map((item: any) => (
              <div key={item.id} className="media-item">
                <div className="media-thumbnail">
                  {item.media_type === 'VIDEO' ? (
                    <video 
                      src={item.media_url} 
                      poster={item.thumbnail_url}
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <img 
                      src={item.thumbnail_url || item.media_url} 
                      alt={item.caption?.substring(0, 50) || 'Post'} 
                    />
                  )}
                  <div className="media-type-badge">
                    {item.media_type === 'VIDEO' ? '🎬' : 
                     item.media_type === 'CAROUSEL_ALBUM' ? '📸' : '🖼️'}
                  </div>
                </div>
                
                <div className="media-info">
                  {item.caption && (
                    <p className="media-caption">
                      {item.caption.length > 100 
                        ? `${item.caption.substring(0, 100)}...` 
                        : item.caption}
                    </p>
                  )}
                  
                  <div className="media-stats">
                    {item.like_count !== undefined && (
                      <span className="stat-item">
                        ❤️ {formatNumber(item.like_count)}
                      </span>
                    )}
                    {item.comments_count !== undefined && (
                      <span className="stat-item">
                        💬 {formatNumber(item.comments_count)}
                      </span>
                    )}
                  </div>
                  
                  <div className="media-footer">
                    <span className="media-date">{formatDate(item.timestamp)}</span>
                    <a 
                      href={item.permalink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="btn-view"
                    >
                      Ver no Instagram →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-media">
            <p>
              {activeTab === 'all' 
                ? '📭 Nenhuma postagem encontrada' 
                : '📭 Nenhum reel encontrado'}
            </p>
          </div>
        );
        })()}
      </div>
      </>
      )}
    </div>
  );
};

export default MyProfile;
