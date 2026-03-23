'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import TopUpModal from '@/components/TopUpModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const money = (value) => `PKR ${parseFloat(Number(value || 0).toFixed(2)).toLocaleString()}`;

const getScoreEntryGameSlug = (entry) => {
  if (entry?.game) return entry.game;
  if (typeof entry?._id === 'string') return entry._id;
  if (entry?._id?.game) return entry._id.game;
  return null;
};

const getScoreEntryContestId = (entry) => {
  if (entry?.contestId) return entry.contestId;
  if (entry?._id?.contestId && entry._id.contestId !== '__none__') return entry._id.contestId;
  return null;
};

const toArray = (value) => (Array.isArray(value) ? value : []);

async function buildAdminSummaryFallback(authFetch) {
  const [gamesData, walletsData, pendingWithdrawalsData] = await Promise.all([
    authFetch('/games/admin/all').catch(() => authFetch('/games').catch(() => [])),
    authFetch('/wallet/admin/all').catch(() => []),
    authFetch('/wallet/admin/withdrawals?status=pending').catch(() => []),
  ]);

  const games = toArray(gamesData);
  const playerWallets = toArray(walletsData).filter((wallet) => wallet?.user && wallet.user.role !== 'admin');
  const pendingWithdrawals = toArray(pendingWithdrawalsData);

  const transactionGroups = await Promise.all(
    playerWallets.map(async (wallet) => {
      const userId = wallet?.user?._id;
      if (!userId) return [];
      const txns = await authFetch(`/wallet/admin/transactions/${userId}`).catch(() => []);
      return toArray(txns);
    })
  );

  let totalWonAmount = 0;
  let totalRedeemedAmount = 0;

  transactionGroups.forEach((txns) => {
    txns.forEach((txn) => {
      const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
      if (!validStatus) return;

      if (txn?.type === 'credit') {
        totalWonAmount += Number(txn?.amount || 0);
        return;
      }

      if (txn?.type === 'debit' || txn?.type === 'withdrawal') {
        totalRedeemedAmount += Number(txn?.amount || 0);
      }
    });
  });

  const totalBalanceAmount = playerWallets.reduce((sum, wallet) => sum + Number(wallet?.balance || 0), 0);
  const redemptionRate = totalWonAmount > 0
    ? Number(((totalRedeemedAmount / totalWonAmount) * 100).toFixed(2))
    : 0;

  const topPlayersByBalance = [...playerWallets]
    .sort((a, b) => Number(b?.balance || 0) - Number(a?.balance || 0))
    .slice(0, 5)
    .map((wallet) => ({
      userId: String(wallet?.user?._id || ''),
      name: wallet?.user?.name || 'Unknown',
      email: wallet?.user?.email || '',
      balanceAmount: Number(wallet?.balance || 0),
    }));

  const totalGames = games.length;
  const competitiveGames = games.filter((game) => game?.gameType === 'competitive').length;
  const rewardingGames = games.filter((game) => game?.gameType !== 'competitive').length;
  const liveGames = games.filter((game) => !!game?.isLive).length;

  const now = new Date();
  const sevenDaysAgoTs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  const next24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const contestRoundsSet = new Set();
  const contestsJoinedSet = new Set();
  const activeGames7d = new Set();

  const gameAttemptStats = await Promise.all(
    games
      .filter((game) => !!game?.slug)
      .map(async (game) => {
        const slug = game.slug;
        const playerSet = new Set();

        let contestAttempts = 0;
        let rewardingAttempts = 0;

        const markRecentPlay = (entry) => {
          const ts = entry?.lastPlayed ? new Date(entry.lastPlayed).getTime() : 0;
          if (ts && !Number.isNaN(ts) && ts >= sevenDaysAgoTs) {
            activeGames7d.add(slug);
          }
        };

        const addAttempts = (entry, contestId) => {
          const rawAttempts = Number(entry?.totalPlays ?? 1);
          const attempts = Number.isFinite(rawAttempts) && rawAttempts > 0 ? rawAttempts : 1;
          const userId = entry?.userId ? String(entry.userId) : '';

          if (contestId) {
            contestAttempts += attempts;
            if (userId) contestsJoinedSet.add(`${userId}::${contestId}`);
          } else {
            rewardingAttempts += attempts;
          }

          if (userId) playerSet.add(userId);
          markRecentPlay(entry);
        };

        if (game?.gameType === 'competitive') {
          const contests = toArray(await authFetch(`/scores/contests/${encodeURIComponent(slug)}`).catch(() => []));

          await Promise.all(
            contests.map(async (contest) => {
              const contestId = contest?.contestId;
              if (!contestId) return;

              const leaderboard = toArray(
                await authFetch(`/scores/leaderboard/${encodeURIComponent(slug)}?limit=5000&contestId=${encodeURIComponent(contestId)}`).catch(() => [])
              );

              if (leaderboard.length === 0) return;

              contestRoundsSet.add(`${slug}::${contestId}`);
              leaderboard.forEach((entry) => addAttempts(entry, contestId));
            })
          );
        } else {
          const leaderboard = toArray(
            await authFetch(`/scores/leaderboard/${encodeURIComponent(slug)}?limit=5000`).catch(() => [])
          );

          leaderboard.forEach((entry) => addAttempts(entry, null));
        }

        return {
          game: slug,
          gameName: game?.name || slug,
          contestAttempts,
          rewardingAttempts,
          totalAttempts: contestAttempts + rewardingAttempts,
          playerCount: playerSet.size,
        };
      })
  );

  const totalContestAttempts = gameAttemptStats.reduce((sum, row) => sum + Number(row?.contestAttempts || 0), 0);
  const totalRewardingAttempts = gameAttemptStats.reduce((sum, row) => sum + Number(row?.rewardingAttempts || 0), 0);
  const totalAttempts = totalContestAttempts + totalRewardingAttempts;
  const totalContestRounds = contestRoundsSet.size;
  const totalContestsJoined = contestsJoinedSet.size;

  const topGamesByAttempts = gameAttemptStats
    .filter((row) => Number(row?.totalAttempts || 0) > 0)
    .sort((a, b) => Number(b.totalAttempts || 0) - Number(a.totalAttempts || 0))
    .slice(0, 5)
    .map((row) => ({
      game: row.game,
      gameName: row.gameName,
      totalAttempts: Number(row.totalAttempts || 0),
      contestAttempts: Number(row.contestAttempts || 0),
      rewardingAttempts: Number(row.rewardingAttempts || 0),
      playerCount: Number(row.playerCount || 0),
    }));

  const contestsEnding24h = games.filter((game) => {
    if (game?.gameType !== 'competitive' || !game?.scheduleEnd || game?.prizesDistributed) return false;
    const endDate = new Date(game.scheduleEnd);
    return endDate > now && endDate <= next24h;
  }).length;

  const prizesPendingDistribution = games.filter((game) => {
    if (game?.gameType !== 'competitive' || !game?.scheduleEnd || game?.prizesDistributed) return false;
    const endDate = new Date(game.scheduleEnd);
    return endDate <= now;
  }).length;

  const gamesNoPlays7d = games.filter((game) => game?.slug && !activeGames7d.has(game.slug)).length;

  return {
    summary: {
      totalGames,
      competitiveGames,
      rewardingGames,
      liveGames,
      totalContestRounds,
      totalContestsJoined,
      totalContestAttempts,
      totalRewardingAttempts,
      totalAttempts,
      totalWonAmount,
      totalRedeemedAmount,
      totalBalanceAmount,
      redemptionRate,
      pendingWithdrawalsCount: pendingWithdrawals.length,
      pendingWithdrawalsAmount: pendingWithdrawals.reduce((sum, txn) => sum + Number(txn?.amount || 0), 0),
      contestsEnding24h,
      gamesNoPlays7d,
      prizesPendingDistribution,
    },
    topGamesByAttempts,
    topPlayersByBalance,
    generatedAt: now.toISOString(),
  };
}

