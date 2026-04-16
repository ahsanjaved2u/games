'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

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

function formatContestDate(start, end) {
  if (!start) return 'Unknown';
  const s = new Date(start);
  const e = end ? new Date(end) : null;
  const now = new Date();
  const showYear = s.getFullYear() !== now.getFullYear();
  const opts = { month: 'short', day: 'numeric' };
  const sStr = s.toLocaleDateString('en-US', opts) + (showYear ? `, ${s.getFullYear()}` : '');
  if (!e) return sStr;
  const eStr = e.toLocaleDateString('en-US', opts) + (showYear ? `, ${e.getFullYear()}` : '');
  return `${sStr} – ${eStr}`;
}

function getScoreEntryGameSlug(entry) {
  if (entry?.game) return entry.game;
  if (typeof entry?._id === 'string') return entry._id;
  if (entry?._id?.game) return entry._id.game;
  return null;
}

/* ─────────────── Admin Summary View ─────────────── */
function AdminSummaryView({ rows, loading }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3">
        <div className="loader" />
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading admin summary...</span>
      </div>
    );
  }

  const filteredRows = rows.filter((row) => {
    if (typeFilter === 'contest' && row.isRewarding) return false;
    if (typeFilter === 'rewarding' && !row.isRewarding) return false;
    if (typeFilter === 'liveContest' && (row.isRewarding || !row.isLive)) return false;
    if (typeFilter === 'liveRewarding' && (!row.isRewarding || !row.isLive)) return false;
    if (searchTerm.trim()) {
      const text = `${row.gameName || row.game} ${row.game}`.toLowerCase();
      if (!text.includes(searchTerm.trim().toLowerCase())) return false;
    }
    return true;
  });

  const contestCount = rows.filter(r => !r.isRewarding).length;
  const rewardingCount = rows.filter(r => r.isRewarding).length;
  const liveContestCount = rows.filter(r => !r.isRewarding && r.isLive).length;
  const liveRewardingCount = rows.filter(r => r.isRewarding && r.isLive).length;

  const filterBtn = (key, label) => ({
    background: typeFilter === key ? 'rgba(0,229,255,0.14)' : 'var(--subtle-overlay)',
    border: typeFilter === key ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
    color: typeFilter === key ? 'var(--neon-cyan)' : 'var(--text-secondary)',
  });

  return (
    <div className="space-y-3 animate-fade-in-up">
      <div className="glass-card p-3">
        <div className="grid grid-cols-5 gap-2 mb-3 text-center">
          <div className="rounded-lg py-2" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>
            <p className="text-base font-extrabold" style={{ color: 'var(--neon-cyan)' }}>{rows.length}</p>
            <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <p className="text-base font-extrabold" style={{ color: '#f59e0b' }}>{contestCount}</p>
            <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Contests</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <p className="text-base font-extrabold" style={{ color: '#00ff88' }}>{rewardingCount}</p>
            <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Rewarding</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-base font-extrabold" style={{ color: '#22c55e' }}>{liveContestCount}</p>
            <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Live Contest</p>
          </div>
          <div className="rounded-lg py-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
            <p className="text-base font-extrabold" style={{ color: '#22c55e' }}>{liveRewardingCount}</p>
            <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Live Rewarding</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterBtn('all')} onClick={() => setTypeFilter('all')}>All</button>
          <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterBtn('contest')} onClick={() => setTypeFilter('contest')}>🏆 Contests</button>
          <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterBtn('rewarding')} onClick={() => setTypeFilter('rewarding')}>💰 Rewarding</button>
          <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterBtn('liveContest')} onClick={() => setTypeFilter('liveContest')}>🟢 Live Contest</button>
          <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterBtn('liveRewarding')} onClick={() => setTypeFilter('liveRewarding')}>🟢 Live Rewarding</button>
        </div>

        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search game..."
          className="w-full text-sm rounded-lg px-3 py-2 outline-none"
          style={{
            background: 'var(--subtle-overlay)',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'var(--text-primary)',
          }}
        />
      </div>

      <div className="glass-card overflow-hidden" style={{ maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
        {filteredRows.length === 0 ? (
          <div className="text-center py-12">
            <span style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: 0.35 }}>📋</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No {typeFilter === 'all' ? '' : typeFilter} entries found.</p>
          </div>
        ) : (
        <div className="overflow-x-auto" style={{ overflowY: 'auto', flex: 1 }}>
          <table className="w-full min-w-[1200px]">
            <thead className="sticky top-0 z-20">
              <tr style={{ background: 'var(--bg-card, #141428)' }}>
                <th className="text-left text-[10px] uppercase tracking-wider px-4 py-2 sticky left-0 z-30" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>
                  Game / Contest
                </th>
                {Array.from({ length: 10 }).map((_, idx) => (
                  <th key={idx} className="text-center text-[10px] uppercase tracking-wider px-2 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>
                    #{idx + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                return (
                  <tr key={`${row.game}-${row.contestId || ''}-${row.sessionId || ''}-${row.periodStart || ''}`} style={{ borderTop: '1px solid var(--subtle-border)' }}>
                    <td className="px-4 py-3 sticky left-0 z-10" style={{ background: 'var(--bg-card)' }}>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {row.gameName || row.game}
                        <span className="text-[10px] font-normal ml-1" style={{ color: row.isRewarding ? '#00ff88' : '#f59e0b' }}>({row.isRewarding ? 'Rewarding' : 'Contest'})</span>
                      </p>
                      {(row.contestStart || row.periodStart) && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{formatContestDate(row.periodStart || row.contestStart, row.periodEnd || row.contestEnd)}</p>}
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                        color: row.isLive ? '#22c55e' : row.isEnded ? '#ff5c8a' : '#00ff88',
                        background: row.isLive ? 'rgba(34,197,94,0.15)' : row.isEnded ? 'rgba(255,92,138,0.15)' : 'rgba(0,255,136,0.15)',
                        border: row.isLive ? '1px solid rgba(34,197,94,0.35)' : row.isEnded ? '1px solid rgba(255,92,138,0.35)' : '1px solid rgba(0,255,136,0.35)',
                      }}>
                        {row.isLive ? 'LIVE' : row.isEnded ? 'ENDED' : 'REWARDING'}
                      </span>
                    </td>

                    {Array.from({ length: 10 }).map((_, idx) => {
                      const winner = row.winners?.[idx];
                      return (
                        <td key={idx} className="px-2 py-3 text-center align-top" style={{ minWidth: 95 }}>
                          {winner ? (
                            <div>
                              <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{winner.name}</p>
                              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{winner.score}</p>
                              {(!row.isRewarding && row.isLive) ? <p className="text-[10px] font-semibold italic" style={{ color: 'var(--text-muted)' }}>Pending</p> : winner.earnedPkr > 0 && <p className="text-[10px] font-semibold" style={{ color: '#00ff88' }}>₨{winner.earnedPkr}</p>}
                            </div>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Summary View ─────────────── */
function SummaryView({ summaryData, loading, isLoggedIn, user, games }) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    setVisibleCount(12);
  }, [statusFilter, searchTerm, summaryData.length]);

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

  // One row per played entry (game + contest combo), newest first.
  // This intentionally repeats the same game if played in multiple contests.
  const summaryEntries = summaryData
    .map((entry, index) => {
      const slug = getScoreEntryGameSlug(entry);
      if (!slug) return null;

      const gameInfo = games.find(g => g.id === slug) || {
        id: slug,
        title: slug,
        color: 'var(--neon-cyan)',
        emoji: '🎮',
      };

      const timestamp = entry.contestStart || entry.periodStart || entry.lastPlayed || 0;

      return {
        ...entry,
        _slug: slug,
        _game: gameInfo,
        _key: `${slug}-${entry.contestId || entry.contest || ''}-${entry.periodStart || ''}-${index}`,
        _sortTs: new Date(timestamp).getTime() || 0,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b._sortTs - a._sortTs);

  if (summaryEntries.length === 0) {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <span style={{ fontSize: 44, display: 'block', marginBottom: 12, opacity: 0.4 }}>🎮</span>
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>No games played yet</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Play a game to see your stats here!</p>
        <a href="/games" className="btn-neon btn-neon-primary text-sm mt-5 inline-block" style={{ textDecoration: 'none' }}>Browse Games</a>
      </div>
    );
  }

  const uniqueGames = new Set(summaryEntries.map(e => e._slug)).size;
  const totalContests = summaryEntries.filter(e => e.contestId || e.contest).length;
  const totalSessions = summaryEntries.filter(e => !(e.contestId || e.contest)).length;

  const filteredEntries = summaryEntries.filter((entry) => {
    const status = (entry.contestId || entry.contest) ? (entry.isLive ? 'live' : 'ended') : 'standard';
    if (statusFilter !== 'all' && status !== statusFilter) return false;

    const text = `${entry._game.title} ${entry._slug}`.toLowerCase();
    if (searchTerm.trim() && !text.includes(searchTerm.trim().toLowerCase())) return false;

    return true;
  });

  const visibleEntries = filteredEntries.slice(0, visibleCount);

  const filterButtonStyle = (key) => ({
    background: statusFilter === key ? 'rgba(0,229,255,0.14)' : 'var(--subtle-overlay)',
    border: statusFilter === key ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
    color: statusFilter === key ? 'var(--neon-cyan)' : 'var(--text-secondary)',
  });

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Greeting */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold" style={{
            background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))', color: '#fff',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <p className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>{user?.name}&apos;s Overview</p>
        </div>
        <p className="text-xs text-right shrink-0" style={{ color: 'var(--text-muted)' }}>
          {summaryEntries.length} entr{summaryEntries.length !== 1 ? 'ies' : 'y'}
          {` · ${uniqueGames} game${uniqueGames !== 1 ? 's' : ''}`}
          {totalContests > 0 && ` · ${totalContests} contest${totalContests !== 1 ? 's' : ''}`}
          {totalSessions > 0 && ` · ${totalSessions} session${totalSessions !== 1 ? 's' : ''}`}
        </p>
      </div>

      <div className="glass-card overflow-hidden">
        {/* ── TEMPORARILY HIDDEN for launch ──────────────────────────────────────
            Hiding the stats summary (Entries / Live / Ended / Standard) and the
            filter tabs (All / Live Contest / Ended Contest / Standard/Rewarding)
            plus the Search box because they confuse new users when contest
            activity is low. Re-enable this block once we have enough contests
            and active players to make the filters meaningful.
            ────────────────────────────────────────────────────────────────────── */}
        {false && (
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--subtle-border)', background: 'var(--subtle-overlay)' }}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3 text-center">
            <div className="rounded-lg py-2" style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)' }}>
              <p className="text-lg font-extrabold" style={{ color: 'var(--neon-cyan)' }}>{summaryEntries.length}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Entries</p>
            </div>
            <div className="rounded-lg py-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <p className="text-lg font-extrabold" style={{ color: '#22c55e' }}>{liveCount}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Live</p>
            </div>
            <div className="rounded-lg py-2" style={{ background: 'rgba(255,92,138,0.08)', border: '1px solid rgba(255,92,138,0.2)' }}>
              <p className="text-lg font-extrabold" style={{ color: '#ff5c8a' }}>{endedCount}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Ended</p>
            </div>
            <div className="rounded-lg py-2" style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}>
              <p className="text-lg font-extrabold" style={{ color: 'var(--text-primary)' }}>{standardCount}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Standard / Rewarding</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-3">
            <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterButtonStyle('all')} onClick={() => setStatusFilter('all')}>All</button>
            <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterButtonStyle('live')} onClick={() => setStatusFilter('live')}>🟢 Live Contest</button>
            <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterButtonStyle('ended')} onClick={() => setStatusFilter('ended')}>🔴 Ended Contest</button>
            <button className="text-xs font-semibold px-3 py-1 rounded-full" style={filterButtonStyle('standard')} onClick={() => setStatusFilter('standard')}>🎮 Standard / Rewarding</button>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search game..."
            className="w-full text-sm rounded-lg px-3 py-2 outline-none"
            style={{
              background: 'var(--subtle-overlay)',
              border: '1px solid rgba(255,255,255,0.12)',
              color: 'var(--text-primary)',
            }}
          />
        </div>
        )}{/* END TEMPORARILY HIDDEN */}

        <div className="hidden sm:grid px-4 py-2 text-[10px] uppercase tracking-wider font-bold" style={{
          gridTemplateColumns: summaryEntries.some(e => e.earnedPkr > 0 || (!!(e.contestId || e.contest) && !!e.isLive)) ? '1.4fr 1fr 0.7fr 0.7fr 0.6fr 0.6fr' : '1.4fr 1fr 0.7fr 0.7fr 0.6fr',
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--subtle-border)',
          background: 'rgba(255,255,255,0.015)',
        }}>
          <span>Game / Contest</span>
          <span>Status</span>
          <span className="text-center">Rank</span>
          <span className="text-center">Score</span>
          {summaryEntries.some(e => e.earnedPkr > 0 || (!!(e.contestId || e.contest) && !!e.isLive)) && <span className="text-center">PKR</span>}
          <span className="text-right">Plays</span>
        </div>

        {visibleEntries.length === 0 ? (
          <div className="text-center py-10">
            <span style={{ fontSize: 28, display: 'block', marginBottom: 8, opacity: 0.35 }}>🔎</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No entries match your filter.</p>
          </div>
        ) : (
          visibleEntries.map((entry) => {
            const game = entry._game;
            const isContestEntry = !!(entry.contestId || entry.contest);
            const isPeriodEntry = !!entry.periodStart;
            const isLive = !!entry.isLive;
            const status = (isContestEntry || isPeriodEntry) ? (isLive ? 'LIVE' : 'ENDED') : 'STANDARD';
            const statusColor = (isContestEntry || isPeriodEntry) ? (isLive ? '#22c55e' : '#ff5c8a') : 'var(--text-muted)';
            const subtitle = isContestEntry
              ? formatContestDate(entry.contestStart, entry.contestEnd)
              : isPeriodEntry
                ? formatContestDate(entry.periodStart, entry.periodEnd)
                : `Last played: ${entry.lastPlayed ? new Date(entry.lastPlayed).toLocaleString() : 'Unknown'}`;

            return (
              <div key={entry._key} className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.045)' }}>
                <div className="sm:hidden">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ fontSize: 18 }}>{game.emoji}</span>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {game.title}
                        <span className="text-[10px] font-normal ml-1" style={{ color: isContestEntry ? '#f59e0b' : isPeriodEntry ? '#00ff88' : 'var(--text-muted)' }}>({isContestEntry ? 'Contest' : 'Reward'})</span>
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      color: statusColor,
                      background: (isContestEntry || isPeriodEntry) ? (isLive ? 'rgba(34,197,94,0.15)' : 'rgba(255,92,138,0.15)') : 'var(--subtle-border)',
                      border: (isContestEntry || isPeriodEntry) ? (isLive ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,92,138,0.35)') : '1px solid rgba(255,255,255,0.2)',
                    }}>{status}</span>
                  </div>
                  <p className="text-[11px] mb-2" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
                  <div className={`grid ${(entry.earnedPkr > 0 || (isContestEntry && isLive)) ? 'grid-cols-4' : 'grid-cols-3'} text-center`}>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: isLive ? game.color : 'var(--text-primary)' }}>#{entry.rank || '—'}</p>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Rank</p>
                    </div>
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{entry.bestScore ?? '—'}</p>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Score</p>
                    </div>
                    {(isContestEntry && isLive) ? (
                    <div>
                      <p className="text-sm font-extrabold italic" style={{ color: 'var(--text-muted)' }}>Pending</p>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Prize</p>
                    </div>
                    ) : entry.earnedPkr > 0 && (
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: '#00ff88' }}>₨{entry.earnedPkr}</p>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Earned</p>
                    </div>
                    )}
                    <div>
                      <p className="text-sm font-extrabold" style={{ color: 'var(--text-primary)' }}>{entry.totalPlays ?? 0}</p>
                      <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Plays</p>
                    </div>
                  </div>
                </div>

                <div className="hidden sm:grid items-center" style={{ gridTemplateColumns: summaryEntries.some(e => e.earnedPkr > 0 || (!!(e.contestId || e.contest) && !!e.isLive)) ? '1.4fr 1fr 0.7fr 0.7fr 0.6fr 0.6fr' : '1.4fr 1fr 0.7fr 0.7fr 0.6fr' }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 min-w-0">
                      <span style={{ fontSize: 18 }}>{game.emoji}</span>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                        {game.title}
                        <span className="text-[10px] font-normal ml-1" style={{ color: isContestEntry ? '#f59e0b' : isPeriodEntry ? '#00ff88' : 'var(--text-muted)' }}>({isContestEntry ? 'Contest' : 'Reward'})</span>
                      </p>
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full" style={{
                      color: statusColor,
                      background: (isContestEntry || isPeriodEntry) ? (isLive ? 'rgba(34,197,94,0.15)' : 'rgba(255,92,138,0.15)') : 'var(--subtle-border)',
                      border: (isContestEntry || isPeriodEntry) ? (isLive ? '1px solid rgba(34,197,94,0.35)' : '1px solid rgba(255,92,138,0.35)') : '1px solid rgba(255,255,255,0.2)',
                    }}>{status}</span>
                  </div>

                  <p className="text-center text-sm font-bold" style={{ color: isLive ? game.color : 'var(--text-primary)' }}>#{entry.rank || '—'}</p>
                  <p className="text-center text-sm font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{entry.bestScore ?? '—'}</p>
                  {summaryEntries.some(e => e.earnedPkr > 0 || (!!(e.contestId || e.contest) && !!e.isLive)) && <p className="text-center text-sm font-semibold italic" style={{ color: (isContestEntry && isLive) ? 'var(--text-muted)' : '#00ff88', fontStyle: (isContestEntry && isLive) ? 'italic' : 'normal' }}>{(isContestEntry && isLive) ? 'Pending' : entry.earnedPkr > 0 ? `₨${entry.earnedPkr}` : '—'}</p>}
                  <p className="text-right text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{entry.totalPlays ?? 0}</p>
                </div>
              </div>
            );
          })
        )}

        {filteredEntries.length > visibleCount && (
          <div className="px-4 py-3 text-center" style={{ borderTop: '1px solid var(--subtle-border)' }}>
            <button
              className="text-xs font-semibold px-3 py-2 rounded-lg"
              style={{
                background: 'rgba(0,229,255,0.1)',
                border: '1px solid rgba(0,229,255,0.28)',
                color: 'var(--neon-cyan)',
              }}
              onClick={() => setVisibleCount(c => c + 12)}
            >
              Load 12 More ({filteredEntries.length - visibleCount} left)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────── Game Leaderboard View ─────────────── */
function GameView({ game, isLoggedIn, authFetch, user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contests, setContests] = useState([]);
  const [selectedContest, setSelectedContest] = useState(null);
  const [contestsLoaded, setContestsLoaded] = useState(false);
  const [rewardPeriods, setRewardPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [periodsLoaded, setPeriodsLoaded] = useState(false);

  const isCompetitive = game.gameType === 'competitive';
  const isRewarding = game.gameType === 'rewarding';

  // Fetch contest periods (competitive)
  useEffect(() => {
    if (!isCompetitive) { setContestsLoaded(true); return; }
    fetch(`${API}/scores/contests/${game.id}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) { setContestsLoaded(true); return; }
        setContests(data);
        const current = data.find(c => c.isCurrent) || data[0];
        if (current) setSelectedContest(current.contestId);
        setContestsLoaded(true);
      })
      .catch(() => setContestsLoaded(true));
  }, [game.id, isCompetitive]);

  // Fetch reward periods (rewarding)
  useEffect(() => {
    if (!isRewarding) { setPeriodsLoaded(true); return; }
    fetch(`${API}/scores/reward-periods/${game.id}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data) || data.length === 0) { setPeriodsLoaded(true); return; }
        setRewardPeriods(data);
        const active = data.find(p => p.isActive) || data[0];
        if (active) setSelectedPeriod(active.periodStart);
        setPeriodsLoaded(true);
      })
      .catch(() => setPeriodsLoaded(true));
  }, [game.id, isRewarding]);

  useEffect(() => {
    if (!contestsLoaded || !periodsLoaded) return;
    setLoading(true);
    let url = `${API}/scores/leaderboard/${game.id}?limit=10`;
    if (isCompetitive && selectedContest) url += `&contestId=${encodeURIComponent(selectedContest)}`;
    if (isRewarding && selectedPeriod) url += `&periodStart=${encodeURIComponent(selectedPeriod)}`;
    fetch(url)
      .then(r => r.json())
      .then(data => { setLeaderboard(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [game.id, selectedContest, selectedPeriod, isCompetitive, isRewarding, contestsLoaded, periodsLoaded]);

  useEffect(() => {
    if (!isLoggedIn || !contestsLoaded || !periodsLoaded) { setMyStats(null); return; }
    let url = `/scores/me/${game.id}`;
    if (isCompetitive && selectedContest) url += `?contestId=${encodeURIComponent(selectedContest)}`;
    if (isRewarding && selectedPeriod) url += `?periodStart=${encodeURIComponent(selectedPeriod)}`;
    authFetch(url)
      .then(data => setMyStats(data))
      .catch(() => setMyStats(null));
  }, [game.id, isLoggedIn, authFetch, selectedContest, selectedPeriod, isCompetitive, isRewarding, contestsLoaded, periodsLoaded]);

  const activeContest = contests.find(c => c.contestId === selectedContest);
  const activePeriod = rewardPeriods.find(p => p.periodStart === selectedPeriod);
  const statusColor = activeContest?.isLive ? '#22c55e' : activeContest?.isEnded ? '#ff5c8a' : '#f59e0b';
  const statusLabel = activeContest?.isLive ? 'LIVE' : activeContest?.isEnded ? 'ENDED' : 'UPCOMING';

  return (
    <div className="space-y-4 animate-fade-in-up">

      {/* ── Main leaderboard card ── */}
      <div className="glass-card overflow-hidden">

        {/* Card header — game name + contest pill */}
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{
          background: `linear-gradient(135deg, ${game.color}12, transparent)`,
          borderBottom: `1px solid ${game.color}22`,
        }}>
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 20 }}>{game.emoji}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{game.title}</span>
          </div>
          {isCompetitive && activeContest && (
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full" style={{
              background: `${statusColor}18`,
              border: `1px solid ${statusColor}40`,
              color: statusColor,
            }}>
              {statusLabel} · {formatContestDate(activeContest.contestStart, activeContest.contestEnd)}
            </span>
          )}
          {isRewarding && activePeriod && (
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full" style={{
              background: activePeriod.isActive ? 'rgba(0,255,136,0.15)' : 'rgba(255,92,138,0.15)',
              border: activePeriod.isActive ? '1px solid rgba(0,255,136,0.35)' : '1px solid rgba(255,92,138,0.35)',
              color: activePeriod.isActive ? '#00ff88' : '#ff5c8a',
            }}>
              {activePeriod.isActive ? 'ACTIVE' : 'ENDED'}
            </span>
          )}
        </div>

        {/* Contest tabs — compact scrollable chips (competitive only) */}
        {isCompetitive && contests.length > 1 && (
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b" style={{ borderColor: 'var(--subtle-border)', scrollbarWidth: 'none' }}>
            {contests.map(c => {
              const isActive = c.contestId === selectedContest;
              const sColor = c.isLive ? '#22c55e' : c.isEnded ? '#ff5c8a' : '#f59e0b';
              return (
                <button
                  key={c.contestId}
                  onClick={() => setSelectedContest(c.contestId)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap transition-all text-[11px] font-semibold flex-shrink-0"
                  style={{
                    background: isActive ? `${game.color}20` : 'var(--subtle-overlay)',
                    border: `1px solid ${isActive ? game.color + '50' : 'var(--subtle-border)'}`,
                    color: isActive ? game.color : 'var(--text-muted)',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sColor, display: 'inline-block', flexShrink: 0 }} />
                  {formatContestDate(c.contestStart, c.contestEnd)}
                </button>
              );
            })}
          </div>
        )}

        {/* Reward period tabs — compact scrollable chips (rewarding only) */}
        {isRewarding && rewardPeriods.length > 0 && (
          <div className="flex gap-1.5 px-3 py-2 overflow-x-auto border-b" style={{ borderColor: 'var(--subtle-border)', scrollbarWidth: 'none' }}>
            {rewardPeriods.map((p, idx) => {
              const isSelected = p.periodStart === selectedPeriod;
              const sColor = p.isActive ? '#00ff88' : '#ff5c8a';
              const label = (p.isActive ? 'Current' : `Period ${rewardPeriods.length - idx}`) + ' · ' + formatContestDate(p.periodStart, p.periodEnd);
              return (
                <button
                  key={p.periodStart}
                  onClick={() => setSelectedPeriod(p.periodStart)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full whitespace-nowrap transition-all text-[11px] font-semibold flex-shrink-0"
                  style={{
                    background: isSelected ? `${game.color}20` : 'var(--subtle-overlay)',
                    border: `1px solid ${isSelected ? game.color + '50' : 'var(--subtle-border)'}`,
                    color: isSelected ? game.color : 'var(--text-muted)',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: sColor, display: 'inline-block', flexShrink: 0 }} />
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {/* My stats inline row — only if logged in and played (competitive only) */}
        {!isRewarding && isLoggedIn && myStats && myStats.totalPlays > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5" style={{
            background: `${game.color}08`,
            borderBottom: `1px solid ${game.color}18`,
          }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{
              background: `linear-gradient(135deg, ${game.color}, #a855f7)`, color: '#fff',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {myStats.totalPlays} played</span>
            </span>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-sm font-extrabold" style={{ color: game.color }}>#{myStats.rank}</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Rank</p>
              </div>
              {!isRewarding && (
              <div>
                <p className="text-sm font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{myStats.bestScore}</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Best</p>
              </div>
              )}
              {(isCompetitive && activeContest?.isLive) ? (
              <div>
                <p className="text-sm font-extrabold italic" style={{ color: 'var(--text-muted)' }}>Pending</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Prize</p>
              </div>
              ) : myStats.earnedPkr > 0 && (
              <div>
                <p className="text-sm font-extrabold" style={{ color: '#00ff88' }}>₨{myStats.earnedPkr}</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Earned</p>
              </div>
              )}
            </div>
          </div>
        )}

        {/* Column headers */}
        <div className="grid px-4 py-2 text-[10px] uppercase tracking-wider font-bold" style={{
          gridTemplateColumns: (leaderboard.some(e => e.earnedPkr > 0) || (isCompetitive && activeContest?.isLive)) ? '40px 1fr 56px 56px 64px 64px' : '40px 1fr 56px 56px 64px',
          color: 'var(--text-muted)',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(255,255,255,0.012)',
        }}>
          <span>Rank</span>
          <span>Player</span>
          <span className="text-center">Pts</span>
          <span className="text-center">Time</span>
          <span className="text-right">Score</span>
          {(leaderboard.some(e => e.earnedPkr > 0) || (isCompetitive && activeContest?.isLive)) && <span className="text-right">PKR</span>}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="loader" />
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.3 }}>🎮</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scores yet — be the first!</p>
          </div>
        ) : (
          leaderboard.map((entry) => {
            const badge = rankBadge(entry.rank);
            const isMe = isLoggedIn && user && entry.userId === user._id;
            const hasEarningsCol = leaderboard.some(e => e.earnedPkr > 0) || (isCompetitive && activeContest?.isLive);
            return (
              <div
                key={entry.rank}
                className="grid px-4 py-2.5 items-center"
                style={{
                  gridTemplateColumns: hasEarningsCol ? '40px 1fr 56px 56px 64px 64px' : '40px 1fr 56px 56px 64px',
                  borderBottom: '1px solid rgba(255,255,255,0.035)',
                  background: isMe ? `${game.color}0a` : entry.rank <= 3 ? badge.bg : 'transparent',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-overlay)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isMe ? `${game.color}0a` : entry.rank <= 3 ? badge.bg : 'transparent'; }}
              >
                <span className="text-sm font-bold" style={{ color: badge.color }}>{badge.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{
                    background: entry.rank <= 3 ? `linear-gradient(135deg, ${badge.color}, ${game.color})` : 'var(--subtle-border)',
                    color: '#fff',
                  }}>
                    {entry.name?.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs font-semibold truncate" style={{ color: isMe ? game.color : 'var(--text-primary)' }}>
                    {entry.name}{isMe && <span className="ml-1 text-[9px] font-normal opacity-60">(you)</span>}
                  </p>
                </div>
                <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{entry.points}</span>
                <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{formatTime(entry.time)}</span>
                <span className="text-xs text-right font-bold" style={{ color: entry.rank <= 3 ? badge.color : 'var(--text-primary)' }}>{entry.score}</span>
                {hasEarningsCol && <span className="text-xs text-right font-semibold italic" style={{ color: (isCompetitive && activeContest?.isLive) ? 'var(--text-muted)' : '#00ff88' }}>{(isCompetitive && activeContest?.isLive) ? 'Pending' : entry.earnedPkr > 0 ? `₨${entry.earnedPkr}` : '—'}</span>}
              </div>
            );
          })
        )}
      </div>

      {/* Login prompt */}
      {!isLoggedIn && (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <a href="/login" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Log in</a> to save your scores and appear here.
        </p>
      )}
    </div>
  );
}

/* ─────────────── Entry Leaderboard View (player-specific contest/session) ─────────────── */
function EntryView({ game, entry, isLoggedIn, authFetch, user }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const isContest = !!entry.contestId;

  // Fetch leaderboard for this specific contest/session
  useEffect(() => {
    setLoading(true);
    let url = `${API}/scores/leaderboard/${encodeURIComponent(game.id)}?limit=10`;
    if (isContest) url += `&contestId=${encodeURIComponent(entry.contestId)}`;
    else if (entry.periodStart) {
      url += `&periodStart=${encodeURIComponent(entry.periodStart)}`;
      if (entry.sessionId) url += `&sessionId=${encodeURIComponent(entry.sessionId)}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(data => { setLeaderboard(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [game.id, entry.contestId, entry.periodStart, entry.sessionId, isContest]);

  // Fetch my stats for this contest/session
  useEffect(() => {
    if (!isLoggedIn) { setMyStats(null); return; }
    let url = `/scores/me/${encodeURIComponent(game.id)}`;
    if (isContest) url += `?contestId=${encodeURIComponent(entry.contestId)}`;
    else if (entry.periodStart) {
      url += `?periodStart=${encodeURIComponent(entry.periodStart)}`;
      if (entry.sessionId) url += `&sessionId=${encodeURIComponent(entry.sessionId)}`;
    }
    authFetch(url).then(data => setMyStats(data)).catch(() => setMyStats(null));
  }, [game.id, isLoggedIn, authFetch, entry.contestId, entry.periodStart, entry.sessionId, isContest]);

  const statusColor = entry.isLive ? '#22c55e' : entry.isEnded ? '#ff5c8a' : '#f59e0b';
  const statusLabel = entry.isLive ? 'LIVE' : entry.isEnded ? 'ENDED' : 'UPCOMING';
  const dateStr = formatContestDate(entry.contestStart || entry.periodStart, entry.contestEnd || entry.periodEnd);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="glass-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-4 py-3" style={{
          background: `linear-gradient(135deg, ${game.color}12, transparent)`,
          borderBottom: `1px solid ${game.color}22`,
        }}>
          <div className="flex items-center gap-2.5">
            <span style={{ fontSize: 20 }}>{game.emoji}</span>
            <div>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{game.title}</span>
              <span className="text-[11px] font-semibold ml-2" style={{ color: isContest ? '#f59e0b' : '#00ff88' }}>
                ({isContest ? 'Contest' : 'Rewarding'})
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {dateStr !== 'Unknown' && (
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{dateStr}</span>
            )}
            <span className="text-[10px] font-bold uppercase px-2.5 py-1 rounded-full" style={{
              background: `${statusColor}18`, border: `1px solid ${statusColor}40`, color: statusColor,
            }}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* My stats */}
        {isLoggedIn && myStats && myStats.totalPlays > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5" style={{
            background: `${game.color}08`, borderBottom: `1px solid ${game.color}18`,
          }}>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0" style={{
              background: `linear-gradient(135deg, ${game.color}, #a855f7)`, color: '#fff',
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs font-semibold flex-1 truncate" style={{ color: 'var(--text-secondary)' }}>
              {user?.name} <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>· {myStats.totalPlays} played</span>
            </span>
            <div className="flex items-center gap-4 text-right">
              <div>
                <p className="text-sm font-extrabold" style={{ color: game.color }}>#{myStats.rank}</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Rank</p>
              </div>
              <div>
                <p className="text-sm font-extrabold" style={{ color: 'var(--neon-yellow)' }}>{myStats.bestScore}</p>
                <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Best</p>
              </div>
              {(isContest && entry.isLive) ? (
                <div>
                  <p className="text-sm font-extrabold italic" style={{ color: 'var(--text-muted)' }}>Pending</p>
                  <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Prize</p>
                </div>
              ) : myStats.earnedPkr > 0 && (
                <div>
                  <p className="text-sm font-extrabold" style={{ color: '#00ff88' }}>₨{myStats.earnedPkr}</p>
                  <p className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>Earned</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Column headers — for rewarding, PKR column only shows in contest mode */}
        <div className="grid px-4 py-2 text-[10px] uppercase tracking-wider font-bold" style={{
          gridTemplateColumns: (isContest && (leaderboard.some(e => e.earnedPkr > 0) || entry.isLive)) ? '40px 1fr 56px 56px 64px 64px' : '40px 1fr 56px 56px 64px',
          color: 'var(--text-muted)', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.012)',
        }}>
          <span>Rank</span><span>Player</span><span className="text-center">Pts</span><span className="text-center">Time</span><span className="text-right">Score</span>
          {(isContest && (leaderboard.some(e => e.earnedPkr > 0) || entry.isLive)) && <span className="text-right">PKR</span>}
        </div>

        {/* Rows */}
        {loading ? (
          <div className="flex items-center justify-center py-12 gap-3">
            <div className="loader" /><span className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</span>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="text-center py-12">
            <span style={{ fontSize: 32, display: 'block', marginBottom: 8, opacity: 0.3 }}>🎮</span>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No scores yet — be the first!</p>
          </div>
        ) : (
          leaderboard.map((lbEntry) => {
            const badge = rankBadge(lbEntry.rank);
            const isMe = isLoggedIn && user && lbEntry.userId === user._id;
            const hasEarningsCol = isContest && (leaderboard.some(e => e.earnedPkr > 0) || entry.isLive);
            return (
              <div key={lbEntry.rank} className="grid px-4 py-2.5 items-center" style={{
                gridTemplateColumns: hasEarningsCol ? '40px 1fr 56px 56px 64px 64px' : '40px 1fr 56px 56px 64px',
                borderBottom: '1px solid rgba(255,255,255,0.035)',
                background: isMe ? `${game.color}0a` : lbEntry.rank <= 3 ? badge.bg : 'transparent',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--subtle-overlay)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = isMe ? `${game.color}0a` : lbEntry.rank <= 3 ? badge.bg : 'transparent'; }}
              >
                <span className="text-sm font-bold" style={{ color: badge.color }}>{badge.label}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{
                    background: lbEntry.rank <= 3 ? `linear-gradient(135deg, ${badge.color}, ${game.color})` : 'var(--subtle-border)', color: '#fff',
                  }}>{lbEntry.name?.charAt(0).toUpperCase()}</div>
                  <p className="text-xs font-semibold truncate" style={{ color: isMe ? game.color : 'var(--text-primary)' }}>
                    {lbEntry.name}{isMe && <span className="ml-1 text-[9px] font-normal opacity-60">(you)</span>}
                  </p>
                </div>
                <span className="text-xs text-center" style={{ color: 'var(--text-secondary)' }}>{lbEntry.points}</span>
                <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>{formatTime(lbEntry.time)}</span>
                <span className="text-xs text-right font-bold" style={{ color: lbEntry.rank <= 3 ? badge.color : 'var(--text-primary)' }}>{lbEntry.score}</span>
                {hasEarningsCol && <span className="text-xs text-right font-semibold italic" style={{ color: (isContest && entry.isLive) ? 'var(--text-muted)' : '#00ff88' }}>{(isContest && entry.isLive) ? 'Pending' : lbEntry.earnedPkr > 0 ? `₨${lbEntry.earnedPkr}` : '—'}</span>}
              </div>
            );
          })
        )}
      </div>

      {!isLoggedIn && (
        <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          <a href="/login" style={{ color: 'var(--neon-cyan)', textDecoration: 'none', fontWeight: 600 }}>Log in</a> to save your scores and appear here.
        </p>
      )}
    </div>
  );
}

/* ═══════════════════ Main Page ═══════════════════ */
export default function LeaderboardPage() {
  const [selected, setSelected] = useState('summary');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [games, setGames] = useState([]);
  const [gamesLoading, setGamesLoading] = useState(true);
  const [summaryData, setSummaryData] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [adminSummaryData, setAdminSummaryData] = useState([]);
  const [adminSummaryLoading, setAdminSummaryLoading] = useState(false);
  const dropdownRef = useRef(null);
  const { isLoggedIn, authFetch, user, isAdmin } = useAuth();

  // Fetch all games from backend
  useEffect(() => {
    fetch(`${API}/games`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) { setGamesLoading(false); return; }
        setGames(data.map(g => ({
          id: g.slug,
          title: g.name,
          color: g.color || '#00e5ff',
          emoji: '🎮',
          gameType: g.gameType || 'rewarding',
        })));
        setGamesLoading(false);
      })
      .catch(() => setGamesLoading(false));
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Fetch summary as one entry per played contest (and one entry per non-competitive game).
  useEffect(() => {
    if (isAdmin) {
      setSummaryData([]);
      setSummaryLoading(false);
      return;
    }

    if (!isLoggedIn) { setSummaryData([]); setSummaryLoading(false); return; }

    let cancelled = false;
    setSummaryLoading(true);

    authFetch('/scores/me')
      .then(async (data) => {
        if (!Array.isArray(data)) {
          if (!cancelled) { setSummaryData([]); setSummaryLoading(false); }
          return;
        }

        const slugs = [...new Set(data.map(entry => getScoreEntryGameSlug(entry)).filter(Boolean))];

        const entriesBySlug = await Promise.all(
          slugs.map(async (slug) => {
            const results = [];

            // ── Check contests the player played ──
            try {
              const contestRes = await fetch(`${API}/scores/contests/${encodeURIComponent(slug)}`);
              const contestData = contestRes.ok ? await contestRes.json() : [];
              const contests = Array.isArray(contestData) ? contestData : [];

              if (contests.length > 0) {
                const contestEntries = await Promise.all(
                  contests.map(async (contest) => {
                    if (!contest?.contestId) return null;
                    try {
                      const stats = await authFetch(`/scores/me/${slug}?contestId=${encodeURIComponent(contest.contestId)}`);
                      if ((stats?.totalPlays || 0) <= 0) return null;
                      return {
                        game: slug,
                        contestId: contest.contestId,
                        contestStart: contest.contestStart,
                        contestEnd: contest.contestEnd,
                        periodStart: null,
                        periodEnd: null,
                        isLive: !!contest.isLive,
                        isEnded: !!contest.isEnded,
                        rank: stats.rank ?? null,
                        bestScore: stats.bestScore ?? 0,
                        earnedPkr: stats.earnedPkr ?? 0,
                        totalPlays: stats.totalPlays ?? 0,
                        lastPlayed: stats?.record?.updatedAt || contest.contestEnd || contest.contestStart || null,
                      };
                    } catch { return null; }
                  })
                );
                results.push(...contestEntries.filter(Boolean));
              }
            } catch {}

            // ── Check reward-period sessions the player played ──
            try {
              const periodsRes = await fetch(`${API}/scores/reward-periods/${encodeURIComponent(slug)}`);
              const periodsData = periodsRes.ok ? await periodsRes.json() : [];
              const periods = Array.isArray(periodsData) ? periodsData : [];

              if (periods.length > 0) {
                const periodEntries = await Promise.all(
                  periods.map(async (period) => {
                    if (!period?.periodStart) return null;
                    try {
                      let pUrl = `/scores/me/${encodeURIComponent(slug)}?periodStart=${encodeURIComponent(period.periodStart)}`;
                      if (period.session) pUrl += `&sessionId=${encodeURIComponent(String(period.session))}`;
                      const stats = await authFetch(pUrl);
                      if ((stats?.totalPlays || 0) <= 0) return null;
                      return {
                        game: slug,
                        contestId: null,
                        periodStart: period.periodStart,
                        periodEnd: period.periodEnd,
                        sessionId: period.session ? String(period.session) : null,
                        contestStart: null,
                        contestEnd: null,
                        isLive: !!period.isActive,
                        isEnded: !period.isActive,
                        rank: stats.rank ?? null,
                        bestScore: stats.bestScore ?? 0,
                        earnedPkr: stats.earnedPkr ?? 0,
                        totalPlays: stats.totalPlays ?? 0,
                        lastPlayed: stats?.record?.updatedAt || null,
                      };
                    } catch { return null; }
                  })
                );
                results.push(...periodEntries.filter(Boolean));
              }
            } catch {}

            return results;
          })
        );

        const expandedEntries = entriesBySlug.flat().sort((a, b) => {
          const aTs = new Date(a.contestStart || a.periodStart || a.lastPlayed || 0).getTime();
          const bTs = new Date(b.contestStart || b.periodStart || b.lastPlayed || 0).getTime();
          return bTs - aTs;
        });

        if (!cancelled) {
          setSummaryData(expandedEntries);
          setSummaryLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) { setSummaryData([]); setSummaryLoading(false); }
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, authFetch, isAdmin]);

  // Admin summary: all contests across all games with top-10 winners per contest
  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      setAdminSummaryData([]);
      setAdminSummaryLoading(false);
      return;
    }

    let cancelled = false;
    setAdminSummaryLoading(true);

    const buildFallbackAdminRows = async () => {
      const competitiveGames = games.filter(g => g.gameType === 'competitive');
      const rewardingGames = games.filter(g => g.gameType === 'rewarding');

      // Build competitive rows (per contest)
      const competitiveRows = await Promise.all(
        competitiveGames.map(async (game) => {
          try {
            const contestsRes = await fetch(`${API}/scores/contests/${encodeURIComponent(game.id)}`);
            const contestsData = contestsRes.ok ? await contestsRes.json() : [];
            const contests = Array.isArray(contestsData) ? contestsData : [];

            if (contests.length === 0) return [];

            const rows = await Promise.all(
              contests.map(async (contest) => {
                if (!contest?.contestId) return null;
                try {
                  const lbRes = await fetch(
                    `${API}/scores/leaderboard/${encodeURIComponent(game.id)}?limit=10&contestId=${encodeURIComponent(contest.contestId)}`
                  );
                  const lbData = lbRes.ok ? await lbRes.json() : [];
                  const leaderboard = Array.isArray(lbData) ? lbData : [];

                  if (leaderboard.length === 0) return null;

                  return {
                    game: game.id,
                    gameName: game.title,
                    contestId: contest.contestId,
                    contestStart: contest.contestStart,
                    contestEnd: contest.contestEnd,
                    isCurrent: !!contest.isCurrent,
                    isLive: !!contest.isLive,
                    isEnded: !!contest.isEnded,
                    isRewarding: false,
                    winners: leaderboard.slice(0, 10).map((entry, idx) => ({
                      rank: idx + 1,
                      userId: entry.userId,
                      name: entry.name,
                      score: entry.score,
                      earnedPkr: entry.earnedPkr || 0,
                    })),
                  };
                } catch {
                  return null;
                }
              })
            );

            return rows.filter(Boolean);
          } catch {
            return [];
          }
        })
      );

      // Build rewarding rows (one row per period per rewarding game)
      const rewardingRowsNested = await Promise.all(
        rewardingGames.map(async (game) => {
          try {
            const periodsRes = await fetch(`${API}/scores/reward-periods/${encodeURIComponent(game.id)}`);
            const periodsData = periodsRes.ok ? await periodsRes.json() : [];
            const periods = Array.isArray(periodsData) ? periodsData : [];

            if (periods.length > 0) {
              const periodRows = await Promise.all(
                periods.map(async (period) => {
                  try {
                    const lbRes = await fetch(`${API}/scores/leaderboard/${encodeURIComponent(game.id)}?limit=10&periodStart=${encodeURIComponent(period.periodStart)}`);
                    const lbData = lbRes.ok ? await lbRes.json() : [];
                    const lb = Array.isArray(lbData) ? lbData : [];
                    if (lb.length === 0) return null;
                    return {
                      game: game.id, gameName: game.title,
                      contestId: null, contestStart: null, contestEnd: null,
                      periodStart: period.periodStart, periodEnd: period.periodEnd,
                      isCurrent: false, isLive: !!period.isActive, isEnded: !period.isActive,
                      isRewarding: true,
                      winners: lb.slice(0, 10).map((e, i) => ({ rank: i + 1, userId: e.userId, name: e.name, score: e.score, earnedPkr: e.earnedPkr || 0 })),
                    };
                  } catch { return null; }
                })
              );
              return periodRows.filter(Boolean);
            }

            const lbRes = await fetch(`${API}/scores/leaderboard/${encodeURIComponent(game.id)}?limit=10`);
            const lbData = lbRes.ok ? await lbRes.json() : [];
            const leaderboard = Array.isArray(lbData) ? lbData : [];
            if (leaderboard.length === 0) return [];
            return [{
              game: game.id, gameName: game.title,
              contestId: null, contestStart: null, contestEnd: null,
              periodStart: null, periodEnd: null,
              isCurrent: false, isLive: false, isEnded: false,
              isRewarding: true,
              winners: leaderboard.slice(0, 10).map((entry, idx) => ({
                rank: idx + 1, userId: entry.userId, name: entry.name, score: entry.score, earnedPkr: entry.earnedPkr || 0,
              })),
            }];
          } catch {
            return [];
          }
        })
      );
      const rewardingRows = rewardingRowsNested.flat();

      // Rewarding rows first, then competitive sorted by date
      const allCompetitive = competitiveRows
        .flat()
        .filter(Boolean)
        .sort((a, b) => new Date(b.contestStart || 0).getTime() - new Date(a.contestStart || 0).getTime());

      return [...allCompetitive, ...rewardingRows];
    };

    authFetch('/scores/admin/contest-summary')
      .then(async (data) => {
        if (cancelled) return;

        const rows = Array.isArray(data) ? data : [];
        if (rows.length > 0) {
          setAdminSummaryData(rows);
          setAdminSummaryLoading(false);
          return;
        }

        // Fallback: derive admin rows from existing public APIs.
        const fallbackRows = await buildFallbackAdminRows();
        if (cancelled) return;
        setAdminSummaryData(fallbackRows);
        setAdminSummaryLoading(false);
      })
      .catch(async () => {
        if (cancelled) return;

        const fallbackRows = await buildFallbackAdminRows();
        if (cancelled) return;
        setAdminSummaryData(fallbackRows);
        setAdminSummaryLoading(false);
      });

    return () => { cancelled = true; };
  }, [isLoggedIn, isAdmin, authFetch, games]);

  // Build dropdown options:
  // - Admin: all contests/sessions from adminSummaryData
  // - Regular user: every contest/session entry the player has played in
  const options = [
    { id: 'summary', label: 'Summary', emoji: '📊' },
    ...(() => {
      if (isAdmin) {
        return adminSummaryData.map((row, idx) => {
          const isContest = !row.isRewarding;
          const tag = isContest ? 'Contest' : 'Rewarding';
          const uniqueId = isContest
            ? `admin_contest_${row.contestId || idx}`
            : `admin_period_${row.game}_${row.sessionId || idx}_${row.periodStart || ''}`;
          return {
            id: uniqueId,
            label: row.gameName || row.game,
            tag,
            emoji: '🎮',
            entryData: {
              contestId: row.contestId || null,
              periodStart: row.periodStart || null,
              periodEnd: row.periodEnd || null,
              sessionId: row.sessionId || (row.session ? String(row.session) : null),
              contestStart: row.contestStart || null,
              contestEnd: row.contestEnd || null,
              isLive: !!row.isLive,
              isEnded: !!row.isEnded,
            },
            gameInfo: games.find(g => g.id === row.game) || { id: row.game, title: row.gameName || row.game, color: '#00e5ff', emoji: '🎮', gameType: isContest ? 'competitive' : 'rewarding' },
          };
        });
      }
      return summaryData.map((entry, idx) => {
        const slug = getScoreEntryGameSlug(entry);
        const gInfo = games.find(g => g.id === slug);
        const gameName = gInfo?.title || slug;
        const isContest = !!entry.contestId;
        const tag = isContest ? 'Contest' : 'Rewarding';
        const uniqueId = isContest
          ? `contest_${entry.contestId}`
          : entry.periodStart
            ? `period_${slug}_${entry.periodStart}`
            : `standard_${slug}_${idx}`;
        return {
          id: uniqueId,
          label: gameName,
          tag,
          emoji: gInfo?.emoji || '🎮',
          entryData: entry,
          gameInfo: gInfo || { id: slug, title: gameName, color: '#00e5ff', emoji: '🎮', gameType: isContest ? 'competitive' : 'rewarding' },
        };
      });
    })(),
  ];

  const activeOption = options.find(o => o.id === selected) || options[0];

  return (
    <div className="bg-grid relative" style={{ overflowX: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', top: '0%', right: '8%' }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 260, maxHeight: 260, background: 'var(--neon-purple)', bottom: '8%', left: '5%', animationDelay: '4s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-12 sm:pt-8 sm:pb-16">

        {/* Header + Dropdown */}
        <div className="flex items-center justify-between mb-6 animate-fade-in-up" style={{ position: 'relative', zIndex: 60 }}>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 34, filter: 'drop-shadow(0 0 14px rgba(255,215,0,0.4))' }}>🏆</span>
            <h1 className="text-xl sm:text-2xl font-extrabold" style={{ color: 'var(--text-primary)' }}>Leaderboard</h1>
          </div>

          <div className="relative" ref={dropdownRef} style={{ zIndex: 60 }}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{ background: 'var(--input-bg)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', minWidth: 200 }}
            >
              <span>{activeOption.emoji}</span>
              <span className="flex-1 text-left truncate">
                {activeOption.label}
                {activeOption.tag && <span className="text-[10px] font-normal ml-1 opacity-70">({activeOption.tag})</span>}
              </span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ transition: 'transform 0.2s', transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 max-h-72 overflow-y-auto py-1.5 rounded-xl shadow-2xl animate-fade-in-up" style={{
                zIndex: 9999, background: 'var(--bg-card, #141428)',
                border: '1px solid var(--input-border)', backdropFilter: 'blur(16px)',
              }}>
                {options.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => { setSelected(opt.id); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-left"
                    style={{
                      color: selected === opt.id ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      background: selected === opt.id ? 'rgba(0,229,255,0.08)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (selected !== opt.id) e.currentTarget.style.background = 'var(--subtle-overlay)'; }}
                    onMouseLeave={e => { if (selected !== opt.id) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span>{opt.emoji}</span>
                    <span className="flex-1 truncate">
                      {opt.label}
                      {opt.tag && <span className="text-[10px] font-normal ml-1 opacity-60">({opt.tag})</span>}
                    </span>
                    {selected === opt.id && (
                      <svg className="ml-auto flex-shrink-0" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
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
          isAdmin ? (
            <AdminSummaryView rows={adminSummaryData} loading={adminSummaryLoading || gamesLoading} />
          ) : (
            <SummaryView summaryData={summaryData} loading={summaryLoading || gamesLoading} isLoggedIn={isLoggedIn} user={user} games={games} />
          )
        ) : activeOption?.entryData ? (
          <EntryView game={activeOption.gameInfo} entry={activeOption.entryData} isLoggedIn={isLoggedIn} authFetch={authFetch} user={user} />
        ) : null}
      </div>

      <style>{`
        .loader {
          width: 22px; height: 22px;
          border: 2px solid color-mix(in srgb, var(--neon-cyan) 20%, transparent);
          border-top: 2px solid var(--neon-cyan);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}
