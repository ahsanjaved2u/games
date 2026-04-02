export const metadata = {
  title: 'All Games — Play, Rate & Earn',
  description: 'Browse all skill-based HTML5 browser games on GameVesta. Play for free, join paid competitions, read player reviews, like your favorites, and earn real PKR rewards based on your score.',
  alternates: { canonical: 'https://gamevesta.com/games' },
  openGraph: {
    title: 'All Games | GameVesta',
    description: 'Browse free and paid HTML5 browser games. Read reviews, compete, earn real cash rewards, and climb the leaderboards.',
    url: 'https://gamevesta.com/games',
  },
};

export default function GamesLayout({ children }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'GameVesta — All Games',
    url: 'https://gamevesta.com/games',
    description: 'Browse all skill-based HTML5 browser games on GameVesta. Play for free, join competitions, like and review games.',
    isPartOf: { '@type': 'WebSite', name: 'GameVesta', url: 'https://gamevesta.com' },
    provider: { '@type': 'Organization', name: 'GameVesta', url: 'https://gamevesta.com' },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {children}
    </>
  );
}
