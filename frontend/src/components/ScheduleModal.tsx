import { useState, useEffect } from 'react'
import './ScheduleModal.css'

interface ScheduleModalProps {
  isOpen: boolean
  onClose: () => void
  onSchedule: (data: ScheduleData) => Promise<void>
  initialData?: Partial<ScheduleData>
  contentList?: any[]
}

export interface ScheduleData {
  contentId?: string
  caption: string
  scheduledFor: string
  media?: {
    type: 'reel' | 'post'
    file?: File
    videoUrl?: string
    imageUrl?: string
  }
}

function ScheduleModal({ isOpen, onClose, onSchedule, initialData, contentList = [] }: ScheduleModalProps) {
  const [formData, setFormData] = useState<ScheduleData>({
    contentId: '',
    caption: '',
    scheduledFor: '',
    media: undefined,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([])
  const [generatingCaption, setGeneratingCaption] = useState(false)
  const [videoStyle, setVideoStyle] = useState<string>('realistic')

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData,
      })
    }
  }, [initialData])

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setFormData({
        contentId: '',
        caption: '',
        scheduledFor: '',
        media: undefined,
      })
      setError(null)
      setMediaFiles([])
      setMediaPreviews([])
      setVideoStyle('realistic') // Reset video style
    }
  }, [isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.caption.trim()) {
      setError('Legenda é obrigatória')
      return
    }

    if (!formData.scheduledFor) {
      setError('Data e hora são obrigatórias')
      return
    }

    // Validar se a data é futura (com margem de 1 minuto)
    const scheduledDate = new Date(formData.scheduledFor)
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Pelo menos 1 minuto no futuro
    
    if (scheduledDate < now) {
      setError('⚠️ Não é possível agendar para o passado! Escolha um horário pelo menos 1 minuto no futuro.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Se tem arquivo de mídia, fazer upload primeiro
      let uploadedMedia = formData.media
      
      if (mediaFiles.length > 0 && formData.media?.type) {
        const uploadFormData = new FormData()
        
        // Upload de todos os vídeos
        mediaFiles.forEach(file => {
          uploadFormData.append('videos', file)
        })
        
        const uploadRes = await fetch('http://localhost:3000/api/videos/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        
        const uploadData = await uploadRes.json()
        
        if (uploadData.success && uploadData.data.videos.length > 0) {
          let finalVideo = uploadData.data.videos[0]
          
          // Se tem mais de 1 vídeo, fazer merge
          if (uploadData.data.videos.length > 1) {
            setError('Juntando vídeos...')
            const mergeRes = await fetch('http://localhost:3000/api/videos/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                filenames: uploadData.data.videos.map((f: any) => f.filename)
              })
            })
            
            const mergeData = await mergeRes.json()
            if (mergeData.success) {
              finalVideo = {
                filename: mergeData.data.filename,
                path: mergeData.data.path,
                thumbnail: undefined
              }
              setError(null)
            }
          }
          
          uploadedMedia = {
            type: formData.media.type,
            videoUrl: finalVideo.path || finalVideo.filename,
            imageUrl: finalVideo.thumbnail,
          }
        }
      }

      await onSchedule({
        ...formData,
        media: uploadedMedia,
      })
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao agendar postagem')
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setMediaFiles(files)

    // Criar previews para todos os arquivos
    const newPreviews: string[] = []
    let completed = 0
    
    files.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        newPreviews.push(reader.result as string)
        completed++
        if (completed === files.length) {
          setMediaPreviews(newPreviews)
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const removeFile = (index: number) => {
    setMediaFiles(prev => prev.filter((_, i) => i !== index))
    setMediaPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleGenerateCaption = async () => {
    setGeneratingCaption(true)
    setError(null)

    try {
      // Se tem vídeo(s), analisar o conteúdo visual
      if (mediaFiles.length > 0 && formData.media?.type === 'reel') {
        setError('📹 Fazendo upload e analisando vídeo...')
        
        // Upload dos vídeos primeiro
        const uploadFormData = new FormData()
        mediaFiles.forEach(file => {
          uploadFormData.append('videos', file)
        })
        
        const uploadRes = await fetch('http://localhost:3000/api/videos/upload', {
          method: 'POST',
          body: uploadFormData,
        })
        
        const uploadData = await uploadRes.json()
        
        if (uploadData.success && uploadData.data.videos.length > 0) {
          // Pegar primeiro vídeo para análise
          const firstVideo = uploadData.data.videos[0]
          
          setError('🤖 Analisando conteúdo do vídeo com IA...')
          
          // Analisar vídeo para gerar legenda contextual
          const analysisRes = await fetch('http://localhost:3000/api/videos/analyze-for-caption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: firstVideo.filename,
              style: videoStyle // Envia estilo visual escolhido
            })
          })
          
          const analysisData = await analysisRes.json()
          
          if (analysisData.success && analysisData.data.caption) {
            setFormData({ ...formData, caption: analysisData.data.caption })
            setError(null)
            return
          }
        }
      }
      
      // Fallback: gerar legenda baseada no contexto
      let contentIdea = ''
      
      if (formData.contentId) {
        const content = contentList.find(c => c.id === formData.contentId)
        if (content) {
          contentIdea = `Título: ${content.idea?.title}\nDescrição: ${content.idea?.description}\nHook: ${content.script?.hook}`
        }
      } else if (formData.media?.type === 'reel') {
        contentIdea = 'Criar legenda engajante e viral para um Reel do Instagram que vai atrair muita atenção'
      } else if (formData.media?.type === 'post') {
        contentIdea = 'Criar legenda criativa e interessante para um Post de imagem no Instagram'
      } else {
        contentIdea = 'Criar legenda interessante e chamativa para Instagram'
      }

      const response = await fetch('http://localhost:3000/api/ai/generate-caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contentIdea,
          tone: 'engaging',
          includeHashtags: true
        })
      })

      const data = await response.json()
      
      if (data.success && data.data.caption) {
        setFormData({ ...formData, caption: data.data.caption })
        setError(null)
      } else {
        setError('Não foi possível gerar a legenda')
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar legenda')
    } finally {
      setGeneratingCaption(false)
    }
  }

  const handleContentSelect = (contentId: string) => {
    const content = contentList.find(c => c.id === contentId)
    if (content) {
      setFormData({
        ...formData,
        contentId,
        caption: content.script?.hook + '\n\n' + content.script?.body || '',
      })
    } else {
      setFormData({
        ...formData,
        contentId,
      })
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 5) // Mínimo 5 minutos no futuro
    return now.toISOString().slice(0, 16)
  }

  if (!isOpen) return null

  return (
    <div className="schedule-modal-overlay" onClick={onClose}>
      <div className="schedule-modal" onClick={(e) => e.stopPropagation()}>
        <div className="schedule-modal-header">
          <h2>📅 Agendar Postagem</h2>
          <button className="schedule-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form className="schedule-form" onSubmit={handleSubmit}>
          {contentList.length > 0 && (
            <div className="form-group">
              <label>Conteúdo (Opcional)</label>
              <select
                value={formData.contentId}
                onChange={(e) => handleContentSelect(e.target.value)}
              >
                <option value="">Criar nova postagem</option>
                {contentList.map((content) => (
                  <option key={content.id} value={content.id}>
                    {content.idea?.title || 'Sem título'}
                  </option>
                ))}
              </select>
              <span className="form-hint">
                Selecione um conteúdo aprovado ou crie uma nova postagem
              </span>
            </div>
          )}

          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ margin: 0 }}>Legenda *</label>
              <button
                type="button"
                className="btn-generate-caption"
                onClick={handleGenerateCaption}
                disabled={generatingCaption || loading}
                title={mediaFiles.length > 0 ? 'Analisa o vídeo e gera legenda contextual' : 'Gera legenda com IA'}
              >
                {generatingCaption ? '⏳ Gerando...' : mediaFiles.length > 0 ? '🎬 Analisar Vídeo' : '🤖 Gerar com IA'}
              </button>
            </div>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData({ ...formData, caption: e.target.value })}
              placeholder={mediaFiles.length > 0 ? "Clique em 'Analisar Vídeo' para IA ver o conteúdo e gerar legenda..." : "Digite a legenda ou clique em 'Gerar com IA'..."}
              maxLength={2200}
              required
            />
            <div className={`character-count ${formData.caption.length > 2000 ? 'warning' : ''}`}>
              {formData.caption.length} / 2200
            </div>
            {mediaFiles.length > 0 && !formData.caption && (
              <span className="form-hint" style={{ color: '#667eea', fontWeight: 600 }}>
                💡 Clique em "Analisar Vídeo" para a IA ver seu vídeo e criar legenda personalizada!
              </span>
            )}
          </div>

          <div className="form-group">
            <label>Data e Hora *</label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
              min={getMinDateTime()}
              required
            />
            <span className="form-hint">
              🤖 O post será publicado automaticamente no horário escolhido (verificando a cada 1 minuto)
            </span>
          </div>

          <div className="form-group">
            <label>Tipo de Mídia</label>
            <select
              value={formData.media?.type || ''}
              onChange={(e) => {
                setFormData({
                  ...formData,
                  media: e.target.value ? { type: e.target.value as 'reel' | 'post' } : undefined
                })
                setMediaFiles([])
                setMediaPreviews([])
              }}
            >
              <option value="">Apenas texto (sem mídia)</option>
              <option value="reel">Reel (Vídeo)</option>
              <option value="post">Post (Imagem)</option>
            </select>
          </div>

          {formData.media?.type === 'reel' && (
            <div className="form-group">
              <label>Vídeo(s) do Reel</label>
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo"
                onChange={handleFileChange}
                multiple
              />
              <span className="form-hint">
                Selecione 1-3 vídeos • MP4, MOV, AVI (max 50MB cada)
                {mediaFiles.length > 1 && ` • ${mediaFiles.length} vídeos serão juntados`}
              </span>
              {mediaPreviews.length > 0 && (
                <>
                  <div className="media-preview">
                    {mediaPreviews.map((preview, index) => (
                      <div key={index} className="media-preview-item">
                        <video src={preview} controls style={{ width: '100%', height: '100%' }} />
                        <button
                          type="button"
                          className="media-preview-remove"
                          onClick={() => removeFile(index)}
                        >
                          ×
                        </button>
                        <div className="video-number">{index + 1}</div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="form-group" style={{ marginTop: '1rem' }}>
                    <label>🎨 Estilo Visual</label>
                    <select
                      value={videoStyle}
                      onChange={(e) => setVideoStyle(e.target.value)}
                    >
                      <option value="realistic">📹 Realista (Vlog/Selfie)</option>
                      <option value="cinematic">🎬 Cinematográfico</option>
                      <option value="meme">😂 Meme (Viral/Humor)</option>
                      <option value="weird">👻 Weird (Bizarro - jonmud.fun)</option>
                      <option value="aesthetic">✨ Aesthetic (Artístico)</option>
                      <option value="satisfying">😌 Satisfying (ASMR Visual)</option>
                      <option value="minimalist">⚪ Minimalista</option>
                      <option value="animated">🎨 Animado</option>
                      <option value="nonsense">🤪 Nonsense (Absurdo)</option>
                    </select>
                    <span className="form-hint">
                      {videoStyle === 'weird' && '👻 Vídeos BIZARROS e perturbadores que param o scroll'}
                      {videoStyle === 'realistic' && '📹 Aparência natural de vlog/selfie com celular'}
                      {videoStyle === 'meme' && '😂 Estilo meme viral com humor rápido'}
                      {videoStyle === 'aesthetic' && '✨ Visual artístico com paleta harmoniosa'}
                      {videoStyle === 'satisfying' && '😌 Vídeos satisfatórios tipo ASMR visual'}
                      {videoStyle === 'cinematic' && '🎬 Estilo cinematográfico profissional'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

          {formData.media?.type === 'post' && (
            <div className="form-group">
              <label>Imagem do Post</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={handleFileChange}
              />
              <span className="form-hint">
                Formatos aceitos: JPG, PNG (max 10MB)
              </span>
              {mediaPreviews.length > 0 && (
                <div className="media-preview">
                  <div className="media-preview-item">
                    <img src={mediaPreviews[0]} alt="Preview" />
                    <button
                      type="button"
                      className="media-preview-remove"
                      onClick={() => removeFile(0)}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="form-error">⚠️ {error}</div>
          )}

          <div className="form-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-schedule" disabled={loading}>
              {loading ? 'Agendando...' : '📅 Agendar Postagem'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ScheduleModal
