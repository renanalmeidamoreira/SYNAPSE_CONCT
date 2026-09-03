import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  auth,
  db,
  googleProvider,
  checkEmailAuthorization,
  isSuperAdminEmail,
  SUPER_ADMIN_EMAIL,
} from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const AUTH_STORAGE_KEY = 'synapse_auth_session_v2';
const GOOGLE_TOKEN_KEY = 'synapse_google_access_token';
const GOOGLE_ID_TOKEN_KEY = 'synapse_google_id_token';

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthorized: boolean;
  isSuperAdmin: boolean;
  role: 'admin' | 'student' | 'guest';
  userEmail: string;
  googleAccessToken: string | null;
  login: () => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginAsGuest: () => void;
  authorizeYouTube: () => Promise<string | null>;
  logout: () => Promise<void>;
  recheckAccess: () => Promise<void>;
}

const GUEST_STORAGE_KEY = 'synapse_guest_session_active';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthorized: false,
  isSuperAdmin: false,
  role: 'guest',
  userEmail: '',
  googleAccessToken: null,
  login: async () => {},
  loginWithGoogle: async () => {},
  loginAsGuest: () => {},
  authorizeYouTube: async () => null,
  logout: async () => {},
  recheckAccess: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState<'admin' | 'student' | 'guest'>('guest');
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(GOOGLE_TOKEN_KEY);
    } catch {
      return null;
    }
  });

  // Configurar persistência local
  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.warn('Persistência local Firebase configurada:', err);
    });
  }, []);

  const verifyUserAccess = async (currentUser: User | null) => {
    if (!currentUser) {
      // Verifica se há sessão de convidado salva
      try {
        const isGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        if (isGuest === 'true') {
          setUser({
            uid: 'guest_synapse_user',
            email: 'visitante@synapse.edu.br',
            displayName: 'Estudante Convidado',
            photoURL: '',
            emailVerified: true,
            isAnonymous: true,
          } as unknown as User);
          setIsAuthorized(true);
          setIsSuperAdmin(false);
          setRole('student');
          setLoading(false);
          return;
        }
      } catch (e) {}

      setUser(null);
      setIsAuthorized(false);
      setIsSuperAdmin(false);
      setRole('guest');
      setLoading(false);
      return;
    }

    setUser(currentUser);
    const email = currentUser.email || '';
    const superAdmin = isSuperAdminEmail(email);
    setIsSuperAdmin(superAdmin);

    try {
      const authResult = await checkEmailAuthorization(email);
      const userRole = superAdmin ? 'admin' : (authResult.role || 'student');
      
      setIsAuthorized(true);
      setRole(userRole);

      // Salva perfil no Firestore se for a primeira vez
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Estudante SYNAPSE',
            photoURL: currentUser.photoURL || '',
            role: userRole,
            createdAt: new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          });
        } else {
          await setDoc(
            userRef,
            { lastLoginAt: new Date().toISOString() },
            { merge: true }
          );
        }
      } catch (e) {
        console.warn('Sync do perfil no Firestore:', e);
      }
    } catch (err) {
      console.warn('Erro ao verificar lista de autorizados:', err);
      setIsAuthorized(true);
      setRole(superAdmin ? 'admin' : 'student');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      await verifyUserAccess(u);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogleHandler = async () => {
    try {
      // Remove any prior guest session flag
      try {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      } catch (e) {}

      // Invoke signInWithPopup directly to preserve user gesture context
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      provider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleAccessToken(token);
        try {
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
          localStorage.setItem('synapse_youtube_token', token);
          localStorage.setItem('synapse_google_music_token', token);
          if (result.user?.email) {
            localStorage.setItem('synapse_google_music_email', result.user.email);
          }
        } catch (e) {}
      }

      await verifyUserAccess(result.user);
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      throw err;
    }
  };

  const authorizeYouTubeHandler = async (): Promise<string | null> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'consent' });
      provider.addScope('https://www.googleapis.com/auth/youtube.readonly');

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleAccessToken(token);
        try {
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
          localStorage.setItem('synapse_youtube_token', token);
          localStorage.setItem('synapse_google_music_token', token);
          if (result.user?.email) {
            localStorage.setItem('synapse_google_music_email', result.user.email);
          }
        } catch (e) {}
      }

      await verifyUserAccess(result.user);
      return token;
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');
      if (code === 'auth/popup-blocked' || msg.includes('popup-blocked')) {
        const error = new Error('POPUP_BLOCKED: O navegador bloqueou a janela de autorização do Google/YouTube.');
        (error as any).code = 'auth/popup-blocked';
        throw error;
      }
      if (code === 'auth/popup-closed-by-user' || msg.includes('popup-closed-by-user')) {
        const error = new Error('A janela de autorização foi fechada antes de concluir.');
        (error as any).code = 'auth/popup-closed-by-user';
        throw error;
      }
      console.warn('[YouTube Auth Warning]:', err?.message || err);
      throw err;
    }
  };

  const loginAsGuestHandler = () => {
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, 'true');
    } catch (e) {}
    setUser({
      uid: 'guest_synapse_user',
      email: 'visitante@synapse.edu.br',
      displayName: 'Estudante Convidado',
      photoURL: '',
      emailVerified: true,
      isAnonymous: true,
    } as unknown as User);
    setIsAuthorized(true);
    setIsSuperAdmin(false);
    setRole('student');
    setLoading(false);
  };

  const logoutHandler = async () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
      localStorage.removeItem(GUEST_STORAGE_KEY);
      await signOut(auth);
    } catch (e) {
      console.warn('Erro ao deslogar:', e);
    } finally {
      setUser(null);
      setIsAuthorized(false);
      setIsSuperAdmin(false);
      setRole('guest');
      setGoogleAccessToken(null);
      setLoading(false);
    }
  };

  const recheckAccessHandler = async () => {
    if (user) {
      setLoading(true);
      await verifyUserAccess(user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthorized,
        isSuperAdmin,
        role,
        userEmail: user?.email || '',
        googleAccessToken,
        login: loginWithGoogleHandler,
        loginWithGoogle: loginWithGoogleHandler,
        loginAsGuest: loginAsGuestHandler,
        authorizeYouTube: authorizeYouTubeHandler,
        logout: logoutHandler,
        recheckAccess: recheckAccessHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
