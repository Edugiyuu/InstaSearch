import { useState } from 'react';
import api from '../services/api';

interface UploadedVideo {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  duration: number;
}

interface VideoUploadResponse {
  videos: UploadedVideo[];
  count: number;
  totalDuration: number;
}

interface MergeResponse {
  filename: string;
  path: string;
}

interface PublishResponse {
  mediaId: string;
  message: string;
}

export function useVideoPublish() {
  const [uploadedVideos, setUploadedVideos] = useState<UploadedVideo[]>([]);
  const [mergedVideo, setMergedVideo] = useState<MergeResponse | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload de vídeos (1-3 arquivos)
   */
  const uploadVideos = async (files: File[]) => {
    if (files.length === 0) {
      setError('Nenhum arquivo selecionado');
      return false;
    }

    if (files.length > 3) {
      setError('Máximo de 3 vídeos permitidos');
      return false;
    }

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => {
        formData.append('videos', file);
      });

      const response = await api.post<{ success: boolean; data: VideoUploadResponse }>(
        '/videos/upload',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setUploadedVideos(response.data.data.videos);
      setMergedVideo(null); // Resetar merge anterior
      return true;

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao fazer upload dos vídeos';
      setError(errorMessage);
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Juntar vídeos (se múltiplos)
   */
  const mergeVideos = async () => {
    if (uploadedVideos.length < 2) {
      setError('É necessário pelo menos 2 vídeos para juntar');
      return false;
    }

    setIsMerging(true);
    setError(null);

    try {
      const filenames = uploadedVideos.map(v => v.filename);

      const response = await api.post<{ success: boolean; data: MergeResponse }>(
        '/videos/merge',
        { filenames }
      );

      setMergedVideo(response.data.data);
      return true;

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao juntar vídeos';
      setError(errorMessage);
      return false;
    } finally {
      setIsMerging(false);
    }
  };

  /**
   * Publicar reel no Instagram
   */
  const publishReel = async (caption: string, hashtags?: string) => {
    // Determinar qual vídeo usar (merged ou único)
    let filename: string;

    if (mergedVideo) {
      filename = mergedVideo.filename;
    } else if (uploadedVideos.length === 1) {
      filename = uploadedVideos[0].filename;
    } else {
      setError('Nenhum vídeo pronto para publicar');
      return false;
    }

    if (!caption.trim()) {
      setError('Caption é obrigatória');
      return false;
    }

    setIsPublishing(true);
    setError(null);

    try {
      const response = await api.post<{ success: boolean; data: PublishResponse }>(
        '/videos/publish-reel',
        {
          filename,
          caption: caption.trim(),
          hashtags: hashtags?.trim() || ''
        }
      );

      // Limpar estado após publicação bem-sucedida
      setUploadedVideos([]);
      setMergedVideo(null);

      return response.data.data;

    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao publicar reel';
      setError(errorMessage);
      return false;
    } finally {
      setIsPublishing(false);
    }
  };

  /**
   * Deletar vídeo
   */
  const deleteVideo = async (filename: string) => {
    try {
      await api.delete(`/videos/${filename}`);
      
      // Remover da lista
      setUploadedVideos(prev => prev.filter(v => v.filename !== filename));
      
      if (mergedVideo?.filename === filename) {
        setMergedVideo(null);
      }

      return true;
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Erro ao deletar vídeo';
      setError(errorMessage);
      return false;
    }
  };

  /**
   * Resetar estado
   */
  const reset = () => {
    setUploadedVideos([]);
    setMergedVideo(null);
    setError(null);
  };

  return {
    // Estado
    uploadedVideos,
    mergedVideo,
    isUploading,
    isMerging,
    isPublishing,
    error,

    // Ações
    uploadVideos,
    mergeVideos,
    publishReel,
    deleteVideo,
    reset,

    // Utilitários
    totalDuration: uploadedVideos.reduce((acc, v) => acc + v.duration, 0),
    videoCount: uploadedVideos.length,
    needsMerge: uploadedVideos.length > 1 && !mergedVideo,
    canPublish: (uploadedVideos.length === 1 || mergedVideo !== null),
  };
}
