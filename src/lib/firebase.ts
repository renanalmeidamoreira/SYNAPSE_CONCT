import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app, config.firestoreDatabaseId || '(default)');
export const googleProvider = new GoogleAuthProvider();

export const SUPER_ADMIN_EMAIL = 'r.fabulous.30@gmail.com';

export interface AuthorizedUserRecord {
  email: string;
  role: 'admin' | 'student' | 'guest';
  addedBy: string;
  addedAt: string;
  notes?: string;
  status: 'active' | 'revoked';
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'admin' | 'student' | 'guest';
  createdAt: string;
  lastLoginAt: string;
}

/**
 * Normaliza e-mails para garantir comparação sem case sensitive
 */
export function normalizeEmail(email?: string | null): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Verifica se um e-mail é o Super Administrador
 */
export function isSuperAdminEmail(email?: string | null): boolean {
  return normalizeEmail(email) === normalizeEmail(SUPER_ADMIN_EMAIL);
}

/**
 * Verifica se um e-mail está na lista de autorizados
 */
export async function checkEmailAuthorization(email?: string | null): Promise<{
  authorized: boolean;
  role: 'admin' | 'student' | 'guest';
  isSuperAdmin: boolean;
}> {
  const norm = normalizeEmail(email);
  if (!norm) {
    return { authorized: false, role: 'guest', isSuperAdmin: false };
  }

  // Super Admin sempre tem acesso total
  if (isSuperAdminEmail(norm)) {
    return { authorized: true, role: 'admin', isSuperAdmin: true };
  }

  try {
    const docRef = doc(db, 'authorizedUsers', norm);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data() as AuthorizedUserRecord;
      if (data.status === 'active') {
        return {
          authorized: true,
          role: data.role || 'student',
          isSuperAdmin: false,
        };
      }
    }
  } catch (err) {
    console.warn('Erro ao consultar autorização no Firestore:', err);
  }

  return { authorized: false, role: 'guest', isSuperAdmin: false };
}

/**
 * Salva ou atualiza um usuário na whitelist (apenas Super Admin ou Admin)
 */
export async function addAuthorizedEmail(
  targetEmail: string,
  role: 'admin' | 'student' | 'guest' = 'student',
  notes: string = '',
  addedByEmail: string = SUPER_ADMIN_EMAIL
): Promise<boolean> {
  const norm = normalizeEmail(targetEmail);
  if (!norm) return false;

  try {
    const docRef = doc(db, 'authorizedUsers', norm);
    await setDoc(docRef, {
      email: norm,
      role,
      addedBy: addedByEmail,
      addedAt: new Date().toISOString(),
      notes,
      status: 'active',
    });
    return true;
  } catch (err) {
    console.error('Erro ao adicionar e-mail autorizado:', err);
    throw err;
  }
}

/**
 * Remove/Revoga permissão de um usuário
 */
export async function revokeAuthorizedEmail(targetEmail: string): Promise<boolean> {
  const norm = normalizeEmail(targetEmail);
  if (!norm || isSuperAdminEmail(norm)) return false;

  try {
    const docRef = doc(db, 'authorizedUsers', norm);
    await setDoc(
      docRef,
      {
        status: 'revoked',
        revokedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (err) {
    console.error('Erro ao revogar e-mail:', err);
    throw err;
  }
}

/**
 * Exclui definitivamente um registro da whitelist
 */
export async function deleteAuthorizedEmail(targetEmail: string): Promise<boolean> {
  const norm = normalizeEmail(targetEmail);
  if (!norm || isSuperAdminEmail(norm)) return false;

  try {
    const docRef = doc(db, 'authorizedUsers', norm);
    await deleteDoc(docRef);
    return true;
  } catch (err) {
    console.error('Erro ao excluir e-mail:', err);
    throw err;
  }
}

/**
 * Lista todos os e-mails cadastrados na whitelist
 */
export async function listAuthorizedUsers(): Promise<AuthorizedUserRecord[]> {
  try {
    const colRef = collection(db, 'authorizedUsers');
    const snap = await getDocs(colRef);
    const list: AuthorizedUserRecord[] = [];

    // Inclui o Super Admin implicitamente
    list.push({
      email: SUPER_ADMIN_EMAIL,
      role: 'admin',
      addedBy: 'Sistema SYNAPSE',
      addedAt: '2026-01-01T00:00:00.000Z',
      notes: 'Super Administrador / Proprietário',
      status: 'active',
    });

    snap.forEach((d) => {
      const data = d.data() as AuthorizedUserRecord;
      if (normalizeEmail(data.email) !== normalizeEmail(SUPER_ADMIN_EMAIL)) {
        list.push(data);
      }
    });

    return list;
  } catch (err) {
    console.warn('Erro ao listar usuários autorizados:', err);
    return [
      {
        email: SUPER_ADMIN_EMAIL,
        role: 'admin',
        addedBy: 'Sistema SYNAPSE',
        addedAt: '2026-01-01T00:00:00.000Z',
        notes: 'Super Administrador / Proprietário',
        status: 'active',
      },
    ];
  }
}

/**
 * Realiza login com o Google
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Erro no login Google:', err);
    throw err;
  }
}

/**
 * Logout do SYNAPSE
 */
export async function logOutFromSynapse(): Promise<void> {
  await fbSignOut(auth);
}