export default function ProfilePage() {
  const { isLoggedIn, isAdmin, authFetch, user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState(null);
  const [adminProfile, setAdminProfile] = useState(null);
  const [showAllGames, setShowAllGames] = useState(false);
  const [adminPanel, setAdminPanel] = useState('snapshot');
  const [playerPanel, setPlayerPanel] = useState('snapshot');
  const [showTopUp, setShowTopUp] = useState(false);

  const panelButtonStyle = (active) => ({
    background: active ? 'rgba(0,229,255,0.14)' : 'rgba(255,255,255,0.04)',
    border: active ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
    color: active ? 'var(--neon-cyan)' : 'var(--text-secondary)',
  });

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!isLoggedIn) {
        if (!cancelled) {
          setLoading(false);
          setProfile(null);
        }
        return;
      }

      setLoading(true);
      setError('');

      if (isAdmin) {
        try {
          const meDataPromise = authFetch('/users/me').catch(() => ({ user: user || null }));

          let summaryData = null;
          try {
            summaryData = await authFetch('/users/admin/profile-summary');
          } catch {
            summaryData = await buildAdminSummaryFallback(authFetch);
          }

          const meData = await meDataPromise;

          if (!cancelled) {
            setAdminProfile({
              me: meData?.user || user || null,
              summary: summaryData?.summary || {},
              topGamesByAttempts: Array.isArray(summaryData?.topGamesByAttempts) ? summaryData.topGamesByAttempts : [],
              topPlayersByBalance: Array.isArray(summaryData?.topPlayersByBalance) ? summaryData.topPlayersByBalance : [],
              generatedAt: summaryData?.generatedAt || null,
            });
            setProfile(null);
            setAdminPanel('snapshot');
          }
        } catch (err) {
          if (!cancelled) {
            setError(err?.message || 'Could not load admin profile summary. Please try again.');
            setAdminProfile(null);
          }
        }

        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const [meData, scoresData, walletData, gamesData] = await Promise.all([
          authFetch('/users/me'),
          authFetch('/scores/me'),
          authFetch('/wallet'),
          fetch(`${API}/games`).then(async (res) => {
            if (!res.ok) return [];
            const payload = await res.json();
            return Array.isArray(payload) ? payload : [];
          }).catch(() => []),
        ]);

        const me = meData?.user || user || null;
        const rawScoreRows = Array.isArray(scoresData) ? scoresData : [];
        const txns = Array.isArray(walletData?.transactions) ? walletData.transactions : [];
        const walletSummary = walletData?.summary || null;
        const balanceAmount = Number(walletData?.balance || 0);

        const gameMap = {};
        (Array.isArray(gamesData) ? gamesData : []).forEach((g) => {
          if (!g?.slug) return;
          gameMap[g.slug] = g;
        });

        const knownGameSlugs = [...new Set(rawScoreRows.map((row) => getScoreEntryGameSlug(row)).filter(Boolean))];

        // Build normalized profile rows:
        // - Competitive rows: one per played contest (accurate contest count)
        // - Rewarding rows: one per game with aggregate plays
        const expandedPerGame = await Promise.all(
          knownGameSlugs.map(async (slug) => {
            const gameInfo = gameMap[slug];
            const baseRows = rawScoreRows.filter((row) => getScoreEntryGameSlug(row) === slug);
            const baseTotalPlays = baseRows.reduce((sum, row) => sum + Number(row?.totalPlays || 0), 0);
            const baseBestScore = baseRows.reduce((best, row) => Math.max(best, Number(row?.bestScore || 0)), 0);

            if (gameInfo?.gameType === 'competitive') {
              try {
                const contestsRes = await fetch(`${API}/scores/contests/${encodeURIComponent(slug)}`);
                const contestsData = contestsRes.ok ? await contestsRes.json() : [];
                const contests = Array.isArray(contestsData) ? contestsData : [];

                if (contests.length > 0) {
                  const contestRows = await Promise.all(
                    contests.map(async (contest) => {
                      if (!contest?.contestId) return null;

                      try {
                        const stats = await authFetch(`/scores/me/${slug}?contestId=${encodeURIComponent(contest.contestId)}`);
                        const plays = Number(stats?.totalPlays || 0);
                        if (plays <= 0) return null;

                        return {
                          game: slug,
                          contestId: contest.contestId,
                          contestStart: contest.contestStart || null,
                          contestEnd: contest.contestEnd || null,
                          isLive: Boolean(contest.isLive),
                          totalPlays: plays,
                          bestScore: Number(stats?.bestScore || 0),
                        };
                      } catch {
                        return null;
                      }
                    })
                  );

                  const playedContestRows = contestRows.filter(Boolean);
                  if (playedContestRows.length > 0) return playedContestRows;
                }
              } catch {
                // Fall back to base rows below.
              }

              if (baseTotalPlays > 0) {
                const fallbackContestId = getScoreEntryContestId(baseRows[0]) || `legacy-${slug}`;
                return [{
                  game: slug,
                  contestId: fallbackContestId,
                  contestStart: baseRows[0]?.contestStart || null,
                  contestEnd: baseRows[0]?.contestEnd || null,
                  isLive: Boolean(baseRows[0]?.isLive),
                  totalPlays: baseTotalPlays,
                  bestScore: baseBestScore,
                }];
              }

              return [];
            }

            // Rewarding game profile row
            try {
              const stats = await authFetch(`/scores/me/${slug}`);
              const plays = Number(stats?.totalPlays || 0);

              if (plays > 0) {
                return [{
                  game: slug,
                  contestId: null,
                  contestStart: null,
                  contestEnd: null,
                  isLive: false,
                  totalPlays: plays,
                  bestScore: Number(stats?.bestScore || baseBestScore || 0),
                }];
              }
            } catch {
              // Fall back to base rows below.
            }

            if (baseTotalPlays > 0) {
              return [{
                game: slug,
                contestId: null,
                contestStart: null,
                contestEnd: null,
                isLive: false,
                totalPlays: baseTotalPlays,
                bestScore: baseBestScore,
              }];
            }

            return [];
          })
        );

        const scoreRows = expandedPerGame.flat();
        const contestRows = scoreRows.filter((s) => !!s?.contestId);
        const rewardingRows = scoreRows.filter((s) => !s?.contestId);

        const contestPlays = contestRows.reduce((sum, row) => sum + Number(row?.totalPlays || 0), 0);
        const rewardingPlays = rewardingRows.reduce((sum, row) => sum + Number(row?.totalPlays || 0), 0);
        const totalPlays = contestPlays + rewardingPlays;

        const contestsPlayed = contestRows.length;
        const liveContestEntries = contestRows.filter((row) => !!row?.isLive).length;

        const fallbackWon = txns.reduce((sum, txn) => {
          const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
          if (!validStatus || txn?.type !== 'credit') return sum;
          return sum + Number(txn?.amount || 0);
        }, 0);

        const fallbackRedeemed = txns.reduce((sum, txn) => {
          const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
          const isRedeemed = txn?.type === 'debit' || txn?.type === 'withdrawal';
          if (!validStatus || !isRedeemed) return sum;
          return sum + Number(txn?.amount || 0);
        }, 0);

        const wonAmount = Number(walletSummary?.wonAmount ?? fallbackWon);
        const redeemedAmount = Number(walletSummary?.redeemedAmount ?? fallbackRedeemed);

        const uniqueGameSlugs = [...new Set(scoreRows.map((row) => row?.game).filter(Boolean))];

        const gamesPlayed = uniqueGameSlugs
          .map((slug) => {
            const rows = scoreRows.filter((row) => row?.game === slug);
            return {
              slug,
              name: gameMap[slug]?.name || slug,
              totalPlays: rows.reduce((sum, row) => sum + Number(row?.totalPlays || 0), 0),
              contests: rows.filter((row) => !!row?.contestId).length,
            };
          })
          .sort((a, b) => b.totalPlays - a.totalPlays);

        const lastPlayedTs = rawScoreRows.reduce((ts, row) => {
          const value = row?.lastPlayed || row?.contestStart || row?.contestEnd;
          const dateTs = value ? new Date(value).getTime() : 0;
          return Math.max(ts, Number.isNaN(dateTs) ? 0 : dateTs);
        }, 0);

        const lastPlayedAt = lastPlayedTs > 0 ? new Date(lastPlayedTs) : null;

        if (!cancelled) {
          setProfile({
            me,
            totals: {
              contestsPlayed,
              totalPlays,
              contestPlays,
              rewardingPlays,
              wonAmount,
              redeemedAmount,
              balanceAmount: Number(walletSummary?.balanceAmount ?? balanceAmount),
              uniqueGames: uniqueGameSlugs.length,
              liveContestEntries,
            },
            gamesPlayed,
            recentTransactions: txns.slice(0, 3),
            lastPlayedAt,
          });
          setAdminProfile(null);
          setShowAllGames(false);
          setPlayerPanel('snapshot');
        }
      } catch {
        if (!cancelled) {
          setError('Could not load profile data. Please try again.');
        }
      }

      if (!cancelled) setLoading(false);
    };

    load();
    return () => { cancelled = true; };
  }, [isLoggedIn, isAdmin, authFetch, user]);

  const joinedDateLabel = useMemo(() => {
    const date = profile?.me?.createdAt ? new Date(profile.me.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [profile?.me?.createdAt]);

  const adminJoinedDateLabel = useMemo(() => {
    const date = adminProfile?.me?.createdAt ? new Date(adminProfile.me.createdAt) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Unknown';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }, [adminProfile?.me?.createdAt]);

  const displayedGames = useMemo(() => {
    const games = profile?.gamesPlayed || [];
    if (showAllGames) return games;
    return games.slice(0, 5);
  }, [profile?.gamesPlayed, showAllGames]);

  if (!isLoggedIn) {
    return (
      <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="relative z-10 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="glass-card p-8 text-center" style={{ maxWidth: 420 }}>
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Login Required</p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>Please login to view your profile.</p>
            <Link href="/login" className="btn-neon btn-neon-primary text-sm" style={{ textDecoration: 'none' }}>
              Log In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    const summary = adminProfile?.summary || {};

    return (
      <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
        <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: '#a855f7', top: '4%', right: '8%', opacity: 0.24 }} />
        <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: '#00e5ff', bottom: '8%', left: '6%', opacity: 0.18 }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
          {loading ? (
            <div className="text-center py-24">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading admin summary...</p>
            </div>
          ) : error ? (
            <div className="glass-card p-8 text-center">
              <p className="text-sm" style={{ color: '#ff9f43' }}>{error}</p>
            </div>
          ) : (
            <>
              <div className="glass-card p-5 sm:p-6 mb-5 animate-fade-in-up">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0" style={{
                      background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(0,229,255,0.25))',
                      border: '1px solid rgba(168,85,247,0.25)',
                      color: '#fff',
                    }}>
                      {adminProfile?.me?.name?.charAt(0)?.toUpperCase() || 'A'}
                    </div>
                    <div className="min-w-0">
                      <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                        {adminProfile?.me?.name || 'Admin'}
                      </h1>
                      <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{adminProfile?.me?.email}</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        Joined {adminJoinedDateLabel}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Balance So Far</p>
                    <p className="text-2xl font-black" style={{ color: '#ffd93d' }}>
                      {money(summary.totalBalanceAmount)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="glass-card p-2 mb-4 animate-fade-in-up">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={panelButtonStyle(adminPanel === 'snapshot')}
                    onClick={() => setAdminPanel('snapshot')}
                  >
                    Snapshot
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={panelButtonStyle(adminPanel === 'insights')}
                    onClick={() => setAdminPanel('insights')}
                  >
                    Insights
                  </button>
                </div>
              </div>

              {adminPanel === 'snapshot' ? (
                <>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Total Games', value: Number(summary.totalGames || 0).toLocaleString(), color: '#00e5ff' },
                      { label: 'Competitive Games', value: Number(summary.competitiveGames || 0).toLocaleString(), color: '#a855f7' },
                      { label: 'Rewarding Games', value: Number(summary.rewardingGames || 0).toLocaleString(), color: '#22c55e' },
                      { label: 'Live Games', value: Number(summary.liveGames || 0).toLocaleString(), color: '#67e8f9' },
                    ].map((item) => (
                      <div key={item.label} className="glass-card p-4 animate-fade-in-up" style={{ border: `1px solid ${item.color}25` }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                        <p className="text-xl font-extrabold mt-1" style={{ color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
                    <div className="glass-card p-4 animate-fade-in-up lg:col-span-2" style={{ border: '1px solid rgba(0,229,255,0.22)' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Attempts Summary</p>
                      <p className="text-2xl font-extrabold mt-1" style={{ color: '#00e5ff' }}>
                        {Number(summary.totalAttempts || 0).toLocaleString()} Total Attempts
                      </p>
                      <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                        Contest Attempts {Number(summary.totalContestAttempts || 0).toLocaleString()} + Rewarding Attempts {Number(summary.totalRewardingAttempts || 0).toLocaleString()} = {Number(summary.totalAttempts || 0).toLocaleString()}
                      </p>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                        Contest Rounds: {Number(summary.totalContestRounds || 0).toLocaleString()} · Contests Joined: {Number(summary.totalContestsJoined || 0).toLocaleString()}
                      </p>
                    </div>

                    <div className="glass-card p-4 animate-fade-in-up" style={{ border: '1px solid rgba(255,217,61,0.22)' }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Redemption Rate</p>
                      <p className="text-2xl font-extrabold mt-1" style={{ color: '#ffd93d' }}>
                        {Number(summary.redemptionRate || 0).toLocaleString()}%
                      </p>
                      <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>
                        Redeemed / Won
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Total Won So Far', value: money(summary.totalWonAmount), color: '#00ff88' },
                      { label: 'Total Redeemed So Far', value: money(summary.totalRedeemedAmount), color: '#ff9f43' },
                      { label: 'Pending Withdrawals', value: `${Number(summary.pendingWithdrawalsCount || 0).toLocaleString()} · ${money(summary.pendingWithdrawalsAmount)}`, color: '#ffd93d' },
                    ].map((item) => (
                      <div key={item.label} className="glass-card p-4 animate-fade-in-up" style={{ border: `1px solid ${item.color}25` }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                        <p className="text-lg sm:text-xl font-extrabold mt-1 truncate" style={{ color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Top Games By Attempts</h2>
                        <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)' }}>
                          Top 5
                        </span>
                      </div>

                      {adminProfile?.topGamesByAttempts?.length ? (
                        <div className="space-y-2">
                          {adminProfile.topGamesByAttempts.map((game) => (
                            <div key={game.game} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{game.gameName}</p>
                                <p className="text-xs font-bold shrink-0" style={{ color: 'var(--neon-cyan)' }}>{Number(game.totalAttempts || 0).toLocaleString()}</p>
                              </div>
                              <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                                Contest {Number(game.contestAttempts || 0).toLocaleString()} · Rewarding {Number(game.rewardingAttempts || 0).toLocaleString()} · Players {Number(game.playerCount || 0).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No attempt data yet.</p>
                      )}
                    </div>

                    <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
                      <div className="flex items-center justify-between mb-3">
                        <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Top Players By Balance</h2>
                        <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(255,217,61,0.1)', color: '#ffd93d' }}>
                          Top 5
                        </span>
                      </div>

                      {adminProfile?.topPlayersByBalance?.length ? (
                        <div className="space-y-2">
                          {adminProfile.topPlayersByBalance.map((player) => (
                            <div key={player.userId} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{player.name}</p>
                                <p className="text-xs font-bold shrink-0" style={{ color: '#ffd93d' }}>{money(player.balanceAmount)}</p>
                              </div>
                              <p className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>{player.email}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No player balance data yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { label: 'Contests Ending In 24h', value: Number(summary.contestsEnding24h || 0).toLocaleString(), color: '#22c55e' },
                      { label: 'Games With No Plays (7d)', value: Number(summary.gamesNoPlays7d || 0).toLocaleString(), color: '#a855f7' },
                      { label: 'Prizes Pending Distribution', value: Number(summary.prizesPendingDistribution || 0).toLocaleString(), color: '#ff9f43' },
                    ].map((item) => (
                      <div key={item.label} className="glass-card p-4 animate-fade-in-up" style={{ border: `1px solid ${item.color}25` }}>
                        <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                        <p className="text-xl font-extrabold mt-1" style={{ color: item.color }}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: '#00e5ff', top: '4%', right: '8%', opacity: 0.25 }} />
      <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: '#a855f7', bottom: '8%', left: '6%', opacity: 0.2 }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {loading ? (
          <div className="text-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
          </div>
        ) : error ? (
          <div className="glass-card p-8 text-center">
            <p className="text-sm" style={{ color: '#ff9f43' }}>{error}</p>
          </div>
        ) : profile ? (
          <>
            <div className="glass-card p-5 sm:p-6 mb-5 animate-fade-in-up">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black shrink-0" style={{
                    background: 'linear-gradient(135deg, rgba(0,229,255,0.25), rgba(168,85,247,0.25))',
                    border: '1px solid rgba(0,229,255,0.25)',
                    color: '#fff',
                  }}>
                    {profile.me?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-extrabold truncate" style={{ color: 'var(--text-primary)' }}>
                      {profile.me?.name || 'Player'}
                    </h1>
                    <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{profile.me?.email}</p>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                      Joined {joinedDateLabel}
                      {profile.lastPlayedAt && ` · Last played ${profile.lastPlayedAt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Current Balance</p>
                  <p className="text-2xl font-black" style={{ color: '#ffd93d' }}>{money(profile.totals.balanceAmount)}</p>
                  <button
                    type="button"
                    onClick={() => setShowTopUp(true)}
                    className="mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,255,136,0.1))',
                      border: '1px solid rgba(0,229,255,0.35)',
                      color: 'var(--neon-cyan)',
                    }}
                  >
                    💳 Add Funds
                  </button>
                </div>
              </div>
            </div>

            <div className="glass-card p-2 mb-4 animate-fade-in-up">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={panelButtonStyle(playerPanel === 'snapshot')}
                  onClick={() => setPlayerPanel('snapshot')}
                >
                  Snapshot
                </button>
                <button
                  type="button"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg"
                  style={panelButtonStyle(playerPanel === 'activity')}
                  onClick={() => setPlayerPanel('activity')}
                >
                  Activity
                </button>
              </div>
            </div>

            {playerPanel === 'snapshot' ? (
              <>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-3">
                  <div className="glass-card p-4 animate-fade-in-up lg:col-span-2" style={{ border: '1px solid rgba(0,229,255,0.25)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Play Summary</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: '#00e5ff' }}>
                      {profile.totals.totalPlays.toLocaleString()} Total Plays
                    </p>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                      Contest Attempts {profile.totals.contestPlays.toLocaleString()} + Rewarding Plays {profile.totals.rewardingPlays.toLocaleString()} = {profile.totals.totalPlays.toLocaleString()}
                    </p>
                    <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                      Unique Contests Joined: {profile.totals.contestsPlayed.toLocaleString()} (one contest can have multiple attempts)
                    </p>
                  </div>

                  <div className="glass-card p-4 animate-fade-in-up" style={{ border: '1px solid rgba(103,232,249,0.25)' }}>
                    <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Games Played</p>
                    <p className="text-2xl font-extrabold mt-1" style={{ color: '#67e8f9' }}>{profile.totals.uniqueGames.toLocaleString()}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { label: 'Prize Won So Far', value: money(profile.totals.wonAmount), color: '#00ff88' },
                    { label: 'Prize Redeemed/Claimed', value: money(profile.totals.redeemedAmount), color: '#ff9f43' },
                    { label: 'Balance Amount', value: money(profile.totals.balanceAmount), color: '#ffd93d' },
                  ].map((item) => (
                    <div key={item.label} className="glass-card p-4 animate-fade-in-up" style={{ border: `1px solid ${item.color}25` }}>
                      <p className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                      <p className="text-lg sm:text-xl font-extrabold mt-1 truncate" style={{ color: item.color }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Games Played</h2>
                    <span className="text-[10px] px-2 py-1 rounded-full" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)' }}>
                      {profile.gamesPlayed.length} games
                    </span>
                  </div>

                  {profile.gamesPlayed.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No game history yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {displayedGames.map((game) => (
                        <div key={game.slug} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{game.name}</p>
                            <p className="text-xs font-bold shrink-0" style={{ color: 'var(--neon-cyan)' }}>{game.totalPlays} plays</p>
                          </div>
                          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                            {game.contests} contest entries
                          </p>
                        </div>
                      ))}

                      {profile.gamesPlayed.length > 5 && (
                        <button
                          type="button"
                          onClick={() => setShowAllGames((prev) => !prev)}
                          className="w-full text-xs font-semibold px-3 py-2 rounded-lg"
                          style={{
                            background: 'rgba(0,229,255,0.08)',
                            border: '1px solid rgba(0,229,255,0.2)',
                            color: 'var(--neon-cyan)',
                          }}
                        >
                          {showAllGames
                            ? 'Show Top 5'
                            : `View All Games (${profile.gamesPlayed.length})`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="glass-card p-4 sm:p-5 animate-fade-in-up">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Recent Wallet Activity</h2>
                    <Link href="/wallet" className="text-xs font-semibold" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
                      View Wallet
                    </Link>
                  </div>

                  {profile.recentTransactions.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {profile.recentTransactions.slice(0, 3).map((txn) => {
                        const isCredit = txn?.type === 'credit';
                        const isRedeemed = txn?.type === 'debit' || txn?.type === 'withdrawal';
                        const amountColor = isCredit ? '#00ff88' : isRedeemed ? '#ff9f43' : 'var(--text-secondary)';
                        const sign = isCredit ? '+' : isRedeemed ? '-' : '';

                        return (
                          <div key={txn._id} className="px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                                {txn.description || txn.type}
                              </p>
                              <p className="text-xs font-bold shrink-0" style={{ color: amountColor }}>
                                {sign}{money(txn.amount).replace('PKR ', '')}
                              </p>
                            </div>
                            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
                              {new Date(txn.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                              {` · ${txn.status || 'completed'}`}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>

      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          onSuccess={() => setShowTopUp(false)}
        />
      )}
    </div>
  );
}
