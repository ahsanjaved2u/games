'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import Link from 'next/link';

/* Chevron icon */
const Chevron = ({ open }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transition: 'transform 0.3s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

/* ── Reusable theme card ── */
function ThemeCard({ t, active, onSelect, light }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(t.id)}
      className="group relative rounded-xl p-3 text-left transition-all duration-300"
      style={{
        background: active ? t.vars['--bg-card'] : (light ? 'var(--bg-card)' : 'var(--subtle-overlay)'),
        border: active ? `2px solid ${t.vars['--neon-cyan']}` : `1px solid ${light ? 'var(--border-color)' : 'var(--subtle-border)'}`,
        boxShadow: active
          ? `0 0 20px ${t.vars['--neon-cyan']}25, 0 4px 12px rgba(0,0,0,0.15)`
          : '0 1px 4px rgba(0,0,0,0.08)',
        transform: active ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      {active && (
        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white" style={{
          background: t.vars['--neon-cyan'], fontSize: 8, fontWeight: 900,
          boxShadow: `0 0 8px ${t.vars['--neon-cyan']}60`,
        }}>✓</div>
      )}
      {/* Color bar */}
      <div className="flex gap-1 mb-2">
        <div className="h-4 flex-1 rounded" style={{ background: t.vars['--bg-primary'], border: `1px solid ${light ? t.vars['--border-color'] : 'rgba(255,255,255,0.08)'}` }} />
        <div className="h-4 w-4 rounded" style={{ background: t.vars['--neon-cyan'] }} />
        <div className="h-4 w-4 rounded" style={{ background: t.vars['--neon-purple'] }} />
      </div>
      {/* Mini mockup */}
      <div className="rounded overflow-hidden mb-2" style={{ background: t.vars['--bg-primary'], border: `1px solid ${light ? t.vars['--border-color'] : 'rgba(255,255,255,0.06)'}`, padding: 5 }}>
        <div className="rounded" style={{ height: 3, width: '65%', background: t.vars['--neon-cyan'], marginBottom: 3, opacity: 0.85 }} />
        <div className="rounded" style={{ height: 2, width: '45%', background: t.vars['--text-secondary'], opacity: 0.4 }} />
        <div className="flex gap-1 mt-1.5">
          <div className="rounded" style={{ height: 6, flex: 1, background: light ? t.vars['--bg-secondary'] : t.vars['--bg-card'] }} />
          <div className="rounded" style={{ height: 6, flex: 1, background: light ? t.vars['--bg-secondary'] : t.vars['--bg-card'] }} />
        </div>
      </div>
      <p className="text-[11px] font-bold truncate" style={{
        color: active ? t.vars['--neon-cyan'] : 'var(--text-primary)',
        textShadow: active && !light ? `0 0 10px ${t.vars['--neon-cyan']}40` : 'none',
      }}>
        {t.emoji} {t.name}
      </p>
    </button>
  );
}

export default function SettingsPage() {
  const { isLoggedIn } = useAuth();
  const { themeId, setTheme, themes } = useTheme();
  const [themeOpen, setThemeOpen] = useState(false);

  if (!isLoggedIn) {
    return (
      <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="glass-card p-8">
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to access settings</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Log in to customize your experience.</p>
            <Link href="/login" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>Log In</Link>
          </div>
        </div>
      </div>
    );
  }

  const darkThemes = themes.filter(t => !t.isLight);
  const lightThemes = themes.filter(t => t.isLight);
  const currentTheme = themes.find(t => t.id === themeId);

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: 'var(--neon-cyan)', top: '4%', right: '8%', opacity: 0.2 }} />
      <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '8%', left: '6%', opacity: 0.15 }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

        {/* Header */}
        <div className="mb-6 animate-fade-in-up">
          <h1 className="text-2xl sm:text-3xl font-extrabold" style={{ color: 'var(--text-primary)' }}>
            ⚙️ Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Personalize your GameVesta experience</p>
        </div>

        <div className="space-y-4">

          {/* ── Theme Section (collapsible) ── */}
          <div className="glass-card animate-fade-in-up" style={{ border: '1px solid var(--glass-border)' }}>
            <button
              type="button"
              onClick={() => setThemeOpen(!themeOpen)}
              className="w-full flex items-center gap-3 p-4 sm:p-5 text-left transition-colors"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{
                background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              }}>🎨</div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>App Theme</h2>
                <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                  Currently: {currentTheme?.emoji} {currentTheme?.name}
                </p>
              </div>
              <span style={{ color: 'var(--text-muted)' }}><Chevron open={themeOpen} /></span>
            </button>

            <div style={{
              maxHeight: themeOpen ? 800 : 0,
              opacity: themeOpen ? 1 : 0,
              overflow: 'hidden',
              transition: 'max-height 0.4s ease, opacity 0.3s ease',
            }}>
              <div className="px-4 sm:px-5 pb-4 sm:pb-5 pt-0">
                {/* Dark themes */}
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-2.5" style={{ color: 'var(--text-muted)' }}>🌙 Dark</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {darkThemes.map(t => (
                    <ThemeCard key={t.id} t={t} active={t.id === themeId} onSelect={setTheme} light={false} />
                  ))}
                </div>

                {/* Light themes */}
                <p className="text-[10px] font-semibold uppercase tracking-widest mt-4 mb-2.5" style={{ color: 'var(--text-muted)' }}>☀️ Light</p>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {lightThemes.map(t => (
                    <ThemeCard key={t.id} t={t} active={t.id === themeId} onSelect={setTheme} light={true} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── Placeholder for future settings sections ── */}
          {/* Add more sections here as needed, e.g.:
          <div className="glass-card p-4 sm:p-5 animate-fade-in-up" style={{ border: '1px solid var(--glass-border)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: 'var(--subtle-overlay)' }}>🔔</div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h2>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Manage your notification preferences</p>
              </div>
            </div>
          </div>
          */}

        </div>
      </div>
    </div>
  );
}
