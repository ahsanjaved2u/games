'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

function StatusBadge({ status }) {
  const map = {
    active: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)', color: '#00ff88', label: 'Active' },
    pending: { bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.3)', color: '#ffd93d', label: 'Pending' },
    flagged: { bg: 'rgba(255,45,120,0.1)', border: 'rgba(255,45,120,0.3)', color: '#ff2d78', label: '⚠ Flagged' },
    expired: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', color: '#6b7280', label: 'Expired' },
    rejected: { bg: 'rgba(255,45,120,0.08)', border: 'rgba(255,45,120,0.2)', color: '#ff2d78', label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>{s.label}</span>
  );
}

const normalizeIP = ip => ip === '::1' ? '127.0.0.1' : (ip || '—');

function IPBadge({ ip1, ip2 }) {
  const same = ip1 && ip2 && ip1 === ip2;
  return (
    <div className="text-[10px] font-mono flex items-center gap-1" style={{ color: same ? '#ff2d78' : 'var(--text-secondary)' }}>
      {same && <span>⚠</span>}
      <span>{normalizeIP(ip1)}</span>
    </div>
  );
}

function ReferralsContent() {
  const { authFetch } = useAuth();
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [refData, statsData] = await Promise.all([
        authFetch('/referrals/admin/all').catch(() => ({ referrals: [] })),
        authFetch('/referrals/admin/stats').catch(() => ({ stats: {} })),
      ]);
      setReferrals(refData.referrals || []);
      setStats(statsData.stats || null);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(id);
    try {
      await authFetch(`/referrals/admin/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await fetchData();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const filtered = filter === 'all' ? referrals : referrals.filter(r => r.status === filter);

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: 'var(--neon-purple)', top: '4%', right: '8%', opacity: 0.18 }} />
      <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-cyan)', bottom: '8%', left: '6%', opacity: 0.13 }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Link href="/dashboard" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>← Dashboard</Link>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>🤝 Referral Management</h1>
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Monitor referrals, review flagged accounts, manage fraud prevention.</p>
          </div>
          <Link href="/dashboard/settings" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>⚙️ Referral Settings</Link>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Total', value: stats.total, color: 'var(--neon-cyan)', icon: '📊' },
              { label: 'Active', value: stats.active, color: '#00ff88', icon: '✅' },
              { label: 'Pending', value: stats.pending, color: '#ffd93d', icon: '⏳' },
              { label: 'Flagged', value: stats.flagged, color: '#ff2d78', icon: '⚠️' },
              { label: 'Bonus Paid', value: `PKR ${(stats.totalBonusPaid || 0).toFixed(0)}`, color: 'var(--neon-purple)', icon: '💰' },
            ].map((card, i) => (
              <div key={card.label} className="glass-card p-4 text-center animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="text-lg mb-0.5">{card.icon}</div>
                <div className="text-xl font-bold" style={{ color: card.color }}>{card.value}</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {['all', 'active', 'pending', 'flagged', 'expired', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all" style={{
              background: filter === f ? 'color-mix(in srgb, var(--neon-purple) 15%, transparent)' : 'transparent',
              border: `1px solid ${filter === f ? 'rgba(168,85,247,0.3)' : 'var(--glass-border)'}`,
              color: filter === f ? 'var(--neon-purple)' : 'var(--text-muted)',
            }}>
              {f} {f !== 'all' ? `(${referrals.filter(r => r.status === f).length})` : `(${referrals.length})`}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
                borderColor: 'rgba(168,85,247,0.3)', borderTopColor: 'transparent',
              }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading referrals...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-4xl mb-3">🤝</div>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No referrals found.</p>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.1)' }}>
                      {['Referrer', 'Referee', 'Referrer IP', 'Referee IP', 'Status', 'Flag', 'Earned', 'Date', 'Actions'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(r => {
                      const sameIP = r.referrerIP && r.refereeIP && r.referrerIP === r.refereeIP;
                      return (
                        <tr key={r._id} className="transition-colors"
                          style={{
                            borderBottom: '1px solid color-mix(in srgb, var(--neon-purple) 5%, transparent)',
                            background: sameIP ? 'rgba(255,45,120,0.03)' : 'transparent',
                          }}
                          onMouseEnter={e => { if (!sameIP) e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-purple) 3%, transparent)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = sameIP ? 'rgba(255,45,120,0.03)' : 'transparent'; }}
                        >
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.referrer?.name || '—'}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.referrer?.email || ''}</div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.referee?.name || '—'}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.referee?.email || ''}</div>
                          </td>
                          <td className="px-4 py-3"><IPBadge ip1={r.referrerIP} ip2={r.refereeIP} /></td>
                          <td className="px-4 py-3"><IPBadge ip1={r.refereeIP} ip2={r.referrerIP} /></td>
                          <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                          <td className="px-4 py-3">
                            {r.flagReason ? (
                              <span className="text-[10px] font-medium" style={{ color: '#ff2d78' }}>{r.flagReason}</span>
                            ) : (
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-bold" style={{ color: 'var(--neon-purple)' }}>PKR {(r.totalEarned || 0).toFixed(2)}</span>
                          </td>
                          <td className="px-4 py-3 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {new Date(r.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3">
                            {(r.status === 'flagged' || r.status === 'pending') && (
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleStatusUpdate(r._id, 'active')}
                                  disabled={actionLoading === r._id}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}
                                >Approve</button>
                                <button
                                  onClick={() => handleStatusUpdate(r._id, 'rejected')}
                                  disabled={actionLoading === r._id}
                                  className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                  style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}
                                >Reject</button>
                              </div>
                            )}
                            {r.status === 'active' && (
                              <button
                                onClick={() => handleStatusUpdate(r._id, 'rejected')}
                                disabled={actionLoading === r._id}
                                className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                                style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}
                              >Revoke</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="lg:hidden space-y-3 p-4">
                {filtered.map(r => {
                  const sameIP = r.referrerIP && r.refereeIP && r.referrerIP === r.refereeIP;
                  return (
                    <div key={r._id} className="p-4 rounded-xl" style={{
                      background: sameIP ? 'rgba(255,45,120,0.05)' : 'var(--subtle-overlay)',
                      border: `1px solid ${sameIP ? 'rgba(255,45,120,0.2)' : 'var(--subtle-border)'}`,
                    }}>
                      <div className="flex items-center justify-between mb-2">
                        <StatusBadge status={r.status} />
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Referrer</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.referrer?.name || '—'}</div>
                          <div className="text-[10px] font-mono" style={{ color: sameIP ? '#ff2d78' : 'var(--text-muted)' }}>{normalizeIP(r.referrerIP)}</div>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Referee</span>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{r.referee?.name || '—'}</div>
                          <div className="text-[10px] font-mono" style={{ color: sameIP ? '#ff2d78' : 'var(--text-muted)' }}>{normalizeIP(r.refereeIP)}</div>
                        </div>
                      </div>
                      {r.flagReason && (
                        <div className="text-[10px] font-medium mb-2" style={{ color: '#ff2d78' }}>⚠ {r.flagReason}</div>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold" style={{ color: 'var(--neon-purple)' }}>PKR {(r.totalEarned || 0).toFixed(2)}</span>
                        {(r.status === 'flagged' || r.status === 'pending') && (
                          <div className="flex gap-1">
                            <button onClick={() => handleStatusUpdate(r._id, 'active')} disabled={actionLoading === r._id}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88' }}>Approve</button>
                            <button onClick={() => handleStatusUpdate(r._id, 'rejected')} disabled={actionLoading === r._id}
                              className="px-2 py-1 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: '#ff2d78' }}>Reject</button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function DashboardReferralsPage() {
  return (
    <AdminRoute>
      <ReferralsContent />
    </AdminRoute>
  );
}
