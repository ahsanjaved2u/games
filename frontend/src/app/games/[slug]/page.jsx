'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GameInstructions from '@/components/GameInstructions';
import EntryFeeModal from '@/components/EntryFeeModal';
import SignupRewardModal from '@/components/SignupRewardModal';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GamePage() {
  const { slug } = useParams();
  const [game, setGame] = useState(null);
  const [error, setError] = useState(null);
  const [started, setStarted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [periodEndsAt, setPeriodEndsAt] = useState(null);
  const [entryStatus, setEntryStatus] = useState(null); // { hasPaid, entryFee, walletBalance }
  const [gameWidth, setGameWidth] = useState(0);
  const iframeRef = useRef(null);
  const { isLoggedIn, authFetch, user, fetchBalance, walletBalance } = useAuth();

  /* Signup reward modal states (for guests) */
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupModalContext, setSignupModalContext] = useState('in-game');
  const [signupReward, setSignupReward] = useState(0);
  const inGamePromptShown = useRef(false);

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

  /* Fetch reward period remaining for rewarding games */
  useEffect(() => {
    if (!game || game.gameType !== 'rewarding') return;
    const pd = (game.rewardPeriodDays || 0) + (game.rewardPeriodHours || 0) + (game.rewardPeriodMinutes || 0);
    if (pd <= 0) return;
    (async () => {
      try {
        const res = await fetch(`${API}/scores/period-remaining/${slug}`);
        const data = await res.json();
        if (data.periodEndsAt) setPeriodEndsAt(new Date(data.periodEndsAt));
      } catch { /* ignore */ }
    })();
  }, [game, slug]);

  /* Check entry fee status for paid games */
  useEffect(() => {
    if (!game || !isLoggedIn) return;
    if (!game.entryFee || game.entryFee <= 0) { setEntryStatus({ hasPaid: true, entryFee: 0 }); return; }
    (async () => {
      try {
        const data = await authFetch(`/entries/${slug}/status`);
        setEntryStatus(data);
      } catch (err) {
        console.error('[entry check]', err.message);
        setEntryStatus({ hasPaid: false, entryFee: game.entryFee });
      }
    })();
  }, [game, slug, isLoggedIn, authFetch]);

  /* Lock body scroll while on this page */
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  /* Fetch signup reward for guest prompt */
  useEffect(() => {
    if (isLoggedIn) return;
    (async () => {
      try {
        const res = await fetch(`${API}/settings/public`);
        const data = await res.json();
        setSignupReward(Number(data.signupReward) || 0);
      } catch { /* ignore */ }
    })();
  }, [isLoggedIn]);

  /* Show signup modal once during gameplay for guests (after 30s) */
  useEffect(() => {
    if (isLoggedIn || !started || inGamePromptShown.current) return;
    const timer = setTimeout(() => {
      if (!inGamePromptShown.current) {
        inGamePromptShown.current = true;
        setSignupModalContext('in-game');
        setShowSignupModal(true);
      }
    }, 30000);
    return () => clearTimeout(timer);
  }, [isLoggedIn, started]);

  /* Fetch leaderboard and send to iframe */
  const sendLeaderboardToIframe = useCallback(async () => {
    if (!game) return;
    try {
      let url = `${API}/scores/leaderboard/${slug}?limit=10`;
      // For rewarding games, fetch leaderboard for the current active period
      if (game.gameType === 'rewarding') {
        try {
          const pRes = await fetch(`${API}/scores/reward-periods/${slug}`);
          if (pRes.ok) {
            const periods = await pRes.json();
            if (Array.isArray(periods)) {
              const active = periods.find(p => p.isActive) || periods[0];
              if (active?.periodStart) url += `&periodStart=${encodeURIComponent(active.periodStart)}`;
            }
          }
        } catch { /* use overall leaderboard as fallback */ }
      }
      const res = await fetch(url);
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
      hasTimeLimit: game.hasTimeLimit || false,
      timeLimitSeconds: game.timeLimitSeconds || 0,
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
        if (!isLoggedIn) {
          // Show signup modal on game over for guests
          setSignupModalContext('game-over');
          setShowSignupModal(true);
          return;
        }
        try {
          const result = await authFetch('/scores', {
            method: 'POST',
            body: JSON.stringify({
              game: slug,
              points: e.data.points,
              time: e.data.time,
              score: e.data.score,
            }),
          });
          // Refresh wallet balance whenever the backend credited a reward
          if (result?.walletCredited) fetchBalance();
          // Update period countdown from response
          if (result?.periodEndsAt) setPeriodEndsAt(new Date(result.periodEndsAt));
          sendLeaderboardToIframe();
        } catch { /* ignore */ }
        return;
      }
      // SDK "Try Again" button was clicked
      if (e.data?.type === 'TRY_AGAIN') {
        if (game?.attemptCost > 0 && game?.gameType === 'rewarding') {
          setStarted(false);
          setIsLoaded(false);
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, authFetch, sendLeaderboardToIframe, sendGameConfig, slug, game]);

  /* Sync top bar width with in-game HUD width */
  useEffect(() => {
    if (!started || !isLoaded) return;
    const syncWidth = () => {
      try {
        const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
        const gc = doc?.getElementById('game-container');
        if (gc) setGameWidth(gc.offsetWidth);
      } catch { /* cross-origin fallback: do nothing, bar stays full-width */ }
    };
    syncWidth();
    window.addEventListener('resize', syncWidth);
    const id = setInterval(syncWidth, 500);
    return () => { window.removeEventListener('resize', syncWidth); clearInterval(id); };
  }, [started, isLoaded]);

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

  /* Period countdown ticker — cyclic: restarts automatically when period ends */
  const [periodTimeLeft, setPeriodTimeLeft] = useState(null);
  useEffect(() => {
    if (!game || game.gameType !== 'rewarding') { setPeriodTimeLeft(null); return; }
    const pd = (game.rewardPeriodDays || 0);
    const ph = (game.rewardPeriodHours || 0);
    const pm = (game.rewardPeriodMinutes || 0);
    const periodMs = (pd * 86400000) + (ph * 3600000) + (pm * 60000);
    if (periodMs <= 0) { setPeriodTimeLeft(null); return; }

    const tick = () => {
      let remaining;
      const anchorMs = game.periodAnchor ? new Date(game.periodAnchor).getTime() : 0;
      if (periodEndsAt) {
        remaining = Math.max(0, periodEndsAt - Date.now());
        if (remaining <= 0) {
          // Period expired — cycle: recalculate from anchor
          setPeriodEndsAt(null);
          const elapsed = Date.now() - anchorMs;
          remaining = periodMs - (elapsed % periodMs);
        }
      } else {
        // No active user period — show cyclic countdown from anchor
        const elapsed = Date.now() - anchorMs;
        remaining = periodMs - (elapsed % periodMs);
      }
      setPeriodTimeLeft({
        d: Math.floor(remaining / 86400000),
        h: Math.floor((remaining % 86400000) / 3600000),
        m: Math.floor((remaining % 3600000) / 60000),
        s: Math.floor((remaining % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game, periodEndsAt]);

  /* Competition countdown ticker — counts down to scheduleEnd for competitive games */
  const [competitionTimeLeft, setCompetitionTimeLeft] = useState(null);
  useEffect(() => {
    if (!game || game.gameType !== 'competitive' || !game.scheduleEnd) { setCompetitionTimeLeft(null); return; }
    const endMs = new Date(game.scheduleEnd).getTime();
    const tick = () => {
      const remaining = Math.max(0, endMs - Date.now());
      if (remaining <= 0) { setCompetitionTimeLeft(null); return; }
      setCompetitionTimeLeft({
        d: Math.floor(remaining / 86400000),
        h: Math.floor((remaining % 86400000) / 3600000),
        m: Math.floor((remaining % 3600000) / 60000),
        s: Math.floor((remaining % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [game]);

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
        <div style={{ width: 40, height: 40, border: '3px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)', borderTop: '3px solid var(--neon-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  const gameSrc = `${GAMES_BASE}/${game.gamePath}/index.html`;

  /* ── Instructions Screen ── */
  if (!started) {
    const needsEntry = isLoggedIn && entryStatus && !entryStatus.hasPaid && game.entryFee > 0;
    const entryLoading = isLoggedIn && game.entryFee > 0 && !entryStatus;

    const handleEntryPaid = async () => {
      const data = await authFetch(`/entries/${slug}/pay`, { method: 'POST' });
      if (data?.success) {
        setEntryStatus({ hasPaid: true, entryFee: game.entryFee, walletBalance: data.balance ?? 0 });
        fetchBalance();
      }
    };

    /* Show loading spinner while checking entry status */
    if (entryLoading) {
      return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 40, height: 40, border: '3px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent)', borderTop: '3px solid var(--neon-cyan)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      );
    }

    /* Show entry fee modal BEFORE instructions for paid games */
    if (needsEntry) {
      return (
        <EntryFeeModal
          entryFee={game.entryFee}
          walletBalance={walletBalance ?? 0}
          gameName={game.name}
          color={game.color}
          onPay={handleEntryPaid}
          periodTimeLeft={periodTimeLeft}
          backHref="/games"
        />
      );
    }

    /* Instructions screen — free game or already paid entry */
    const hasAttemptCost = isLoggedIn && game.attemptCost > 0 && game.gameType === 'rewarding';

    const handleStartClick = () => {
      setStarted(true);
    };

    const handlePayAndPlay = async () => {
      const data = await authFetch(`/entries/${slug}/pay-attempt`, { method: 'POST' });
      if (data?.success) {
        fetchBalance();
        setStarted(true);
      }
    };

    return (
      <GameInstructions
        game={game}
        onStart={handleStartClick}
        attemptCost={hasAttemptCost ? game.attemptCost : 0}
        walletBalance={walletBalance ?? 0}
        onPayAndPlay={hasAttemptCost ? handlePayAndPlay : undefined}
      />
    );
  }

  /* ── Game Screen ── */
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', flexDirection: 'column' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: 36, flexShrink: 0, background: '#0b0b1a',
      }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 10px', width: gameWidth > 0 ? gameWidth : '100%', maxWidth: '100%',
        background: 'linear-gradient(135deg, #0d0d22 0%, #161638 50%, #0d0d22 100%)',
        height: 36,
        position: 'relative', overflow: 'hidden',
        borderLeft: gameWidth > 0 ? '2px solid rgba(0, 255, 255, 0.25)' : 'none',
        borderRight: gameWidth > 0 ? '2px solid rgba(0, 255, 255, 0.25)' : 'none',
        borderTop: gameWidth > 0 ? '2px solid rgba(0, 255, 255, 0.25)' : 'none',
        borderBottom: gameWidth > 0 ? 'none' : '1px solid rgba(0,229,255,0.15)',
        borderRadius: gameWidth > 0 ? '12px 12px 0 0' : 0,
      }}>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${game.color || '#00e5ff'}60 30%, rgba(168,85,247,0.4) 70%, transparent)` }} />

        <Link href="/games" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--subtle-border)', transition: 'all 0.2s', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1, minWidth: 0 }}>
          {periodTimeLeft && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: '#ffd93d', fontVariantNumeric: 'tabular-nums',
              padding: '2px 10px', borderRadius: 20,
              background: 'rgba(255,217,61,0.08)', border: '1px solid rgba(255,217,61,0.18)',
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>⏱</span>
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Session ends & best score freezes in</span>
              {periodTimeLeft.d > 0 ? `${periodTimeLeft.d}d ` : ''}{String(periodTimeLeft.h).padStart(2, '0')}:{String(periodTimeLeft.m).padStart(2, '0')}:{String(periodTimeLeft.s).padStart(2, '0')}
            </span>
          )}
          {competitionTimeLeft && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--neon-cyan)', fontVariantNumeric: 'tabular-nums',
              padding: '2px 10px', borderRadius: 20,
              background: 'color-mix(in srgb, var(--neon-cyan) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-cyan) 15%, transparent)',
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>🏆</span>
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Ends in</span>
              {competitionTimeLeft.d > 0 ? `${competitionTimeLeft.d}d ` : ''}{String(competitionTimeLeft.h).padStart(2, '0')}:{String(competitionTimeLeft.m).padStart(2, '0')}:{String(competitionTimeLeft.s).padStart(2, '0')}
            </span>
          )}
        </div>

        <button onClick={toggleFullscreen} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--subtle-border)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
          {isFullscreen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
          )}
        </button>
      </div>
      </div>

      {/* Loading overlay */}
      {!isLoaded && (
        <div style={{ position: 'absolute', inset: 0, top: 36, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0b0b1a', zIndex: 10, gap: 16 }}>
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0,229,255,0.2)', borderTop: `3px solid ${game.color || '#00e5ff'}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Loading game...</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
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

      {/* Signup reward modal for guests */}
      {!isLoggedIn && (
        <SignupRewardModal
          show={showSignupModal}
          rewardAmount={signupReward}
          onClose={() => { setShowSignupModal(false); setTimeout(() => iframeRef.current?.focus(), 100); }}
          context={signupModalContext}
        />
      )}
    </div>
  );
}
