'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';

const EMPTY_SUMMARY = {
  totalClaimable: 0,
  rows: [],
  totals: {
    wonAmount: 0,
    redeemedAmount: 0,
    balanceAmount: 0,
  },
};

const EMPTY_PLAYER_DETAIL = {
  player: null,
  rows: [],
  totals: {
    wonAmount: 0,
    redeemedAmount: 0,
    balanceAmount: 0,
  },
  redeemedUnmappedAmount: 0,
};

function normalizeSummary(payload) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const totals = {
    wonAmount: Number(payload?.totals?.wonAmount || 0),
    redeemedAmount: Number(payload?.totals?.redeemedAmount || 0),
    balanceAmount: Number(payload?.totals?.balanceAmount || 0),
  };

  const normalizedRows = rows.map((row) => ({
    userId: typeof row.userId === 'string' ? row.userId : (row.userId?._id ? String(row.userId._id) : ''),
    playerName: row.playerName || 'Unknown',
    playerEmail: row.playerEmail || '',
    wonAmount: Number(row.wonAmount || 0),
    redeemedAmount: Number(row.redeemedAmount || 0),
    balanceAmount: Number(row.balanceAmount || 0),
  }));

  return {
    totalClaimable: Number(payload?.totalClaimable || totals.balanceAmount || 0),
    rows: normalizedRows,
    totals,
  };
}

function normalizePlayerDetail(payload, fallbackPlayer) {
  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  const totals = {
    wonAmount: Number(payload?.totals?.wonAmount || 0),
    redeemedAmount: Number(payload?.totals?.redeemedAmount || 0),
    balanceAmount: Number(payload?.totals?.balanceAmount || 0),
  };

  const normalizedRows = rows.map((row) => ({
    game: row.game || '',
    gameName: row.gameName || row.game || 'Unknown Game',
    contestId: row.contestId || '',
    contestStart: row.contestStart || null,
    contestEnd: row.contestEnd || null,
    rank: Number(row.rank || 0),
    bestScore: Number(row.bestScore || 0),
    totalPlays: Number(row.totalPlays || 0),
    wonAmount: Number(row.wonAmount || 0),
    redeemedAmount: Number(row.redeemedAmount || 0),
    balanceAmount: Number(row.balanceAmount || 0),
    isLive: Boolean(row.isLive),
    isEnded: Boolean(row.isEnded),
  }));

  return {
    player: {
      userId: payload?.player?.userId || fallbackPlayer?.userId || '',
      name: payload?.player?.name || fallbackPlayer?.playerName || 'Unknown Player',
      email: payload?.player?.email || fallbackPlayer?.playerEmail || '',
    },
    rows: normalizedRows,
    totals,
    redeemedUnmappedAmount: Number(payload?.redeemedUnmappedAmount || 0),
  };
}

