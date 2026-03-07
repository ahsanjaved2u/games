'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import PaymentModal from '@/components/PaymentModal';
import { useAuth } from '@/context/AuthContext';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ── Competitive schedule + live countdown (self-contained, tick-accurate) ── */
function CompetitiveSchedule({ scheduleStart, scheduleEnd, prizesDistributed }) {
  const startDate = scheduleStart ? new Date(scheduleStart) : null;
  const endDate   = scheduleEnd   ? new Date(scheduleEnd)   : null;

  const getPhase = () => {
    const now = new Date();
    if (!startDate || !endDate) return 'unknown';
    if (now < startDate) return 'before';
    if (now < endDate && !prizesDistributed) return 'running';
    return 'ended';
  };

  const calcTime = (target) => {
    const diff = Math.max(0, target - new Date());
    return {
      days:  Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      mins:  Math.floor((diff % 3600000)  / 60000),
      secs:  Math.floor((diff % 60000)    / 1000),
    };
  };

  const [phase, setPhase] = useState(getPhase);
  const [time,  setTime]  = useState(() => calcTime(getPhase() === 'before' ? startDate : endDate));

  useEffect(() => {
    const tick = () => {
      const p = getPhase();
      setPhase(p);
      const target = p === 'before' ? startDate : endDate;
      if (target) setTime(calcTime(target));
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleStart, scheduleEnd, prizesDistributed]);

  if (!startDate || !endDate) return null;

  // If competition ended and start date is in the past → old schedule, don't show dates
  const now = new Date();
  const isOldSchedule = phase === 'ended' && startDate < now;

  // If old schedule is done, just show "coming soon" — no stale dates
  if (isOldSchedule) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,92,138,0.22)' }}>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,92,138,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,92,138,0.7)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ff5c8a' }}>Competition Ended</span>
        </div>
        <div style={{ padding: '0 12px 10px' }}>
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0 }}>🔜 Next round coming soon. Stay tuned!</p>
        </div>
      </div>
    );
  }

  const fmtDate = (d) => d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  // Per-phase colours
  const cfg = {
    before:  { color: '#ffd93d', icon: '⏳', label: 'Starts in',        dot: 'rgba(255,217,61,0.7)'  },
    running: { color: '#00e5ff', icon: '🔥', label: 'Competition ends in', dot: 'rgba(0,229,255,0.7)' },
    ended:   { color: '#ff5c8a', icon: '🏁', label: 'Competition ended',  dot: 'rgba(255,92,138,0.7)' },
    unknown: { color: '#888',    icon: '📅', label: 'Scheduled',          dot: 'rgba(136,136,136,0.5)' },
  }[phase];

  const seg = (val, unit) => (
    <div style={{ textAlign: 'center', minWidth: 34 }}>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: cfg.color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 14px ${cfg.color}90` }}>
        {String(val).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
    </div>
  );
  const sep = <span style={{ fontSize: 15, fontWeight: 700, color: cfg.color, opacity: 0.5, alignSelf: 'flex-start', marginTop: 1 }}>:</span>;

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: `1px solid ${cfg.color}22` }}>
      {/* Schedule row — only shown when dates are relevant (not ended old schedule) */}
      <div style={{ background: `${cfg.color}0a`, borderBottom: `1px solid ${cfg.color}18`, padding: '6px 10px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontWeight: 600 }}>📅 Start</span>
        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDate(startDate)}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontWeight: 600 }}>🏁 End</span>
        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDate(endDate)}</span>
      </div>
      {/* Countdown row */}
      <div style={{ padding: '8px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: phase === 'ended' ? 0 : 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, display: 'inline-block', boxShadow: `0 0 6px ${cfg.dot}` }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: cfg.color }}>{cfg.label}</span>
          </div>
        </div>
        {phase !== 'ended' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {time.days > 0 && <>{seg(time.days, 'days')}{sep}</>}
            {seg(time.hours, 'hrs')}{sep}
            {seg(time.mins, 'min')}{sep}
            {seg(time.secs, 'sec')}
          </div>
        )}
        {phase === 'ended' && (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 3 }}>Prizes have been distributed. Stay tuned for the next round!</p>
        )}
      </div>
    </div>
  );
}

/* ── GameCard: per-card tick so competitive live state matches the clock ── */
function GameCard({ game, i, isLoggedIn, onPay }) {
  const thumb = game.thumbnail ? `${GAMES_BASE}/${game.gamePath}/${game.thumbnail}` : null;

  const calcEffective = () => {
    if (game.gameType !== 'competitive' || !game.scheduleStart || !game.scheduleEnd) return game.isLive;
    const now = new Date();
    return now >= new Date(game.scheduleStart) && now < new Date(game.scheduleEnd) && !game.prizesDistributed;
  };

  const [effectiveLive, setEffectiveLive] = useState(calcEffective);

  useEffect(() => {
    if (game.gameType !== 'competitive' || !game.scheduleStart || !game.scheduleEnd) {
      setEffectiveLive(game.isLive);
      return;
    }
    const id = setInterval(() => setEffectiveLive(calcEffective()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.isLive, game.scheduleStart, game.scheduleEnd, game.prizesDistributed]);

  const handlePlay = () => {
    if (!effectiveLive) return;
    if (!game.isFree && !isLoggedIn) { alert('Please log in to play paid games.'); return; }
    if (!game.isFree) { onPay(game); return; }
  };

  const getScheduleText = () => {
    if (game.gameType === 'competitive' || !game.showSchedule || !game.scheduleStart || !game.scheduleEnd) return null;
    const opts = { dateStyle: 'medium', timeStyle: 'short' };
    return `Live from ${new Date(game.scheduleStart).toLocaleString(undefined, opts)} to ${new Date(game.scheduleEnd).toLocaleString(undefined, opts)}`;
  };
  const scheduleText = getScheduleText();

  return (
    <div
      className="glass-card group transition-all duration-300 animate-fade-in-up relative overflow-hidden flex flex-col"
      style={{ animationDelay: `${i * 0.08}s`, opacity: effectiveLive ? 1 : 0.7 }}
      onMouseEnter={e => {
        if (!effectiveLive) return;
        e.currentTarget.style.borderColor = (game.color || '#00e5ff') + '40';
        e.currentTarget.style.boxShadow = `0 0 30px ${game.color || '#00e5ff'}15`;
        e.currentTarget.style.transform = 'translateY(-4px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--glass-border)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Banner */}
      <div className="relative h-40 sm:h-48 flex items-center justify-center overflow-hidden" style={{ borderBottom: `1px solid ${(game.color || '#00e5ff')}15` }}>
        {thumb ? (
          <>
            <Image src={thumb} alt={game.name} fill className="object-cover" sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" priority />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11,11,26,0.95) 0%, rgba(11,11,26,0.3) 40%, transparent 100%)' }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 50% 80%, ${game.color || '#00e5ff'}18, transparent 70%)` }}>
            <span className="absolute inset-0 flex items-center justify-center text-6xl sm:text-7xl select-none" style={{ filter: `drop-shadow(0 0 20px ${game.color || '#00e5ff'}60)` }}>🎮</span>
          </div>
        )}
        {game.tag && (
          <span className="absolute top-3 left-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,255,136,0.12)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.25)' }}>{game.tag}</span>
        )}
        {!game.isFree && effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,217,61,0.12)', color: 'var(--neon-yellow)', border: '1px solid rgba(255,217,61,0.3)' }}>PKR {game.price}</span>
        )}
        {!effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,45,120,0.15)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.3)' }}>Not Live</span>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{game.name}</h3>
        <p className="text-xs mb-3 leading-relaxed flex-1" style={{ color: 'var(--text-muted)' }}>{game.description || 'No description'}</p>

        {/* Rewarding banner */}
        {effectiveLive && game.gameType === 'rewarding' && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,217,61,0.08))', border: '1px solid rgba(0,255,136,0.15)' }}>
            <div className="flex items-center gap-2">
              <span style={{ fontSize: 14 }}>💰</span>
              <span className="text-[11px] font-bold" style={{ color: '#00ff88' }}>Play &amp; Earn Cash Rewards</span>
            </div>
            {game.conversionRate > 0 && <p className="text-[10px] mt-1 ml-6" style={{ color: 'rgba(255,255,255,0.4)' }}>Score points and win real money!</p>}
          </div>
        )}

        {/* Competitive: prizes */}
        {game.gameType === 'competitive' && game.prizes?.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(255,217,61,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(255,217,61,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 14 }}>🏆</span>
              <span className="text-[11px] font-bold" style={{ color: '#ffd93d' }}>Compete &amp; Win Prizes</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-6">
              {game.prizes.slice(0, 3).map((p, j) => {
                const icons = ['🥇', '🥈', '🥉'];
                return <span key={j} className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>{icons[j]} PKR {p.toLocaleString()}</span>;
              })}
              {game.prizes.length > 3 && <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>+{game.prizes.length - 3} more</span>}
            </div>
          </div>
        )}

        {/* Competitive: always-on schedule + live countdown */}
        {game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd && (
          <CompetitiveSchedule
            scheduleStart={game.scheduleStart}
            scheduleEnd={game.scheduleEnd}
            prizesDistributed={game.prizesDistributed}
          />
        )}

        {/* Rewarding schedule text */}
        {scheduleText && (
          <p className="text-[11px] mb-3 font-medium" style={{ color: 'var(--neon-yellow)' }}>🕐 {scheduleText}</p>
        )}

        {/* Action — driven by tick-accurate effectiveLive */}
        {!effectiveLive ? (
          <div className="btn-neon text-sm w-full text-center" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            🔒 Not Available
          </div>
        ) : game.isFree ? (
          <Link href={`/games/${game.slug}`} className="btn-neon btn-neon-primary text-sm w-full text-center" style={{ textDecoration: 'none' }}>
            ▶ Play Now
          </Link>
        ) : (
          <button onClick={handlePlay} className="btn-neon btn-neon-primary text-sm w-full text-center">
            🔓 Unlock &amp; Play — PKR {game.price}
          </button>
        )}
      </div>
    </div>
  );
}

export default function GamesPage() {
  const { isLoggedIn } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [payGame, setPayGame] = useState(null);

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



  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: '#00e5ff', top: '0%', left: '5%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: '#a855f7', bottom: '10%', right: '5%', animationDelay: '5s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="text-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-24">
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
