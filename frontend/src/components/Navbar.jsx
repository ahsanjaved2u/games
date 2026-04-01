'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  { label: 'FAQ', href: '/faq' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [claimableTotal, setClaimableTotal] = useState(0);
  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const { user, isLoggedIn, isAdmin, logout, loading, walletBalance, authFetch } = useAuth();

  // Close dropdowns on route change
  useEffect(() => {
    setUserDropdown(false);
    setMobileOpen(false);
  }, [pathname]);

  const fetchAdminClaimableTotal = async () => {
    if (!isLoggedIn || !isAdmin) {
      setClaimableTotal(0);
      return;
    }

    // Primary source: dedicated summary endpoint.
    try {
      const data = await authFetch('/wallet/admin/claimable-summary');
      const apiTotal = Number(data?.totalClaimable);
      if (Number.isFinite(apiTotal) && apiTotal >= 0) {
        setClaimableTotal(apiTotal);
        return;
      }
    } catch {
      // Fall through to wallet-based fallback.
    }

    // Fallback source: sum current player wallet balances + pending withdrawals.
    try {
      const [wallets, pendingTxns] = await Promise.all([
        authFetch('/wallet/admin/all'),
        authFetch('/wallet/admin/withdrawals?status=pending').catch(() => []),
      ]);
      const pendingByUser = {};
      (Array.isArray(pendingTxns) ? pendingTxns : []).forEach(t => {
        const uid = typeof t.user === 'object' ? t.user._id : t.user;
        pendingByUser[uid] = (pendingByUser[uid] || 0) + Number(t.amount || 0);
      });
      const total = (Array.isArray(wallets) ? wallets : []).reduce((sum, wallet) => {
        if (!wallet?.user || wallet.user.role === 'admin') return sum;
        const uid = wallet.user._id || wallet.user;
        return sum + Number(wallet.balance || 0) + (pendingByUser[uid] || 0);
      }, 0);
      setClaimableTotal(total);
    } catch {
      setClaimableTotal(0);
    }
  };

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

  useEffect(() => {
    fetchAdminClaimableTotal();
    // Poll every 30s so admin sees updated totals without manual refresh
    if (isLoggedIn && isAdmin) {
      const id = setInterval(fetchAdminClaimableTotal, 30000);
      return () => clearInterval(id);
    }
  }, [isLoggedIn, isAdmin, authFetch]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50" style={{
      background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)',
      borderBottom: '1px solid var(--border-color)',
      backdropFilter: 'blur(16px)',
    }}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-12">

          {/* ── Logo ── */}
          <Link href="/" className="flex items-center gap-2 group" style={{ textDecoration: 'none' }}>
            <span className="neon-text-cyan transition-all duration-300 group-hover:scale-110">
              <GamepadIcon />
            </span>
            <span className="text-xl font-bold tracking-tight" style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              GameVesta
            </span>
          </Link>

          {/* ── Desktop Nav Links ── */}
          <div className="hidden md:flex items-center gap-0.5">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--neon-cyan)';
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 8%, transparent)';
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
          <div className="hidden md:flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* Wallet / Claimable Badge */}
                {isAdmin ? (
                  <Link href="/dashboard/claimable" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200" style={{
                    border: '1px solid rgba(255,217,61,0.25)',
                    background: 'rgba(255,217,61,0.08)',
                    color: '#ffd93d',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,217,61,0.16)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(255,217,61,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,217,61,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
                    title="Total players claimable amount"
                  >
                    💰 PKR {parseFloat(claimableTotal.toFixed(2)).toLocaleString()}
                  </Link>
                ) : (
                  <Link href="/wallet" className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200" style={{
                    border: '1px solid rgba(0,255,136,0.2)',
                    background: 'rgba(0,255,136,0.05)',
                    color: '#00ff88',
                    textDecoration: 'none',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.12)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,255,136,0.15)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.05)'; e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    💰 PKR {walletBalance.toLocaleString()}
                  </Link>
                )}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setUserDropdown(!userDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-200"
                  style={{
                    border: '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)',
                    background: 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <div className="w-8 h-8 rounded-full flex items-center justify-center relative" style={{
                    background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                  }}>
                    <span className="text-xs font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase()}
                    </span>
                    {!user?.emailVerified && (
                      <span style={{
                        position: 'absolute', top: -2, right: -2,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#ffd93d',
                        border: '2px solid rgba(10,11,26,0.9)',
                        boxShadow: '0 0 6px rgba(255,217,61,0.5)',
                      }} title="Email not verified" />
                    )}
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
                    {!isAdmin && (
                      <Link href="/wallet" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,255,136,0.08)'; e.currentTarget.style.color = '#00ff88'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        💰 Wallet
                      </Link>
                    )}
                    {!user?.emailVerified && (
                      <Link href="/verify-email" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: '#ffd93d', textDecoration: 'none' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,217,61,0.08)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffd93d', boxShadow: '0 0 6px rgba(255,217,61,0.5)', flexShrink: 0 }} />
                        Verify Email
                      </Link>
                    )}
                    <Link href="/profile" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 8%, transparent)'; e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      <UserIcon /> Profile
                    </Link>
                    {isAdmin && (
                      <Link href="/dashboard" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                        style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-purple) 8%, transparent)'; e.currentTarget.style.color = 'var(--neon-purple)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                      >
                        🛡️ Dashboard
                      </Link>
                    )}
                    <Link href="/settings" onClick={() => setUserDropdown(false)} className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                      style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 8%, transparent)'; e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                    >
                      ⚙️ Settings
                    </Link>
                    <div style={{ borderTop: '1px solid color-mix(in srgb, var(--neon-cyan) 10%, transparent)', margin: '4px 0' }} />
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
              </> 
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
          borderTop: '1px solid var(--border-color)',
        }}>
          <div className="px-3 py-2 space-y-0.5">
            {navLinks.map(link => (
              <Link key={link.href} href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2 rounded-xl text-base font-medium transition-all"
                style={{
                  color: 'var(--text-secondary)',
                  textDecoration: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--neon-cyan)';
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 8%, transparent)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                {link.label}
              </Link>
            ))}

            <div style={{ borderTop: '1px solid color-mix(in srgb, var(--neon-cyan) 8%, transparent)', margin: '12px 0' }} />

            {isLoggedIn ? (
              <div className="space-y-1">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center relative" style={{
                    background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                  }}>
                    <span className="text-sm font-bold text-white">{user?.name?.charAt(0).toUpperCase()}</span>
                    {!user?.emailVerified && (
                      <span style={{
                        position: 'absolute', top: -1, right: -1,
                        width: 10, height: 10, borderRadius: '50%',
                        background: '#ffd93d',
                        border: '2px solid rgba(10,11,26,0.9)',
                        boxShadow: '0 0 6px rgba(255,217,61,0.5)',
                      }} />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{user?.name}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user?.role === 'admin' ? 'Administrator' : 'Player'}</p>
                  </div>
                </div>
                {!user?.emailVerified && (
                  <Link href="/verify-email" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 mx-4 px-3 py-2 rounded-xl text-xs font-semibold"
                    style={{
                      background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.2)',
                      color: '#ffd93d', textDecoration: 'none',
                    }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#ffd93d', boxShadow: '0 0 6px rgba(255,217,61,0.5)', flexShrink: 0 }} />
                    Verify your email to claim rewards
                  </Link>
                )}
                {isAdmin ? (
                  <Link
                    href="/dashboard/claimable"
                    onClick={() => setMobileOpen(false)}
                    className="block w-[calc(100%-2rem)] mx-4 px-4 py-2.5 rounded-xl text-left"
                    style={{
                      background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.22)',
                      color: '#ffd93d', fontWeight: 700, fontSize: 14, textDecoration: 'none',
                    }}
                  >
                    💰 PKR {parseFloat(claimableTotal.toFixed(2)).toLocaleString()}
                  </Link>
                ) : (
                  <Link href="/wallet" onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 mx-4 px-4 py-2.5 rounded-xl" style={{
                      background: 'rgba(0,255,136,0.06)', border: '1px solid rgba(0,255,136,0.15)',
                      color: '#00ff88', textDecoration: 'none', fontWeight: 700, fontSize: 14,
                    }}>
                    💰 PKR {walletBalance.toLocaleString()}
                  </Link>
                )}
                {isAdmin && (
                  <Link href="/dashboard" onClick={() => setMobileOpen(false)}
                    className="block px-4 py-3 rounded-xl text-base font-medium transition-all"
                    style={{ color: 'var(--neon-purple)', textDecoration: 'none' }}
                  >
                    🛡️ Dashboard
                  </Link>
                )}
                <Link href="/settings" onClick={() => setMobileOpen(false)}
                  className="block px-4 py-3 rounded-xl text-base font-medium transition-all"
                  style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
                >
                  ⚙️ Settings
                </Link>
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
