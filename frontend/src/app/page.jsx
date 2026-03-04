'use client';

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const games = [
  {
    id: 'bubble-shooter',
    title: 'Neon Bubble Shooter',
    description: 'Pop neon bubbles, collect shields, and survive as long as you can!',
    color: '#00e5ff',
    image: '/games/bubble-shooter/images/background.png',
    players: '2.1k',
    rating: 4.8,
    tag: 'Popular',
  },
  {
    id: 'coming-soon-1',
    title: 'Space Runner',
    description: 'Navigate through asteroids in this high-speed space adventure.',
    color: '#a855f7',
    emoji: '🚀',
    players: '—',
    rating: null,
    comingSoon: true,
  },
  {
    id: 'coming-soon-2',
    title: 'Neon Pong',
    description: 'Classic pong reimagined with neon visuals and power-ups.',
    color: '#ff2d78',
    emoji: '🏓',
    players: '—',
    rating: null,
    comingSoon: true,
  },
];

export default function Home() {
  const { isLoggedIn } = useAuth();

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden' }}>

      {/* Glow orbs — subtle background */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: '#00e5ff', top: '0%', left: '5%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: '#a855f7', bottom: '10%', right: '5%', animationDelay: '5s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* ── Compact Hero ── */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in-up">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold leading-tight mb-4">
            <span style={{ color: 'var(--text-primary)' }}>Play. </span>
            <span className="neon-text-cyan">Compete. </span>
            <span className="neon-text-purple">Win.</span>
          </h1>
          {!isLoggedIn && (
            <Link href="/signup" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>
              ✨ Create Free Account
            </Link>
          )}
        </div>

        {/* ── Games Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game, i) => (
            <div
              key={game.id}
              className="glass-card group transition-all duration-300 animate-fade-in-up relative overflow-hidden flex flex-col"
              style={{ animationDelay: `${i * 0.08}s` }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = game.color + '40';
                e.currentTarget.style.boxShadow = `0 0 30px ${game.color}15`;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {/* Game visual banner */}
              <div className="relative h-40 sm:h-48 flex items-center justify-center overflow-hidden" style={{
                borderBottom: `1px solid ${game.color}15`,
              }}>
                {game.image ? (
                  <>
                    <Image
                      src={game.image}
                      alt={game.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      priority
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: `linear-gradient(to top, rgba(11,11,26,0.95) 0%, rgba(11,11,26,0.3) 40%, transparent 100%)`,
                    }} />
                  </>
                ) : (
                  <>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(circle at 50% 80%, ${game.color}18, transparent 70%)`,
                    }} />
                    <span className="text-6xl sm:text-7xl select-none" style={{
                      filter: `drop-shadow(0 0 20px ${game.color}60)`,
                    }}>
                      {game.emoji}
                    </span>
                  </>
                )}

                {/* Tag */}
                {game.tag && (
                  <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{
                    background: 'rgba(0,255,136,0.12)',
                    color: 'var(--neon-green)',
                    border: '1px solid rgba(0,255,136,0.25)',
                  }}>
                    {game.tag}
                  </span>
                )}

                {/* Coming Soon overlay */}
                {game.comingSoon && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{
                    background: 'rgba(168,85,247,0.15)',
                    color: 'var(--neon-purple)',
                    border: '1px solid rgba(168,85,247,0.3)',
                  }}>
                    Coming Soon
                  </span>
                )}
              </div>

              {/* Card body */}
              <div className="p-5 flex flex-col flex-1">
                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {game.title}
                </h3>
                <p className="text-xs mb-4 leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                  {game.description}
                </p>

                {/* Footer row */}
                <div className="flex items-center justify-between mb-3">
                  {game.players !== '—' && (
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>👥 {game.players} players</span>
                  )}
                  {game.rating && (
                    <span className="text-[11px] font-medium" style={{ color: 'var(--neon-yellow)' }}>⭐ {game.rating}</span>
                  )}
                  {game.comingSoon && (
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Stay tuned</span>
                  )}
                </div>

                {/* Action */}
                {game.comingSoon ? (
                  <div className="btn-neon text-sm w-full text-center" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                    🔒 Coming Soon
                  </div>
                ) : (
                  <Link href={`/games/${game.id}`}
                    className="btn-neon btn-neon-primary text-sm w-full text-center"
                    style={{ textDecoration: 'none' }}
                  >
                    ▶ Play Now
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
