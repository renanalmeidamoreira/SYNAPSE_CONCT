import { useState, useEffect, useCallback } from 'react';

export interface GeminiAuthState {
  hasCustomKey: boolean;
  apiKey: string | null;
  preferredModel: string;
  useLocalLlamafile: boolean;
  llamafileEndpoint: string;
}

const GEMINI_CUSTOM_KEY = 'synapse_custom_gemini_key';
const GEMINI_PREFERRED_MODEL_KEY = 'synapse_preferred_gemini_model';
const LLAMAFILE_ENABLED_KEY = 'synapse_llamafile_enabled';
const LLAMAFILE_ENDPOINT_KEY = 'synapse_llamafile_endpoint';

export function useGeminiAuth() {
  const [geminiState, setGeminiState] = useState<GeminiAuthState>(() => {
    try {
      const savedKey = localStorage.getItem(GEMINI_CUSTOM_KEY);
      const savedModel = localStorage.getItem(GEMINI_PREFERRED_MODEL_KEY) || 'gemini-3.5-flash';
      const llamaEnabled = localStorage.getItem(LLAMAFILE_ENABLED_KEY) === 'true';
      const llamaEndpoint = localStorage.getItem(LLAMAFILE_ENDPOINT_KEY) || 'http://127.0.0.1:8080';

      return {
        hasCustomKey: Boolean(savedKey),
        apiKey: savedKey,
        preferredModel: savedModel,
        useLocalLlamafile: llamaEnabled,
        llamafileEndpoint: llamaEndpoint,
      };
    } catch {
      return {
        hasCustomKey: false,
        apiKey: null,
        preferredModel: 'gemini-3.5-flash',
        useLocalLlamafile: false,
        llamafileEndpoint: 'http://127.0.0.1:8080',
      };
    }
  });

  const loadSettings = useCallback(() => {
    try {
      const savedKey = localStorage.getItem(GEMINI_CUSTOM_KEY);
      const savedModel = localStorage.getItem(GEMINI_PREFERRED_MODEL_KEY) || 'gemini-3.5-flash';
      const llamaEnabled = localStorage.getItem(LLAMAFILE_ENABLED_KEY) === 'true';
      const llamaEndpoint = localStorage.getItem(LLAMAFILE_ENDPOINT_KEY) || 'http://127.0.0.1:8080';

      setGeminiState({
        hasCustomKey: Boolean(savedKey),
        apiKey: savedKey,
        preferredModel: savedModel,
        useLocalLlamafile: llamaEnabled,
        llamafileEndpoint: llamaEndpoint,
      });
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao carregar configurações de IA:', err);
      }
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const saveCustomApiKey = (key: string | null) => {
    try {
      if (key && key.trim()) {
        localStorage.setItem(GEMINI_CUSTOM_KEY, key.trim());
      } else {
        localStorage.removeItem(GEMINI_CUSTOM_KEY);
      }
      loadSettings();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao salvar chave da IA:', err);
      }
    }
  };

  const setPreferredModel = (modelName: string) => {
    try {
      localStorage.setItem(GEMINI_PREFERRED_MODEL_KEY, modelName);
      setGeminiState((prev) => ({ ...prev, preferredModel: modelName }));
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao salvar modelo preferido:', err);
      }
    }
  };

  const toggleLocalLlamafile = (enabled: boolean, endpoint?: string) => {
    try {
      localStorage.setItem(LLAMAFILE_ENABLED_KEY, String(enabled));
      if (endpoint) {
        localStorage.setItem(LLAMAFILE_ENDPOINT_KEY, endpoint);
      }
      loadSettings();
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao configurar Llamafile:', err);
      }
    }
  };

  return {
    ...geminiState,
    saveCustomApiKey,
    setPreferredModel,
    toggleLocalLlamafile,
    refreshGeminiSettings: loadSettings,
  };
}
