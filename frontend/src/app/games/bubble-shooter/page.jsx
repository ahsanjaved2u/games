'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

/* ── Instruction steps ── */
const instructions = [
  { icon: '🎯', title: 'Aim & Shoot', text: 'Tap or click anywhere on screen to shoot bubbles in that direction.' },
  { icon: '💥', title: 'Pop Bubbles', text: 'Hit the falling neon bricks to reduce their strength. When it reaches 0 — pop!' },
  { icon: '🛡️', title: 'Collect Shields', text: 'A shield power-up appears every 50 points. Grab it for 5 seconds of protection.' },
  { icon: '⚡', title: 'Upgrade Strength', text: 'Your bullet strength grows as you score. Stronger bullets break bricks faster.' },
  { icon: '⏱️', title: 'Survive', text: 'Bricks keep coming! If any brick reaches the bottom, game over.' },
];

export default function BubbleShooterPage() {
  const [started, setStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const { isLoggedIn, authFetch, user } = useAuth();

  /* Lock body scroll while on this page */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Fetch leaderboard and send to iframe */
  const sendLeaderboardToIframe = useCallback(async () => {
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API}/scores/leaderboard/bubble-shooter?limit=10`);
      if (!res.ok) return;
      const data = await res.json();
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'LEADERBOARD_DATA', entries: data, playerName: user?.name || '' },
          '*'
        );
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  }, []);

  /* Listen for messages from iframe (GAME_OVER + REQUEST_LEADERBOARD) */
  useEffect(() => {
    const handleMessage = async (e) => {
      // Handle leaderboard data request from game
      if (e.data?.type === 'REQUEST_LEADERBOARD') {
        sendLeaderboardToIframe();
        return;
      }

      // Handle game over — save score then send updated leaderboard
      if (e.data?.type === 'GAME_OVER') {
        if (!isLoggedIn) return;
        try {
          await authFetch('/scores', {
            method: 'POST',
            body: JSON.stringify({
              game: e.data.game,
              points: e.data.points,
              time: e.data.time,
              score: e.data.score,
            }),
          });
          // After saving, send updated leaderboard back to game
          sendLeaderboardToIframe();
        } catch (err) {
          console.error('Failed to save score:', err);
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, authFetch, sendLeaderboardToIframe]);

  /* Block spacebar / arrow keys from scrolling the parent when game is active */
  useEffect(() => {
    if (!started) return;
    const blockKeys = (e) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', blockKeys, { passive: false });
    return () => window.removeEventListener('keydown', blockKeys);
  }, [started]);

  /* Focus iframe when game loads so it receives all keyboard input */
  const focusGame = useCallback(() => {
    if (iframeRef.current) {
      iframeRef.current.focus();
    }
  }, []);

  /* Fullscreen helpers */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  /* ────────────────────────────── Instructions Screen ────────────────────────────── */
  if (!started) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0b0b1a',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Background image */}
        <Image
          src="/games/bubble-shooter/images/background.png"
          alt=""
          fill
          className="object-cover"
          style={{ opacity: 0.18 }}
          priority
        />

        {/* Glow accents */}
        <div style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,255,0.12), transparent 70%)',
          top: '-60px', right: '-40px', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 200, height: 200, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.10), transparent 70%)',
          bottom: '10%', left: '-30px', pointerEvents: 'none',
        }} />

        {/* Content */}
        <div style={{
          position: 'relative', zIndex: 2,
          flex: 1, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '14px 20px 16px',
          WebkitOverflowScrolling: 'touch',
        }}>
          {/* Back link */}
          <div style={{ width: '100%', maxWidth: 480, marginBottom: 10 }}>
            <Link href="/" style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
              fontSize: 13, fontWeight: 600, padding: '6px 14px',
              borderRadius: 8, background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
              Back
            </Link>
          </div>

          {/* Title area */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 38, display: 'block', marginBottom: 4, filter: 'drop-shadow(0 0 18px rgba(0,229,255,0.5))' }}>🫧</span>
            <h1 style={{
              fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 3px',
              textShadow: '0 0 20px rgba(0,229,255,0.35)',
            }}>
              Neon Bubble Shooter
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '0.3px' }}>
              Learn the basics, then jump in!
            </p>
          </div>

          {/* Instructions */}
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {instructions.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '10px 16px', borderRadius: 12,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(6px)',
                animation: `fadeSlideIn 0.35s ease-out ${i * 0.07}s both`,
              }}>
                <span style={{
                  fontSize: 26, lineHeight: 1, flexShrink: 0,
                  filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.3))',
                }}>
                  {item.icon}
                </span>
                <div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>
                    {item.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Start button */}
          <button
            onClick={() => setStarted(true)}
            style={{
              marginTop: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', maxWidth: 500,
              padding: '15px 24px', borderRadius: 14,
              fontSize: 17, fontWeight: 800, letterSpacing: '0.5px',
              color: '#fff', cursor: 'pointer',
              background: 'linear-gradient(135deg, #00e5ff 0%, #00b0ff 50%, #a855f7 100%)',
              border: 'none',
              boxShadow: '0 0 30px rgba(0,229,255,0.25), 0 4px 20px rgba(0,0,0,0.4)',
              transition: 'transform 0.15s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.03)';
              e.currentTarget.style.boxShadow = '0 0 40px rgba(0,229,255,0.4), 0 6px 28px rgba(0,0,0,0.5)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 30px rgba(0,229,255,0.25), 0 4px 20px rgba(0,0,0,0.4)';
            }}
          >
            <span style={{ fontSize: 22 }}>▶</span>
            Start Game
          </button>

          <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
            Best on mobile in portrait mode
          </p>
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ──────────────────────────────── Game Screen ──────────────────────────────── */
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      background: '#0b0b1a',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 14px',
        background: 'linear-gradient(135deg, #0d0d22 0%, #161638 40%, #1a1040 70%, #0d0d22 100%)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.2)',
        minHeight: 46,
        flexShrink: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated shimmer line */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5) 30%, rgba(168,85,247,0.5) 70%, transparent)',
        }} />

        <Link href="/" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          color: 'rgba(255,255,255,0.7)', textDecoration: 'none',
          fontSize: 13, fontWeight: 600, padding: '6px 12px',
          borderRadius: 8, background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.6))' }}>🫧</span>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '1px',
            background: 'linear-gradient(90deg, #00e5ff, #a855f7, #00e5ff)',
            backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'titleShimmer 3s linear infinite',
            textShadow: 'none',
          }}>
            Neon Bubble Shooter
          </span>
        </div>

        <button
          onClick={toggleFullscreen}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600,
            padding: '6px 12px', borderRadius: 8,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/>
              <line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
              <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
            </svg>
          )}
        </button>
      </div>

      {/* Loading overlay */}
      {!isLoaded && (
        <div style={{
          position: 'absolute', inset: 0, top: 44,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#0b0b1a', zIndex: 10, gap: 16,
        }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(0,229,255,0.2)',
            borderTop: '3px solid #00e5ff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Loading game...</span>
          <style>{`
            @keyframes spin { to { transform: rotate(360deg) } }
            @keyframes titleShimmer { to { background-position: -200% 0 } }
          `}</style>
        </div>
      )}

      {/* Game iframe */}
      <iframe
        ref={iframeRef}
        src="/games/bubble-shooter/index.html"
        onLoad={() => { setIsLoaded(true); focusGame(); sendLeaderboardToIframe(); }}
        onClick={focusGame}
        style={{ flex: 1, width: '100%', border: 'none', background: '#0b0b1a' }}
        allow="autoplay; fullscreen"
        title="Neon Bubble Shooter"
        tabIndex={0}
      />
    </div>
  );
}
