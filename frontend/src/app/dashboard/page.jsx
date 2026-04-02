'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

// ── Icons ──
const StatsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
  </svg>
);

const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const LogsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
);

const ShieldIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const GamepadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" /><line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" />
    <rect x="2" y="6" width="20" height="12" rx="2" />
  </svg>
);

function DashboardContent() {
  const { authFetch, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const fetchStats = async () => {
    setLoadingStats(true);
    try {
      const data = await authFetch('/logs/stats');
      if (data.success) setStats(data.stats);
    } catch { /* ignore */ }
    setLoadingStats(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await authFetch('/users');
      if (data.success) setUsers(data.users);
    } catch { /* ignore */ }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const statCards = stats ? [
    { label: 'Total Requests', value: stats.totalRequests.toLocaleString(), icon: <StatsIcon />, color: 'var(--neon-cyan)' },
    { label: 'Today\'s Requests', value: stats.todayRequests.toLocaleString(), icon: <StatsIcon />, color: '#00ff88' },
    { label: 'Unique Visitors (7d)', value: stats.uniqueVisitorsThisWeek.toLocaleString(), icon: <UsersIcon />, color: 'var(--neon-purple)' },
    { label: 'Active Users (7d)', value: stats.activeUsersThisWeek.toLocaleString(), icon: <UsersIcon />, color: '#ffd93d' },
  ] : [];

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      {/* Background */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-purple)', top: '5%', right: '5%' }} />
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', bottom: '10%', left: '5%', animationDelay: '7s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex items-start justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-xl" style={{
                  background: 'linear-gradient(135deg, color-mix(in srgb, var(--neon-purple) 15%, transparent), color-mix(in srgb, var(--neon-cyan) 15%, transparent))',
                  border: '1px solid color-mix(in srgb, var(--neon-purple) 20%, transparent)',
                }}>
                  <ShieldIcon />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Welcome back, <span className="neon-text-cyan">{user?.name}</span>. Here&apos;s your platform overview.
              </p>
            </div>
            <button onClick={() => { fetchStats(); fetchUsers(); }} className="btn-neon text-sm flex-shrink-0">
              <RefreshIcon /> <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Nav links — wrap on mobile */}
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:flex lg:flex-wrap gap-2">
            <Link href="/dashboard/games" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              <GamepadIcon /> <span>Games</span>
            </Link>
            <Link href="/dashboard/logs" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              <LogsIcon /> <span>Logs</span>
            </Link>
            <Link href="/dashboard/claimable" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              💸 <span>Claimables</span>
            </Link>
            <Link href="/dashboard/wallet" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              💰 <span>Wallets</span>
            </Link>
            <Link href="/dashboard/users" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              👥 <span>Users</span>
            </Link>
            <Link href="/dashboard/settings" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              ⚙️ <span>Settings</span>
            </Link>
            <Link href="/dashboard/referrals" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              🤝 <span>Referrals</span>
            </Link>
            <Link href="/dashboard/comments" className="btn-neon text-sm justify-center" style={{ textDecoration: 'none' }}>
              💬 <span>Comments</span>
            </Link>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {loadingStats ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="glass-card p-6 shimmer" style={{ height: 120 }} />
            ))
          ) : (
            statCards.map((card, i) => (
              <div key={card.label} className="glass-card p-6 animate-fade-in-up transition-all duration-300"
                style={{ animationDelay: `${i * 0.08}s` }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = card.color + '40';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--glass-border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {card.label}
                  </span>
                  <span style={{ color: card.color }}>{card.icon}</span>
                </div>
                <div className="text-3xl font-bold" style={{ color: card.color }}>
                  {card.value}
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Users Summary ── */}
        <div className="glass-card p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <UsersIcon /> Registered Users
            </h2>
            <Link href="/dashboard/users" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              Manage Users →
            </Link>
          </div>

          {loadingUsers ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Array(4).fill(0).map((_, i) => <div key={i} className="glass-card p-4 shimmer" style={{ height: 70 }} />)}
            </div>
          ) : (() => {
            const now = new Date();
            const verified = users.filter(u => u.emailVerified && !u.deletedAt && !(u.blockedUntil && new Date(u.blockedUntil) > now)).length;
            const unverified = users.filter(u => !u.emailVerified && !u.deletedAt && !(u.blockedUntil && new Date(u.blockedUntil) > now)).length;
            const blocked = users.filter(u => u.blockedUntil && new Date(u.blockedUntil) > now && !u.deletedAt).length;
            const deleted = users.filter(u => u.deletedAt).length;
            return (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Total', value: users.length, color: 'var(--neon-cyan)' },
                  { label: 'Verified', value: verified, color: '#00ff88' },
                  { label: 'Unverified', value: unverified, color: '#ffd93d' },
                  { label: 'Blocked', value: blocked, color: '#ff2d78' },
                  { label: 'Deleted', value: deleted, color: '#6b7280' },
                ].map(s => (
                  <div key={s.label} className="text-center p-3 rounded-xl" style={{ background: 'var(--subtle-overlay)' }}>
                    <div className="text-xl font-bold" style={{ color: s.color }}>{s.value}</div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminRoute>
      <DashboardContent />
    </AdminRoute>
  );
}
