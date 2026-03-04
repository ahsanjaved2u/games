'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

// ── Icons ──
const BackIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 12H5" /><polyline points="12 19 5 12 12 5" />
  </svg>
);

const RefreshIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const FilterIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

const methodColors = {
  GET: { bg: 'rgba(0,229,255,0.12)', color: '#00e5ff', border: 'rgba(0,229,255,0.25)' },
  POST: { bg: 'rgba(0,255,136,0.12)', color: '#00ff88', border: 'rgba(0,255,136,0.25)' },
  PUT: { bg: 'rgba(255,217,61,0.12)', color: '#ffd93d', border: 'rgba(255,217,61,0.25)' },
  PATCH: { bg: 'rgba(168,85,247,0.12)', color: '#a855f7', border: 'rgba(168,85,247,0.25)' },
  DELETE: { bg: 'rgba(255,45,120,0.12)', color: '#ff2d78', border: 'rgba(255,45,120,0.25)' },
};

const statusColor = (code) => {
  if (code >= 200 && code < 300) return 'var(--neon-green)';
  if (code >= 300 && code < 400) return 'var(--neon-cyan)';
  if (code >= 400 && code < 500) return 'var(--neon-yellow)';
  return 'var(--neon-pink)';
};

function LogsContent() {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [methodFilter, setMethodFilter] = useState('');
  const [expandedLog, setExpandedLog] = useState(null);

  const fetchLogs = async (p = 1) => {
    setLoading(true);
    try {
      let url = `/logs?page=${p}&limit=30`;
      if (methodFilter) url += `&method=${methodFilter}`;
      const data = await authFetch(url);
      if (data.success) {
        setLogs(data.logs);
        setTotalPages(data.pages);
        setTotal(data.total);
        setPage(data.page);
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchLogs(1);
  }, [methodFilter]);

  const timeAgo = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: '#00e5ff', top: '8%', left: '10%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: '#ff2d78', bottom: '10%', right: '8%', animationDelay: '6s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="p-2 rounded-xl transition-all duration-200" style={{
              background: 'rgba(0,229,255,0.08)',
              border: '1px solid rgba(0,229,255,0.15)',
              color: 'var(--neon-cyan)',
              textDecoration: 'none',
            }}>
              <BackIcon />
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Request Logs
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {total.toLocaleString()} total entries
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Method Filter */}
            <div className="flex items-center gap-1.5">
              <span style={{ color: 'var(--text-muted)' }}><FilterIcon /></span>
              <select
                value={methodFilter}
                onChange={e => setMethodFilter(e.target.value)}
                className="px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
                style={{
                  background: 'rgba(10,11,26,0.7)',
                  border: '1px solid rgba(0,229,255,0.15)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="">All Methods</option>
                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <button onClick={() => fetchLogs(page)} className="btn-neon text-sm">
              <RefreshIcon /> Refresh
            </button>
          </div>
        </div>

        {/* ── Logs List ── */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
                borderColor: 'rgba(0,229,255,0.3)',
                borderTopColor: 'transparent',
              }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No logs found</p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 text-[11px] font-semibold uppercase tracking-wider" style={{
                color: 'var(--text-muted)',
                borderBottom: '1px solid rgba(0,229,255,0.08)',
              }}>
                <div className="col-span-1">Method</div>
                <div className="col-span-3">URL</div>
                <div className="col-span-1">Status</div>
                <div className="col-span-2">IP Address</div>
                <div className="col-span-2">User</div>
                <div className="col-span-1">Time</div>
                <div className="col-span-2">When</div>
              </div>

              {/* Log rows */}
              {logs.map((log, i) => {
                const mc = methodColors[log.method] || methodColors.GET;
                const isExpanded = expandedLog === log._id;

                return (
                  <div key={log._id}>
                    {/* Desktop row */}
                    <div
                      className="hidden md:grid grid-cols-12 gap-4 px-6 py-3.5 cursor-pointer transition-all duration-150"
                      style={{ borderBottom: '1px solid rgba(0,229,255,0.05)' }}
                      onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,229,255,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Method */}
                      <div className="col-span-1 flex items-center">
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{
                          background: mc.bg,
                          color: mc.color,
                          border: `1px solid ${mc.border}`,
                        }}>
                          {log.method}
                        </span>
                      </div>

                      {/* URL */}
                      <div className="col-span-3 flex items-center">
                        <span className="text-sm font-mono truncate" style={{ color: 'var(--text-secondary)' }} title={log.url}>
                          {log.url}
                        </span>
                      </div>

                      {/* Status */}
                      <div className="col-span-1 flex items-center">
                        <span className="text-xs font-bold" style={{ color: statusColor(log.statusCode) }}>
                          {log.statusCode || '—'}
                        </span>
                      </div>

                      {/* IP */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                          {log.ip}
                        </span>
                      </div>

                      {/* User */}
                      <div className="col-span-2 flex items-center">
                        {log.user ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--neon-purple)' }}>
                            {log.user.name || log.user.email || 'Authenticated'}
                          </span>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Anonymous</span>
                        )}
                      </div>

                      {/* Response time */}
                      <div className="col-span-1 flex items-center">
                        <span className="text-xs" style={{ color: log.responseTime > 1000 ? 'var(--neon-pink)' : 'var(--text-muted)' }}>
                          {log.responseTime ? `${log.responseTime}ms` : '—'}
                        </span>
                      </div>

                      {/* When */}
                      <div className="col-span-2 flex items-center">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {timeAgo(log.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Mobile card */}
                    <div
                      className="md:hidden px-4 py-3 cursor-pointer transition-all duration-150"
                      style={{ borderBottom: '1px solid rgba(0,229,255,0.05)' }}
                      onClick={() => setExpandedLog(isExpanded ? null : log._id)}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded shrink-0" style={{
                            background: mc.bg, color: mc.color, border: `1px solid ${mc.border}`,
                          }}>
                            {log.method}
                          </span>
                          <span className="text-xs font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
                            {log.url}
                          </span>
                        </div>
                        <span className="text-[11px] font-bold shrink-0" style={{ color: statusColor(log.statusCode) }}>
                          {log.statusCode || '—'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        <span>{log.user ? (log.user.name || 'Auth') : 'Anon'} · {log.ip}</span>
                        <span>{timeAgo(log.createdAt)}{log.responseTime ? ` · ${log.responseTime}ms` : ''}</span>
                      </div>
                    </div>

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="px-4 md:px-6 py-4 animate-fade-in-up" style={{
                        background: 'rgba(0,229,255,0.02)',
                        borderBottom: '1px solid rgba(0,229,255,0.08)',
                      }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>Full URL</span>
                            <p className="mt-1 font-mono break-all" style={{ color: 'var(--text-secondary)' }}>{log.url}</p>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>User Agent</span>
                            <p className="mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>{log.userAgent || '—'}</p>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>Referer</span>
                            <p className="mt-1 break-all" style={{ color: 'var(--text-secondary)' }}>{log.referer || '—'}</p>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>Timestamp</span>
                            <p className="mt-1" style={{ color: 'var(--text-secondary)' }}>
                              {new Date(log.createdAt).toLocaleString('en-US', {
                                month: 'short', day: 'numeric', year: 'numeric',
                                hour: '2-digit', minute: '2-digit', second: '2-digit',
                              })}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>Response Time</span>
                            <p className="mt-1 font-mono" style={{ color: log.responseTime > 1000 ? 'var(--neon-pink)' : 'var(--neon-green)' }}>
                              {log.responseTime ? `${log.responseTime}ms` : '—'}
                            </p>
                          </div>
                          <div>
                            <span className="font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: 10 }}>IP Address</span>
                            <p className="mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>{log.ip}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid rgba(0,229,255,0.08)' }}>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => fetchLogs(page - 1)}
                      className="btn-neon text-xs px-3 py-1.5"
                      style={{ opacity: page <= 1 ? 0.4 : 1 }}
                    >
                      ← Prev
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => fetchLogs(page + 1)}
                      className="btn-neon text-xs px-3 py-1.5"
                      style={{ opacity: page >= totalPages ? 0.4 : 1 }}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LogsPage() {
  return (
    <AdminRoute>
      <LogsContent />
    </AdminRoute>
  );
}
