'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ── Helpers ── */
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

function Avatar({ name, size = 32 }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size, height: size, fontSize: size * 0.4,
        background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
      }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

/* ── Single Comment ── */
function CommentItem({ comment, currentUserId, onReply, onEdit, onDelete, onReport, isReply = false }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [showActions, setShowActions] = useState(false);

  const isOwner = currentUserId && comment.user?._id === currentUserId;

  const handleSaveEdit = () => {
    if (!editText.trim()) return;
    onEdit(comment._id, editText.trim());
    setEditing(false);
  };

  const handleReply = () => {
    if (!replyText.trim()) return;
    onReply(comment._id, replyText.trim());
    setReplyText('');
    setShowReplyInput(false);
  };

  return (
    <div className={`flex gap-2.5 ${isReply ? 'ml-10 mt-2' : 'mt-4'}`}>
      <Avatar name={comment.user?.name} size={isReply ? 28 : 34} />
      <div className="flex-1 min-w-0">
        {/* Bubble */}
        <div
          className="rounded-2xl px-3.5 py-2.5 relative group"
          style={{
            background: isReply
              ? 'color-mix(in srgb, var(--bg-card) 80%, var(--neon-cyan) 4%)'
              : 'var(--bg-card)',
            border: '1px solid var(--glass-border)',
          }}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              {comment.user?.name || 'Unknown'}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-[9px] italic" style={{ color: 'var(--text-muted)' }}>edited</span>
            )}
          </div>

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  background: 'var(--bg-primary)', color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)', outline: 'none',
                }}
                rows={2}
                maxLength={1000}
                autoFocus
              />
              <div className="flex gap-2 mt-1.5">
                <button onClick={handleSaveEdit} className="text-[11px] font-semibold px-3 py-1 rounded-lg" style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--neon-cyan)', border: 'none', cursor: 'pointer' }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(comment.text); }} className="text-[11px] px-3 py-1 rounded-lg" style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
              {comment.text}
            </p>
          )}

          {/* Three-dot actions menu */}
          {showActions && !editing && (
            <div className="absolute top-2 right-2 flex gap-1">
              {isOwner && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="p-1 rounded-md transition-colors"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    title="Edit"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(comment._id)}
                    className="p-1 rounded-md transition-colors"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff2d78'; e.currentTarget.style.background = 'rgba(255,45,120,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                    title="Delete"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </>
              )}
              {!isOwner && currentUserId && (
                <button
                  onClick={() => onReport(comment._id)}
                  className="p-1 rounded-md transition-colors"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ffd93d'; e.currentTarget.style.background = 'rgba(255,217,61,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  title="Report"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Action links */}
        {!editing && !isReply && (
          <div className="flex items-center gap-3 mt-1 ml-1">
            {currentUserId && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                className="text-[11px] font-semibold transition-colors"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                Reply
              </button>
            )}
            {comment.replyCount > 0 && !comment.replies?.length && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
              </span>
            )}
          </div>
        )}

        {/* Reply input */}
        {showReplyInput && (
          <div className="flex gap-2 mt-2 ml-1 items-start">
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 rounded-xl px-3 py-2 text-sm resize-none"
              style={{
                background: 'var(--bg-primary)', color: 'var(--text-primary)',
                border: '1px solid var(--glass-border)', outline: 'none',
                minHeight: 36, maxHeight: 100,
              }}
              rows={1}
              maxLength={1000}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
              autoFocus
            />
            <button
              onClick={handleReply}
              disabled={!replyText.trim()}
              className="px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: replyText.trim() ? 'rgba(0,229,255,0.15)' : 'transparent',
                color: replyText.trim() ? 'var(--neon-cyan)' : 'var(--text-muted)',
                border: `1px solid ${replyText.trim() ? 'rgba(0,229,255,0.3)' : 'var(--glass-border)'}`,
                cursor: replyText.trim() ? 'pointer' : 'default',
              }}
            >
              Reply
            </button>
          </div>
        )}

        {/* Nested replies */}
        {comment.replies?.map(reply => (
          <CommentItem
            key={reply._id}
            comment={reply}
            currentUserId={currentUserId}
            onEdit={onEdit}
            onDelete={onDelete}
            onReport={onReport}
            onReply={() => {}}
            isReply
          />
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   Main GameReviews Component
   ══════════════════════════════════════════ */
export default function GameReviews({ slug }) {
  const { isLoggedIn, user, authFetch } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [likeData, setLikeData] = useState({ totalLikes: 0, userLiked: false });
  const [toast, setToast] = useState(null);
  const inputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  /* Fetch comments */
  const fetchComments = useCallback(async (p = 1, append = false) => {
    try {
      const res = await fetch(`${API}/reviews/${slug}/comments?page=${p}&limit=20`);
      const data = await res.json();
      setComments(prev => append ? [...prev, ...data.comments] : data.comments);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  /* Fetch like status */
  const fetchLikes = useCallback(async () => {
    try {
      const headers = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('gz_token') : null;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}/reviews/${slug}/likes`, { headers });
      const data = await res.json();
      setLikeData(data);
    } catch { /* ignore */ }
  }, [slug]);

  useEffect(() => {
    fetchComments(1);
    fetchLikes();
  }, [fetchComments, fetchLikes]);

  /* Toggle like */
  const handleLike = async () => {
    if (!isLoggedIn) { showToast('Please log in to like', 'error'); return; }
    try {
      const data = await authFetch(`/reviews/${slug}/like`, { method: 'POST' });
      setLikeData({ totalLikes: data.totalLikes, userLiked: data.liked });
    } catch { showToast('Failed to like', 'error'); }
  };

  /* Post comment */
  const handlePost = async () => {
    if (!isLoggedIn) { showToast('Please log in to comment', 'error'); return; }
    if (!newComment.trim()) return;
    setPosting(true);
    try {
      const data = await authFetch(`/reviews/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text: newComment.trim() }),
      });
      setComments(prev => [data, ...prev]);
      setTotal(t => t + 1);
      setNewComment('');
    } catch (err) { showToast(err.message || 'Failed to post', 'error'); }
    setPosting(false);
  };

  /* Reply to comment */
  const handleReply = async (parentId, text) => {
    if (!isLoggedIn) { showToast('Please log in to reply', 'error'); return; }
    try {
      const data = await authFetch(`/reviews/${slug}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, parentId }),
      });
      setComments(prev => prev.map(c =>
        c._id === parentId
          ? { ...c, replies: [...(c.replies || []), data], replyCount: (c.replyCount || 0) + 1 }
          : c
      ));
      setTotal(t => t + 1);
    } catch (err) { showToast(err.message || 'Failed to reply', 'error'); }
  };

  /* Edit comment */
  const handleEdit = async (commentId, text) => {
    try {
      const data = await authFetch(`/reviews/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ text }),
      });
      const update = (list) => list.map(c => {
        if (c._id === commentId) return { ...c, text: data.text, isEdited: true };
        if (c.replies) return { ...c, replies: update(c.replies) };
        return c;
      });
      setComments(update);
    } catch (err) { showToast(err.message || 'Failed to edit', 'error'); }
  };

  /* Delete comment */
  const handleDelete = async (commentId) => {
    try {
      await authFetch(`/reviews/comments/${commentId}`, { method: 'DELETE' });
      // Remove from top-level or from replies
      setComments(prev => {
        const topLevel = prev.filter(c => c._id !== commentId);
        return topLevel.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r._id !== commentId) || [],
          replyCount: c.replies?.filter(r => r._id !== commentId).length || 0,
        }));
      });
      setTotal(t => Math.max(0, t - 1));
      showToast('Comment deleted');
    } catch (err) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  /* Report comment */
  const handleReport = async (commentId) => {
    if (!isLoggedIn) { showToast('Please log in to report', 'error'); return; }
    try {
      await authFetch(`/reviews/comments/${commentId}/report`, { method: 'POST', body: JSON.stringify({}) });
      showToast('Comment reported — thanks for keeping the community safe');
    } catch (err) { showToast(err.message || 'Already reported', 'error'); }
  };

  return (
    <div id="reviews" className="mt-6" style={{ scrollMarginTop: 80 }}>
      {/* Header with like button */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)', margin: 0 }}>
            Reviews
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)' }}>
            {total} {total === 1 ? 'comment' : 'comments'}
          </span>
        </div>
        <button
          onClick={handleLike}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200"
          style={{
            background: likeData.userLiked ? 'rgba(255,45,120,0.12)' : 'transparent',
            border: `1px solid ${likeData.userLiked ? 'rgba(255,45,120,0.3)' : 'var(--glass-border)'}`,
            color: likeData.userLiked ? '#ff2d78' : 'var(--text-secondary)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
          onMouseEnter={e => { if (!likeData.userLiked) { e.currentTarget.style.borderColor = 'rgba(255,45,120,0.3)'; e.currentTarget.style.color = '#ff2d78'; } }}
          onMouseLeave={e => { if (!likeData.userLiked) { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.color = 'var(--text-secondary)'; } }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill={likeData.userLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
          </svg>
          {likeData.totalLikes > 0 ? likeData.totalLikes : 'Like'}
        </button>
      </div>

      {/* Comment input */}
      <div className="flex gap-3 items-start mb-4">
        {isLoggedIn ? (
          <>
            <Avatar name={user?.name} size={36} />
            <div className="flex-1">
              <textarea
                ref={inputRef}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="w-full rounded-2xl px-4 py-3 text-sm resize-none transition-all"
                style={{
                  background: 'var(--bg-card)', color: 'var(--text-primary)',
                  border: '1px solid var(--glass-border)', outline: 'none',
                  minHeight: 44, maxHeight: 120,
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.3)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
                rows={1}
                maxLength={1000}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
              />
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  {newComment.length}/1000 · Press Enter to post
                </span>
                <button
                  onClick={handlePost}
                  disabled={!newComment.trim() || posting}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: newComment.trim() ? 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))' : 'transparent',
                    color: newComment.trim() ? '#fff' : 'var(--text-muted)',
                    border: newComment.trim() ? 'none' : '1px solid var(--glass-border)',
                    cursor: newComment.trim() ? 'pointer' : 'default',
                    opacity: posting ? 0.6 : 1,
                  }}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div
            className="w-full rounded-2xl px-4 py-3 text-sm text-center"
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
              color: 'var(--text-muted)',
            }}
          >
            <a href="/login" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Log in</a> to leave a comment
          </div>
        )}
      </div>

      {/* Comments list */}
      {loading ? (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
          <p className="text-sm">No comments yet. Be the first!</p>
        </div>
      ) : (
        <>
          {comments.map(comment => (
            <CommentItem
              key={comment._id}
              comment={comment}
              currentUserId={user?._id}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onReport={handleReport}
            />
          ))}
          {page < pages && (
            <button
              onClick={() => fetchComments(page + 1, true)}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: 'transparent', color: 'var(--neon-cyan)',
                border: '1px solid rgba(0,229,255,0.2)', cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              Load more comments ({total - comments.length} remaining)
            </button>
          )}
        </>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl text-sm font-medium shadow-2xl animate-fade-in-up"
          style={{
            background: toast.type === 'error' ? 'rgba(255,45,120,0.95)' : 'rgba(0,229,255,0.95)',
            color: '#fff', zIndex: 99999, backdropFilter: 'blur(8px)',
          }}
        >
          {toast.msg}
        </div>
      )}
    </div>
  );
}
