import { useState, useCallback } from 'react';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Dialogue {
  speaker: string;
  text: string;
  timing?: string;
}

interface VideoPrompt {
  prompt: string;
  duration: number;
  style: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'comedy' | 'aesthetic' | 'dramatic' | 'educational' | 'retro' | 'futuristic' | 'abstract' | 'trendy';
  technicalSpecs: {
    aspectRatio: string;
    fps: number;
    length: string;
  };
}

interface VideoPromptResult {
  prompts: VideoPrompt[];
  context: string;
  tips: string[];
  grokUrl: string;
  metadata?: {
    duration: number;
    style: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'comedy' | 'aesthetic' | 'dramatic' | 'educational' | 'retro' | 'futuristic' | 'abstract' | 'trendy';
    promptCount: number;
    source: string;
  };
}

interface Style {
  id: string;
  name: string;
  description: string;
  bestFor: string;
}

interface Duration {
  value: number;
  label: string;
  prompts: number;
  description: string;
}

export function useVideoPrompts() {
  const [result, setResult] = useState<VideoPromptResult | null>(null);
  const [styles, setStyles] = useState<Style[]>([]);
  const [durations, setDurations] = useState<Duration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePrompt = useCallback(async (params: {
    topic?: string;
    contentId?: string;
    useMyProfile?: boolean;
    duration: number;
    style: 'cinematic' | 'realistic' | 'animated' | 'minimalist' | 'meme' | 'nonsense' | 'comedy' | 'aesthetic' | 'dramatic' | 'educational' | 'retro' | 'futuristic' | 'abstract' | 'trendy';
    dialogues?: Dialogue[];
  }) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post('/video-prompts/generate', params);
      setResult(response.data.data);
      return response.data.data;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Erro ao gerar prompts de vídeo';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchStyles = useCallback(async () => {
    try {
      const response = await api.get('/video-prompts/styles');
      setStyles(response.data.data.styles);
      setDurations(response.data.data.durations);
    } catch (err: any) {
      console.error('Erro ao buscar estilos:', err);
    }
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Erro ao copiar:', err);
      return false;
    }
  }, []);

  const openInGrok = useCallback((prompt: string) => {
    // Tentar deep link primeiro
    const encodedPrompt = encodeURIComponent(prompt);
    const grokUrl = `https://grok.com/imagine?prompt=${encodedPrompt}`;
    
    // Copiar para clipboard
    navigator.clipboard.writeText(prompt).catch(console.error);
    
    // Abrir Grok
    window.open(grokUrl, '_blank');
  }, []);

  return {
    result,
    styles,
    durations,
    loading,
    error,
    generatePrompt,
    fetchStyles,
    copyToClipboard,
    openInGrok
  };
}
