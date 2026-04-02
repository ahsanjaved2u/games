'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function MyCommentsPage() {
  const { isLoggedIn, user, authFetch, loading: authLoading } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchComments = useCallback(async (p = 1, append = false) => {
    try {
      const data = await authFetch(`/reviews/my-comments?page=${p}&limit=20`);
      setComments(prev => append ? [...prev, ...data.comments] : data.comments);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    if (isLoggedIn) fetchComments(1);
    else setLoading(false);
  }, [isLoggedIn, fetchComments]);

  const handleEdit = async (commentId) => {
    if (!editText.trim()) return;
    try {
      await authFetch(`/reviews/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ text: editText.trim() }),
      });
      setComments(prev => prev.map(c => c._id === commentId ? { ...c, text: editText.trim(), isEdited: true } : c));
      setEditingId(null);
      showToast('Comment updated');
    } catch (err) { showToast(err.message || 'Failed to edit', 'error'); }
  };

  const handleDelete = async (commentId) => {
    try {
      await authFetch(`/reviews/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => prev.filter(c => c._id !== commentId));
      setTotal(t => Math.max(0, t - 1));
      showToast('Comment deleted');
    } catch (err) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center glass-card p-8 rounded-2xl max-w-sm mx-auto">
          <p className="text-lg font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Log in to view your comments</p>
          <Link href="/login" className="btn-neon btn-neon-primary text-sm" style={{ textDecoration: 'none' }}>Log In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-cyan)', top: '5%', right: '10%' }} />
      <div className="glow-orb" style={{ width: '20vw', height: '20vw', maxWidth: 250, maxHeight: 250, background: 'var(--neon-purple)', bottom: '10%', left: '5%', animationDelay: '3s' }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>My Comments</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>{total} {total === 1 ? 'comment' : 'comments'} across all games</p>
          </div>
          <Link href="/games" className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all" style={{
            color: 'var(--neon-cyan)', textDecoration: 'none',
            border: '1px solid rgba(0,229,255,0.2)', background: 'rgba(0,229,255,0.05)',
          }}>
            ← Games
          </Link>
        </div>

        {comments.length === 0 ? (
          <div className="glass-card p-8 rounded-2xl text-center">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>You haven&apos;t posted any comments yet.</p>
            <Link href="/games" className="btn-neon text-sm mt-4 inline-block" style={{ textDecoration: 'none' }}>Browse Games</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map(comment => {
              const gameName = comment.game?.name || 'Unknown Game';
              const gameSlug = comment.game?.slug;
              const isReply = !!comment.parent;

              return (
                <div key={comment._id} className="glass-card rounded-xl p-4 transition-all duration-200" style={{ borderLeft: `3px solid ${isReply ? 'var(--neon-purple)' : 'var(--neon-cyan)'}` }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {gameSlug ? (
                        <Link href={`/games/${gameSlug}#reviews`} className="text-xs font-semibold truncate" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
                          🎮 {gameName}
                        </Link>
                      ) : (
                        <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>🎮 {gameName}</span>
                      )}
                      {isReply && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc' }}>Reply</span>
                      )}
                      {comment.isEdited && (
                        <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>edited</span>
                      )}
                    </div>
                    <span className="text-[10px] flex-shrink-0 ml-2" style={{ color: 'var(--text-muted)' }}>{timeAgo(comment.createdAt)}</span>
                  </div>

                  {/* Reply context */}
                  {isReply && comment.parent?.text && (
                    <div className="mb-2 pl-3 py-1.5 rounded-lg text-xs" style={{ borderLeft: '2px solid var(--glass-border)', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{comment.parent.user?.name || 'User'}:</span> {comment.parent.text.slice(0, 100)}{comment.parent.text.length > 100 ? '...' : ''}
                    </div>
                  )}

                  {/* Comment text or edit mode */}
                  {editingId === comment._id ? (
                    <div>
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-sm resize-none"
                        style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', border: '1px solid var(--glass-border)', outline: 'none' }}
                        rows={2}
                        maxLength={1000}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <button onClick={() => handleEdit(comment._id)} className="text-[11px] font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--neon-cyan)', border: 'none', cursor: 'pointer' }}>Save</button>
                        <button onClick={() => setEditingId(null)} className="text-[11px] px-3 py-1 rounded-lg" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', margin: 0 }}>
                      {comment.text}
                    </p>
                  )}

                  {/* Actions */}
                  {editingId !== comment._id && (
                    <div className="flex items-center gap-3 mt-2">
                      <button
                        onClick={() => { setEditingId(comment._id); setEditText(comment.text); }}
                        className="text-[11px] font-medium transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className="text-[11px] font-medium transition-colors"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#ff2d78'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                      >
                        Delete
                      </button>
                      {!isReply && comment.replyCount > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Load more */}
            {page < pages && (
              <button
                onClick={() => fetchComments(page + 1, true)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: 'transparent', color: 'var(--neon-cyan)',
                  border: '1px solid rgba(0,229,255,0.2)', cursor: 'pointer',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                Load more ({total - comments.length} remaining)
              </button>
            )}
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
  );
}
