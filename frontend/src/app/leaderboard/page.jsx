'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const GAMES = [
  { id: 'bubble-shooter', title: 'Neon Bubble Shooter', color: '#00e5ff', emoji: '🫧' },
  // future games go here
];

function formatTime(sec) {
  if (!sec && sec !== 0) return '—';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

const rankBadge = (rank) => {
  if (rank === 1) return { bg: 'rgba(255,215,0,0.13)', color: '#ffd700', label: '🥇' };
  if (rank === 2) return { bg: 'rgba(192,192,192,0.10)', color: '#c0c0c0', label: '🥈' };
  if (rank === 3) return { bg: 'rgba(205,127,50,0.10)', color: '#cd7f32', label: '🥉' };
  return { bg: 'transparent', color: 'var(--text-muted)', label: `#${rank}` };
};

/* ─────────────── Summary View ─────────────── */
function SummaryView({ summaryData, loading, isLoggedIn, user }) {
  if (!isLoggedIn) {
    return (
      <div className="text-center py-10 animate-fade-in-up">
        <span style={{ fontSize: 48, display: 'block', marginBottom: 12, filter: 'drop-shadow(0 0 14px rgba(255,215,0,0.35))' }}>🏆</span>
        <p className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Welcome to the Leaderboard</p>
        <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Log in to track your rank across all games!</p>
        <a href="/login" className="btn-neon btn-neon-primary text-sm" style={{ textDecoration: 'none' }}>Log In</a>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <div className="loader" />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading summary...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Greeting */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold" style={{
          background: 'linear-gradient(135deg, #00e5ff, #a855f7)', color: '#fff',
        }}>
          {user?.name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name}&apos;s Overview</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Your performance across all games</p>
        </div>
      </div>

      {/* Game summary cards */}
      {GAMES.map((game, i) => {
        const stats = summaryData.find(s => s._id === game.id);
        return (
          <div key={game.id} className="glass-card overflow-hidden animate-fade-in-up" style={{ animationDelay: `${i * 0.06}s` }}>
            {/* Game header bar */}
            <div className="flex items-center gap-3 px-4 py-3" style={{
              background: `linear-gradient(135deg, ${game.color}10, transparent)`,
              borderBottom: `1px solid ${game.color}20`,
            }}>
              <span style={{ fontSize: 22 }}>{game.emoji}</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{game.title}</span>
            </div>

            {stats ? (
              <div className="grid grid-cols-3 divide-x divide-white/5 text-center py-4">
                <div>
                  <p className="text-2xl font-extrabold" style={{ color: game.color }}>#{stats.rank || '—'}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Rank</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{stats.bestScore}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Best Score</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>{stats.totalPlays}</p>
                  <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: 'var(--text-muted)' }}>Games Played</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-5">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No games played yet</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────── Game Leaderboard View ─────────────── */
function GameView({ game, isLoggedIn, authFetch, user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/scores/leaderboard/${game.id}?limit=10`)
      .then(r => r.json())
      .then(data => { setLeaderboard(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [game.id]);

  useEffect(() => {
    if (!isLoggedIn) { setMyStats(null); return; }
    authFetch(`/scores/me/${game.id}`)
      .then(data => setMyStats(data))
      .catch(() => setMyStats(null));
  }, [game.id, isLoggedIn, authFetch]);

  return (
    <div className="space-y-5 animate-fade-in-up">
      {/* Player stats card */}
      {isLoggedIn && myStats && myStats.totalPlays > 0 && (
        <div className="glass-card p-4" style={{
          border: `1px solid ${game.color}30`,
          background: `${game.color}08`,
        }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{
                background: `linear-gradient(135deg, ${game.color}, #a855f7)`, color: '#fff',
              }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Your Stats — {game.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{myStats.totalPlays} games played</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-center">
              <div>
                <p className="text-2xl font-extrabold" style={{ color: game.color }}>#{myStats.rank}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Rank</p>
              </div>
              <div>
                <p className="text-2xl font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{myStats.bestScore}</p>
                <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Best Score</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard table */}
      <div className="glass-card overflow-hidden">
        {/* Table header */}
        <div className="flex items-center gap-3 px-4 py-3" style={{
          background: `linear-gradient(135deg, ${game.color}10, transparent)`,
          borderBottom: `1px solid ${game.color}20`,
        }}>
          <span style={{ fontSize: 20 }}>{game.emoji}</span>
          <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{game.title} — Top 10</span>
        </div>

        {/* Column headers */}
        <div className="grid gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider font-bold" style={{
          gridTemplateColumns: '44px 1fr 62px 62px 72px',
          color: 'var(--text-muted)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <span>Rank</span>
          <span>Player</span>
          <span className="text-center">Points</span>
          <span className="text-center">Time</span>
          <span className="text-right">Score</span>
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-14 gap-3">
            <div className="loader" />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-14">
            <span style={{ fontSize: 36, display: 'block', marginBottom: 8, opacity: 0.35 }}>🎮</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scores yet. Be the first to play!</p>
          </div>
        ) : (
          leaderboard.map((entry) => {
            const badge = rankBadge(entry.rank);
            const isMe = isLoggedIn && user && entry.userId === user._id;
            return (
              <div
                key={entry.rank}
                className="grid gap-2 px-4 py-3 items-center transition-colors duration-150"
                style={{
                  gridTemplateColumns: '44px 1fr 62px 62px 72px',
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  background: isMe ? 'rgba(0,229,255,0.07)' : entry.rank <= 3 ? badge.bg : 'transparent',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isMe ? 'rgba(0,229,255,0.07)' : entry.rank <= 3 ? badge.bg : 'transparent'; }}
              >
                <span className="text-base font-bold" style={{ color: badge.color }}>{badge.label}</span>

                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{
                    background: entry.rank <= 3 ? `linear-gradient(135deg, ${badge.color}, ${game.color})` : 'rgba(255,255,255,0.08)',
                    color: '#fff',
                  }}>
                    {entry.name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-sm font-semibold truncate" style={{ color: isMe ? game.color : 'var(--text-primary)' }}>
                    {entry.name} {isMe && <span className="text-[10px] font-normal" style={{ color: game.color }}>(you)</span>}
                  </p>
                </div>

                <span className="text-sm text-center font-medium" style={{ color: 'var(--text-secondary)' }}>{entry.points}</span>
                <span className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>{formatTime(entry.time)}</span>
                <span className="text-sm text-right font-bold" style={{ color: entry.rank <= 3 ? badge.color : 'var(--text-primary)' }}>{entry.score}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Not logged in prompt */}
      {!isLoggedIn && (
        <div className="text-center mt-2">
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            Log in to save your scores and appear on the leaderboard!
          </p>
          <a href="/login" className="btn-neon btn-neon-primary text-sm" style={{ textDecoration: 'none' }}>Log In</a>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Main Page ═══════════════════ */
export default function LeaderboardPage() {
  const [selected, setSelected] = useState('summary');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const dropdownRef = useRef(null);
  const { isLoggedIn, authFetch, user } = useAuth();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch summary (user's stats across all games) + rank per game
  useEffect(() => {
    if (!isLoggedIn) { setSummaryData([]); setSummaryLoading(false); return; }
    setSummaryLoading(true);

    authFetch('/scores/me')
      .then(async (data) => {
        if (!Array.isArray(data)) { setSummaryData([]); setSummaryLoading(false); return; }

        const withRank = await Promise.all(
          data.map(async (entry) => {
            try {
              const gameData = await authFetch(`/scores/me/${entry._id}`);
              return { ...entry, rank: gameData.rank };
            } catch {
              return { ...entry, rank: null };
            }
          })
        );
        setSummaryData(withRank);
        setSummaryLoading(false);
      })
      .catch(() => { setSummaryData([]); setSummaryLoading(false); });
  }, [isLoggedIn, authFetch]);

  const options = [
    { id: 'summary', label: 'Summary', emoji: '📊' },
    ...GAMES.map(g => ({ id: g.id, label: g.title, emoji: g.emoji })),
  ];

  const activeOption = options.find(o => o.id === selected) || options[0];
  const activeGame = GAMES.find(g => g.id === selected);

  return (
    <div className="bg-grid relative" style={{ overflowX: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      {/* Glow orbs */}
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: '#00e5ff', top: '0%', right: '8%' }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 260, maxHeight: 260, background: '#a855f7', bottom: '8%', left: '5%', animationDelay: '4s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-8 sm:pb-16">

        {/* Header + Dropdown row */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up" style={{ position: 'relative', zIndex: 60 }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 34, filter: 'drop-shadow(0 0 14px rgba(255,215,0,0.4))' }}>🏆</span>
            <h1 className="text-xl sm:text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Leaderboard</h1>
          </div>

          {/* Custom dropdown */}
          <div className="relative" ref={dropdownRef} style={{ zIndex: 60 }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-primary)',
                minWidth: 180,
              }}
            >
              <span>{activeOption.emoji}</span>
              <span className="flex-1 text-left">{activeOption.label}</span>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 py-1.5 rounded-xl shadow-2xl animate-fade-in-up" style={{
                zIndex: 9999,
                background: 'var(--bg-card, #141428)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(16px)',
              }}>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSelected(opt.id); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors text-left"
                    style={{
                      color: selected === opt.id ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      background: selected === opt.id ? 'rgba(0,229,255,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selected !== opt.id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                    onMouseLeave={e => { if (selected !== opt.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                    {selected === opt.id && (
                      <svg className="ml-auto" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        {selected === 'summary' ? (
          <SummaryView
            summaryData={summaryData}
            loading={summaryLoading}
            isLoggedIn={isLoggedIn}
            user={user}
          />
        ) : activeGame ? (
          <GameView
            game={activeGame}
            isLoggedIn={isLoggedIn}
            authFetch={authFetch}
            user={user}
          />
        ) : null}
      </div>

      <style>{`
        .loader {
          width: 22px; height: 22px;
          border: 2px solid rgba(0,229,255,0.2);
          border-top: 2px solid #00e5ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
