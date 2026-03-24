'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';


const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';

const calcTime = (target) => {
  const diff = Math.max(0, target - new Date());
  return {
    days: Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins: Math.floor((diff % 3600000) / 60000),
    secs: Math.floor((diff % 60000) / 1000),
  };
};

function CompetitiveSchedule({ scheduleStart, scheduleEnd, prizesDistributed }) {
  const startDate = scheduleStart ? new Date(scheduleStart) : null;
  const endDate = scheduleEnd ? new Date(scheduleEnd) : null;

  const getPhase = () => {
    const now = new Date();
    if (!startDate || !endDate) return 'unknown';
    if (now < startDate) return 'before';
    if (now < endDate && !prizesDistributed) return 'running';
    return 'ended';
  };

  const [phase, setPhase] = useState(getPhase);
  const [time, setTime] = useState(() => calcTime(getPhase() === 'before' ? startDate : endDate));

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

  const now = new Date();
  const isOldSchedule = phase === 'ended' && startDate < now;

  if (isOldSchedule) {
    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,92,138,0.22)' }}>
        <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,92,138,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,92,138,0.7)' }} />
          <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ff5c8a' }}>Competition Ended</span>
        </div>
        <div style={{ padding: '0 12px 10px' }}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>🔜 Next round coming soon. Stay tuned!</p>
        </div>
      </div>
    );
  }

  const fmtDate = (d) => d.toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const cfg = {
    before: { color: '#ffd93d', icon: '⏳', label: 'Starts in', dot: 'rgba(255,217,61,0.7)' },
    running: { color: '#00e5ff', icon: '🔥', label: 'Competition ends in', dot: 'rgba(0,229,255,0.7)' },
    ended: { color: '#ff5c8a', icon: '🏁', label: 'Competition ended', dot: 'rgba(255,92,138,0.7)' },
    unknown: { color: '#888', icon: '📅', label: 'Scheduled', dot: 'rgba(136,136,136,0.5)' },
  }[phase];

  const seg = (val, unit) => (
    <div style={{ textAlign: 'center', minWidth: 34 }}>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: cfg.color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 14px ${cfg.color}90` }}>
        {String(val).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
    </div>
  );
  const sep = <span style={{ fontSize: 15, fontWeight: 700, color: cfg.color, opacity: 0.5, alignSelf: 'flex-start', marginTop: 1 }}>:</span>;

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: `1px solid ${cfg.color}22` }}>
      <div style={{ background: `${cfg.color}0a`, borderBottom: `1px solid ${cfg.color}18`, padding: '6px 10px', display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 8px', alignItems: 'center' }}>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontWeight: 600 }}>📅 Start</span>
        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDate(startDate)}</span>
        <span style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap', fontWeight: 600 }}>🏁 End</span>
        <span style={{ fontSize: 10, color: cfg.color, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fmtDate(endDate)}</span>
      </div>
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
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>Prizes have been distributed. Stay tuned for the next round!</p>
        )}
      </div>
    </div>
  );
}

function RewardingSchedulePanel({ scheduleStart, isLive, conversionRate }) {
  const startDate = scheduleStart ? new Date(scheduleStart) : null;
  const [time, setTime] = useState(() => (startDate ? calcTime(startDate) : null));
  const [started, setStarted] = useState(() => (!startDate ? false : new Date() >= startDate));

  useEffect(() => {
    if (!startDate) return undefined;
    const tick = () => {
      const hasStarted = new Date() >= startDate;
      setStarted(hasStarted);
      if (!hasStarted) setTime(calcTime(startDate));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [scheduleStart]);

  if (!startDate) return null;

  const showCountdown = !isLive && !started;

  if (!showCountdown || !time) {
    const rateText = conversionRate > 0
      ? `${Number(conversionRate).toLocaleString()} score = 1 PKR`
      : 'Rewards are active now';

    return (
      <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(0,255,136,0.24)' }}>
        <div style={{ padding: '9px 10px 10px', background: 'linear-gradient(135deg, rgba(0,255,136,0.14), rgba(255,217,61,0.08))' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span className="animate-pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(0,255,136,0.85)', display: 'inline-block', boxShadow: '0 0 7px rgba(0,255,136,0.85)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#00ff88' }}>Rewards Live</span>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: 'var(--text-primary)' }}>Play now and turn your score into cash rewards.</p>
          <p style={{ margin: '3px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>{rateText}</p>
        </div>
      </div>
    );
  }

  const seg = (val, unit) => (
    <div style={{ textAlign: 'center', minWidth: 34 }}>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: '#ffd93d', fontVariantNumeric: 'tabular-nums', textShadow: '0 0 14px rgba(255,217,61,0.56)' }}>
        {String(val).padStart(2, '0')}
      </div>
      <div style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{unit}</div>
    </div>
  );
  const sep = <span style={{ fontSize: 15, fontWeight: 700, color: '#ffd93d', opacity: 0.5, alignSelf: 'flex-start', marginTop: 1 }}>:</span>;

  return (
    <div style={{ borderRadius: 10, overflow: 'hidden', marginBottom: 10, border: '1px solid rgba(255,217,61,0.22)' }}>
      <div style={{ padding: '8px 10px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(255,217,61,0.7)', display: 'inline-block', boxShadow: '0 0 6px rgba(255,217,61,0.7)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#ffd93d' }}>Starts in</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {time.days > 0 && <>{seg(time.days, 'days')}{sep}</>}
          {seg(time.hours, 'hrs')}{sep}
          {seg(time.mins, 'min')}{sep}
          {seg(time.secs, 'sec')}
        </div>
      </div>
    </div>
  );
}

function RewardPeriodCountdown({ days, hours, minutes, slug, anchor }) {
  const periodMs = (days * 86400000) + (hours * 3600000) + (minutes * 60000);
  const anchorMs = anchor ? new Date(anchor).getTime() : 0;
  const [periodEndsAt, setPeriodEndsAt] = useState(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/scores/period-remaining/${slug}`)
      .then(r => r.json())
      .then(data => { if (!cancelled && data.periodEndsAt) setPeriodEndsAt(new Date(data.periodEndsAt)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [slug]);

  const [time, setTime] = useState(() => {
    const elapsed = Date.now() - anchorMs;
    const rem = periodMs - (elapsed % periodMs);
    return calcTime(Date.now() + rem);
  });

  useEffect(() => {
    const tick = () => {
      let remaining;
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
      setTime({
        days: Math.floor(remaining / 86400000),
        hours: Math.floor((remaining % 86400000) / 3600000),
        mins: Math.floor((remaining % 3600000) / 60000),
        secs: Math.floor((remaining % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [periodMs, periodEndsAt, anchorMs]);

  return (
    <div className="flex items-center gap-1.5 mt-3" style={{ color: 'rgba(255,217,61,0.9)' }}>
      <span style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, letterSpacing: '0.2px' }}>Game ends & best score freezes in</span>
      <span style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {time.days > 0 && `${time.days}d `}
        {String(time.hours).padStart(2, '0')}:{String(time.mins).padStart(2, '0')}:{String(time.secs).padStart(2, '0')}
      </span>
    </div>
  );
}

export default function GameCard({ game, i, isLoggedIn }) {
  const thumb = game.thumbnail ? `${GAMES_BASE}/${game.gamePath}/${game.thumbnail}` : null;

  const calcEffective = () => {
    const now = new Date();

    if (game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd) {
      return now >= new Date(game.scheduleStart) && now < new Date(game.scheduleEnd) && !game.prizesDistributed;
    }

    return game.isLive;
  };

  const [effectiveLive, setEffectiveLive] = useState(calcEffective);

  useEffect(() => {
    const hasCompetitiveSchedule = game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd;

    if (!hasCompetitiveSchedule) {
      setEffectiveLive(calcEffective());
      return;
    }

    setEffectiveLive(calcEffective());
    const id = setInterval(() => setEffectiveLive(calcEffective()), 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.gameType, game.isLive, game.scheduleStart, game.scheduleEnd, game.prizesDistributed]);

  const handlePlay = () => {
    if (!effectiveLive) return;
  };

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
        {game.entryFee > 0 && effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(168,85,247,0.12)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.3)' }}>🎟️ Entry PKR {game.entryFee}</span>
        )}
        {!game.entryFee && game.attemptCost > 0 && effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,217,61,0.12)', color: '#ffd93d', border: '1px solid rgba(255,217,61,0.3)' }}>🎯 PKR {game.attemptCost}/play</span>
        )}
        {!game.entryFee && !game.attemptCost && effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(0,255,136,0.12)', color: 'var(--neon-green)', border: '1px solid rgba(0,255,136,0.25)' }}>FREE</span>
        )}
        {!effectiveLive && (
          <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: 'rgba(255,45,120,0.15)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.3)' }}>Not Live</span>
        )}
      </div>

      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>{game.name}</h3>

        {game.gameType === 'rewarding' && (() => {
          const pd = game.rewardPeriodDays || 0;
          const ph = game.rewardPeriodHours || 0;
          const pm = game.rewardPeriodMinutes || 0;
          const hasPeriod = pd + ph + pm > 0;
          return (
            <div className="flex-1 flex flex-col items-center justify-center rounded-xl mb-3 px-4 py-5 text-center" style={{ background: 'linear-gradient(135deg, rgba(0,255,136,0.08), rgba(255,217,61,0.06))', border: '1px solid rgba(0,255,136,0.15)' }}>
              <span style={{ fontSize: 34, lineHeight: 1, marginBottom: 10 }}>💰</span>
              <span className="font-bold" style={{ color: '#00ff88', fontSize: 17 }}>Play &amp; Earn Cash Rewards</span>
              <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0', fontSize: 13.5 }}>Score points and win real money!</p>
              {hasPeriod && <RewardPeriodCountdown days={pd} hours={ph} minutes={pm} slug={game.slug} anchor={game.periodAnchor} />}
            </div>
          );
        })()}

        {game.gameType === 'competitive' && game.prizes?.length > 0 && (
          <div className="mb-3 px-3 py-2 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(255,217,61,0.08), rgba(168,85,247,0.08))', border: '1px solid rgba(255,217,61,0.15)' }}>
            <div className="flex items-center gap-2 mb-1">
              <span style={{ fontSize: 14 }}>🏆</span>
              <span className="text-[11px] font-bold" style={{ color: '#ffd93d' }}>Compete &amp; Win Prizes</span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 ml-6">
              {game.prizes.slice(0, 3).map((p, j) => {
                const icons = ['🥇', '🥈', '🥉'];
                return <span key={j} className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{icons[j]} PKR {p.toLocaleString()}</span>;
              })}
              {game.prizes.length > 3 && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{game.prizes.length - 3} more</span>}
            </div>
          </div>
        )}

        {game.gameType === 'competitive' && game.scheduleStart && game.scheduleEnd && (
          <CompetitiveSchedule
            scheduleStart={game.scheduleStart}
            scheduleEnd={game.scheduleEnd}
            prizesDistributed={game.prizesDistributed}
          />
        )}

        {!effectiveLive ? (
          <div className="btn-neon text-sm w-full text-center" style={{ opacity: 0.4, cursor: 'not-allowed' }}>
            🔒 Not Available
          </div>
        ) : (
          <Link href={`/games/${game.slug}`} className="btn-neon btn-neon-primary text-sm w-full text-center" style={{ textDecoration: 'none' }}>
            {game.entryFee > 0 ? `🎟️ Enter — PKR ${game.entryFee}` : game.attemptCost > 0 ? `🎯 Play — PKR ${game.attemptCost}/try` : '▶ Play Now'}
          </Link>
        )}
      </div>
    </div>
  );
}
