import { useState } from 'react';
import axios from 'axios';

interface InstagramProfile {
  id: string;
  username: string;
  name: string;
  profile_picture_url?: string;
  followers_count?: number;
  follows_count?: number;
  media_count?: number;
  biography?: string;
  website?: string;
}

interface InstagramMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
  username: string;
}

interface InstagramInsights {
  impressions?: number;
  reach?: number;
  engagement?: number;
  profile_views?: number;
  website_clicks?: number;
}

export const useMyInstagram = () => {
  const [profile, setProfile] = useState<InstagramProfile | null>(null);
  const [media, setMedia] = useState<InstagramMedia[]>([]);
  const [reels, setReels] = useState<InstagramMedia[]>([]);
  const [insights, setInsights] = useState<InstagramInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/instagram/data/profile');
      setProfile(response.data.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar perfil');
      console.error('Erro ao buscar perfil:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async (limit = 25) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/instagram/data/media?limit=${limit}`);
      setMedia(response.data.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar posts');
      console.error('Erro ao buscar posts:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchReels = async (limit = 25) => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/instagram/data/reels?limit=${limit}`);
      setReels(response.data.data || response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao buscar reels');
      console.error('Erro ao buscar reels:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/instagram/data/insights');
      setInsights(response.data.data || response.data);
    } catch (err: any) {
      // Insights são opcionais - não setamos erro se falharem
      console.warn('Insights não disponíveis:', err.response?.data?.message || err.message);
      setInsights(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMediaInsights = async (mediaId: string) => {
    try {
      const response = await axios.get(`/api/instagram/data/media/${mediaId}/insights`);
      return response.data.data || response.data;
    } catch (err: any) {
      console.error('Erro ao buscar insights do post:', err);
      return null;
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Buscar dados essenciais em paralelo
      const results = await Promise.allSettled([
        fetchProfile(),
        fetchMedia(),
        fetchReels()
      ]);

      // Verificar se alguma das chamadas essenciais falhou
      const failures = results.filter((r, idx) => {
        // Só consideramos falha se for profile, media ou reels (não insights)
        return r.status === 'rejected';
      });

      if (failures.length > 0) {
        setError('Erro ao carregar alguns dados');
      }

      // Tentar buscar insights, mas não falhar se não conseguir
      try {
        await fetchInsights();
      } catch (err) {
        console.warn('Insights não disponíveis');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  return {
    profile,
    media,
    reels,
    insights,
    loading,
    error,
    fetchProfile,
    fetchMedia,
    fetchReels,
    fetchInsights,
    fetchMediaInsights,
    fetchAll
  };
};
