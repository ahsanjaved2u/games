'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import PaymentModal from '@/components/PaymentModal';
import GameCard from '@/components/GameCard';
import { useAuth } from "@/context/AuthContext";

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payGame, setPayGame] = useState(null);
  const [heroSlide, setHeroSlide] = useState(0);

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

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API}/games`);
      const data = await res.json();
      setGames(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setHeroSlide((prev) => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden' }}>

      {/* Glow orbs — subtle background */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-cyan)', top: '0%', left: '5%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '10%', right: '5%', animationDelay: '5s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">

        {/* ── Minimal Sliding Hero ── */}
        <div className="mb-3 sm:mb-4 animate-fade-in-up">
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden" style={{
                  border: '1px solid var(--border-color)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--bg-primary) 90%, transparent), color-mix(in srgb, var(--bg-secondary) 86%, transparent))',
            boxShadow: '0 0 40px color-mix(in srgb, var(--neon-cyan) 8%, transparent), inset 0 1px 0 rgba(255,255,255,0.04)',
          }}>
            <div style={{
              display: 'flex',
              width: '300%',
              transform: `translateX(-${heroSlide * 33.333333}%)`,
              transition: 'transform 700ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              <div className="shrink-0 px-6 sm:px-10 py-6 sm:py-7 text-center" style={{ width: '33.333333%' }}>
                <p className="text-[11px] uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--neon-cyan)', opacity: 0.8 }}>
                  Welcome
                </p>
                <h1 className="text-3xl sm:text-5xl font-extrabold leading-tight">
                  <span className="neon-text-cyan">Real Reward Arcade</span>
                </h1>
              </div>

              <div className="shrink-0 px-6 sm:px-10 py-6 sm:py-7 text-center" style={{ width: '33.333333%' }}>
                <p className="text-[12px] uppercase tracking-[0.12em] mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Live Snapshot
                </p>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4">
                  <div className="px-4 py-2 rounded-full text-sm sm:text-[15px] font-semibold" style={{ border: '1px solid rgba(0,255,136,0.26)', color: '#00ff88', background: 'rgba(0,255,136,0.08)' }}>
                    Live Now: {liveCount}
                  </div>
                  <div className="px-4 py-2 rounded-full text-sm sm:text-[15px] font-semibold" style={{ border: '1px solid rgba(255,217,61,0.26)', color: '#ffd93d', background: 'rgba(255,217,61,0.08)' }}>
                    Competitive: {competitiveCount}
                  </div>
                  <div className="px-4 py-2 rounded-full text-sm sm:text-[15px] font-semibold" style={{ border: '1px solid rgba(0,229,255,0.26)', color: 'var(--neon-cyan)', background: 'rgba(0,229,255,0.08)' }}>
                    Rewarding: {rewardingCount}
                  </div>
                </div>
              </div>

              <div className="shrink-0 px-6 sm:px-10 py-6 sm:py-7 text-center" style={{ width: '33.333333%' }}>
                <p className="text-[11px] uppercase tracking-[0.12em] mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Coming Next
                </p>
                <h2 className="text-xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Featured Game Visuals Soon
                </h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  We will add hero images and highlights here in the next update.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 pb-2">
              {[0, 1, 2].map((idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setHeroSlide(idx)}
                  aria-label={`Go to hero slide ${idx + 1}`}
                  style={{
                    width: heroSlide === idx ? 18 : 7,
                    height: 7,
                    borderRadius: 999,
                    border: 'none',
                    cursor: 'pointer',
                    background: heroSlide === idx ? 'rgba(0,229,255,0.9)' : 'rgba(255,255,255,0.26)',
                    boxShadow: heroSlide === idx ? '0 0 10px rgba(0,229,255,0.55)' : 'none',
                    transition: 'all 220ms ease',
                  }}
                />
              ))}
            </div>
          </div>

          {!isLoggedIn && (
            <div className="text-center mt-2">
              <Link href="/signup" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>
                ✨ Create Free Account
              </Link>
            </div>
          )}
        </div>

        {/* ── Games Grid ── */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No games available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game, i) => (
              <GameCard key={game._id} game={game} i={i} isLoggedIn={isLoggedIn} onPay={setPayGame} />
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
