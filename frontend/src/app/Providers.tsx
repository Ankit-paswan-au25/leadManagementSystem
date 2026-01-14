import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeConfig, getTheme, type ThemeMode } from '../theme/theme.config';
import { authStore } from '../store/auth.store';

interface ThemeContextType {
  theme: ThemeConfig;
  mode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', mode);
  }, [mode]);

  const toggleTheme = () => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const setTheme = (newMode: ThemeMode) => {
    setMode(newMode);
  };

  const theme = getTheme(mode);

  return (
    <ThemeContext.Provider value={{ theme, mode, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

interface ProvidersProps {
  children: ReactNode;
}

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  // Restore session on app boot
  useEffect(() => {
    authStore.restoreSession();
  }, []);

  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
};

