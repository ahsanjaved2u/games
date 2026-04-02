'use client';

import { useState, useEffect, useCallback } from 'react';
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
    return () => clearInterval(interval);
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
          <div className="text-center py-24">
            <p className="text-lg" style={{ color: 'var(--text-muted)' }}>No games available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {games.map((game, i) => (
              <GameCard key={game._id} game={game} i={i} isLoggedIn={isLoggedIn} reviewData={reviewMap[game.slug]} onToggleLike={handleToggleLike} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
