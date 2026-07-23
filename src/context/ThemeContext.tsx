import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light';

interface ThemeContextType {
  theme: Theme;
  printEnabled: boolean;
  setPrintEnabled: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme: Theme = 'light';

  const [printEnabled, setPrintEnabled] = useState<boolean>(() => {
    return localStorage.getItem('print_button_enabled') === 'true';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('dark');
    localStorage.setItem('theme', 'light');
  }, []);

  useEffect(() => {
    localStorage.setItem('print_button_enabled', String(printEnabled));
  }, [printEnabled]);

  return (
    <ThemeContext.Provider value={{ theme, printEnabled, setPrintEnabled }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
