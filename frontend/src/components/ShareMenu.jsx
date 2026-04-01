'use client';

import { useState, useRef, useEffect } from 'react';

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

export default function ShareMenu({ url, text, compact = false }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://gamevesta.com');
  const shareText = text || 'Check out GameVesta — Play. Compete. Win real cash rewards! 🎮';

  useEffect(() => {
    const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleShare = async (platform) => {
    if (platform.name === 'Copy Link') {
      try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      return;
    }
    if (platform.name === 'Instagram') {
      try { await navigator.clipboard.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
      return;
    }
    if (platform.share) {
      window.open(platform.share(shareUrl, shareText), '_blank', 'noopener,noreferrer');
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-200"
        style={{
          border: '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)',
          background: 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)',
          color: 'var(--neon-cyan)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 12%, transparent)'; e.currentTarget.style.boxShadow = '0 0 12px rgba(0,229,255,0.15)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'color-mix(in srgb, var(--neon-cyan) 5%, transparent)'; e.currentTarget.style.boxShadow = 'none'; }}
        title="Share GameVesta"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
        </svg>
        {!compact && <span className="hidden sm:inline">Share</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 py-2 rounded-xl shadow-2xl animate-fade-in-up" style={{
          background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
          minWidth: 200, zIndex: 9999,
        }}>
          <p className="px-4 py-1 text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Share via</p>
          {platforms.map(p => (
            <button key={p.name} onClick={() => handleShare(p)}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-left"
              style={{ color: 'var(--text-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${p.color}12`; e.currentTarget.style.color = p.color; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <span style={{ fontSize: 16 }}>{p.icon}</span>
              {p.name === 'Copy Link' && copied ? '✅ Copied!' : p.name === 'Instagram' && copied ? '📋 Link copied — paste in IG' : p.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
