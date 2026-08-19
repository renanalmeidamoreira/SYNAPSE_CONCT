import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../utils/firebase';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const loadTheme = async () => {
      const localTheme = localStorage.getItem('synapse_theme');
      if (localTheme) {
        setTheme(localTheme as Theme);
      }

      if (user) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const snap = await getDoc(docRef);
          if (snap.exists() && snap.data()?.theme) {
            setTheme(snap.data().theme as Theme);
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
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('synapse_theme', theme);
  }, [theme]);

  const toggleTheme = async () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (user) {
      try {
        const docRef = doc(db, 'users', user.uid);
        await updateDoc(docRef, { theme: newTheme });
      } catch (e) {
        console.warn('Firestore theme update offline or failed:', e);
      }
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
