'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * SignupRewardModal — gorgeous full-screen overlay prompting guests to sign up.
 * Shows reward amount if > 0, or just a generic "Join us" message otherwise.
 *
 * Props:
 *  - show: boolean — whether to render
 *  - rewardAmount: number — PKR reward (0 = no reward messaging)
 *  - onClose: () => void — "Continue as Guest" handler
 *  - context: 'first-visit' | 'in-game' | 'game-over'
 */
export default function SignupRewardModal({ show, rewardAmount = 0, onClose, context = 'first-visit' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      // Small delay for mount animation
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [show]);

  if (!show) return null;

  const hasReward = rewardAmount > 0;

  const subtitle = context === 'game-over'
    ? 'Save your score, earn real money & withdraw anytime!'
    : context === 'in-game'
    ? 'Your scores can earn you real cash — sign up to claim!'
    : 'Play games, win real money & withdraw to your wallet!';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: visible ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0)',
        backdropFilter: visible ? 'blur(8px)' : 'blur(0px)',
        transition: 'all 0.4s ease',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'relative',
          width: '100%', maxWidth: 380,
          borderRadius: 24,
          overflow: 'hidden',
          transform: visible ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(30px)',
          opacity: visible ? 1 : 0,
          transition: 'transform 0.5s cubic-bezier(0.16, 1.11, 0.36, 1), opacity 0.4s ease',
        }}
      >
        {/* Background gradient card */}
        <div style={{
          background: 'linear-gradient(145deg, var(--bg-card) 0%, var(--bg-secondary) 100%)',
          border: '1px solid var(--glass-border)',
          borderRadius: 24,
          padding: '32px 24px 24px',
          position: 'relative',
        }}>
          {/* Top glow accent */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 200, height: 3,
            background: 'var(--accent-gradient, linear-gradient(90deg, var(--neon-cyan), var(--neon-purple)))',
            borderRadius: '0 0 4px 4px',
          }} />

          {/* Decorative floating orbs */}
          <div style={{
            position: 'absolute', top: -20, right: -20, width: 80, height: 80,
            borderRadius: '50%', background: 'var(--neon-cyan)', opacity: 0.06, filter: 'blur(20px)',
          }} />
          <div style={{
            position: 'absolute', bottom: -15, left: -15, width: 60, height: 60,
            borderRadius: '50%', background: 'var(--neon-purple)', opacity: 0.06, filter: 'blur(16px)',
          }} />

          {/* Gift icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: '0 auto 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: hasReward
              ? 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.15))'
              : 'linear-gradient(135deg, color-mix(in srgb, var(--neon-cyan) 15%, transparent), color-mix(in srgb, var(--neon-purple) 15%, transparent))',
            border: hasReward
              ? '1px solid rgba(0,255,136,0.2)'
              : '1px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)',
            fontSize: 28,
          }}>
            {hasReward ? '🎁' : '🎮'}
          </div>

          {/* Main text */}
          <h2 style={{
            textAlign: 'center', fontSize: 20, fontWeight: 800,
            color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3,
          }}>
            {hasReward ? 'Sign Up & Get Rewarded!' : 'Join GameZone!'}
          </h2>

          {hasReward && (
            <div style={{
              textAlign: 'center', margin: '12px auto 4px',
              padding: '10px 20px', borderRadius: 16, display: 'inline-flex',
              alignItems: 'center', gap: 8, justifyContent: 'center', width: '100%',
              background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,229,255,0.08))',
              border: '1px solid rgba(0,255,136,0.15)',
            }}>
              <span style={{ fontSize: 22 }}>💰</span>
              <span style={{
                fontSize: 22, fontWeight: 900,
                background: 'linear-gradient(135deg, #00ff88, var(--neon-cyan))',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>
                PKR {rewardAmount}
              </span>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
                Free Bonus!
              </span>
            </div>
          )}

          <p style={{
            textAlign: 'center', fontSize: 13, color: 'var(--text-muted)',
            marginTop: 10, marginBottom: 20, lineHeight: 1.5,
          }}>
            {subtitle}
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link href="/signup" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 20px', borderRadius: 14, textDecoration: 'none',
              fontWeight: 700, fontSize: 14,
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              color: '#fff', border: 'none', cursor: 'pointer',
              boxShadow: '0 4px 20px color-mix(in srgb, var(--neon-cyan) 30%, transparent)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 28px color-mix(in srgb, var(--neon-cyan) 40%, transparent)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px color-mix(in srgb, var(--neon-cyan) 30%, transparent)'; }}
            >
              ✨ Sign Up {hasReward ? `& Claim PKR ${rewardAmount}` : 'Now'}
            </Link>

            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '11px 20px', borderRadius: 14,
                fontWeight: 600, fontSize: 13,
                background: 'var(--subtle-overlay)',
                color: 'var(--text-muted)', border: '1px solid var(--subtle-border)',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--input-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--subtle-overlay)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              Continue as Guest
            </button>
          </div>

          {/* Already have account link */}
          <p style={{
            textAlign: 'center', fontSize: 12, color: 'var(--text-muted)',
            marginTop: 14,
          }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--neon-cyan)', fontWeight: 600, textDecoration: 'none' }}>
              Log In
            </Link>
          </p>
        </div>
      </div>

      {/* Keyframes for pulse animation on reward badge */}
      <style>{`
        @keyframes rewardPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </div>
  );
}
