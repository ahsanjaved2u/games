export default function sitemap() {
  const base = 'https://gamevesta.com';
  const now = new Date().toISOString();

  return [
    { url: base,                      lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/games`,           lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/leaderboard`,     lastModified: now, changeFrequency: 'hourly',  priority: 0.8 },
    { url: `${base}/about`,           lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/faq`,             lastModified: now, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/contact`,         lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/signup`,          lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/login`,           lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
  ];
}
