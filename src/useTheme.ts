import { useState, useEffect } from 'react';

type Theme = 'dark' | 'light';

/**
 * Custom hook that manages the app theme (dark/light).
 * Persists the choice in localStorage and applies it to the document root.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    return (localStorage.getItem('theme') as Theme) || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  return { theme, toggleTheme } as const;
}
