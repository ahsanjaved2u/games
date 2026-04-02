'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  return `${Math.floor(days / 30)}mo ago`;
}

function Avatar({ name, size = 32 }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center rounded-full font-bold"
      style={{
        width: size, height: size, fontSize: size * 0.38,
        background: 'linear-gradient(135deg, var(--neon-cyan, #00e5ff), var(--neon-purple, #a855f7))',
        color: '#0b0b1a',
      }}
    >
      {name?.charAt(0).toUpperCase() || '?'}
    </div>
  );
}

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
    <div className={`flex gap-2.5 ${isReply ? 'ml-9 mt-2' : 'mt-4'}`}>
      <Avatar name={comment.user?.name} size={isReply ? 26 : 32} />
      <div className="flex-1 min-w-0">
        <div
          className="rounded-2xl px-3.5 py-2.5 relative"
          style={{
            background: isReply
              ? 'color-mix(in srgb, var(--bg-card, #12122a) 75%, var(--neon-cyan, #00e5ff) 5%)'
              : 'var(--bg-card, #12122a)',
            border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
          }}
          onMouseEnter={() => setShowActions(true)}
          onMouseLeave={() => setShowActions(false)}
        >
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-[12px] font-semibold" style={{ color: 'var(--text-primary, #fff)' }}>
              {comment.user?.name || 'Unknown'}
            </span>
            <span className="text-[10px]" style={{ color: 'var(--text-muted, #666)' }}>
              {timeAgo(comment.createdAt)}
            </span>
            {comment.isEdited && (
              <span className="text-[9px] italic" style={{ color: 'var(--text-muted, #666)' }}>edited</span>
            )}
          </div>

          {editing ? (
            <div className="mt-1">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none"
                style={{
                  background: 'var(--bg-primary, #0b0b1a)', color: 'var(--text-primary, #fff)',
                  border: '1px solid var(--glass-border, rgba(255,255,255,0.08))', outline: 'none',
                }}
                rows={2}
                maxLength={1000}
                autoFocus
              />
              <div className="flex gap-2 mt-1.5">
                <button onClick={handleSaveEdit} style={{ background: 'rgba(0,229,255,0.12)', color: 'var(--neon-cyan, #00e5ff)', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 8 }}>Save</button>
                <button onClick={() => { setEditing(false); setEditText(comment.text); }} style={{ color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 11, padding: '4px 8px', borderRadius: 8 }}>Cancel</button>
              </div>
            </div>
          ) : (
            <p className="text-sm break-words whitespace-pre-wrap" style={{ color: 'var(--text-secondary, #aaa)', margin: 0, lineHeight: 1.55 }}>
              {comment.text}
            </p>
          )}

          {/* Actions on hover */}
          {showActions && !editing && (
            <div className="absolute top-2 right-2 flex gap-1">
              {isOwner ? (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    title="Edit"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; e.currentTarget.style.background = 'rgba(0,229,255,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(comment._id)}
                    title="Delete"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#ff2d78'; e.currentTarget.style.background = 'rgba(255,45,120,0.1)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                  </button>
                </>
              ) : currentUserId ? (
                <button
                  onClick={() => onReport(comment._id)}
                  title="Report"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4, borderRadius: 6 }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ffd93d'; e.currentTarget.style.background = 'rgba(255,217,61,0.1)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
                  </svg>
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Reply link */}
        {!editing && !isReply && (
          <div className="flex items-center gap-3 mt-1 ml-1">
            {currentUserId && (
              <button
                onClick={() => setShowReplyInput(!showReplyInput)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, fontSize: 11, fontWeight: 600 }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
              >
                Reply
              </button>
            )}
            {comment.replyCount > 0 && !comment.replies?.length && (
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
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
              style={{
                background: replyText.trim() ? 'rgba(0,229,255,0.15)' : 'transparent',
                color: replyText.trim() ? 'var(--neon-cyan)' : 'var(--text-muted)',
                border: `1px solid ${replyText.trim() ? 'rgba(0,229,255,0.3)' : 'var(--glass-border)'}`,
                cursor: replyText.trim() ? 'pointer' : 'default',
                padding: '8px 12px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              }}
            >
              Send
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
   CommentsModal
   ══════════════════════════════════════════ */
export default function CommentsModal({ slug, gameName, onClose }) {
  const { isLoggedIn, user, authFetch } = useAuth();
  const [comments, setComments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);
  const bodyRef = useRef(null);
  const inputRef = useRef(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    // Lock body scroll
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 280);
  };

  /* Fetch comments */
  const fetchComments = useCallback(async (p = 1, append = false) => {
    try {
      const headers = {};
      const token = typeof window !== 'undefined' ? localStorage.getItem('gz_token') : null;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}/reviews/${slug}/comments?page=${p}&limit=20`, { headers });
      const data = await res.json();
      setComments(prev => append ? [...prev, ...data.comments] : data.comments);
      setTotal(data.total);
      setPages(data.pages);
      setPage(p);
    } catch { /* ignore */ }
    setLoading(false);
  }, [slug]);

  useEffect(() => { fetchComments(1); }, [fetchComments]);

  /* Post */
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
      if (bodyRef.current) bodyRef.current.scrollTop = 0;
    } catch (err) { showToast(err.message || 'Failed to post', 'error'); }
    setPosting(false);
  };

  /* Reply */
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

  /* Edit */
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

  /* Delete */
  const handleDelete = async (commentId) => {
    try {
      await authFetch(`/reviews/comments/${commentId}`, { method: 'DELETE' });
      setComments(prev => {
        const topLevel = prev.filter(c => c._id !== commentId);
        return topLevel.map(c => ({
          ...c,
          replies: c.replies?.filter(r => r._id !== commentId) || [],
          replyCount: c.replies?.filter(r => r._id !== commentId).length ?? 0,
        }));
      });
      setTotal(t => Math.max(0, t - 1));
      showToast('Comment deleted');
    } catch (err) { showToast(err.message || 'Failed to delete', 'error'); }
  };

  /* Report */
  const handleReport = async (commentId) => {
    if (!isLoggedIn) { showToast('Please log in to report', 'error'); return; }
    try {
      await authFetch(`/reviews/comments/${commentId}/report`, { method: 'POST', body: JSON.stringify({}) });
      showToast('Comment reported — thanks!');
    } catch (err) { showToast(err.message || 'Already reported', 'error'); }
  };

  if (typeof window === 'undefined') return null;

  return createPortal(
    <div
      onClick={handleClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        padding: '0',
        background: visible ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(6px)' : 'none',
        transition: 'background 0.28s ease, backdrop-filter 0.28s ease',
      }}
    >
      {/* Panel */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 620,
          height: '85dvh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '20px 20px 0 0',
          background: 'var(--bg-primary, #0b0b1a)',
          border: '1px solid var(--glass-border, rgba(255,255,255,0.08))',
          borderBottom: 'none',
          boxShadow: '0 -8px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(0,229,255,0.06)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
          overflow: 'hidden',
          /* Desktop: floating centered */
        }}
        className="sm:mb-6 sm:rounded-2xl sm:border-b sm:h-[80vh] sm:max-h-[700px]"
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.15)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--glass-border, rgba(255,255,255,0.07))' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: 'rgba(0,229,255,0.1)',
              border: '1px solid rgba(0,229,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--neon-cyan, #00e5ff)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary, #fff)', margin: 0 }}>
                {gameName || 'Comments'}
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted, #666)', margin: 0 }}>
                {total} {total === 1 ? 'comment' : 'comments'}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: 32, height: 32, borderRadius: 10, flexShrink: 0,
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'var(--text-secondary, #aaa)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,45,120,0.12)'; e.currentTarget.style.color = '#ff2d78'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable comment list */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-4 pb-4" style={{ overscrollBehavior: 'contain' }}>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            </div>
          ) : comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div style={{
                width: 56, height: 56, borderRadius: 16,
                background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(0,229,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-muted)', margin: 0 }}>No comments yet</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)', margin: 0, opacity: 0.7 }}>Be the first to share your thoughts!</p>
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
                  className="w-full mt-4 py-3 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: 'transparent', color: 'var(--neon-cyan)',
                    border: '1px solid rgba(0,229,255,0.2)', cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.06)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  Load more ({total - comments.length} remaining)
                </button>
              )}
            </>
          )}
        </div>

        {/* Sticky comment input */}
        <div
          className="flex-shrink-0 px-4 py-3"
          style={{ borderTop: '1px solid var(--glass-border, rgba(255,255,255,0.07))', background: 'var(--bg-primary, #0b0b1a)' }}
        >
          {isLoggedIn ? (
            <div className="flex gap-2.5 items-end">
              <Avatar name={user?.name} size={32} />
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="w-full rounded-2xl text-sm resize-none transition-all"
                  style={{
                    background: 'var(--bg-card, #12122a)',
                    color: 'var(--text-primary, #fff)',
                    border: '1px solid var(--glass-border)',
                    outline: 'none', padding: '10px 48px 10px 14px',
                    minHeight: 42, maxHeight: 110,
                    lineHeight: 1.5,
                  }}
                  onFocus={e => { e.target.style.borderColor = 'rgba(0,229,255,0.35)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--glass-border)'; }}
                  rows={1}
                  maxLength={1000}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
                />
                <button
                  onClick={handlePost}
                  disabled={!newComment.trim() || posting}
                  style={{
                    position: 'absolute', right: 8, bottom: 8,
                    width: 30, height: 30, borderRadius: 10,
                    background: newComment.trim() ? 'linear-gradient(135deg, var(--neon-cyan, #00e5ff), var(--neon-purple, #a855f7))' : 'rgba(255,255,255,0.05)',
                    border: 'none', cursor: newComment.trim() ? 'pointer' : 'default',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    opacity: posting ? 0.6 : 1,
                  }}
                >
                  {posting ? (
                    <div style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={newComment.trim() ? '#0b0b1a' : 'rgba(255,255,255,0.25)'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div
              className="text-center py-2.5 rounded-2xl text-sm"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}
            >
              <a href="/login" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Log in</a> to join the conversation
            </div>
          )}
          {newComment.length > 0 && (
            <p className="text-right mt-1" style={{ fontSize: 10, color: 'var(--text-muted)' }}>{newComment.length}/1000</p>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 100, left: '50%', transform: 'translateX(-50%)',
          padding: '10px 20px', borderRadius: 12, fontSize: 13, fontWeight: 600,
          zIndex: 10000, pointerEvents: 'none', whiteSpace: 'nowrap',
          background: toast.type === 'error' ? 'rgba(255,45,120,0.9)' : 'rgba(0,229,255,0.9)',
          color: '#0b0b1a', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast.msg}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>,
    document.body
  );
}
