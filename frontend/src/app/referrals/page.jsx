'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import ShareMenu from '@/components/ShareMenu';

const SITE_URL = typeof window !== 'undefined' ? window.location.origin : '';

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

function StatusBadge({ status }) {
  const map = {
    active: { bg: 'rgba(0,255,136,0.1)', border: 'rgba(0,255,136,0.3)', color: '#00ff88', label: 'Active' },
    pending: { bg: 'rgba(255,217,61,0.1)', border: 'rgba(255,217,61,0.3)', color: '#ffd93d', label: 'Pending' },
    flagged: { bg: 'rgba(255,45,120,0.1)', border: 'rgba(255,45,120,0.3)', color: '#ff2d78', label: 'Flagged' },
    expired: { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', color: '#6b7280', label: 'Expired' },
    rejected: { bg: 'rgba(255,45,120,0.1)', border: 'rgba(255,45,120,0.3)', color: '#ff2d78', label: 'Rejected' },
  };
  const s = map[status] || map.pending;
  return (
    <span className="text-[11px] font-bold uppercase px-2.5 py-1 rounded-full" style={{
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>{s.label}</span>
  );
}

export default function ReferralsPage() {
  const { isLoggedIn, authFetch, user, loading: authLoading } = useAuth();
  const [data, setData] = useState(null);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [retryKey, setRetryKey] = useState(0);
  const [tab, setTab] = useState('referrals');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    // Not logged in — stop spinner and show login prompt
    if (!isLoggedIn) { setLoading(false); return; }
    setLoading(true);
    setFetchError('');
    (async () => {
      try {
        const [refData, earnData] = await Promise.all([
          authFetch('/referrals/my'),
          authFetch('/referrals/my/earnings'),
        ]);
        if (refData.success) setData(refData);
        if (earnData.success) setEarnings(earnData.earnings);
      } catch (err) {
        setFetchError(err.message || 'Failed to load referral data');
      }
      setLoading(false);
    })();
  }, [isLoggedIn, authLoading, retryKey]);

  const referralLink = data?.referralCode ? `${SITE_URL}/signup?ref=${data.referralCode}` : '';

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
        <div className="relative z-10 max-w-2xl mx-auto px-4 py-16 text-center">
          <div className="glass-card p-8">
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Sign in to access referrals</p>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>Log in to invite friends and earn rewards.</p>
            <Link href="/login" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>Log In</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-purple)', top: '3%', right: '5%', opacity: 0.18 }} />
      <div className="glow-orb" style={{ width: '26vw', height: '26vw', maxWidth: 320, maxHeight: 320, background: 'var(--neon-cyan)', bottom: '8%', left: '5%', opacity: 0.12 }} />

      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8">

        {/* Header */}
        <div className="mb-5 animate-fade-in-up">
          <h1 className="text-xl sm:text-2xl font-extrabold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            🤝 Referral Program
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Invite friends — earn <strong style={{ color: 'var(--neon-purple)' }}>{data?.bonusPercent || 10}%</strong> bonus on their game rewards for <strong style={{ color: 'var(--neon-cyan)' }}>{data?.durationDays || 30} days</strong>.
          </p>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
              borderColor: 'color-mix(in srgb, var(--neon-purple) 30%, transparent)', borderTopColor: 'transparent',
            }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your referral data...</p>
          </div>
        ) : fetchError ? (
          <div className="glass-card p-8 text-center">
            <p className="text-2xl mb-3">⚠️</p>
            <p className="text-sm font-semibold mb-1" style={{ color: '#ff2d78' }}>Failed to load referral data</p>
            <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>{fetchError}</p>
            <button onClick={() => { setFetchError(''); setRetryKey(k => k + 1); }}
              className="btn-neon text-sm px-5 py-2">Retry</button>
          </div>
        ) : (
          <>
            {/* ── Top row: Link + Stats side by side on desktop ── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4 animate-fade-in-up">

              {/* Referral Link — takes 3/5 */}
              <div className="lg:col-span-3 glass-card p-4 sm:p-5 flex flex-col justify-between" style={{
                border: '1px solid color-mix(in srgb, var(--neon-purple) 25%, transparent)',
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--neon-purple) 5%, var(--glass-bg)), var(--glass-bg))',
              }}>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Your Referral Link</p>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 px-3 py-2 rounded-xl text-xs font-mono truncate" style={{
                    background: 'var(--input-bg)', border: '1px solid var(--input-border)', color: 'var(--neon-cyan)',
                  }}>
                    {referralLink || 'Loading...'}
                  </div>
                  <button onClick={copyLink} title="Copy link" className="btn-neon px-3 py-2 shrink-0" style={{
                    color: copied ? '#00ff88' : 'var(--neon-cyan)',
                  }}>
                    {copied ? <CheckIcon /> : <CopyIcon />}
                  </button>
                  <ShareMenu
                    url={referralLink}
                    text="Play games and earn real PKR rewards! Use my referral link to get started:"
                    compact
                  />
                </div>
                {/* Steps strip */}
                <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {[['🔗','Share'], ['📝','Sign up'], ['🎮','They play'], ['💰','You earn']].map(([icon, label], i, arr) => (
                    <div key={i} className="flex items-center gap-1">
                      <span>{icon}</span>
                      <span className="font-medium">{label}</span>
                      {i < arr.length - 1 && <span className="mx-1 opacity-40">›</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats — takes 2/5 */}
              <div className="lg:col-span-2 grid grid-cols-2 gap-3">
                {[
                  { label: 'Total', value: data?.totalCount || 0, color: 'var(--neon-cyan)', icon: '👥' },
                  { label: 'Active', value: data?.activeCount || 0, color: '#00ff88', icon: '✅' },
                  { label: 'Earned', value: `PKR ${(data?.totalEarnings || 0).toFixed(0)}`, color: 'var(--neon-purple)', icon: '💰' },
                  { label: 'Capacity', value: `${data?.totalCount || 0}/${data?.maxReferrals || 50}`, color: '#ffd93d', icon: '🎯' },
                ].map((card, i) => (
                  <div key={card.label} className="glass-card p-3 text-center" style={{ animationDelay: `${i * 0.06}s` }}>
                    <div className="text-lg mb-0.5">{card.icon}</div>
                    <div className="text-base font-bold leading-tight" style={{ color: card.color }}>{card.value}</div>
                    <div className="text-[10px] font-medium uppercase tracking-wider mt-0.5" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Tabs ── */}
            <div className="flex gap-2 mb-3 animate-fade-in-up">
              {[
                { key: 'referrals', label: '👥 My Referrals', count: data?.totalCount },
                { key: 'earnings', label: '💸 Earnings', count: earnings.length },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: tab === t.key ? 'color-mix(in srgb, var(--neon-purple) 15%, transparent)' : 'transparent',
                    border: `1px solid ${tab === t.key ? 'rgba(168,85,247,0.35)' : 'var(--glass-border)'}`,
                    color: tab === t.key ? 'var(--neon-purple)' : 'var(--text-muted)',
                  }}>
                  {t.label}
                  {t.count > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[10px]" style={{
                      background: tab === t.key ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.06)',
                    }}>{t.count}</span>
                  )}
                </button>
              ))}
            </div>

            {tab === 'referrals' ? (
              <div className="glass-card overflow-hidden animate-fade-in-up">
                {(!data?.referrals || data.referrals.length === 0) ? (
                  <div className="p-10 text-center">
                    <div className="text-4xl mb-3">🔗</div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No referrals yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Share your link to start earning!</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(168,85,247,0.1)' }}>
                            {['User', 'Status', 'Activated', 'Expires', 'Days Left', 'Earned'].map(h => (
                              <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.referrals.map(r => (
                            <tr key={r._id} className="transition-colors" style={{ borderBottom: '1px solid color-mix(in srgb, var(--neon-purple) 5%, transparent)' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-purple) 3%, transparent)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{
                                    background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                                  }}>{r.referee?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                                  <div>
                                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{r.referee?.name || 'Unknown'}</div>
                                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{r.referee?.email || ''}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {r.activatedAt ? new Date(r.activatedAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '—'}
                              </td>
                              <td className="px-4 py-3">
                                {r.status === 'active' && r.daysRemaining > 0 ? (
                                  <span className="text-sm font-bold" style={{ color: r.daysRemaining <= 7 ? '#ffd93d' : '#00ff88' }}>{r.daysRemaining}d</span>
                                ) : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>}
                              </td>
                              <td className="px-4 py-3">
                                <span className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>PKR {r.totalEarned?.toFixed(2) || '0.00'}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile — compact list */}
                    <div className="md:hidden divide-y" style={{ borderColor: 'color-mix(in srgb, var(--neon-purple) 8%, transparent)' }}>
                      {data.referrals.map(r => (
                        <div key={r._id} className="flex items-center gap-3 px-4 py-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{
                            background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-purple))',
                          }}>{r.referee?.name?.charAt(0)?.toUpperCase() || '?'}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.referee?.name || 'Unknown'}</span>
                              <StatusBadge status={r.status} />
                            </div>
                            <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                              {r.status === 'active' && r.daysRemaining > 0 ? `${r.daysRemaining}d left` : r.activatedAt ? new Date(r.activatedAt).toLocaleDateString() : 'Not activated'}
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="text-sm font-bold" style={{ color: 'var(--neon-purple)' }}>PKR {r.totalEarned?.toFixed(2) || '0.00'}</div>
                            <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>earned</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="glass-card overflow-hidden animate-fade-in-up">
                {earnings.length === 0 ? (
                  <div className="p-10 text-center">
                    <div className="text-4xl mb-3">💸</div>
                    <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No earnings yet</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Earnings appear when your referred users play games.</p>
                  </div>
                ) : (
                  <div className="divide-y" style={{ borderColor: 'color-mix(in srgb, var(--neon-purple) 8%, transparent)' }}>
                    {earnings.map(e => (
                      <div key={e._id} className="flex items-center gap-3 px-4 py-3 transition-colors"
                        onMouseEnter={ev => ev.currentTarget.style.background = 'color-mix(in srgb, var(--neon-purple) 3%, transparent)'}
                        onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0" style={{
                          background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(0,229,255,0.15))',
                        }}>🎮</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{e.game}</div>
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                            {e.referee?.name || 'user'} · {e.bonusPercent}% of PKR {e.baseReward?.toFixed(2)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold" style={{ color: '#00ff88' }}>+PKR {e.bonusAmount?.toFixed(2)}</div>
                          <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(e.createdAt).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
