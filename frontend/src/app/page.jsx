'use client';

import { useState, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function Home() {
  const { isLoggedIn } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/games`);
        const data = await res.json();
        setGames(Array.isArray(data) ? data : []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const formatSchedule = (game) => {
    if (!game.showSchedule || !game.scheduleStart || !game.scheduleEnd) return null;
    const opts = { dateStyle: 'medium', timeStyle: 'short' };
    const start = new Date(game.scheduleStart).toLocaleString(undefined, opts);
    const end = new Date(game.scheduleEnd).toLocaleString(undefined, opts);
    return `Game will be live from ${start} to ${end}`;
  };

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
            {games.map((game, i) => {
              const color = game.color || '#00e5ff';
              const thumb = game.thumbnail
                ? `${GAMES_BASE}/${game.gamePath}/${game.thumbnail}`
                : null;
              const schedule = !game.isLive ? formatSchedule(game) : null;

              return (
                <div
                  key={game._id}
                  className="glass-card group transition-all duration-300 animate-fade-in-up relative overflow-hidden flex flex-col"
                  style={{ animationDelay: `${i * 0.08}s`, opacity: game.isLive ? 1 : 0.6 }}
                  onMouseEnter={e => {
                    if (!game.isLive) return;
                    e.currentTarget.style.borderColor = color + '40';
                    e.currentTarget.style.boxShadow = `0 0 30px ${color}15`;
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
                    borderBottom: `1px solid ${color}15`,
                  }}>
                    {thumb ? (
                      <>
                        <Image
                          src={thumb}
                          alt={game.name}
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
                      <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 80%, ${color}18, transparent 70%)` }}>
                        <span className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl select-none" style={{ filter: `drop-shadow(0 0 20px ${color}60)` }}>🎮</span>
                      </div>
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

                    {/* Not Live badge */}
                    {!game.isLive && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{
                        background: 'rgba(255,45,120,0.15)',
                        color: '#ff5c8a',
                        border: '1px solid rgba(255,45,120,0.3)',
                      }}>
                        Not Live
                      </span>
                    )}

                    {/* Paid badge */}
                    {!game.isFree && game.isLive && (
                      <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{
                        background: 'rgba(255,217,61,0.12)',
                        color: 'var(--neon-yellow)',
                        border: '1px solid rgba(255,217,61,0.3)',
                      }}>PKR {game.price}</span>
                    )}
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                      {game.name}
                    </h3>
                    <p className="text-xs mb-4 leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>
                      {game.description || 'No description'}
                    </p>

                    {/* Game type banner */}
                    {game.isLive && game.gameType === 'rewarding' && (
                      <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,217,61,0.08))', border: '1px solid rgba(0,255,136,0.15)' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14 }}>💰</span>
                          <span className="text-[11px] font-bold" style={{ color: '#00ff88' }}>Play & Earn Cash Rewards</span>
                        </div>
                        {game.conversionRate > 0 && (
                          <p className="text-[10px] mt-1 ml-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Score points and win real money!</p>
                        )}
                      </div>
                    )}
                    {game.isLive && game.gameType === 'competitive' && (
                      <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(255,217,61,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(255,217,61,0.15)' }}>
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: 14 }}>🏆</span>
                          <span className="text-[11px] font-bold" style={{ color: '#ffd93d' }}>Compete & Win Prizes</span>
                        </div>
                        {game.prizes?.length > 0 && (
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 ml-6">
                            {game.prizes.slice(0, 3).map((p, j) => {
                              const icons = ['🥇', '🥈', '🥉'];
                              return <span key={j} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{icons[j] || `${j+1}.`} {p}</span>;
                            })}
                            {game.prizes.length > 3 && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+{game.prizes.length - 3} more</span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Schedule info if not live and showSchedule */}
                    {schedule && (
                      <p className="text-[11px] mb-3 font-medium" style={{ color: 'var(--neon-yellow)' }}>
                        🕐 {schedule}
                      </p>
                    )}

                    {/* Action */}
                    {!game.isLive ? (
                      <div className="btn-neon text-sm w-full text-center" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
                        🔒 Not Available
                      </div>
                    ) : game.isFree ? (
                      <Link href={`/games/${game.slug}`}
                        className="btn-neon btn-neon-primary text-sm w-full text-center"
                        style={{ textDecoration: 'none' }}
                      >
                        ▶ Play Now
                      </Link>
                    ) : (
                      <Link href={`/games/${game.slug}`}
                        className="btn-neon btn-neon-primary text-sm w-full text-center"
                        style={{ textDecoration: 'none' }}
                      >
                        🔓 Unlock &amp; Play — PKR {game.price}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
