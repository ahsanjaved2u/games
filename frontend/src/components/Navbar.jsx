'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

// ── Icons (inline SVG to avoid extra deps) ──
const GamepadIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="11" x2="10" y2="11" /><line x1="8" y1="9" x2="8" y2="13" />
    <line x1="15" y1="12" x2="15.01" y2="12" /><line x1="18" y1="10" x2="18.01" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 00-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 003 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 019.828 16h4.344a2 2 0 011.414.586L17 18c.5.5 1 1 2 1a3 3 0 003-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0017.32 5z" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const CloseIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronDown = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
  </svg>
);

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Games', href: '/games' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'About', href: '/about' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const { user, isLoggedIn, isAdmin, logout, loading } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{
      background: 'rgba(10, 11, 26, 0.92)',
      borderBottom: '1px solid rgba(0, 229, 255, 0.1)',
      backdropFilter: 'blur(16px)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: 'none' }}>
            <span className="neon-text-cyan transition-all duration-300 group-hover:scale-110">
              <GamepadIcon />
            </span>
            <span className="text-xl font-bold tracking-tight" style={{
              background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              GameZone
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--neon-cyan)';
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Right side: Auth buttons or User dropdown ── */}
          <div className="hidden md:flex items-center gap-3">
            {isLoggedIn ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{
                    border: '1px solid rgba(0, 229, 255, 0.2)',
                    background: 'rgba(0, 229, 255, 0.05)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
                  }}>
                    <span className="text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-medium">{user?.name}</span>
                  <span className={`transition-transform duration-200 ${userDropdown ? 'rotate-180' : ''}`}>
                    <ChevronDown />
                  </span>
                </button>

                {/* Dropdown */}
                {userDropdown && (
                  <div className="absolute right-0 mt-2 w-52 py-2 rounded-xl shadow-2xl animate-fade-in-up" style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--glass-border)',
                  }}>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <UserIcon /> Profile
                    </Link>
                    {isAdmin && (
                      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = 'var(--neon-purple)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        🛡️ Dashboard
                      </Link>
                    )}
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      ⚙️ Settings
                    </Link>
                    <div style={{ borderTop: '1px solid rgba(0,229,255,0.1)', margin: '4px 0' }} />
                    <button onClick={logout} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
                      style={{ color: 'var(--neon-pink)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,120,0.08)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      🚪 Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link href="/login" className="btn-neon text-sm">
                  Log In
                </Link>
                <Link href="/signup" className="btn-neon btn-neon-primary text-sm" style={{ padding: '10px 22px' }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* ── Mobile hamburger ── */}
          <button
            className="md:hidden p-2 rounded-lg transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            style={{ color: 'var(--neon-cyan)' }}
          >
            {mobileOpen ? <CloseIcon /> : <MenuIcon />}
          </button>
        </div>
      </div>

      {/* ── Mobile Menu ── */}
      {mobileOpen && (
        <div className="md:hidden animate-fade-in-up" style={{
          background: 'var(--bg-secondary)',
          borderTop: '1px solid rgba(0, 229, 255, 0.1)',
        }}>
          <div className="px-4 py-4 space-y-1">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-3 rounded-xl text-base font-medium transition-all"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--neon-cyan)';
                  e.currentTarget.style.background = 'rgba(0, 229, 255, 0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            ))}

            <div style={{ borderTop: '1px solid rgba(0, 229, 255, 0.08)', margin: '12px 0' }} />

            {isLoggedIn ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
                  }}>
                    <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.role === 'admin' ? 'Administrator' : 'Player'}</p>
                  </div>
                </div>
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base font-medium transition-all"
                    style={{ color: 'var(--neon-purple)', textDecoration: 'none' }}
                  >
                    🛡️ Dashboard
                  </Link>
                )}
                <button onClick={() => { logout(); setMobileOpen(false); }}
                  className="w-full text-left px-4 py-3 rounded-xl text-base font-medium transition-all"
                  style={{ color: 'var(--neon-pink)' }}
                >
                  🚪 Logout
                </button>
              </div>
            ) : (
              <div className="flex gap-3 px-4 pt-2">
                <Link href="/login" className="btn-neon text-sm flex-1 text-center" onClick={() => setMobileOpen(false)}>
                  Log In
                </Link>
                <Link href="/signup" className="btn-neon btn-neon-primary text-sm flex-1 text-center" style={{ padding: '10px 16px' }} onClick={() => setMobileOpen(false)}>
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
