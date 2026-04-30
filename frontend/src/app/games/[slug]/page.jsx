// ══════════════════════════════════════════════════════════════════════════════
//  GAME PAGE — Contest vs Session mode routing & HUD configuration
//
//  MODE DETECTION (contest vs session):
//    1. URL query params take priority: ?contestId=X → contest mode, ?sessionId=X → session mode.
//    2. If no query param, auto-detect: contest takes priority over session.
//    3. The resolved mode is stored in `gameMode` ('contest' | 'session' | null).
//
//  GAME_CONFIG sent to iframe HUD (via postMessage):
//    - mode: 'contest' | 'session' | null
//    - conversionRate: forced to 0 in contest mode (no PKR display). In session mode, uses session's value.
//    - showCurrency: forced to false in contest mode. In session mode, uses session's value.
//    - hasTimeLimit, timeLimitSeconds: from the active contest or session.
//
//  SCORE SUBMISSION:
//    - Sends ONLY contestId OR sessionId, never both. Contest takes priority.
//    - If walletCredited comes back true (session only), triggers confetti + balance refresh.
//
//  COUNTDOWN LABEL:
//    - Contest: "Contest ends in X:XX"
//    - Session: "Session ends & best score freezes in X:XX"
//
//  ENTRY FEE / ATTEMPT COST:
//    - entryFee: from contest or session (one-time gate to play).
//    - attemptCost: session-only (deducted per "Try Again").
// ══════════════════════════════════════════════════════════════════════════════

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import GameInstructions from '@/components/GameInstructions';
import EntryFeeModal from '@/components/EntryFeeModal';
import SignupRewardModal from '@/components/SignupRewardModal';
import Confetti from '@/components/Confetti';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GamePage() {
  const { slug } = useParams();
  const searchParams = useSearchParams();
  const qsContestId = searchParams.get('contestId');
  const qsSessionId = searchParams.get('sessionId');
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

  /* iOS Safari does not support the Fullscreen API. Detect iPhone (not in
     standalone PWA mode) so we can show a one-time hint to "Add to Home
     Screen" for true fullscreen. */
  const [showIosHint, setShowIosHint] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isIPhone = /iPhone|iPod/.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
    const isStandalone = window.navigator.standalone === true
      || window.matchMedia?.('(display-mode: standalone)')?.matches;
    if (isIPhone && !isStandalone) {
      try {
        if (!localStorage.getItem('iosFullscreenHintSeen')) setShowIosHint(true);
      } catch { /* localStorage may be blocked */ }
    }
  }, []);
  const dismissIosHint = useCallback(() => {
    setShowIosHint(false);
    try { localStorage.setItem('iosFullscreenHintSeen', '1'); } catch {}
  }, []);

  /* Signup reward modal states (for guests) */
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupModalContext, setSignupModalContext] = useState('in-game');
  const [signupReward, setSignupReward] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const inGamePromptShown = useRef(false);

  /* ── Derive active contest / session from backend data ── */
  // URL query param determines which mode (contest vs session).
  // If query param is present, use ONLY that mode.
  // If no query param, fall back to whichever is available (contest priority).
  const _activeContest = game?.contests?.find(c =>
    c.status === 'live' ||
    (c.status === 'scheduled' && new Date(c.startDate) <= new Date() && new Date(c.endDate) > new Date())
  ) || null;
  const _activeSession = game?.sessions?.find(s => s.isActive) || null;

  // Mode selection: query param overrides auto-detection
  const gameMode = qsContestId ? 'contest' : qsSessionId ? 'session'
    : _activeContest ? 'contest' : _activeSession ? 'session' : null;
  const activeContest = gameMode === 'contest' ? (
    qsContestId ? (game?.contests?.find(c => c._id === qsContestId) || _activeContest) : _activeContest
  ) : null;
  const activeSession = gameMode === 'session' ? (
    qsSessionId ? (game?.sessions?.find(s => s._id === qsSessionId) || _activeSession) : _activeSession
  ) : null;

  const ctx = activeContest || activeSession || {};
  const contestId = activeContest?._id || null;
  const sessionId = activeSession?._id || null;
  const entryFee = ctx.entryFee || 0;
  const attemptCost = activeSession?.attemptCost || 0;
  const color = ctx.color || game?.color || '#00e5ff';
  const derivedInstructions = ctx.instructions?.length ? ctx.instructions : [];
  const hasTimeLimit = ctx.hasTimeLimit || false;
  const timeLimitSeconds = ctx.timeLimitSeconds || 0;
  const conversionRate = activeSession?.conversionRate || 0;
  const showCurrency = activeSession?.showCurrency || false;

  /* Fetch game metadata */
  const fetchGame = useCallback(async () => {
    try {
      const res = await fetch(`${API}/games/${slug}`);
      if (!res.ok) { setError('Game not found'); return; }
      setGame(await res.json());
    } catch { setError('Failed to load game'); }
  }, [slug]);

  useEffect(() => { fetchGame(); }, [fetchGame]);

  /* Auto re-fetch game when a scheduled contest should go live */
  useEffect(() => {
    if (!game) return;
    const scheduled = game.contests?.find(c => c.status === 'scheduled' && new Date(c.startDate) > new Date());
    if (!scheduled) return;
    const delay = Math.max(0, new Date(scheduled.startDate) - Date.now()) + 1000;
    const timer = setTimeout(fetchGame, delay);
    return () => clearTimeout(timer);
  }, [game, fetchGame]);

  /* Fetch session period remaining */
  useEffect(() => {
    if (!activeSession || !sessionId) return;
    (async () => {
      try {
        const res = await fetch(`${API}/scores/period-remaining/${slug}?sessionId=${sessionId}`);
        const data = await res.json();
        if (data.periodEndsAt) setPeriodEndsAt(new Date(data.periodEndsAt));
      } catch { /* ignore */ }
    })();
  }, [activeSession, sessionId, slug]);

  /* Check entry fee status */
  useEffect(() => {
    if (!game || !isLoggedIn) return;
    if (entryFee <= 0) { setEntryStatus({ hasPaid: true, entryFee: 0 }); return; }
    const qs = contestId ? `?contestId=${contestId}` : sessionId ? `?sessionId=${sessionId}` : '';
    (async () => {
      try {
        const data = await authFetch(`/entries/${slug}/status${qs}`);
        setEntryStatus(data);
      } catch (err) {
        console.error('[entry check]', err.message);
        setEntryStatus({ hasPaid: false, entryFee });
      }
    })();
  }, [game, slug, isLoggedIn, authFetch, entryFee, contestId, sessionId]);

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
      if (contestId) url += `&contestId=${contestId}`;
      else if (sessionId) {
        url += `&sessionId=${sessionId}`;
        try {
          const pRes = await fetch(`${API}/scores/reward-periods/${slug}?sessionId=${sessionId}`);
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
  }, [slug, user?.name, game, contestId, sessionId]);

  /* Send game config to iframe */
  const sendGameConfig = useCallback(() => {
    if (!game || !iframeRef.current?.contentWindow) return;
    iframeRef.current.contentWindow.postMessage({
      type: 'GAME_CONFIG',
      mode: gameMode,                             // 'contest' | 'session' | null
      conversionRate: gameMode === 'contest' ? 0 : conversionRate,
      showCurrency: gameMode === 'contest' ? false : showCurrency,
      hasTimeLimit,
      timeLimitSeconds,
    }, '*');
  }, [game, gameMode, conversionRate, showCurrency, hasTimeLimit, timeLimitSeconds]);

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
              // Contest (competition) and Session (rewarding) are mutually exclusive.
              // If a contest is active, send ONLY contestId — no session rewards.
              ...(contestId ? { contestId } : sessionId ? { sessionId } : {}),
            }),
          });
          // Refresh wallet balance whenever the backend credited a reward
          if (result?.walletCredited) {
            fetchBalance();
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3500);
          }
          // Update period countdown from response
          if (result?.periodEndsAt) setPeriodEndsAt(new Date(result.periodEndsAt));
          sendLeaderboardToIframe();
        } catch (err) {
          console.error('Score submit failed:', err.message);
        }
        return;
      }
      // SDK "Try Again" button was clicked
      if (e.data?.type === 'TRY_AGAIN') {
        if (attemptCost > 0 && activeSession) {
          setStarted(false);
          setIsLoaded(false);
        }
        return;
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isLoggedIn, authFetch, sendLeaderboardToIframe, sendGameConfig, slug, game, contestId, sessionId, attemptCost, activeSession]);

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

    // Use ResizeObserver if we can access the iframe document (same-origin)
    let ro;
    try {
      const doc = iframeRef.current?.contentDocument || iframeRef.current?.contentWindow?.document;
      const gc = doc?.getElementById('game-container');
      if (gc) {
        ro = new ResizeObserver(() => syncWidth());
        ro.observe(gc);
      }
    } catch { /* cross-origin: rely on window resize only */ }

    return () => {
      window.removeEventListener('resize', syncWidth);
      if (ro) ro.disconnect();
    };
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
  // Cross-browser helpers. Wrapped in try/catch + Promise.resolve so that
  // browsers without Fullscreen API (e.g. iOS Safari iPhone) never throw —
  // the game just runs without fullscreen, without disturbing the app.
  const enterFullscreen = useCallback(() => {
    try {
      const el = document.documentElement;
      const req = el.requestFullscreen
        || el.webkitRequestFullscreen
        || el.webkitRequestFullScreen
        || el.msRequestFullscreen;
      if (!req) return Promise.resolve();
      const result = req.call(el);
      return (result && typeof result.then === 'function') ? result.catch(() => {}) : Promise.resolve();
    } catch { return Promise.resolve(); }
  }, []);

  const exitFullscreenSafe = useCallback(() => {
    try {
      const fsEl = document.fullscreenElement
        || document.webkitFullscreenElement
        || document.msFullscreenElement;
      if (!fsEl) return Promise.resolve();
      const exit = document.exitFullscreen
        || document.webkitExitFullscreen
        || document.webkitCancelFullScreen
        || document.msExitFullscreen;
      if (!exit) return Promise.resolve();
      const result = exit.call(document);
      return (result && typeof result.then === 'function') ? result.catch(() => {}) : Promise.resolve();
    } catch { return Promise.resolve(); }
  }, []);

  const toggleFullscreen = () => {
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (!fsEl) enterFullscreen().then(() => setIsFullscreen(true));
    else       exitFullscreenSafe().then(() => setIsFullscreen(false));
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(
      !!(document.fullscreenElement || document.webkitFullscreenElement)
    );
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, []);

  /* Auto-enter fullscreen when the game actually starts.
     Safe because `started` only flips inside a click handler (user gesture). */
  useEffect(() => {
    if (started) enterFullscreen();
  }, [started, enterFullscreen]);

  /* iOS Safari "minimal UI" trick — Apple does not expose a Fullscreen API
     on iPhone, but Safari hides its URL/bottom bars when the page is
     scrolled. We briefly make the document tall enough to scroll, scroll
     1 px, then restore. Done once per game-start, iPhone-only.            */
  useEffect(() => {
    if (!started) return;
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isIPhone = /iPhone|iPod/.test(ua);
    if (!isIPhone) return;
    const isStandalone = window.navigator.standalone === true
      || window.matchMedia?.('(display-mode: standalone)')?.matches;
    if (isStandalone) return; // already fullscreen, nothing to do

    const prevHtmlHeight = document.documentElement.style.minHeight;
    const prevBodyHeight = document.body.style.minHeight;
    document.documentElement.style.minHeight = '101vh';
    document.body.style.minHeight = '101vh';

    // Defer to next frames so layout settles before scrolling
    let raf1, raf2, t;
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        try { window.scrollTo(0, 1); } catch {}
        // Restore original heights after Safari has hidden its UI
        t = setTimeout(() => {
          document.documentElement.style.minHeight = prevHtmlHeight;
          document.body.style.minHeight = prevBodyHeight;
        }, 350);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      clearTimeout(t);
      document.documentElement.style.minHeight = prevHtmlHeight;
      document.body.style.minHeight = prevBodyHeight;
    };
  }, [started]);

  /* Always exit fullscreen when leaving the game page so the rest of the
     app (header, mobile nav bar, browser chrome) is restored. */
  useEffect(() => {
    return () => { exitFullscreenSafe(); };
  }, [exitFullscreenSafe]);

  /* Period countdown ticker — cyclic: restarts automatically when period ends */
  const [periodTimeLeft, setPeriodTimeLeft] = useState(null);
  useEffect(() => {
    if (!activeSession) { setPeriodTimeLeft(null); return; }
    const pd = activeSession.durationDays || 0;
    const ph = activeSession.durationHours || 0;
    const pm = activeSession.durationMinutes || 0;
    const periodMs = (pd * 86400000) + (ph * 3600000) + (pm * 60000);
    if (periodMs <= 0) { setPeriodTimeLeft(null); return; }

    const tick = () => {
      let remaining;
      const anchorMs = activeSession.periodAnchor ? new Date(activeSession.periodAnchor).getTime() : 0;
      if (periodEndsAt) {
        remaining = Math.max(0, periodEndsAt - Date.now());
        if (remaining <= 0) {
          setPeriodEndsAt(null);
          const elapsed = Date.now() - anchorMs;
          remaining = periodMs - (elapsed % periodMs);
        }
      } else {
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
  }, [activeSession, periodEndsAt]);

  /* Competition countdown ticker — counts down to contest end */
  const [competitionTimeLeft, setCompetitionTimeLeft] = useState(null);
  useEffect(() => {
    if (!activeContest?.endDate) { setCompetitionTimeLeft(null); return; }
    const endMs = new Date(activeContest.endDate).getTime();
    const tick = () => {
      const remaining = Math.max(0, endMs - Date.now());
      if (remaining <= 0) {
        setCompetitionTimeLeft(null);
        // Contest just ended — refresh game data and wallet balance
        fetchGame();
        fetchBalance();
        return;
      }
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
  }, [activeContest, fetchGame, fetchBalance]);

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
    const needsEntry = isLoggedIn && entryStatus && !entryStatus.hasPaid && entryFee > 0;
    const entryLoading = isLoggedIn && entryFee > 0 && !entryStatus;

    const handleEntryPaid = async () => {
      const data = await authFetch(`/entries/${slug}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          ...(contestId && { contestId }),
          ...(sessionId && { sessionId }),
        }),
      });
      if (data?.success) {
        setEntryStatus({ hasPaid: true, entryFee, walletBalance: data.balance ?? 0 });
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
          entryFee={entryFee}
          walletBalance={walletBalance ?? 0}
          gameName={game.name}
          color={color}
          onPay={handleEntryPaid}
          periodTimeLeft={periodTimeLeft}
          backHref="/games"
        />
      );
    }

    /* Instructions screen — free game or already paid entry */
    const hasAttemptCost = isLoggedIn && attemptCost > 0 && !!activeSession;

    const handleStartClick = () => {
      setStarted(true);
    };

    const handlePayAndPlay = async () => {
      const data = await authFetch(`/entries/${slug}/pay-attempt`, {
        method: 'POST',
        body: JSON.stringify({ sessionId }),
      });
      if (data?.success) {
        fetchBalance();
        setStarted(true);
      }
    };

    const gameForUI = { ...game, color, instructions: derivedInstructions };

    return (
      <GameInstructions
        game={gameForUI}
        onStart={handleStartClick}
        attemptCost={hasAttemptCost ? attemptCost : 0}
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
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${color}60 30%, rgba(168,85,247,0.4) 70%, transparent)` }} />

        <Link href="/games" onClick={() => { exitFullscreenSafe(); }} style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--text-secondary)', textDecoration: 'none', fontSize: 12, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--subtle-border)', transition: 'all 0.2s', flexShrink: 0 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          <span className="hidden sm:inline">Back</span>
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1, minWidth: 0 }}>
          {activeContest && competitionTimeLeft && (
            <span style={{
              fontSize: 11, fontWeight: 700, color: 'var(--neon-cyan)', fontVariantNumeric: 'tabular-nums',
              padding: '2px 10px', borderRadius: 20,
              background: 'color-mix(in srgb, var(--neon-cyan) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--neon-cyan) 15%, transparent)',
              display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontSize: 10, opacity: 0.7 }}>🏆</span>
              <span style={{ fontSize: 10, fontWeight: 600, opacity: 0.8 }}>Contest ends in</span>
              {competitionTimeLeft.d > 0 ? `${competitionTimeLeft.d}d ` : ''}{String(competitionTimeLeft.h).padStart(2, '0')}:{String(competitionTimeLeft.m).padStart(2, '0')}:{String(competitionTimeLeft.s).padStart(2, '0')}
            </span>
          )}
          {!activeContest && activeSession && periodTimeLeft && (
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
        </div>

        <button onClick={toggleFullscreen} style={{ display: 'none', alignItems: 'center', color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 6, background: 'var(--input-bg)', border: '1px solid var(--subtle-border)', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }} title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}>
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
          <div style={{ width: 40, height: 40, border: '3px solid rgba(0,229,255,0.2)', borderTop: `3px solid ${color}`, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
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

      {/* iPhone-only fullscreen hint — shown once per device.
          iOS Safari blocks the Fullscreen API; the only way to truly hide
          Safari's URL bar / home indicator is via Add to Home Screen. */}
      {showIosHint && (
        <div style={{
          position: 'absolute', left: 12, right: 12, bottom: 12, zIndex: 50,
          padding: '10px 12px', borderRadius: 10,
          background: 'rgba(10,11,26,0.92)',
          border: '1px solid color-mix(in srgb, var(--neon-cyan) 30%, transparent)',
          color: '#e6e6f0', fontSize: 12, lineHeight: 1.4,
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}>
          <span style={{ flex: 1 }}>
            For true fullscreen on iPhone, tap <strong>Share</strong> →{' '}
            <strong>Add to Home Screen</strong>, then open from the icon.
          </span>
          <button
            onClick={dismissIosHint}
            aria-label="Dismiss"
            style={{
              flexShrink: 0, padding: '4px 10px', borderRadius: 6,
              background: 'var(--input-bg)', border: '1px solid var(--subtle-border)',
              color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
            }}
          >Got it</button>
        </div>
      )}

      {/* Signup reward modal for guests */}
      {!isLoggedIn && (
        <SignupRewardModal
          show={showSignupModal}
          rewardAmount={signupReward}
          onClose={() => { setShowSignupModal(false); setTimeout(() => iframeRef.current?.focus(), 100); }}
          context={signupModalContext}
        />
      )}

      <Confetti active={showConfetti} />
    </div>
  );
}
