'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AdminRoute from '@/components/AdminRoute';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function AdminCommentsPage() {
  const { authFetch } = useAuth();
  const [comments, setComments] = useState([]);
  const [stats, setStats] = useState({ totalAll: 0, totalToday: 0, totalReported: 0 });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [games, setGames] = useState([]);
  const [toast, setToast] = useState(null);

  // Filters
  const [filterGame, setFilterGame] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterReported, setFilterReported] = useState(false);
  const [sortOrder, setSortOrder] = useState('newest');
  const [confirmDelete, setConfirmDelete] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch all games for filter dropdown
  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch('/games/admin/all');
        setGames(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
    })();
  }, [authFetch]);

  const fetchComments = useCallback(async (p = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 30, sort: sortOrder });
      if (filterGame) params.set('game', filterGame);
      if (filterUser.trim()) params.set('user', filterUser.trim());
      if (filterReported) params.set('reported', '1');

      const data = await authFetch(`/reviews/admin/comments?${params}`);
      setComments(data.comments || []);
      setTotal(data.total || 0);
      setPages(data.pages || 0);
      setPage(p);
      if (data.stats) setStats(data.stats);
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch, filterGame, filterUser, filterReported, sortOrder]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  const handleDelete = async (commentId) => {
    try {
      await authFetch(`/reviews/admin/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c._id !== commentId));
      setTotal(t => Math.max(0, t - 1));
      setConfirmDelete(null);
      showToast('Comment permanently deleted');
    } catch (err) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  return (
    <AdminRoute>
      <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>💬 Comments Management</h1>
              <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Review and moderate user comments</p>
            </div>
            <Link href="/dashboard" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>← Dashboard</Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="glass-card p-4 rounded-xl text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--neon-cyan)' }}>{stats.totalAll}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Total Comments</p>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <p className="text-2xl font-bold" style={{ color: '#00ff88' }}>{stats.totalToday}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Today</p>
            </div>
            <div className="glass-card p-4 rounded-xl text-center">
              <p className="text-2xl font-bold" style={{ color: stats.totalReported > 0 ? '#ff2d78' : 'var(--text-muted)' }}>{stats.totalReported}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Reported</p>
            </div>
          </div>

          {/* Filters */}
          <div className="glass-card p-4 rounded-xl mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Game filter */}
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Game</label>
                <select
                  value={filterGame}
                  onChange={e => setFilterGame(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
                >
                  <option value="">All Games</option>
                  {games.map(g => <option key={g._id} value={g.slug}>{g.name}</option>)}
                </select>
              </div>

              {/* User filter */}
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>User</label>
                <input
                  type="text"
                  value={filterUser}
                  onChange={e => setFilterUser(e.target.value)}
                  placeholder="Search by name..."
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
                />
              </div>

              {/* Sort */}
              <div>
                <label className="text-[10px] uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Sort</label>
                <select
                  value={sortOrder}
                  onChange={e => setSortOrder(e.target.value)}
                  className="w-full rounded-lg px-3 py-2 text-sm"
                  style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>

              {/* Reported toggle */}
              <div className="flex items-end">
                <button
                  onClick={() => setFilterReported(!filterReported)}
                  className="w-full rounded-lg px-3 py-2 text-sm font-semibold transition-all"
                  style={{
                    background: filterReported ? 'rgba(255,45,120,0.12)' : 'var(--bg-primary)',
                    color: filterReported ? '#ff2d78' : 'var(--text-secondary)',
                    border: `1px solid ${filterReported ? 'rgba(255,45,120,0.3)' : 'var(--glass-border)'}`,
                    cursor: 'pointer',
                  }}
                >
                  🚩 {filterReported ? 'Reported Only' : 'Show Reported'}
                </button>
              </div>
            </div>
          </div>

          {/* Comments list */}
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            </div>
          ) : comments.length === 0 ? (
            <div className="glass-card p-8 rounded-xl text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No comments found matching your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map(comment => (
                <div key={comment._id} className="glass-card rounded-xl p-4 transition-all duration-200">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Meta row */}
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-semibold" style={{ color: 'var(--neon-cyan)' }}>
                          {comment.user?.name || 'Deleted User'}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>on</span>
                        {comment.game?.slug ? (
                          <Link href={`/games/${comment.game.slug}#reviews`} className="text-xs font-semibold" style={{ color: 'var(--neon-purple)', textDecoration: 'none' }}>
                            🎮 {comment.game?.name || 'Unknown'}
                          </Link>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>🎮 {comment.game?.name || 'Unknown'}</span>
                        )}
                        {comment.parent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>Reply</span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{timeAgo(comment.createdAt)}</span>
                        {comment.isEdited && (
                          <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>edited</span>
                        )}
                        {comment.reports?.length > 0 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(255,45,120,0.12)', color: '#ff2d78' }}>
                            🚩 {comment.reports.length} {comment.reports.length === 1 ? 'report' : 'reports'}
                          </span>
                        )}
                      </div>

                      {/* Replying to context */}
                      {comment.parent?.text && (
                        <div className="mb-1.5 pl-3 py-1 rounded text-[11px]" style={{ borderLeft: '2px solid var(--glass-border)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                          Re: {comment.parent.text.slice(0, 80)}{comment.parent.text.length > 80 ? '...' : ''}
                        </div>
                      )}

                      {/* Comment text */}
                      <p className="text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                        {comment.text}
                      </p>
                    </div>

                    {/* Delete button */}
                    <div className="flex-shrink-0">
                      {confirmDelete === comment._id ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleDelete(comment._id)}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                            style={{ background: 'rgba(255,45,120,0.15)', color: '#ff2d78', border: '1px solid rgba(255,45,120,0.3)', cursor: 'pointer' }}
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="text-[10px] px-2.5 py-1 rounded-lg"
                            style={{ color: 'var(--text-muted)', background: 'transparent', border: '1px solid var(--glass-border)', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(comment._id)}
                          className="p-1.5 rounded-lg transition-all"
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#ff2d78'; e.currentTarget.style.background = 'rgba(255,45,120,0.1)'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                          title="Delete comment"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => fetchComments(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: page > 1 ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: page > 1 ? 'var(--neon-cyan)' : 'var(--text-muted)',
                  border: `1px solid ${page > 1 ? 'rgba(0,229,255,0.2)' : 'var(--glass-border)'}`,
                  cursor: page > 1 ? 'pointer' : 'default',
                }}
              >
                ← Prev
              </button>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                Page {page} of {pages} ({total} total)
              </span>
              <button
                onClick={() => fetchComments(page + 1)}
                disabled={page >= pages}
                className="px-3 py-1.5 rounded-lg text-sm transition-all"
                style={{
                  background: page < pages ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: page < pages ? 'var(--neon-cyan)' : 'var(--text-muted)',
                  border: `1px solid ${page < pages ? 'rgba(0,229,255,0.2)' : 'var(--glass-border)'}`,
                  cursor: page < pages ? 'pointer' : 'default',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Toast */}
        {toast && (
          <div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-fade-in-up"
            style={{
              background: toast.type === 'error' ? 'rgba(255,45,120,0.95)' : 'rgba(0,229,255,0.95)',
              color: '#fff', zIndex: 99999,
            }}
          >
            {toast.msg}
          </div>
        )}
      </div>
    </AdminRoute>
  );
}
