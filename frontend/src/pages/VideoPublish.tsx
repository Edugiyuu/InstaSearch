import { useState, useRef } from 'react';
import { useVideoPublish } from '../hooks/useVideoPublish';
import './VideoPublish.css';

export default function VideoPublish() {
  const {
    uploadedVideos,
    mergedVideo,
    isUploading,
    isMerging,
    isPublishing,
    error,
    uploadVideos,
    mergeVideos,
    publishReel,
    deleteVideo,
    reset,
    totalDuration,
    videoCount,
    canPublish,
  } = useVideoPublish();

  const [caption, setCaption] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [generatingCaption, setGeneratingCaption] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados do fluxo
  const isUploadStep = uploadedVideos.length === 0 && !mergedVideo;
  const isMergeStep = uploadedVideos.length > 1 && !mergedVideo;
  const isPublishStep = canPublish;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, 3); // Máximo 3
    const success = await uploadVideos(fileArray);

    if (success && fileInputRef.current) {
      fileInputRef.current.value = ''; // Limpar input
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    await handleFileSelect(files);
  };

  const handleMerge = async () => {
    await mergeVideos();
  };

  const handlePublish = async () => {
    const result = await publishReel(caption, hashtags);

    if (result) {
      setPublishSuccess(true);
      setCaption('');
      setHashtags('');

      // Resetar após 3 segundos
      setTimeout(() => {
        setPublishSuccess(false);
      }, 3000);
    }
  };

  const handleReset = () => {
    reset();
    setCaption('');
    setHashtags('');
    setPublishSuccess(false);
  };

  const handleGenerateCaption = async () => {
    if (!mergedVideo && uploadedVideos.length === 0) {
      alert('⚠️ Faça upload de pelo menos um vídeo primeiro!');
      return;
    }

    setGeneratingCaption(true);

    try {
      // Determinar qual vídeo analisar
      const videoToAnalyze = mergedVideo || uploadedVideos[0];

      const response = await fetch('http://localhost:3000/api/videos/analyze-for-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: videoToAnalyze.filename,
          style: 'realistic' // Pode ser dinâmico se quiser
        })
      });

      const data = await response.json();

      if (data.success && data.data.caption) {
        setCaption(data.data.caption);
      } else {
        throw new Error(data.message || 'Erro ao gerar legenda');
      }
    } catch (err: any) {
      alert(`❌ Erro ao gerar legenda: ${err.message}`);
    } finally {
      setGeneratingCaption(false);
    }
  };

  const formatDuration = (seconds: number) => {
    return `${seconds.toFixed(1)}s`;
  };

  const formatFileSize = (bytes: number) => {
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  };

  return (
    <div className="video-publish-container">
      <div className="video-publish-header">
        <h1>📱 Publicar Reel</h1>
        <p>Envie até 3 vídeos, junte (opcional) e publique direto no Instagram</p>
      </div>

      {/* Mensagem de Sucesso */}
      {publishSuccess && (
        <div className="success-banner">
          ✅ Reel publicado com sucesso no Instagram!
        </div>
      )}

      {/* Mensagem de Erro */}
      {error && (
        <div className="error-banner">
          ❌ {error}
        </div>
      )}

      {/* ETAPA 1: Upload de Vídeos */}
      {isUploadStep && (
        <div className="upload-section">
          <div
            className={`dropzone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <div className="loading">
                <div className="spinner"></div>
                <p>Enviando vídeos...</p>
              </div>
            ) : (
              <>
                <div className="dropzone-icon">🎬</div>
                <h3>Arraste vídeos aqui</h3>
                <p>ou clique para selecionar</p>
                <span className="dropzone-hint">Máximo: 3 vídeos | 50MB cada | Formatos: MP4, MOV, AVI, MKV</span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              multiple
              style={{ display: 'none' }}
              onChange={(e) => handleFileSelect(e.target.files)}
            />
          </div>
        </div>
      )}

      {/* ETAPA 2: Vídeos Carregados - Opção de Merge */}
      {isMergeStep && (
        <div className="videos-section">
          <div className="videos-header">
            <h3>📹 Vídeos Carregados ({videoCount})</h3>
            <span className="total-duration">Duração total: {formatDuration(totalDuration)}</span>
          </div>

          <div className="videos-grid">
            {uploadedVideos.map((video, index) => (
              <div key={video.filename} className="video-card">
                <div className="video-number">{index + 1}</div>
                <div className="video-info">
                  <p className="video-name">{video.originalName}</p>
                  <div className="video-meta">
                    <span>{formatDuration(video.duration)}</span>
                    <span>{formatFileSize(video.size)}</span>
                  </div>
                </div>
                <button
                  className="video-delete"
                  onClick={() => deleteVideo(video.filename)}
                  title="Remover vídeo"
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>

          <div className="merge-actions">
            {videoCount > 1 && (
              <button
                className="btn btn-primary btn-large"
                onClick={handleMerge}
                disabled={isMerging}
              >
                {isMerging ? (
                  <>
                    <div className="spinner-small"></div>
                    Juntando vídeos...
                  </>
                ) : (
                  <>🎬 Juntar {videoCount} Vídeos</>
                )}
              </button>
            )}
            <button className="btn btn-secondary" onClick={handleReset}>
              ↺ Recomeçar
            </button>
          </div>
        </div>
      )}

      {/* ETAPA 3: Publicação */}
      {isPublishStep && (
        <div className="publish-section">
          <div className="video-ready">
            <h3>✅ Vídeo Pronto para Publicar</h3>
            {mergedVideo ? (
              <p>Vídeo unificado criado com sucesso!</p>
            ) : (
              <p>{uploadedVideos[0]?.originalName}</p>
            )}
            <span className="video-duration">
              {formatDuration(mergedVideo ? totalDuration : uploadedVideos[0]?.duration || 0)}
            </span>
          </div>

          <div className="publish-form">
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label htmlFor="caption" style={{ margin: 0 }}>
                  <strong>Legenda do Reel</strong> <span className="required">*</span>
                </label>
                <button
                  type="button"
                  className="btn-generate-caption"
                  onClick={handleGenerateCaption}
                  disabled={generatingCaption || (!mergedVideo && uploadedVideos.length === 0)}
                  title="Analisa o vídeo e gera legenda contextual com IA"
                >
                  {generatingCaption ? '⏳ Gerando...' : '🎬 Analisar Vídeo & Gerar Legenda'}
                </button>
              </div>
              <textarea
                id="caption"
                className="form-textarea"
                placeholder={uploadedVideos.length > 0 || mergedVideo ? "Clique em 'Analisar Vídeo' para IA ver o conteúdo e gerar legenda..." : "Escreva uma legenda envolvente para o seu reel..."}
                rows={4}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={2200}
              />
              <span className="char-count">{caption.length}/2200 caracteres</span>
              {(uploadedVideos.length > 0 || mergedVideo) && !caption && (
                <span className="form-hint" style={{ color: '#667eea', fontWeight: 600, marginTop: '0.5rem', display: 'block' }}>
                  💡 Clique em "Analisar Vídeo" para a IA ver seu vídeo e criar legenda personalizada!
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="hashtags">
                <strong>Hashtags</strong> <span className="optional">(opcional)</span>
              </label>
              <input
                id="hashtags"
                type="text"
                className="form-input"
                placeholder="#reels #instagram #viral"
                value={hashtags}
                onChange={(e) => setHashtags(e.target.value)}
              />
              <span className="form-hint">Separe hashtags com espaço</span>
            </div>

            <div className="publish-actions">
              <button
                className="btn btn-success btn-large"
                onClick={handlePublish}
                disabled={isPublishing || !caption.trim()}
              >
                {isPublishing ? (
                  <>
                    <div className="spinner-small"></div>
                    Publicando...
                  </>
                ) : (
                  <>📱 Publicar Reel no Instagram</>
                )}
              </button>
              <button className="btn btn-secondary" onClick={handleReset} disabled={isPublishing}>
                ↺ Recomeçar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
