/**
 * Legacy static route — the dynamic [slug] page handles bubble-shooter now.
 * This file re-exports the dynamic page with the slug hardcoded for backward compat.
 */
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SLUG = 'bubble-shooter';

export default function BubbleShooterPage() {
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef(null);
  const { isLoggedIn, authFetch, user, fetchBalance } = useAuth();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/games/${SLUG}`);
        if (!res.ok) { setError('Game not found'); return; }
        setGame(await res.json());
      } catch { setError('Failed to load game'); }
    })();
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sendLeaderboardToIframe = useCallback(async () => {
    if (!game) return;
    try {
      const res = await fetch(`${API}/scores/leaderboard/${SLUG}?limit=10`);
      if (!res.ok) return;
      const data = await res.json();
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          { type: 'LEADERBOARD_DATA', entries: data, playerName: user?.name || '' }, '*'
        );
      }
    } catch { /* ignore */ }
  }, [user?.name, game]);

  const sendGameConfig = useCallback(() => {
    if (!game || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'GAME_CONFIG',
      conversionRate: game.conversionRate || 0,
      showCurrency: game.showCurrency || false,
      hasTimeLimit: game.hasTimeLimit || false,
      timeLimitSeconds: game.timeLimitSeconds || 0,
    }, '*');
  }, [game]);

  useEffect(() => {
    const handleMessage = async (e) => {
      if (e.data?.type === 'REQUEST_LEADERBOARD') { sendLeaderboardToIframe(); return; }
      if (e.data?.type === 'REQUEST_GAME_CONFIG') { sendGameConfig(); return; }
      if (e.data?.type === 'GAME_OVER') {
        if (!isLoggedIn) return;
        try {
          await authFetch('/scores', {
            method: 'POST',
            body: JSON.stringify({ game: e.data.game || SLUG, points: e.data.points, time: e.data.time, score: e.data.score }),
          });
          sendLeaderboardToIframe();
          fetchBalance();
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, authFetch, sendLeaderboardToIframe, sendGameConfig, fetchBalance]);

  useEffect(() => {
    if (!started) return;
    const blockKeys = (e) => { if ([' ', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); };
    window.addEventListener('keydown', blockKeys, { passive: false });
    return () => window.removeEventListener('keydown', blockKeys);
  }, [started]);

  const focusGame = useCallback(() => { iframeRef.current?.focus(); }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

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
  const thumbSrc = game.thumbnail ? `${GAMES_BASE}/${game.gamePath}/${game.thumbnail}` : null;
  const instructions = game.instructions || [];

  if (!started) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', flexDirection: 'column' }}>
        {thumbSrc && <Image src={thumbSrc} alt="" fill className="object-cover" style={{ opacity: 0.18 }} priority />}
        <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${game.color || '#00e5ff'}20, transparent 70%)`, top: '-60px', right: '-40px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.10), transparent 70%)', bottom: '10%', left: '-30px', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 20px 16px', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ width: '100%', maxWidth: 480, marginBottom: 10 }}>
            <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'var(--subtle-border)', border: '1px solid var(--subtle-border)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
              Back
            </Link>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 38, display: 'block', marginBottom: 4, filter: 'drop-shadow(0 0 18px rgba(0,229,255,0.5))' }}>🫧</span>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 3px', textShadow: '0 0 20px rgba(0,229,255,0.35)' }}>{game.name}</h1>
            {game.description && <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: 0 }}>{game.description}</p>}
          </div>
          {instructions.length > 0 && (
            <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {instructions.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 12, background: 'var(--subtle-overlay)', border: '1px solid var(--subtle-border)', backdropFilter: 'blur(6px)', animation: `fadeSlideIn 0.35s ease-out ${i * 0.07}s both` }}>
                  <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 0 8px rgba(0,229,255,0.3))' }}>{item.icon}</span>
                  <div>
                    <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{item.title}</h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          <button onClick={() => setStarted(true)} style={{
            marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', maxWidth: 500, padding: '15px 24px', borderRadius: 14,
            fontSize: 17, fontWeight: 800, letterSpacing: '0.5px', color: '#fff', cursor: 'pointer',
            background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))', border: 'none',
            boxShadow: '0 0 30px rgba(0,229,255,0.25), 0 4px 20px rgba(0,0,0,0.4)',
            transition: 'transform 0.15s, box-shadow 0.2s',
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            <span style={{ fontSize: 22 }}>▶</span> Start Game
          </button>
          <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>Best on mobile in portrait mode</p>
        </div>
        <style>{`@keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px',
        background: 'linear-gradient(135deg, #0d0d22 0%, #161638 40%, #1a1040 70%, #0d0d22 100%)',
        borderBottom: '1px solid rgba(0,229,255,0.2)', minHeight: 46, flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.5) 30%, rgba(168,85,247,0.5) 70%, transparent)' }} />
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-primary)', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'var(--subtle-border)', border: '1px solid var(--input-border)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          Back
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(0,229,255,0.6))' }}>🫧</span>
          <span style={{
            fontSize: 15, fontWeight: 800, letterSpacing: '1px',
            background: 'linear-gradient(90deg, var(--neon-cyan), var(--neon-purple), var(--neon-cyan))', backgroundSize: '200% 100%',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'titleShimmer 3s linear infinite',
          }}>{game.name}</span>
        </div>
        <button onClick={toggleFullscreen} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8, background: 'var(--subtle-border)', border: '1px solid var(--input-border)', cursor: 'pointer' }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          )}
        </button>
      </div>
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, top: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b1a', zIndex: 10, gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0,229,255,0.2)', borderTop: '3px solid #00e5ff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading game...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } } @keyframes titleShimmer { to { background-position: -200% 0 } }`}</style>
        </div>
      )}
      <iframe ref={iframeRef} src={gameSrc} onLoad={() => { setIsLoaded(true); focusGame(); sendLeaderboardToIframe(); sendGameConfig(); }} onClick={focusGame}
        style={{ flex: 1, width: '100%', border: 'none', background: '#0b0b1a' }} allow="autoplay; fullscreen" title={game.name} tabIndex={0} />
    </div>
  );
}
