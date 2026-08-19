import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, db } from '../utils/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AUTH_STORAGE_KEY = 'synapse_auth_session_v1';
const GOOGLE_TOKEN_KEY = 'synapse_google_access_token';
const GOOGLE_ID_TOKEN_KEY = 'synapse_google_id_token';

export interface PersistedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  providerId?: string;
  isGuest?: boolean;
  lastLoginAt: number;
}

interface AuthContextType {
  user: User | PersistedUser | null;
  loading: boolean;
  googleAccessToken: string | null;
  login: () => Promise<void>;
  loginAsGuest: (customName?: string) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  googleAccessToken: null,
  login: async () => {},
  loginAsGuest: () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | PersistedUser | null>(() => {
    // 1. Restaurar sessão salva imediatamente no localStorage para evitar redirecionamento ao recarregar a página
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.uid) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao restaurar sessão inicial:', e);
    }
    return null;
  });

  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GOOGLE_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // Configurar persistência local do Firebase Auth
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Persistência local do Firebase configurada:', err);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const persistedData: PersistedUser = {
          uid: u.uid,
          email: u.email,
          displayName: u.displayName,
          photoURL: u.photoURL,
          providerId: u.providerData[0]?.providerId || 'google.com',
          lastLoginAt: Date.now(),
        };
        try {
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedData));
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedData));
        } catch (e) {}

        // Sincronizar dados no Firestore
        try {
          const userRef = doc(db, 'users', u.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              email: u.email || '',
              displayName: u.displayName || '',
              createdAt: Date.now(),
            });
          }
        } catch (err) {
          console.warn('Firestore sync status:', err);
        }
      } else {
        // Garantir que a sessão persistida no localStorage previna redirecionamentos indesejados
        try {
          const saved = localStorage.getItem(AUTH_STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && parsed.uid) {
              setUser(parsed);
              setLoading(false);
              return;
            }
          }
        } catch (e) {}

        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    // Escopos do Google para conexão única unificada (Classroom, Slides, Drive, Profile)
    provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
    provider.addScope('https://www.googleapis.com/auth/userinfo.email');
    provider.addScope('https://www.googleapis.com/auth/drive.readonly');
    provider.addScope('https://www.googleapis.com/auth/classroom.courses.readonly');
    provider.addScope('https://www.googleapis.com/auth/classroom.coursework.me.readonly');
    provider.addScope('https://www.googleapis.com/auth/classroom.announcements.readonly');
    provider.addScope('https://www.googleapis.com/auth/classroom.rosters.readonly');
    provider.addScope('https://www.googleapis.com/auth/presentations.readonly');
    provider.setCustomParameters({
      prompt: 'select_account',
    });

    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      const idToken = await result.user.getIdToken();

      if (token) {
        setGoogleAccessToken(token);
        try {
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
          sessionStorage.setItem(GOOGLE_TOKEN_KEY, token);
        } catch (e) {}
      }

      if (idToken) {
        try {
          localStorage.setItem(GOOGLE_ID_TOKEN_KEY, idToken);
          sessionStorage.setItem(GOOGLE_ID_TOKEN_KEY, idToken);
        } catch (e) {}
      }

      (window as any).SYNAPSE_GOOGLE_SESSION = {
        accessToken: token,
        idToken,
        user: result.user,
      };

      const persistedData: PersistedUser = {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        providerId: 'google.com',
        lastLoginAt: Date.now(),
      };

      setUser(result.user);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedData));
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistedData));
    } catch (err: any) {
      console.error('Erro no login com Google:', err);
      loginAsGuest('Estudante Synapse');
    }
  };

  const loginAsGuest = (customName = 'Concurseiro Synapse') => {
    const guestUser: PersistedUser = {
      uid: `guest-${Date.now()}`,
      email: 'estudante@synapse.app',
      displayName: customName,
      photoURL: null,
      isGuest: true,
      lastLoginAt: Date.now(),
    };
    setUser(guestUser);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(guestUser));
    } catch (e) {}
    setLoading(false);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      sessionStorage.removeItem(GOOGLE_TOKEN_KEY);
      sessionStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
      delete (window as any).SYNAPSE_GOOGLE_SESSION;
    } catch (e) {}

    setUser(null);
    setGoogleAccessToken(null);
    try {
      await signOut(auth);
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        googleAccessToken,
        login,
        loginAsGuest,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

