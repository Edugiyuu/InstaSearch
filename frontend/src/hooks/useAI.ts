import { useState } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:3000/api';

interface ProfileData {
  username: string;
  bio?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  posts?: Array<{
    caption?: string;
    likesCount?: number;
    commentsCount?: number;
    type?: string;
  }>;
}

interface ProfileAnalysis {
  overview: string;
  contentThemes: string[];
  targetAudience: string;
  postingFrequency: string;
  engagementPattern: string;
  recommendations: string[];
}

interface ContentSuggestion {
  title: string;
  description: string;
  format: string;
  targetAudience: string;
  estimatedEngagement: string;
  hooks: string[];
  hashtags: string[];
}

interface CaptionResult {
  caption: string;
  hashtags: string[];
  callToAction: string;
  tone: string;
}

interface HashtagAnalysis {
  relevance: string;
  recommendations: string[];
  alternatives: string[];
}

interface AIHealth {
  status: string;
  model: string;
  provider: string;
  free: boolean;
  dailyLimit: number;
}

export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeProfile = async (profileData: ProfileData): Promise<ProfileAnalysis | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/ai/analyze-profile`, { profileData });
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao analisar perfil');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateContent = async (
    profileAnalysis: ProfileAnalysis,
    count: number = 5
  ): Promise<ContentSuggestion[] | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/ai/generate-content`, {
        profileAnalysis,
        count,
      });
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao gerar sugestões');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const generateCaption = async (
    contentIdea: string,
    tone: 'casual' | 'profissional' | 'inspirador' | 'humorístico' = 'casual',
    includeHashtags: boolean = true
  ): Promise<CaptionResult | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/ai/generate-caption`, {
        contentIdea,
        tone,
        includeHashtags,
      });
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao gerar caption');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const analyzeHashtags = async (hashtags: string[]): Promise<HashtagAnalysis | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`${API_URL}/ai/analyze-hashtags`, { hashtags });
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao analisar hashtags');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const checkHealth = async (): Promise<AIHealth | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(`${API_URL}/ai/health`);
      return response.data.data;
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Erro ao verificar status da IA');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    analyzeProfile,
    generateContent,
    generateCaption,
    analyzeHashtags,
    checkHealth,
  };
}
