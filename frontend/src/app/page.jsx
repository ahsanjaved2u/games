'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from "next/link";
import PaymentModal from '@/components/PaymentModal';
import GameCard from '@/components/GameCard';
import GameCardSkeleton from '@/components/GameCardSkeleton';
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';

export default function Home() {
  const { isLoggedIn, authFetch } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payGame, setPayGame] = useState(null);
  const [signupReward, setSignupReward] = useState(0);
  const [reviewMap, setReviewMap] = useState({});


  /* Fetch signup reward for CTA */
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

  const isCurrentlyLive = (game) => {
    // A game is "live" if it has a live contest or an active session
    const hasLiveContest = game.contests?.some(c => c.status === 'live');
    const hasActiveSession = game.sessions?.some(s => s.isActive);
    return hasLiveContest || hasActiveSession;
  };

  const liveCount = games.filter(isCurrentlyLive).length;
  const contestCount = games.filter(g => g.contests?.length > 0).length;
  const sessionCount = games.filter(g => g.sessions?.length > 0).length;

  const fetchReviewSummary = useCallback(async (slugs) => {
    try {
      const data = await authFetch('/reviews/bulk-summary', {
        method: 'POST',
        body: JSON.stringify({ slugs }),
      });
      setReviewMap(data);
    } catch { /* ignore */ }
  }, [authFetch]);

  const handleToggleLike = useCallback(async (slug) => {
    if (!isLoggedIn) return;
    try {
      const data = await authFetch(`/reviews/${slug}/like`, { method: 'POST' });
      setReviewMap(prev => ({
        ...prev,
        [slug]: { ...prev[slug], totalLikes: data.totalLikes, userLiked: data.liked },
      }));
    } catch { /* ignore */ }
  }, [isLoggedIn, authFetch]);

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API}/games`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setGames(list);
      if (list.length > 0) fetchReviewSummary(list.map(g => g.slug));
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') fetchGames();
    }, 30_000);

    // Listen for real-time session updates from admin actions / cron
    const baseUrl = API.endsWith('/api') ? API.slice(0, -4) : API;
    const es = new EventSource(`${baseUrl}/api/stream`);
    es.addEventListener('session-update', () => fetchGames());

    return () => { clearInterval(interval); es.close(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch review summary when user logs in/out so userLiked state is correct
  useEffect(() => {
    if (games.length > 0) fetchReviewSummary(games.map(g => g.slug));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Light preload: cache each game's index.html via Service Worker
  useEffect(() => {
    if (games.length === 0 || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      if (!reg.active) return;
      games.forEach(game => {
        if (!game.gamePath) return;
        reg.active.postMessage({
          type: 'PREFETCH_GAME',
          url: `${GAMES_BASE}/${game.gamePath}/index.html`,
        });
      });
    });
  }, [games]);

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden' }}>

      {/* Glow orbs — subtle background */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-cyan)', top: '0%', left: '5%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '10%', right: '5%', animationDelay: '5s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-4 sm:pb-6">

        {/* ── Mobile-only SEO heading (visible to crawlers + mobile users) ── */}
        <h1 className="sm:hidden text-center font-extrabold mb-3 px-2" style={{ fontSize: 18, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          GameVesta — Skill-Based Browser Games with Real Cash Prizes
        </h1>

        {/* ── Hero Banner ── */}
        <div className="hidden sm:block mb-5 sm:mb-6 animate-fade-in-up">
          <div
            className="rounded-2xl flex flex-col items-center justify-center px-5 sm:px-8 text-center"
            style={{
              border: '1px solid var(--border-color)',
              boxShadow: '0 0 40px rgba(0,229,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
              height: 100,
              background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(161,0,255,0.04) 100%)',
            }}
          >
            <h1 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2">
              <span className="neon-text-cyan">Real Reward Arcade</span>
            </h1>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-8" style={{ marginBottom: isLoggedIn ? 0 : '0.5rem' }}>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', background: 'rgba(0,255,136,0.07)' }}>
                🟢 Live: {liveCount}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(255,217,61,0.3)', color: '#ffd93d', background: 'rgba(255,217,61,0.07)' }}>
                🏆 Contests: {contestCount}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.07)' }}>
                💎 Sessions: {sessionCount}
              </span>
            </div>
            {!isLoggedIn && (
              <Link href="/signup" className="btn-neon btn-neon-primary text-xs px-5 py-1.5" style={{ textDecoration: 'none', whiteSpace: 'nowrap', marginBottom: 6 }}>
                ✨ Join Free{signupReward > 0 ? ` · Rs ${signupReward}` : ''}
              </Link>
            )}
          </div>
        </div>

        {/* ── Games Grid ── */}
        {loading ? (
          <GameCardSkeleton count={6} />
        ) : games.length === 0 ? (
          <div className="text-center py-16 max-w-2xl mx-auto px-4">
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Get ready to play!</h2>
            <p className="text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              We&apos;re putting the finishing touches on a fresh batch of skill-based arcade and puzzle games. Top scorers win real PKR cash prizes — based purely on skill, never on chance. Check back soon.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {(() => {
              const cards = [];
              games.forEach(game => {
                const contests = game.contests || [];
                const sessions = game.sessions || [];
                const visibleContests = contests.filter(c => c.status === 'live' || (c.status === 'scheduled' && new Date(c.startDate) > new Date()));
                visibleContests.forEach(c => cards.push({ game, contest: c, session: null, key: `${game._id}_c_${c._id}` }));
                sessions.filter(s => s.isActive).forEach(s => cards.push({ game, contest: null, session: s, key: `${game._id}_s_${s._id}` }));
                if (visibleContests.length === 0 && sessions.filter(s => s.isActive).length === 0) {
                  cards.push({ game, contest: null, session: null, key: game._id });
                }
              });
              return cards.map((entry, i) => (
                <GameCard key={entry.key} game={entry.game} contest={entry.contest} session={entry.session} i={i} isLoggedIn={isLoggedIn} onPay={setPayGame} reviewData={reviewMap[entry.game.slug]} onToggleLike={handleToggleLike} onContestLive={fetchGames} onSessionEnd={fetchGames} />
              ));
            })()}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/*  Static SEO / About content — helps search engines + AdSense reviewers
           understand what GameVesta is. Indexable text, not behind login. */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10" aria-label="About GameVesta">

        {/* Intro */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-2xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>
            Welcome to GameVesta
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            GameVesta is a skill-based online gaming platform built for players who enjoy fast,
            competitive HTML5 arcade and puzzle games. Every game is free to try, runs directly
            in your browser — no downloads or installs — and works equally well on mobile phones,
            tablets, and desktops. Top scorers earn real cash prizes in PKR, awarded purely on
            ranking and skill, never on chance.
          </p>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Whether you want a quick brain break or a serious leaderboard run, GameVesta gives
            you a clean, ad-supported way to play, compete, and get rewarded for your skill.
          </p>
        </div>

        {/* How it works */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-2xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
            How GameVesta Works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="glass-card p-4">
              <div style={{ fontSize: 28, marginBottom: 6 }}>1️⃣</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Pick a Game</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Browse the catalogue and choose any game. Free games let you play instantly;
                paid contests have a small entry fee that contributes to the prize pool.
              </p>
            </div>
            <div className="glass-card p-4">
              <div style={{ fontSize: 28, marginBottom: 6 }}>2️⃣</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Play &amp; Score</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                Use your skill to score as high as you can. Faster finishes earn bigger time
                bonuses. Only your best score in each session or contest counts.
              </p>
            </div>
            <div className="glass-card p-4">
              <div style={{ fontSize: 28, marginBottom: 6 }}>3️⃣</div>
              <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Win Real PKR</h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                When a session or contest ends, prizes are credited automatically to your
                in-app wallet. Withdraw via the wallet page once you reach the minimum.
              </p>
            </div>
          </div>
        </div>

        {/* Featured games — static text Google can read */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-2xl font-extrabold mb-4" style={{ color: 'var(--text-primary)' }}>
            Featured Games on GameVesta
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <article className="glass-card p-4">
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                🚀 Space Shooter
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A fast-paced arcade shooter where you survive enemy waves, collect power-ups,
                and upgrade your ship across five tiers. Score points by destroying enemies,
                collect gems for bonus value, and grab green or blue drops to keep your
                strength bar alive. Faster runs earn larger time-bonus multipliers.
              </p>
            </article>
            <article className="glass-card p-4">
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                🍬 Bubble Crush
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A classic match-3 puzzle game with a competitive twist. Swap candies to match
                three or more, chain cascades for bonus points, and watch out for bad swaps
                that drain your strength. Plan combos carefully — a 6-match scores far more
                than two separate 3-matches.
              </p>
            </article>
            <article className="glass-card p-4">
              <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                🕹️ Plasma Burst
              </h3>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A reflex-based arcade challenge: dodge moving walls, collect coloured orbs for
                points, and grab shields to recharge your energy. Red orbs award the most
                points, golden are mid-tier, and green are the easiest to grab. Hitting walls
                costs you points, so precision matters more than speed alone.
              </p>
            </article>
          </div>
        </div>

        {/* Why skill-based */}
        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-2xl font-extrabold mb-3" style={{ color: 'var(--text-primary)' }}>
            Why Skill-Based Gaming?
          </h2>
          <p className="text-sm sm:text-base leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            Unlike games of chance, every prize on GameVesta is earned through measurable
            skill: reflexes, pattern recognition, planning, and timing. There are no random
            jackpots, no dice rolls, and no luck-based outcomes. Two players starting from
            the same position will end up on the leaderboard purely based on how well they
            play.
          </p>
          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            This makes GameVesta a fair competition platform rather than a gambling service.
            Sessions and contests have transparent rules, fixed prize pools, and public
            leaderboards so anyone can verify how rankings are determined.
          </p>
        </div>

        {/* Quick links */}
        <div className="text-center">
          <p className="text-xs sm:text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            Want to learn more about how rewards, contests, and the wallet work?
          </p>
          <div className="flex flex-wrap gap-2 sm:gap-3 justify-center">
            <Link href="/about" className="text-xs sm:text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(0,229,255,0.08)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,229,255,0.25)', textDecoration: 'none' }}>
              About GameVesta
            </Link>
            <Link href="/faq" className="text-xs sm:text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(168,85,247,0.08)', color: 'var(--neon-purple)', border: '1px solid rgba(168,85,247,0.25)', textDecoration: 'none' }}>
              FAQ
            </Link>
            <Link href="/leaderboard" className="text-xs sm:text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(0,255,136,0.08)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.25)', textDecoration: 'none' }}>
              Leaderboard
            </Link>
            <Link href="/contact" className="text-xs sm:text-sm px-4 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)', textDecoration: 'none' }}>
              Contact
            </Link>
          </div>
        </div>
      </section>

      {payGame && (
        <PaymentModal
          game={payGame}
          onClose={() => setPayGame(null)}
          onSuccess={() => { setPayGame(null); window.location.href = `/games/${payGame.slug}`; }}
        />
      )}
    </div>
  );
}
