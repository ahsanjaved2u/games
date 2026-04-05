'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from "next/link";
import Image from 'next/image';
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
  const [heroSlide, setHeroSlide] = useState(0);
  const touchStartX = useRef(null);

  // Add more images here to auto-populate the gallery slide
  const HERO_IMAGES = [
    '/appLevelImages/heroImages/bubble-shooter-hero-image.png',
  ];
  const TOTAL_SLIDES = HERO_IMAGES.length > 0 ? 2 : 1; // slide 0 = text, slide 1 = gallery

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
    const now = new Date();

    if (game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd) {
      const start = new Date(game.scheduleStart);
      const end = new Date(game.scheduleEnd);
      if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime())) {
        return now >= start && now < end && !game.prizesDistributed;
      }
    }

    if (game.gameType === 'rewarding' && game.showSchedule && game.scheduleStart) {
      const start = new Date(game.scheduleStart);
      if (!Number.isNaN(start.getTime())) {
        return game.isLive || now >= start;
      }
    }

    return !!game.isLive;
  };

  const liveCount = games.filter(isCurrentlyLive).length;
  const rewardingCount = games.filter(g => g.gameType === 'rewarding').length;
  const competitiveCount = games.filter(g => g.gameType === 'competitive').length;

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
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-fetch review summary when user logs in/out so userLiked state is correct
  useEffect(() => {
    if (games.length > 0) fetchReviewSummary(games.map(g => g.slug));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  // Hero auto-advance
  useEffect(() => {
    const id = setInterval(() => setHeroSlide(p => (p + 1) % TOTAL_SLIDES), 5000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TOTAL_SLIDES]);

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

        {/* ── Hero Slider ── */}
        <div className="hidden sm:block mb-5 sm:mb-6 animate-fade-in-up" style={{ marginTop: 0 }}>
          {/* Fixed height wrapper — all slides match this */}
          <div
            className="rounded-2xl overflow-hidden relative"
            style={{
              border: '1px solid var(--border-color)',
              boxShadow: '0 0 40px rgba(0,229,255,0.06), inset 0 1px 0 rgba(255,255,255,0.04)',
              height: 100,
            }}
            onTouchStart={e => { touchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              if (touchStartX.current === null) return;
              const diff = touchStartX.current - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 40) setHeroSlide(p => diff > 0 ? (p + 1) % TOTAL_SLIDES : (p - 1 + TOTAL_SLIDES) % TOTAL_SLIDES);
              touchStartX.current = null;
            }}
          >
            {/* Track */}
            <div style={{
              display: 'flex',
              width: `${TOTAL_SLIDES * 100}%`,
              height: '100%',
              transform: `translateX(-${(heroSlide / TOTAL_SLIDES) * 100}%)`,
              transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}>

              {/* Slide 0 — Text hero */}
              <div className="shrink-0 flex flex-col items-center justify-center px-5 sm:px-8 text-center" style={{
                width: `${100 / TOTAL_SLIDES}%`,
                height: '100%',
                background: 'linear-gradient(135deg, rgba(0,229,255,0.04) 0%, rgba(161,0,255,0.04) 100%)',
              }}>
                <h1 className="text-xl sm:text-2xl font-extrabold leading-tight mb-2">
                  <span className="neon-text-cyan">Real Reward Arcade</span>
                </h1>
                <div className="flex flex-wrap justify-center gap-6 sm:gap-8" style={{ marginBottom: isLoggedIn ? 0 : '0.5rem' }}>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88', background: 'rgba(0,255,136,0.07)' }}>
                    🟢 Live: {liveCount}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(255,217,61,0.3)', color: '#ffd93d', background: 'rgba(255,217,61,0.07)' }}>
                    🏆 Competitive: {competitiveCount}
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ border: '1px solid rgba(0,229,255,0.3)', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.07)' }}>
                    💎 Rewarding: {rewardingCount}
                  </span>
                </div>
                {!isLoggedIn && (
                  <Link href="/signup" className="btn-neon btn-neon-primary text-xs px-5 py-1.5" style={{ textDecoration: 'none', whiteSpace: 'nowrap' }}>
                    ✨ Join Free{signupReward > 0 ? ` · Rs ${signupReward}` : ''}
                  </Link>
                )}
              </div>

              {/* Slide 1 — Same image repeated across columns */}
              {HERO_IMAGES.length > 0 && (
                <div className="shrink-0 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7" style={{
                  width: `${100 / TOTAL_SLIDES}%`,
                  height: '100%',
                  gap: 6,
                  padding: 8,
                  boxSizing: 'border-box',
                  background: 'rgba(0,0,0,0.3)',
                }}>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className={`relative rounded-[10px] overflow-hidden${i >= 5 ? ' hidden md:block' : i >= 3 ? ' hidden sm:block' : ''}`}>
                      <Image
                        src={HERO_IMAGES[0]}
                        alt={`Game preview ${i + 1}`}
                        fill
                        style={{ objectFit: 'contain', objectPosition: 'center' }}
                        priority={i === 0}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* ── Games Grid ── */}
        {loading ? (
          <GameCardSkeleton count={6} />
        ) : games.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No games available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game, i) => (
              <GameCard key={game._id} game={game} i={i} isLoggedIn={isLoggedIn} onPay={setPayGame} reviewData={reviewMap[game.slug]} onToggleLike={handleToggleLike} />
            ))}
          </div>
        )}
      </div>

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
