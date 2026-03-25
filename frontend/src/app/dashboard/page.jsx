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
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
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

          <div className="flex items-center gap-3">
            <Link href="/dashboard/games" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              <GamepadIcon /> Manage Games
            </Link>
            <Link href="/dashboard/logs" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              <LogsIcon /> View Logs
            </Link>
            <Link href="/dashboard/claimable" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              💸 Claimables
            </Link>
            <Link href="/dashboard/wallet" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              💰 Wallets
            </Link>
            <Link href="/dashboard/settings" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
              ⚙️ Settings
            </Link>
            <button onClick={() => { fetchStats(); fetchUsers(); }} className="btn-neon text-sm">
              <RefreshIcon /> Refresh
            </button>
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

        {/* ── Users Table ── */}
        <div className="glass-card overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(0,229,255,0.1)' }}>
            <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <UsersIcon /> Registered Users
            </h2>
            <span className="text-xs px-3 py-1 rounded-full" style={{
              background: 'rgba(0,229,255,0.1)',
              color: 'var(--neon-cyan)',
              border: '1px solid rgba(0,229,255,0.2)',
            }}>
              {users.length} total
            </span>
          </div>

          {loadingUsers ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
                borderColor: 'rgba(0,229,255,0.3)',
                borderTopColor: 'transparent',
              }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading users...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              {/* Desktop table */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
                    {['User', 'Email', 'Role', 'Status', 'Joined'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id} className="transition-colors"
                      style={{ borderBottom: '1px solid color-mix(in srgb, var(--neon-cyan) 5%, transparent)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 3%, transparent)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{
                            background: u.role === 'admin'
                              ? 'linear-gradient(135deg, #a855f7, #ff2d78)'
                              : 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                          }}>
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{u.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full" style={{
                          background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
                          color: u.role === 'admin' ? 'var(--neon-purple)' : 'var(--neon-cyan)',
                          border: `1px solid ${u.role === 'admin' ? 'rgba(168,85,247,0.3)' : 'color-mix(in srgb, var(--neon-cyan) 20%, transparent)'}`,
                        }}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-1.5 text-xs" style={{
                          color: u.isActive ? 'var(--neon-green)' : 'var(--text-muted)',
                        }}>
                          <span className="w-2 h-2 rounded-full" style={{
                            background: u.isActive ? 'var(--neon-green)' : 'var(--text-muted)',
                          }} />
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile card layout */}
              <div className="md:hidden divide-y" style={{ borderColor: 'rgba(0,229,255,0.06)' }}>
                {users.map(u => (
                  <div key={u._id} className="px-4 py-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{
                          background: u.role === 'admin'
                            ? 'linear-gradient(135deg, #a855f7, #ff2d78)'
                            : 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                        }}>
                          {u.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{u.name}</p>
                          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ml-2" style={{
                        background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'rgba(0,229,255,0.1)',
                        color: u.role === 'admin' ? 'var(--neon-purple)' : 'var(--neon-cyan)',
                        border: `1px solid ${u.role === 'admin' ? 'rgba(168,85,247,0.3)' : 'rgba(0,229,255,0.2)'}`,
                      }}>
                        {u.role}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span className="flex items-center gap-1.5" style={{ color: u.isActive ? 'var(--neon-green)' : 'var(--text-muted)' }}>
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: u.isActive ? 'var(--neon-green)' : 'var(--text-muted)' }} />
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span>{new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                    </div>
                  </div>
                ))}
              </div>
              {users.length === 0 && (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No users found</div>
              )}
            </div>
          )}
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
