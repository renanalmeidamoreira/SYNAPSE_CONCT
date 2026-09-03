import { useState, useEffect, useCallback } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface GoogleMusicAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
}

const GOOGLE_MUSIC_TOKEN_KEY = 'synapse_google_music_token';
const GOOGLE_MUSIC_EMAIL_KEY = 'synapse_google_music_email';

export function useGoogleMusicAuth() {
  const [authState, setAuthState] = useState<GoogleMusicAuthState>(() => {
    try {
      const savedToken = localStorage.getItem(GOOGLE_MUSIC_TOKEN_KEY);
      const savedEmail = localStorage.getItem(GOOGLE_MUSIC_EMAIL_KEY);
      return {
        isAuthenticated: Boolean(savedToken),
        accessToken: savedToken,
        isLoading: false,
        error: null,
        userEmail: savedEmail,
      };
    } catch {
      return {
        isAuthenticated: false,
        accessToken: null,
        isLoading: false,
        error: null,
        userEmail: null,
      };
    }
  });

  const checkExistingToken = useCallback(() => {
    try {
      const token = localStorage.getItem(GOOGLE_MUSIC_TOKEN_KEY);
      const email = localStorage.getItem(GOOGLE_MUSIC_EMAIL_KEY);
      if (token) {
        setAuthState({
          isAuthenticated: true,
          accessToken: token,
          isLoading: false,
          error: null,
          userEmail: email,
        });
      }
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao carregar token Google Music:', err);
      }
    }
  }, []);

  useEffect(() => {
    checkExistingToken();
  }, [checkExistingToken]);

  const loginGoogleMusic = async (): Promise<string | null> => {
    setAuthState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'consent' });
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      const email = result.user?.email || null;

      if (token) {
        try {
          localStorage.setItem(GOOGLE_MUSIC_TOKEN_KEY, token);
          localStorage.setItem('synapse_youtube_token', token);
          if (email) localStorage.setItem(GOOGLE_MUSIC_EMAIL_KEY, email);
        } catch (storageErr) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Erro ao persistir token Google Music:', storageErr);
          }
        }

        setAuthState({
          isAuthenticated: true,
          accessToken: token,
          isLoading: false,
          error: null,
          userEmail: email,
        });
        return token;
      } else {
        setAuthState((prev) => ({ ...prev, isLoading: false }));
        return null;
      }
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      const code = errorObj?.code || '';
      const rawMsg = String(errorObj?.message || '');

      const isClosedByUser =
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        rawMsg.includes('popup-closed-by-user') ||
        rawMsg.includes('fechada');

      const isBlocked =
        code === 'auth/popup-blocked' ||
        rawMsg.includes('popup-blocked') ||
        rawMsg.includes('POPUP_BLOCKED');

      if (isClosedByUser) {
        // User closed or dismissed the popup window - clear loading without error
        setAuthState((prev) => ({
          ...prev,
          isLoading: false,
          error: null,
        }));
        return null;
      }

      let message = 'Falha ao autenticar no Google Music / YouTube.';
      if (isBlocked) {
        message = 'A janela pop-up foi bloqueada pelo navegador. Permita pop-ups para autenticar.';
      } else if (rawMsg) {
        message = rawMsg;
      }

      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      return null;
    }
  };

  const logoutGoogleMusic = () => {
    try {
      localStorage.removeItem(GOOGLE_MUSIC_TOKEN_KEY);
      localStorage.removeItem('synapse_youtube_token');
      localStorage.removeItem(GOOGLE_MUSIC_EMAIL_KEY);
    } catch (err) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Erro ao limpar dados Google Music:', err);
      }
    }
    setAuthState({
      isAuthenticated: false,
      accessToken: null,
      isLoading: false,
      error: null,
      userEmail: null,
    });
  };

  return {
    ...authState,
    loginGoogleMusic,
    logoutGoogleMusic,
    refreshGoogleMusic: checkExistingToken,
  };
}
