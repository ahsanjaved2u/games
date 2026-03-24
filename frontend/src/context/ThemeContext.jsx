'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

/* ════════════════════════════════════════════════════════════
   Theme Definitions
   ════════════════════════════════════════════════════════════ */

export const THEMES = [
  /* ── Dark Themes ── */
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    emoji: '⚡',
    isLight: false,
    preview: ['#0a0b1a', '#00e5ff', '#a855f7'],
    vars: {
      '--bg-primary':    '#0a0b1a',
      '--bg-secondary':  '#12132d',
      '--bg-card':       '#1a1b3a',
      '--bg-card-hover': '#222456',
      '--neon-cyan':     '#00e5ff',
      '--neon-purple':   '#a855f7',
      '--neon-pink':     '#ff2d78',
      '--neon-green':    '#00ff88',
      '--neon-yellow':   '#ffd93d',
      '--text-primary':  '#e8eaf6',
      '--text-secondary':'#9ca3af',
      '--text-muted':    '#6b7280',
      '--border-color':  'rgba(0, 229, 255, 0.12)',
      '--glass-bg':      'rgba(18, 19, 45, 0.85)',
      '--glass-border':  'rgba(0, 229, 255, 0.15)',
      '--accent-gradient': 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
      '--scrollbar-thumb': 'rgba(0, 229, 255, 0.3)',
      '--scrollbar-hover': 'rgba(0, 229, 255, 0.5)',
    },
  },
  {
    id: 'midnight-amethyst',
    name: 'Midnight Amethyst',
    emoji: '🔮',
    isLight: false,
    preview: ['#0d0a1a', '#c084fc', '#8b5cf6'],
    vars: {
      '--bg-primary':    '#0d0a1a',
      '--bg-secondary':  '#1a1230',
      '--bg-card':       '#231a40',
      '--bg-card-hover': '#2e2255',
      '--neon-cyan':     '#c084fc',
      '--neon-purple':   '#8b5cf6',
      '--neon-pink':     '#f472b6',
      '--neon-green':    '#a78bfa',
      '--neon-yellow':   '#e879f9',
      '--text-primary':  '#ede9fe',
      '--text-secondary':'#a78bfa',
      '--text-muted':    '#7c6b9e',
      '--border-color':  'rgba(192, 132, 252, 0.12)',
      '--glass-bg':      'rgba(26, 18, 48, 0.85)',
      '--glass-border':  'rgba(192, 132, 252, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #c084fc, #8b5cf6)',
      '--scrollbar-thumb': 'rgba(192, 132, 252, 0.3)',
      '--scrollbar-hover': 'rgba(192, 132, 252, 0.5)',
    },
  },
  {
    id: 'aurora-borealis',
    name: 'Aurora Borealis',
    emoji: '🌌',
    isLight: false,
    preview: ['#071210', '#34d399', '#2dd4bf'],
    vars: {
      '--bg-primary':    '#071210',
      '--bg-secondary':  '#0d2420',
      '--bg-card':       '#143530',
      '--bg-card-hover': '#1a4a42',
      '--neon-cyan':     '#34d399',
      '--neon-purple':   '#2dd4bf',
      '--neon-pink':     '#6ee7b7',
      '--neon-green':    '#4ade80',
      '--neon-yellow':   '#a3e635',
      '--text-primary':  '#ecfdf5',
      '--text-secondary':'#86efac',
      '--text-muted':    '#5a8a78',
      '--border-color':  'rgba(52, 211, 153, 0.12)',
      '--glass-bg':      'rgba(13, 36, 32, 0.85)',
      '--glass-border':  'rgba(52, 211, 153, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #34d399, #2dd4bf)',
      '--scrollbar-thumb': 'rgba(52, 211, 153, 0.3)',
      '--scrollbar-hover': 'rgba(52, 211, 153, 0.5)',
    },
  },
  {
    id: 'sunset-blaze',
    name: 'Sunset Blaze',
    emoji: '🌅',
    isLight: false,
    preview: ['#140a08', '#f97316', '#ef4444'],
    vars: {
      '--bg-primary':    '#140a08',
      '--bg-secondary':  '#251510',
      '--bg-card':       '#351d14',
      '--bg-card-hover': '#46281c',
      '--neon-cyan':     '#f97316',
      '--neon-purple':   '#ef4444',
      '--neon-pink':     '#fb7185',
      '--neon-green':    '#fbbf24',
      '--neon-yellow':   '#f59e0b',
      '--text-primary':  '#fef3c7',
      '--text-secondary':'#fdba74',
      '--text-muted':    '#92644a',
      '--border-color':  'rgba(249, 115, 22, 0.12)',
      '--glass-bg':      'rgba(37, 21, 16, 0.85)',
      '--glass-border':  'rgba(249, 115, 22, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #f97316, #ef4444)',
      '--scrollbar-thumb': 'rgba(249, 115, 22, 0.3)',
      '--scrollbar-hover': 'rgba(249, 115, 22, 0.5)',
    },
  },
  {
    id: 'crimson-night',
    name: 'Crimson Night',
    emoji: '🔥',
    isLight: false,
    preview: ['#120508', '#ef4444', '#f97316'],
    vars: {
      '--bg-primary':    '#120508',
      '--bg-secondary':  '#1e0a10',
      '--bg-card':       '#2a0f16',
      '--bg-card-hover': '#3a1520',
      '--neon-cyan':     '#ef4444',
      '--neon-purple':   '#f97316',
      '--neon-pink':     '#fb7185',
      '--neon-green':    '#fbbf24',
      '--neon-yellow':   '#f59e0b',
      '--text-primary':  '#fef2f2',
      '--text-secondary':'#fca5a5',
      '--text-muted':    '#8b5050',
      '--border-color':  'rgba(239, 68, 68, 0.12)',
      '--glass-bg':      'rgba(30, 10, 16, 0.85)',
      '--glass-border':  'rgba(239, 68, 68, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #ef4444, #f97316)',
      '--scrollbar-thumb': 'rgba(239, 68, 68, 0.3)',
      '--scrollbar-hover': 'rgba(239, 68, 68, 0.5)',
    },
  },
  {
    id: 'rose-gold',
    name: 'Rose Gold',
    emoji: '🌹',
    isLight: false,
    preview: ['#140a10', '#f472b6', '#fbbf24'],
    vars: {
      '--bg-primary':    '#140a10',
      '--bg-secondary':  '#221420',
      '--bg-card':       '#2d1a28',
      '--bg-card-hover': '#3d2438',
      '--neon-cyan':     '#f472b6',
      '--neon-purple':   '#e879f9',
      '--neon-pink':     '#fb7185',
      '--neon-green':    '#fbbf24',
      '--neon-yellow':   '#fcd34d',
      '--text-primary':  '#fdf2f8',
      '--text-secondary':'#f9a8d4',
      '--text-muted':    '#8b5a6f',
      '--border-color':  'rgba(244, 114, 182, 0.12)',
      '--glass-bg':      'rgba(34, 20, 32, 0.85)',
      '--glass-border':  'rgba(244, 114, 182, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #f472b6, #fbbf24)',
      '--scrollbar-thumb': 'rgba(244, 114, 182, 0.3)',
      '--scrollbar-hover': 'rgba(244, 114, 182, 0.5)',
    },
  },
  {
    id: 'velvet-maroon',
    name: 'Velvet Maroon',
    emoji: '🍷',
    isLight: false,
    preview: ['#0e0608', '#9f1239', '#be185d'],
    vars: {
      '--bg-primary':    '#0e0608',
      '--bg-secondary':  '#1a0c10',
      '--bg-card':       '#26121a',
      '--bg-card-hover': '#341824',
      '--neon-cyan':     '#e11d48',
      '--neon-purple':   '#be185d',
      '--neon-pink':     '#fb7185',
      '--neon-green':    '#f9a8d4',
      '--neon-yellow':   '#fda4af',
      '--text-primary':  '#fff1f2',
      '--text-secondary':'#fda4af',
      '--text-muted':    '#7f4054',
      '--border-color':  'rgba(225, 29, 72, 0.12)',
      '--glass-bg':      'rgba(26, 12, 16, 0.85)',
      '--glass-border':  'rgba(225, 29, 72, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #e11d48, #be185d)',
      '--scrollbar-thumb': 'rgba(225, 29, 72, 0.3)',
      '--scrollbar-hover': 'rgba(225, 29, 72, 0.5)',
    },
  },
  {
    id: 'sakura-twilight',
    name: 'Sakura Twilight',
    emoji: '🌸',
    isLight: false,
    preview: ['#0e0814', '#e879f9', '#f9a8d4'],
    vars: {
      '--bg-primary':    '#0e0814',
      '--bg-secondary':  '#180e22',
      '--bg-card':       '#221432',
      '--bg-card-hover': '#2e1a44',
      '--neon-cyan':     '#e879f9',
      '--neon-purple':   '#f9a8d4',
      '--neon-pink':     '#f472b6',
      '--neon-green':    '#c084fc',
      '--neon-yellow':   '#fbbf24',
      '--text-primary':  '#fdf4ff',
      '--text-secondary':'#f0abfc',
      '--text-muted':    '#7e5a8e',
      '--border-color':  'rgba(232, 121, 249, 0.12)',
      '--glass-bg':      'rgba(24, 14, 34, 0.85)',
      '--glass-border':  'rgba(232, 121, 249, 0.15)',
      '--accent-gradient': 'linear-gradient(135deg, #e879f9, #f9a8d4)',
      '--scrollbar-thumb': 'rgba(232, 121, 249, 0.3)',
      '--scrollbar-hover': 'rgba(232, 121, 249, 0.5)',
    },
  },

  /* ── Light Themes ── */
  {
    id: 'cloud-white',
    name: 'Cloud White',
    emoji: '☁️',
    isLight: true,
    preview: ['#f5f7fa', '#0284c7', '#7c3aed'],
    vars: {
      '--bg-primary':    '#f5f7fa',
      '--bg-secondary':  '#edf0f5',
      '--bg-card':       '#ffffff',
      '--bg-card-hover': '#f0f4ff',
      '--neon-cyan':     '#0284c7',
      '--neon-purple':   '#7c3aed',
      '--neon-pink':     '#db2777',
      '--neon-green':    '#059669',
      '--neon-yellow':   '#d97706',
      '--text-primary':  '#1e293b',
      '--text-secondary':'#475569',
      '--text-muted':    '#94a3b8',
      '--border-color':  'rgba(2, 132, 199, 0.15)',
      '--glass-bg':      'rgba(255, 255, 255, 0.82)',
      '--glass-border':  'rgba(2, 132, 199, 0.18)',
      '--accent-gradient': 'linear-gradient(135deg, #0284c7, #7c3aed)',
      '--scrollbar-thumb': 'rgba(2, 132, 199, 0.25)',
      '--scrollbar-hover': 'rgba(2, 132, 199, 0.4)',
    },
  },
  {
    id: 'lavender-bloom',
    name: 'Lavender Bloom',
    emoji: '💐',
    isLight: true,
    preview: ['#f5f0ff', '#8b5cf6', '#d946ef'],
    vars: {
      '--bg-primary':    '#f5f0ff',
      '--bg-secondary':  '#ede5ff',
      '--bg-card':       '#ffffff',
      '--bg-card-hover': '#f3edff',
      '--neon-cyan':     '#8b5cf6',
      '--neon-purple':   '#d946ef',
      '--neon-pink':     '#ec4899',
      '--neon-green':    '#10b981',
      '--neon-yellow':   '#f59e0b',
      '--text-primary':  '#1e1b4b',
      '--text-secondary':'#4c4680',
      '--text-muted':    '#8b83b8',
      '--border-color':  'rgba(139, 92, 246, 0.15)',
      '--glass-bg':      'rgba(255, 255, 255, 0.82)',
      '--glass-border':  'rgba(139, 92, 246, 0.18)',
      '--accent-gradient': 'linear-gradient(135deg, #8b5cf6, #d946ef)',
      '--scrollbar-thumb': 'rgba(139, 92, 246, 0.25)',
      '--scrollbar-hover': 'rgba(139, 92, 246, 0.4)',
    },
  },
  {
    id: 'mint-breeze',
    name: 'Mint Breeze',
    emoji: '🍃',
    isLight: true,
    preview: ['#f0fdf4', '#059669', '#0d9488'],
    vars: {
      '--bg-primary':    '#f0fdf4',
      '--bg-secondary':  '#e6f7ed',
      '--bg-card':       '#ffffff',
      '--bg-card-hover': '#edfff5',
      '--neon-cyan':     '#059669',
      '--neon-purple':   '#0d9488',
      '--neon-pink':     '#e11d48',
      '--neon-green':    '#16a34a',
      '--neon-yellow':   '#ca8a04',
      '--text-primary':  '#14332a',
      '--text-secondary':'#3d6b5c',
      '--text-muted':    '#7daa98',
      '--border-color':  'rgba(5, 150, 105, 0.15)',
      '--glass-bg':      'rgba(255, 255, 255, 0.82)',
      '--glass-border':  'rgba(5, 150, 105, 0.18)',
      '--accent-gradient': 'linear-gradient(135deg, #059669, #0d9488)',
      '--scrollbar-thumb': 'rgba(5, 150, 105, 0.25)',
      '--scrollbar-hover': 'rgba(5, 150, 105, 0.4)',
    },
  },
  {
    id: 'peach-sunset',
    name: 'Peach Sunset',
    emoji: '🍑',
    isLight: true,
    preview: ['#fff7ed', '#ea580c', '#e11d48'],
    vars: {
      '--bg-primary':    '#fff7ed',
      '--bg-secondary':  '#ffedd5',
      '--bg-card':       '#ffffff',
      '--bg-card-hover': '#fff3e6',
      '--neon-cyan':     '#ea580c',
      '--neon-purple':   '#e11d48',
      '--neon-pink':     '#be185d',
      '--neon-green':    '#15803d',
      '--neon-yellow':   '#b45309',
      '--text-primary':  '#431407',
      '--text-secondary':'#78350f',
      '--text-muted':    '#b8906e',
      '--border-color':  'rgba(234, 88, 12, 0.15)',
      '--glass-bg':      'rgba(255, 255, 255, 0.82)',
      '--glass-border':  'rgba(234, 88, 12, 0.18)',
      '--accent-gradient': 'linear-gradient(135deg, #ea580c, #e11d48)',
      '--scrollbar-thumb': 'rgba(234, 88, 12, 0.25)',
      '--scrollbar-hover': 'rgba(234, 88, 12, 0.4)',
    },
  },
];

const STORAGE_KEY = 'gamezone-theme';
const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState('cyber-neon');
  const [mounted, setMounted] = useState(false);

  /* Load saved theme on mount */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && THEMES.find(t => t.id === saved)) {
      setThemeId(saved);
    }
    setMounted(true);
  }, []);

  /* Apply CSS vars whenever themeId changes */
  useEffect(() => {
    const theme = THEMES.find(t => t.id === themeId);
    if (!theme) return;
    const root = document.documentElement;
    Object.entries(theme.vars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
    root.setAttribute('data-theme', themeId);
    root.setAttribute('data-theme-mode', theme.isLight ? 'light' : 'dark');
  }, [themeId]);

  const setTheme = useCallback((id) => {
    if (!THEMES.find(t => t.id === id)) return;
    setThemeId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }, []);

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ themeId, theme, setTheme, themes: THEMES, mounted }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