function ClaimableSummaryContent() {
  const { authFetch } = useAuth();

  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedPlayerMeta, setSelectedPlayerMeta] = useState(null);
  const [playerDetail, setPlayerDetail] = useState(EMPTY_PLAYER_DETAIL);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString();
  };

  const buildFallbackSummary = async () => {
    const walletsData = await authFetch('/wallet/admin/all');
    const wallets = Array.isArray(walletsData) ? walletsData : [];
    const playerWallets = wallets.filter((w) => w?.user && w.user.role !== 'admin');

    const rows = await Promise.all(
      playerWallets.map(async (wallet) => {
        const userId = wallet.user?._id;
        const txnsData = userId ? await authFetch(`/wallet/admin/transactions/${userId}`) : [];
        const txns = Array.isArray(txnsData) ? txnsData : [];

        const wonAmount = txns.reduce((sum, txn) => {
          const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
          if (txn?.type !== 'credit' || !validStatus) return sum;
          return sum + Number(txn.amount || 0);
        }, 0);

        const redeemedAmount = txns.reduce((sum, txn) => {
          const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
          const isRedeemed = txn?.type === 'debit' || txn?.type === 'withdrawal';
          if (!isRedeemed || !validStatus) return sum;
          return sum + Number(txn.amount || 0);
        }, 0);

        return {
          userId,
          playerName: wallet.user?.name || 'Unknown',
          playerEmail: wallet.user?.email || '',
          wonAmount,
          redeemedAmount,
          balanceAmount: Number(wallet.balance || 0),
        };
      })
    );

    rows.sort((a, b) => b.balanceAmount - a.balanceAmount);

    const totals = rows.reduce(
      (acc, row) => {
        acc.wonAmount += row.wonAmount;
        acc.redeemedAmount += row.redeemedAmount;
        acc.balanceAmount += row.balanceAmount;
        return acc;
      },
      { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0 }
    );

    return {
      totalClaimable: totals.balanceAmount,
      rows,
      totals,
    };
  };

  const fetchSummary = async () => {
    setLoading(true);
    setSelectedUserId(null);
    setSelectedPlayerMeta(null);
    setPlayerDetail(EMPTY_PLAYER_DETAIL);
    setDetailError('');
    setDetailModalOpen(false);

    try {
      const data = await authFetch('/wallet/admin/claimable-summary');
      const normalized = normalizeSummary(data);

      // If endpoint is unavailable/old and returns empty, fallback to wallet+transactions.
      if (normalized.rows.length === 0 && normalized.totalClaimable === 0) {
        const fallback = await buildFallbackSummary();
        setSummary(fallback);
      } else {
        setSummary(normalized);
      }
    } catch {
      try {
        const fallback = await buildFallbackSummary();
        setSummary(fallback);
      } catch {
        setSummary(EMPTY_SUMMARY);
      }
    }

    setLoading(false);
  };

  const buildFallbackPlayerDetail = async (row) => {
    const userId = String(row?.userId || '');
    if (!userId) {
      return {
        player: { userId: '', name: row?.playerName || 'Unknown Player', email: row?.playerEmail || '' },
        rows: [],
        totals: { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0 },
        redeemedUnmappedAmount: 0,
      };
    }

    const [gamesData, txnsData] = await Promise.all([
      authFetch('/games'),
      authFetch(`/wallet/admin/transactions/${userId}`),
    ]);

    const games = Array.isArray(gamesData) ? gamesData : [];
    const txns = Array.isArray(txnsData) ? txnsData : [];
    const competitiveGames = games.filter((g) => g?.gameType === 'competitive' && g?.slug);

    const rowsPerGame = await Promise.all(
      competitiveGames.map(async (game) => {
        try {
          const contestsData = await authFetch(`/scores/contests/${encodeURIComponent(game.slug)}`);
          const contests = Array.isArray(contestsData) ? contestsData : [];

          const rows = await Promise.all(
            contests.map(async (contest) => {
              if (!contest?.contestId) return null;

              try {
                const leaderboardData = await authFetch(
                  `/scores/leaderboard/${encodeURIComponent(game.slug)}?limit=300&contestId=${encodeURIComponent(contest.contestId)}`
                );
                const leaderboard = Array.isArray(leaderboardData) ? leaderboardData : [];

                const entry = leaderboard.find((it) => String(it?.userId || '') === userId);
                if (!entry) return null;

                const rank = Number(entry.rank || 0);
                const prizes = Array.isArray(game.prizes) ? game.prizes : [];
                const wonAmount = rank > 0 ? Number(prizes[rank - 1] || 0) : 0;

                return {
                  game: game.slug,
                  gameName: game.name || game.slug,
                  contestId: contest.contestId,
                  contestStart: contest.contestStart || null,
                  contestEnd: contest.contestEnd || null,
                  rank,
                  bestScore: Number(entry.score || 0),
                  totalPlays: Number(entry.totalPlays || 0),
                  wonAmount,
                  redeemedAmount: 0,
                  balanceAmount: wonAmount,
                  isLive: Boolean(contest.isLive),
                  isEnded: Boolean(contest.isEnded),
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

    const chronRows = rowsPerGame
      .flat()
      .sort((a, b) => new Date(a.contestStart || 0).getTime() - new Date(b.contestStart || 0).getTime());

    const totalRedeemed = txns.reduce((sum, txn) => {
      const validStatus = txn?.status === 'completed' || txn?.status === 'pending';
      const isRedeemed = txn?.type === 'debit' || txn?.type === 'withdrawal';
      if (!validStatus || !isRedeemed) return sum;
      return sum + Number(txn.amount || 0);
    }, 0);

    let remainingRedeemed = totalRedeemed;
    chronRows.forEach((detailRow) => {
      if (detailRow.wonAmount <= 0 || remainingRedeemed <= 0) {
        detailRow.redeemedAmount = 0;
        detailRow.balanceAmount = detailRow.wonAmount;
        return;
      }

      const applied = Math.min(remainingRedeemed, detailRow.wonAmount);
      detailRow.redeemedAmount = applied;
      detailRow.balanceAmount = Math.max(0, detailRow.wonAmount - applied);
      remainingRedeemed -= applied;
    });

    const outputRows = [...chronRows].sort((a, b) => new Date(b.contestStart || 0).getTime() - new Date(a.contestStart || 0).getTime());

    const totals = outputRows.reduce((acc, detailRow) => {
      acc.wonAmount += Number(detailRow.wonAmount || 0);
      acc.redeemedAmount += Number(detailRow.redeemedAmount || 0);
      acc.balanceAmount += Number(detailRow.balanceAmount || 0);
      return acc;
    }, { wonAmount: 0, redeemedAmount: 0, balanceAmount: 0 });

    return {
      player: {
        userId,
        name: row?.playerName || 'Unknown Player',
        email: row?.playerEmail || '',
      },
      rows: outputRows,
      totals,
      redeemedUnmappedAmount: Math.max(0, totalRedeemed - totals.redeemedAmount),
    };
  };

  const fetchPlayerContestDetail = async (row) => {
    if (!row?.userId) return;

    setDetailModalOpen(true);
    setSelectedUserId(row.userId);
    setSelectedPlayerMeta(row);
    setDetailLoading(true);
    setDetailError('');
    setPlayerDetail(EMPTY_PLAYER_DETAIL);

    try {
      const payload = await authFetch(`/wallet/admin/claimable-summary/${row.userId}/contests`);
      setPlayerDetail(normalizePlayerDetail(payload, row));
      setDetailError('');
    } catch {
      try {
        const fallback = await buildFallbackPlayerDetail(row);
        setPlayerDetail(normalizePlayerDetail(fallback, row));
        setDetailError('');
      } catch {
        setPlayerDetail(normalizePlayerDetail(null, row));
        setDetailError('Could not load contest-level detail for this player.');
      }
    }

    setDetailLoading(false);
  };

  const closeDetailModal = () => {
    setDetailModalOpen(false);
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return summary.rows;
    return summary.rows.filter((row) => {
      const text = `${row.playerName} ${row.playerEmail}`.toLowerCase();
      return text.includes(q);
    });
  }, [summary.rows, searchTerm]);

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: '#ffd93d', top: '6%', right: '4%', opacity: 0.25 }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 260, maxHeight: 260, background: 'var(--neon-cyan)', bottom: '8%', left: '5%', opacity: 0.2 }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-sm" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Back
            </Link>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Players Claimable Summary</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchSummary}
              className="text-sm font-semibold px-3 py-2 rounded-lg"
              style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,229,255,0.25)' }}
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="glass-card p-4 mb-4">
          <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Total Claimable Now</p>
          <p className="text-3xl font-black" style={{ color: '#ffd93d' }}>
            PKR {parseFloat(Number(summary.totalClaimable).toFixed(2)).toLocaleString()}
          </p>
          <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
            This equals the total of all player balances shown in the table.
          </p>
        </div>

        <div className="glass-card overflow-hidden">
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--subtle-border)' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search player name or email..."
              className="w-full text-sm rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--subtle-overlay)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-9 h-9 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading claimable summary...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No players found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--subtle-border)', background: 'var(--subtle-overlay)' }}>
                    <th className="text-left text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Player</th>
                    <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Won Amount</th>
                    <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Redeemed / Paid</th>
                    <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row) => (
                    <tr
                      key={row.userId}
                      onClick={() => fetchPlayerContestDetail(row)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        background: selectedUserId === row.userId ? 'rgba(0,229,255,0.07)' : 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUserId !== row.userId) e.currentTarget.style.background = 'var(--subtle-overlay)';
                      }}
                      onMouseLeave={(e) => {
                        if (selectedUserId !== row.userId) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.playerName}</p>
                        <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{row.playerEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                        PKR {parseFloat(Number(row.wonAmount).toFixed(2)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm" style={{ color: '#ff9f43' }}>
                        PKR {parseFloat(Number(row.redeemedAmount).toFixed(2)).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#00ff88' }}>
                        PKR {parseFloat(Number(row.balanceAmount).toFixed(2)).toLocaleString()}
                      </td>
                    </tr>
                  ))}

                  <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'var(--subtle-overlay)' }}>
                    <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total</td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                      PKR {parseFloat(Number(summary.totals.wonAmount).toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#ff9f43' }}>
                      PKR {parseFloat(Number(summary.totals.redeemedAmount).toFixed(2)).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-extrabold" style={{ color: '#ffd93d' }}>
                      PKR {parseFloat(Number(summary.totals.balanceAmount).toFixed(2)).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {detailModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 70,
              background: 'rgba(5,8,20,0.7)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
            onClick={closeDetailModal}
          >
            <div
              className="glass-card overflow-hidden"
              style={{ width: '100%', maxWidth: 1100, maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--subtle-border)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p className="text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Player Contest Reward Summary</p>
                  <h2 className="text-lg font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                    {playerDetail.player?.name || selectedPlayerMeta?.playerName || 'Player'}
                  </h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {playerDetail.player?.email || selectedPlayerMeta?.playerEmail || ''}
                  </p>
                </div>

                <button
                  onClick={closeDetailModal}
                  className="text-xs font-semibold px-2.5 py-1.5 rounded-lg"
                  style={{
                    background: 'var(--subtle-border)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Close
                </button>
              </div>

              {detailLoading ? (
                <div className="py-12 text-center">
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading player contest summary...</p>
                </div>
              ) : detailError ? (
                <div className="py-10 text-center px-4">
                  <p className="text-sm" style={{ color: '#ff9f43' }}>{detailError}</p>
                </div>
              ) : playerDetail.rows.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No contest records found for this player.</p>
                </div>
              ) : (
                <div className="overflow-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--subtle-border)', background: 'var(--subtle-overlay)' }}>
                        <th className="text-left text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Game / Contest</th>
                        <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Rank</th>
                        <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Won</th>
                        <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Redeemed / Paid</th>
                        <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Balance</th>
                        <th className="text-right text-[11px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerDetail.rows.map((row) => {
                        const statusLabel = row.isLive ? 'LIVE' : row.isEnded ? 'ENDED' : 'UPCOMING';
                        const statusColor = row.isLive ? '#00ff88' : row.isEnded ? 'var(--text-muted)' : '#ffd93d';

                        return (
                          <tr key={`${row.game}-${row.contestId}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <td className="px-4 py-3">
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{row.gameName}</p>
                              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                {formatDateTime(row.contestStart)}
                              </p>
                            </td>
                            <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                              {row.rank > 0 ? `#${row.rank}` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-sm" style={{ color: 'var(--text-secondary)' }}>
                              PKR {Math.round(row.wonAmount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm" style={{ color: '#ff9f43' }}>
                              PKR {Math.round(row.redeemedAmount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-semibold" style={{ color: '#00ff88' }}>
                              PKR {Math.round(row.balanceAmount).toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-right text-xs font-bold" style={{ color: statusColor }}>
                              {statusLabel}
                            </td>
                          </tr>
                        );
                      })}

                      <tr style={{ borderTop: '2px solid rgba(255,255,255,0.12)', background: 'var(--subtle-overlay)' }}>
                        <td className="px-4 py-3 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Total</td>
                        <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>-</td>
                        <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
                          PKR {Math.round(playerDetail.totals.wonAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#ff9f43' }}>
                          PKR {Math.round(playerDetail.totals.redeemedAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-extrabold" style={{ color: '#ffd93d' }}>
                          PKR {Math.round(playerDetail.totals.balanceAmount).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: 'var(--text-muted)' }}>-</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {!detailLoading && !detailError && playerDetail.redeemedUnmappedAmount > 0 && (
                <div className="px-4 py-3 text-xs" style={{ color: '#ff9f43', borderTop: '1px solid var(--subtle-border)' }}>
                  Note: PKR {Math.round(playerDetail.redeemedUnmappedAmount).toLocaleString()} redeemed amount is beyond contest winnings and cannot be mapped to a specific contest.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardClaimablePage() {
  return (
    <AdminRoute>
      <ClaimableSummaryContent />
    </AdminRoute>
  );
}
