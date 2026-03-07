'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GameInstructions from '@/components/GameInstructions';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GamePage() {
  const { slug } = useParams();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const { isLoggedIn, authFetch, user } = useAuth();

  /* Fetch game metadata */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/games/${slug}`);
        if (!res.ok) { setError('Game not found'); return; }
        setGame(await res.json());
      } catch { setError('Failed to load game'); }
    })();
  }, [slug]);

  /* Lock body scroll while on this page */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Fetch leaderboard and send to iframe */
  const sendLeaderboardToIframe = useCallback(async () => {
    if (!game) return;
    try {
      const res = await fetch(`${API}/scores/leaderboard/${slug}?limit=10`);
      if (!res.ok) return;
      const data = await res.json();
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'LEADERBOARD_DATA', entries: data, playerName: user?.name || '' },
          '*'
        );
      }
    } catch { /* ignore */ }
  }, [slug, user?.name, game]);

  /* Send game config (conversionRate etc.) to iframe */
  const sendGameConfig = useCallback(() => {
    if (!game || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'GAME_CONFIG',
      conversionRate: game.conversionRate || 0,
      showCurrency: game.showCurrency || false,
    }, '*');
  }, [game]);

  /* Listen for messages from iframe */
  useEffect(() => {
    const handleMessage = async (e) => {
      if (e.data?.type === 'REQUEST_LEADERBOARD') {
        sendLeaderboardToIframe();
        return;
      }
      if (e.data?.type === 'REQUEST_GAME_CONFIG') {
        sendGameConfig();
        return;
      }
      if (e.data?.type === 'GAME_OVER') {
        if (!isLoggedIn) return;
        try {
          await authFetch('/scores', {
            method: 'POST',
            body: JSON.stringify({
              game: slug,
              points: e.data.points,
              time: e.data.time,
              score: e.data.score,
            }),
          });
          sendLeaderboardToIframe();
        } catch { /* ignore */ }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, authFetch, sendLeaderboardToIframe, sendGameConfig, slug]);

  /* Block scrolling keys */
  useEffect(() => {
    if (!started) return;
    const blockKeys = (e) => {
      if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault();
    };
    window.addEventListener('keydown', blockKeys, { passive: false });
    return () => window.removeEventListener('keydown', blockKeys);
  }, [started]);

  const focusGame = useCallback(() => { iframeRef.current?.focus(); }, []);

  /* Fullscreen */
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

  /* ── Loading / Error states ── */
  if (error) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
        <p style={{ color: '#ff5c8a', fontSize: 18, fontWeight: 700 }}>{error}</p>
        <Link href="/games" style={{ color: 'var(--neon-cyan)', textDecoration: 'underline', fontSize: 14 }}>← Back to Games</Link>
      </div>
    );
  }

  if (!game) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid rgba(0,229,255,0.2)', borderTop: '3px solid #00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const gameSrc = `${GAMES_BASE}/${game.gamePath}/index.html`;

  /* ── Instructions Screen ── */
  if (!started) {
    return <GameInstructions game={game} onStart={() => setStarted(true)} />;
  }

  /* ── Game Screen ── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 14px',
        background: 'linear-gradient(135deg, #0d0d22 0%, #161638 40%, #1a1040 70%, #0d0d22 100%)',
        borderBottom: '1px solid rgba(0,229,255,0.2)', minHeight: 46, flexShrink: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${game.color || '#00e5ff'}80 30%, rgba(168,85,247,0.5) 70%, transparent)` }} />

        <Link href="/games" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', transition: 'all 0.2s' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, filter: `drop-shadow(0 0 6px ${game.color || '#00e5ff'}90)` }}>🎮</span>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '1px',
            background: `linear-gradient(90deg, ${game.color || '#00e5ff'}, #a855f7, ${game.color || '#00e5ff'})`,
            backgroundSize: '200% 100%', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            animation: 'titleShimmer 3s linear infinite',
          }}>{game.name}</span>
        </div>

        <button onClick={toggleFullscreen} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', transition: 'all 0.2s' }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          )}
        </button>
      </div>

      {/* Loading overlay */}
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, top: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b1a', zIndex: 10, gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0,229,255,0.2)', borderTop: `3px solid ${game.color || '#00e5ff'}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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
        src={gameSrc}
        onLoad={() => { setIsLoaded(true); focusGame(); sendLeaderboardToIframe(); sendGameConfig(); }}
        onClick={focusGame}
        style={{ flex: 1, width: '100%', border: 'none', background: '#0b0b1a' }}
        allow="autoplay; fullscreen"
        title={game.name}
        tabIndex={0}
      />
    </div>
  );
}
