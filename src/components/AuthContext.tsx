import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
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
  logout: () => Promise<void>;
  recheckAccess: () => Promise<void>;
}

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
      if (authResult.authorized || superAdmin) {
        setIsAuthorized(true);
        setRole(superAdmin ? 'admin' : authResult.role);

        // Salva perfil no Firestore se for a primeira vez
        try {
          const userRef = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            await setDoc(userRef, {
              uid: currentUser.uid,
              email: currentUser.email || '',
              displayName: currentUser.displayName || '',
              photoURL: currentUser.photoURL || '',
              role: superAdmin ? 'admin' : authResult.role,
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
      } else {
        setIsAuthorized(false);
        setRole('guest');
      }
    } catch (err) {
      console.warn('Erro ao verificar lista de autorizados:', err);
      if (superAdmin) {
        setIsAuthorized(true);
        setRole('admin');
      } else {
        setIsAuthorized(false);
        setRole('guest');
      }
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
      setLoading(true);
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
      googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');

      const result = await signInWithPopup(auth, googleProvider);
      const credential = (result as any).credential;
      const token = credential?.accessToken || null;

      if (token) {
        setGoogleAccessToken(token);
        try {
          localStorage.setItem(GOOGLE_TOKEN_KEY, token);
        } catch (e) {}
      }

      await verifyUserAccess(result.user);
    } catch (err: any) {
      console.error('Erro no login Google:', err);
      setLoading(false);
      throw err;
    }
  };

  const logoutHandler = async () => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_ID_TOKEN_KEY);
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
        logout: logoutHandler,
        recheckAccess: recheckAccessHandler,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
