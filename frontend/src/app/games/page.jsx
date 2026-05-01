'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import GameCard from '@/components/GameCard';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function GamesPage() {
  const { isLoggedIn, authFetch } = useAuth();
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewMap, setReviewMap] = useState({});

  const fetchGames = async () => {
    try {
      const res = await fetch(`${API}/games`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setGames(list);
      // Fetch review summaries for all games in one call
      if (list.length > 0) {
        fetchReviewSummary(list.map(g => g.slug));
      }
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchReviewSummary = async (slugs) => {
    try {
      const data = await authFetch('/reviews/bulk-summary', {
        method: 'POST',
        body: JSON.stringify({ slugs }),
      });
      setReviewMap(data);
    } catch { /* ignore */ }
  };

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

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 30_000);

    // Listen for real-time session updates from admin actions / cron
    const baseUrl = API.endsWith('/api') ? API.slice(0, -4) : API;
    const es = new EventSource(`${baseUrl}/api/stream`);
    es.addEventListener('session-update', () => fetchGames());

    return () => { clearInterval(interval); es.close(); };
  }, []);



  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-cyan)', top: '0%', left: '5%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '10%', right: '5%', animationDelay: '5s' }} />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {loading ? (
          <div className="text-center py-24">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading games...</p>
          </div>
        ) : games.length === 0 ? (
          <div className="text-center py-16 max-w-2xl mx-auto px-4">
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎮</div>
            <h2 className="text-xl sm:text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>New games are on the way!</h2>
            <p className="text-base mb-6" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              GameVesta hosts skill-based HTML5 arcade and puzzle games where top scorers win real PKR cash prizes. We&apos;re actively adding new titles — check back soon, or browse what we have on the homepage.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link href="/" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>🏠 Home</Link>
              <Link href="/leaderboard" className="btn-neon text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>🏆 Leaderboard</Link>
              <Link href="/faq" className="btn-neon text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>❓ How it works</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {(() => {
              const cards = [];
              games.forEach(game => {
                const contests = game.contests || [];
                const sessions = game.sessions || [];
                const visibleContests = contests.filter(c => c.status === 'live' || (c.status === 'scheduled' && new Date(c.startDate) > new Date()));
                visibleContests.forEach(c => cards.push({ game, contest: c, session: null, key: `${game._id}_c_${c._id}` }));
                sessions.filter(s => s.isActive).forEach(s => cards.push({ game, contest: null, session: s, key: `${game._id}_s_${s._id}` }));
                if (visibleContests.length === 0 && sessions.filter(s => s.isActive).length === 0) {
                  cards.push({ game, contest: null, session: null, key: game._id });
                }
              });
              return cards.map((entry, i) => (
                <GameCard key={entry.key} game={entry.game} contest={entry.contest} session={entry.session} i={i} isLoggedIn={isLoggedIn} reviewData={reviewMap[entry.game.slug]} onToggleLike={handleToggleLike} onContestLive={fetchGames} onSessionEnd={fetchGames} />
              ));
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
