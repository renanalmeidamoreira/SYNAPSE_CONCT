import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

export type Theme = 'dark' | 'light' | 'swat' | 'pink';

export interface ThemeMeta {
  id: Theme;
  name: string;
  badge: string;
  description: string;
  accentColor: string;
  badgeBg: string;
  badgeText: string;
  isDarkBase: boolean;
}

export const AVAILABLE_THEMES: ThemeMeta[] = [
  {
    id: 'dark',
    name: 'Escuro (Synapse)',
    badge: 'Padrão',
    description: 'Paleta original de alta concentração em tons de ardósia e índigo.',
    accentColor: '#6366f1',
    badgeBg: 'bg-indigo-500/20',
    badgeText: 'text-indigo-400',
    isDarkBase: true,
  },
  {
    id: 'light',
    name: 'Claro (Light)',
    badge: 'Clean',
    description: 'Interface clara de alto contraste para leitura diurna relaxante.',
    accentColor: '#3b82f6',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-600',
    isDarkBase: false,
  },
  {
    id: 'swat',
    name: 'S.W.A.T.',
    badge: 'Twisted Media HUD',
    description: 'Estética tática futurista inspirada nas telas e painéis HUD da série S.W.A.T. (Twisted Media).',
    accentColor: '#00f0ff',
    badgeBg: 'bg-cyan-500/20',
    badgeText: 'text-cyan-300',
    isDarkBase: true,
  },
  {
    id: 'pink',
    name: 'Pink',
    badge: 'Cyber-Rose',
    description: 'Visual moderno neon rose com alto contraste e estética cyber elegante.',
    accentColor: '#f43f5e',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-300',
    isDarkBase: true,
  },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  availableThemes: ThemeMeta[];
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  availableThemes: AVAILABLE_THEMES,
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const localTheme = localStorage.getItem('synapse_theme') as Theme;
      if (localTheme && ['dark', 'light', 'swat', 'pink'].includes(localTheme)) {
        setThemeState(localTheme);
      }

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.theme) {
            const savedTheme = snap.data().theme as Theme;
            if (['dark', 'light', 'swat', 'pink'].includes(savedTheme)) {
              setThemeState(savedTheme);
            }
          }
        } catch (e) {
          console.warn('Firestore theme load offline or failed:', e);
        }
      }
    };
    loadTheme();
  }, [user]);

  useEffect(() => {
    const root = window.document.documentElement;
    // Clean up previous classes
    root.classList.remove('light', 'dark', 'swat', 'pink');
    
    // Add current theme class
    root.classList.add(theme);
    root.setAttribute('data-theme', theme);
    
    // For swat and pink themes, keep dark class enabled so Tailwind dark: utilities resolve correctly
    if (theme === 'swat' || theme === 'pink' || theme === 'dark') {
      root.classList.add('dark');
    }

    localStorage.setItem('synapse_theme', theme);
  }, [theme]);

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, { theme: newTheme });
      } catch (e) {
        console.warn('Firestore theme update offline or failed:', e);
      }
    }
  };

  const toggleTheme = async () => {
    const order: Theme[] = ['dark', 'swat', 'pink', 'light'];
    const currentIndex = order.indexOf(theme);
    const nextTheme = order[(currentIndex + 1) % order.length];
    await setTheme(nextTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, availableThemes: AVAILABLE_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
};
