'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/**
 * Sticky bottom banner for guest users — prompts signup with reward.
 * Hidden on game playing pages (/games/[slug]) and signup/login pages.
 */
export default function SignupBanner() {
  const { isLoggedIn, loading } = useAuth();
  const pathname = usePathname();
  const [reward, setReward] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  // Don't show on game pages, signup, login, or verify-email
  const hiddenPages = /^\/(games\/[^/]+|signup|login|verify-email)/;
  const shouldHide = hiddenPages.test(pathname);

  useEffect(() => {
    if (loading || isLoggedIn || shouldHide) return;
    if (sessionStorage.getItem('gz_banner_dismissed')) {
      setDismissed(true);
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${API}/settings/public`);
        const data = await res.json();
        setReward(Number(data.signupReward) || 0);
      } catch { /* ignore */ }
      // Delay show for smooth entrance
      setTimeout(() => setVisible(true), 800);
    })();
  }, [loading, isLoggedIn, shouldHide]);

  // Hide when user logs in
  useEffect(() => {
    if (isLoggedIn) setVisible(false);
  }, [isLoggedIn]);

  if (loading || isLoggedIn || shouldHide || dismissed) return null;

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => setDismissed(true), 400);
    sessionStorage.setItem('gz_banner_dismissed', '1');
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 9990,
      transform: visible ? 'translateY(0)' : 'translateY(100%)',
      opacity: visible ? 1 : 0,
      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
        borderTop: '1px solid var(--glass-border)',
        backdropFilter: 'blur(16px)',
        padding: '10px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10, flexWrap: 'wrap',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.3)',
      }}>
        {/* Close button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{
            position: 'absolute', top: 8, right: 12,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 16, lineHeight: 1, padding: 4,
          }}
        >✕</button>

        {/* Message */}
        <span style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {reward > 0 ? (
            <>
              🎁 <span>Sign up &amp; get <strong style={{
                background: 'linear-gradient(135deg, #00ff88, var(--neon-cyan))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Rs {reward}</strong> free!</span>
            </>
          ) : (
            <>🎮 <span>Create a free account to earn real money!</span></>
          )}
        </span>

        {/* CTA buttons */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Link href="/signup" style={{
            padding: '6px 16px', borderRadius: 10, textDecoration: 'none',
            fontSize: 12, fontWeight: 700,
            background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
            color: '#fff', whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px color-mix(in srgb, var(--neon-cyan) 25%, transparent)',
          }}>
            Sign Up Free
          </Link>
          <Link href="/login" style={{
            padding: '6px 12px', borderRadius: 10, textDecoration: 'none',
            fontSize: 11, fontWeight: 600,
            color: 'var(--text-muted)', whiteSpace: 'nowrap',
            background: 'var(--subtle-overlay)',
            border: '1px solid var(--subtle-border)',
          }}>
            Already have account? Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
