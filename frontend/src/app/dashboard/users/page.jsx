'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    active: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)', color: '#00ff88', label: 'Active' },
    unverified: { bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.3)', color: '#ffd93d', label: 'Unverified' },
    blocked: { bg: 'rgba(255,45,120,0.1)', border: 'rgba(255,45,120,0.3)', color: '#ff2d78', label: 'Blocked' },
    deleted: { bg: 'rgba(107,114,128,0.15)', border: 'rgba(107,114,128,0.3)', color: '#6b7280', label: 'Deleted' },
  };
  const s = map[status] || map.active;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full whitespace-nowrap" style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>{s.label}</span>
  );
}

function BlockModal({ user, onClose, onConfirm }) {
  const [days, setDays] = useState('7');
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="glass-card p-6 w-full max-w-sm animate-fade-in-up" style={{ border: '1px solid rgba(255,45,120,0.3)' }}>
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Block {user.name}</h3>
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>User will be unable to log in or use the app for the duration.</p>
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Duration (days)</label>
        <input type="number" min="1" max="3650" value={days} onChange={e => setDays(e.target.value)}
          className="w-full rounded-xl py-2 px-3 text-sm font-semibold outline-none mb-3"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }} />
        <label className="block text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Reason (optional)</label>
        <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Suspicious activity"
          className="w-full rounded-xl py-2 px-3 text-sm outline-none mb-4"
          style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }} />
        <div className="flex gap-2">
          <button onClick={() => onConfirm(Number(days), reason)} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'rgba(255,45,120,0.15)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}>Block</button>
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-sm font-bold transition-all"
            style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function UsersContent() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [blockTarget, setBlockTarget] = useState(null);
  const [msg, setMsg] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch('/users');
      if (data.success) setUsers(data.users);
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 3000);
  };

  const handleVerify = async (id) => {
    setActionLoading(id);
    try {
      const data = await authFetch(`/users/${id}/verify`, { method: 'PATCH' });
      if (data.success) {
        showMsg('success', data.emailVerified ? 'User verified' : 'Verification removed');
        fetchUsers();
      }
    } catch (e) { showMsg('error', e.message); }
    setActionLoading(null);
  };

  const handleBlock = async (days, reason) => {
    if (!blockTarget) return;
    setActionLoading(blockTarget._id);
    setBlockTarget(null);
    try {
      const data = await authFetch(`/users/${blockTarget._id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({ days, reason }),
      });
      if (data.success) {
        showMsg('success', `User blocked until ${new Date(data.blockedUntil).toLocaleDateString()}`);
        fetchUsers();
      }
    } catch (e) { showMsg('error', e.message); }
    setActionLoading(null);
  };

  const handleUnblock = async (id) => {
    setActionLoading(id);
    try {
      const data = await authFetch(`/users/${id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({ days: 0 }),
      });
      if (data.success) { showMsg('success', 'User unblocked'); fetchUsers(); }
    } catch (e) { showMsg('error', e.message); }
    setActionLoading(null);
  };

  const handleDelete = async (id, isDeleted) => {
    setActionLoading(id);
    try {
      const data = await authFetch(`/users/${id}`, { method: 'DELETE' });
      if (data.success) {
        showMsg('success', isDeleted ? 'User restored' : 'User deleted');
        fetchUsers();
      }
    } catch (e) { showMsg('error', e.message); }
    setActionLoading(null);
  };

  // Filter + search
  const filtered = users.filter(u => {
    if (filter !== 'all' && u.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
    }
    return true;
  });

  const counts = { all: users.length };
  users.forEach(u => { counts[u.status] = (counts[u.status] || 0) + 1; });

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: 'var(--neon-cyan)', top: '4%', right: '8%', opacity: 0.18 }} />
      <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '8%', left: '6%', opacity: 0.13 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/dashboard" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>← Dashboard</Link>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>👥 User Management</h1>
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Verify, block, or delete users. {users.length} total registered.</p>
          </div>
          <button onClick={fetchUsers} className="btn-neon text-sm">🔄 Refresh</button>
        </div>

        {/* Toast */}
        {msg && (
          <div className="mb-4 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: msg.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,120,0.1)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(0,255,136,0.3)' : 'rgba(255,45,120,0.3)'}`,
            color: msg.type === 'success' ? '#00ff88' : '#ff2d78',
          }}>{msg.text}</div>
        )}

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {[
            { key: 'all', label: 'Total', icon: '📊', color: 'var(--neon-cyan)' },
            { key: 'active', label: 'Active', icon: '✅', color: '#00ff88' },
            { key: 'unverified', label: 'Unverified', icon: '⏳', color: '#ffd93d' },
            { key: 'blocked', label: 'Blocked', icon: '🚫', color: '#ff2d78' },
            { key: 'deleted', label: 'Deleted', icon: '🗑️', color: '#6b7280' },
          ].map(s => (
            <div key={s.key} className="glass-card p-3 text-center cursor-pointer transition-all" onClick={() => setFilter(s.key)}
              style={{ border: filter === s.key ? `1px solid ${s.color}40` : '1px solid var(--glass-border)' }}>
              <div className="text-lg">{s.icon}</div>
              <div className="text-xl font-bold" style={{ color: s.color }}>{counts[s.key] || 0}</div>
              <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1 max-w-sm">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>🔍</span>
            <input
              type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-xl py-2 pl-9 pr-4 text-sm outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['all', 'active', 'unverified', 'blocked', 'deleted'].map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all"
                style={{
                  background: filter === f ? 'color-mix(in srgb, var(--neon-cyan) 15%, transparent)' : 'transparent',
                  border: `1px solid ${filter === f ? 'rgba(0,229,255,0.3)' : 'var(--glass-border)'}`,
                  color: filter === f ? 'var(--neon-cyan)' : 'var(--text-muted)',
                }}>
                {f} ({counts[f] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
                borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent',
              }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading users...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-3xl mb-2">👥</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No users match your filter.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(0,229,255,0.1)' }}>
                      {['User', 'Status', 'Role', 'Verified', 'Joined', 'Last Login', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(u => (
                      <tr key={u._id} className="transition-colors"
                        style={{ borderBottom: '1px solid color-mix(in srgb, var(--neon-cyan) 5%, transparent)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 3%, transparent)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{
                              background: u.role === 'admin'
                                ? 'linear-gradient(135deg, #a855f7, #ff2d78)'
                                : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                              opacity: u.status === 'deleted' ? 0.4 : 1,
                            }}>{u.name?.charAt(0).toUpperCase()}</div>
                            <div>
                              <div className="text-sm font-medium" style={{ color: u.status === 'deleted' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: u.status === 'deleted' ? 'line-through' : 'none' }}>{u.name}</div>
                              <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={u.status} />
                          {u.status === 'blocked' && u.blockedUntil && (
                            <div className="text-[9px] mt-0.5" style={{ color: '#ff2d78' }}>Until {new Date(u.blockedUntil).toLocaleDateString()}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                            background: u.role === 'admin' ? 'rgba(168,85,247,0.15)' : 'rgba(0,229,255,0.08)',
                            color: u.role === 'admin' ? 'var(--neon-purple)' : 'var(--neon-cyan)',
                            border: `1px solid ${u.role === 'admin' ? 'rgba(168,85,247,0.3)' : 'rgba(0,229,255,0.2)'}`,
                          }}>{u.role}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-base">{u.emailVerified ? '✅' : '❌'}</span>
                        </td>
                        <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                          {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {u.role !== 'admin' && (
                            <div className="flex flex-wrap gap-1">
                              {/* Verify toggle */}
                              <button
                                onClick={() => handleVerify(u._id)}
                                disabled={actionLoading === u._id}
                                title={u.emailVerified ? 'Revoke verification' : 'Verify user'}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                style={{
                                  background: u.emailVerified ? 'rgba(255,217,61,0.1)' : 'rgba(0,255,136,0.1)',
                                  border: `1px solid ${u.emailVerified ? 'rgba(255,217,61,0.3)' : 'rgba(0,255,136,0.3)'}`,
                                  color: u.emailVerified ? '#ffd93d' : '#00ff88',
                                  opacity: actionLoading === u._id ? 0.5 : 1,
                                }}>
                                {u.emailVerified ? 'Unverify' : 'Verify'}
                              </button>
                              {/* Block / Unblock */}
                              {u.status === 'blocked' ? (
                                <button
                                  onClick={() => handleUnblock(u._id)}
                                  disabled={actionLoading === u._id}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', opacity: actionLoading === u._id ? 0.5 : 1 }}>
                                  Unblock
                                </button>
                              ) : u.status !== 'deleted' && (
                                <button
                                  onClick={() => setBlockTarget(u)}
                                  disabled={actionLoading === u._id}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78', opacity: actionLoading === u._id ? 0.5 : 1 }}>
                                  Block
                                </button>
                              )}
                              {/* Delete / Restore */}
                              <button
                                onClick={() => handleDelete(u._id, !!u.deletedAt)}
                                disabled={actionLoading === u._id}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                style={{
                                  background: u.deletedAt ? 'rgba(0,255,136,0.1)' : 'rgba(107,114,128,0.1)',
                                  border: `1px solid ${u.deletedAt ? 'rgba(0,255,136,0.3)' : 'rgba(107,114,128,0.3)'}`,
                                  color: u.deletedAt ? '#00ff88' : '#6b7280',
                                  opacity: actionLoading === u._id ? 0.5 : 1,
                                }}>
                                {u.deletedAt ? 'Restore' : 'Delete'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="lg:hidden divide-y" style={{ borderColor: 'rgba(0,229,255,0.06)' }}>
                {filtered.map(u => (
                  <div key={u._id} className="px-4 py-3.5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{
                        background: u.role === 'admin'
                          ? 'linear-gradient(135deg, #a855f7, #ff2d78)'
                          : 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                        opacity: u.status === 'deleted' ? 0.4 : 1,
                      }}>{u.name?.charAt(0).toUpperCase()}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold" style={{ color: u.status === 'deleted' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: u.status === 'deleted' ? 'line-through' : 'none' }}>
                            {u.name}
                          </span>
                          <StatusBadge status={u.status} />
                          {u.role === 'admin' && (
                            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full" style={{
                              background: 'rgba(168,85,247,0.15)', color: 'var(--neon-purple)', border: '1px solid rgba(168,85,247,0.3)',
                            }}>admin</span>
                          )}
                        </div>
                        <div className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{u.email}</div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          <span>{u.emailVerified ? '✅ Verified' : '❌ Unverified'}</span>
                          <span>Joined {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                    {u.role !== 'admin' && (
                      <div className="flex flex-wrap gap-1.5 ml-12">
                        <button onClick={() => handleVerify(u._id)} disabled={actionLoading === u._id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          style={{
                            background: u.emailVerified ? 'rgba(255,217,61,0.1)' : 'rgba(0,255,136,0.1)',
                            border: `1px solid ${u.emailVerified ? 'rgba(255,217,61,0.3)' : 'rgba(0,255,136,0.3)'}`,
                            color: u.emailVerified ? '#ffd93d' : '#00ff88',
                          }}>{u.emailVerified ? 'Unverify' : 'Verify'}</button>
                        {u.status === 'blocked' ? (
                          <button onClick={() => handleUnblock(u._id)} disabled={actionLoading === u._id}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>Unblock</button>
                        ) : u.status !== 'deleted' && (
                          <button onClick={() => setBlockTarget(u)} disabled={actionLoading === u._id}
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                            style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}>Block</button>
                        )}
                        <button onClick={() => handleDelete(u._id, !!u.deletedAt)} disabled={actionLoading === u._id}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold"
                          style={{
                            background: u.deletedAt ? 'rgba(0,255,136,0.1)' : 'rgba(107,114,128,0.1)',
                            border: `1px solid ${u.deletedAt ? 'rgba(0,255,136,0.3)' : 'rgba(107,114,128,0.3)'}`,
                            color: u.deletedAt ? '#00ff88' : '#6b7280',
                          }}>{u.deletedAt ? 'Restore' : 'Delete'}</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Block Modal */}
      {blockTarget && <BlockModal user={blockTarget} onClose={() => setBlockTarget(null)} onConfirm={handleBlock} />}
    </div>
  );
}

export default function DashboardUsersPage() {
  return (
    <AdminRoute>
      <UsersContent />
    </AdminRoute>
  );
}
