import React, { createContext, useContext, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [oscuro, setOscuro] = useState(
    localStorage.getItem('tema') === 'oscuro'
  );

  const toggleTema = () => {
    const nuevo = !oscuro;
    setOscuro(nuevo);
    localStorage.setItem('tema', nuevo ? 'oscuro' : 'claro');
  };

  const tema = {
    oscuro,
    bg:          oscuro ? '#13111a' : '#f0f0f7',
    bgCard:      oscuro ? '#1e1b2e' : '#ffffff',
    bgSidebar:   oscuro ? '#1e1b2e' : '#ffffff',
    bgHover:     oscuro ? '#2a2640' : '#f5f3ff',
    bgInput:     oscuro ? '#2a2640' : '#f5f3ff',
    bgTopbar:    oscuro ? '#1e1b2e' : '#ffffff',
    text:        oscuro ? '#eeeaf8' : '#1a1040',
    textSub:     oscuro ? '#9b93c4' : '#6b5fa0',
    textMuted:   oscuro ? '#5c5480' : '#a89fc0',
    border:      oscuro ? '#2e2a44' : '#ede9f8',
    accent:      '#7c3aed',
    accentLight: '#8b5cf6',
    accentHover: '#6d28d9',
    accentBg:    oscuro ? '#2e2060' : '#ede9f8',
    success:     '#10b981',
    successBg:   oscuro ? '#0d2e22' : '#ecfdf5',
    danger:      '#ef4444',
    dangerBg:    oscuro ? '#2e1515' : '#fef2f2',
    warning:     '#f59e0b',
    warningBg:   oscuro ? '#2e2210' : '#fffbeb',
    shadow:      oscuro ? '0 4px 24px rgba(0,0,0,0.4)' : '0 4px 24px rgba(124,58,237,0.08)',
    shadowCard:  oscuro ? '0 2px 12px rgba(0,0,0,0.3)' : '0 2px 12px rgba(124,58,237,0.06)',
  };

  return (
    <ThemeContext.Provider value={{ tema, toggleTema }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);