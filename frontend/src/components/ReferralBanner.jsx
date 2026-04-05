'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function ReferralBanner() {
  const { isLoggedIn, user, token } = useAuth();
  // null = loading, true = show, false = hidden
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || !user?.id || !token) { setShow(false); return; }

    // Dismissed today? (resets daily so we gently re-remind)
    const key = `gv_ref_banner_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const dismissedAt = Number(stored);
      const hoursAgo = (Date.now() - dismissedAt) / 3600000;
      if (hoursAgo < 24) { setShow(false); return; }
      // It's been over 24h — clear stale entry and re-evaluate
      localStorage.removeItem(key);
    }

    // Only show if user has no active referrals yet (nothing to remind about if they already refer)
    (async () => {
      try {
        const res = await fetch(`${API}/referrals/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const activeCount = data.referrals?.filter(r => r.status === 'active').length ?? 0;
        setShow(activeCount === 0);
      } catch {
        setShow(true); // API failed — show anyway
      }
    })();
  }, [isLoggedIn, user?.id, token]);

  const dismiss = () => {
    setShow(false);
    if (user?.id) localStorage.setItem(`gv_ref_banner_${user.id}`, String(Date.now()));
  };

  if (!show) return null;

  return (
    <div className="relative overflow-hidden animate-fade-in-up" style={{
      background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(0,229,255,0.08), rgba(255,45,120,0.06))',
      borderBottom: '1px solid rgba(168,85,247,0.2)',
    }}>
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-2 relative pr-12">
        <span className="text-base shrink-0">🤝</span>
        <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
          <span className="font-bold" style={{ color: 'var(--neon-purple)' }}>Invite friends</span>
          <span className="hidden sm:inline" style={{ color: 'var(--text-primary)' }}> &amp; earn rewards!</span>
          {' '}
          <span className="hidden sm:inline" style={{ color: 'var(--text-muted)' }}>Get bonus PKR when your referrals play.</span>
          <span className="sm:hidden" style={{ color: 'var(--text-muted)' }}>&amp; earn real money</span>
        </p>
        <Link
          href="/referrals"
          onClick={dismiss}
          className="shrink-0 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(0,229,255,0.15))',
            border: '1px solid rgba(168,85,247,0.3)',
            color: 'var(--neon-purple)',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          Invite →
        </Link>
        <button
          onClick={dismiss}
          className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-all"
          style={{
            color: 'var(--text-muted)',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >✕</button>
      </div>
    </div>
  );
}
