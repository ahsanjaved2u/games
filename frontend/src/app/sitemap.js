const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default async function sitemap() {
  const base = 'https://gamevesta.com';
  const now = new Date().toISOString();

  // Fetch all games for dynamic URLs
  let gameEntries = [];
  try {
    const res = await fetch(`${API}/games`, { next: { revalidate: 3600 } });
    const games = await res.json();
    if (Array.isArray(games)) {
      gameEntries = games.map(game => ({
        url: `${base}/games/${game.slug}`,
        lastModified: game.updatedAt || now,
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch { /* fallback to static only */ }

  return [
    { url: base,                          lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/games`,               lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/leaderboard`,         lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    ...gameEntries,
    { url: `${base}/about`,               lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`,                 lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`,             lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/signup`,              lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/privacy-policy`,      lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
    { url: `${base}/terms`,               lastModified: now, changeFrequency: 'yearly',  priority: 0.4 },
  ];
}
