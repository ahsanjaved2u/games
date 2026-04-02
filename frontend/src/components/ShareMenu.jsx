'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const platforms = [
  { name: 'WhatsApp', icon: '💬', color: '#25D366', share: (url, text) => `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}` },
  { name: 'Facebook', icon: '📘', color: '#1877F2', share: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { name: 'Twitter / X', icon: '🐦', color: '#1DA1F2', share: (url, text) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
  { name: 'TikTok', icon: '🎵', color: '#ff0050', share: (url, text) => `https://www.tiktok.com/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'Instagram', icon: '📸', color: '#E4405F', share: null },
  { name: 'LinkedIn', icon: '💼', color: '#0A66C2', share: (url) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  { name: 'Telegram', icon: '✈️', color: '#26A5E4', share: (url, text) => `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  { name: 'Copy Link', icon: '🔗', color: '#00e5ff', share: null },
];

const DROPDOWN_WIDTH = 208; // matches minWidth below

export default function ShareMenu({ url, text, compact = false, referralCode }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef(null);

  // Ensure portal only runs client-side
  useEffect(() => { setMounted(true); }, []);

  const baseUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://gamevesta.com');
  const shareUrl = referralCode ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}ref=${referralCode}` : baseUrl;
  const shareText = text || 'Check out GameVesta — Play. Compete. Win real cash rewards! 🎮';

  const toggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      // Right-align dropdown with button, clamped so it never overflows left/right edges
      const idealLeft = rect.right - DROPDOWN_WIDTH;
      const clampedLeft = Math.max(8, Math.min(idealLeft, window.innerWidth - DROPDOWN_WIDTH - 8));
      setDropPos({ top: rect.bottom + 6, left: clampedLeft });
    }
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!btnRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Close on scroll / resize to avoid stale coordinates
  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [open]);

  const handleShare = async (platform) => {
    if (platform.name === 'Copy Link' || platform.name === 'Instagram') {
      try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      return;
    }
    if (platform.share) window.open(platform.share(shareUrl, shareText), '_blank', 'noopener,noreferrer');
    setOpen(false);
  };

  const dropdown = open && (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: dropPos.top,
        left: dropPos.left,
        width: DROPDOWN_WIDTH,
        background: 'var(--bg-card)',
        border: '1px solid var(--glass-border)',
        borderRadius: 12,
        padding: '6px 0',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        zIndex: 999999,
        animation: 'fadeInUp 0.15s ease',
      }}
    >
      <p style={{ padding: '4px 16px 6px', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Share via</p>
      {platforms.map(p => (
        <button key={p.name} onClick={() => handleShare(p)}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 16px',
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--text-secondary)', fontSize: 13, textAlign: 'left',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = `${p.color}15`; e.currentTarget.style.color = p.color; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
        >
          <span style={{ fontSize: 17 }}>{p.icon}</span>
          {p.name === 'Copy Link' && copied ? '✅ Copied!'
            : p.name === 'Instagram' && copied ? '📋 Copied — paste in IG'
            : p.name}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <button
        ref={btnRef}
        onClick={toggle}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200"
        style={{
          border: '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)',
          background: open
            ? 'color-mix(in srgb, var(--neon-cyan) 12%, transparent)'
            : 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)',
          color: 'var(--neon-cyan)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 12%, transparent)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)'; }}
        title="Share"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        {!compact && <span className="hidden sm:inline">Share</span>}
      </button>

      {mounted && createPortal(dropdown, document.body)}
    </>
  );
}
