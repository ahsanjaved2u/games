const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const BASE = 'https://gamevesta.com';

async function fetchGame(slug) {
  try {
    const res = await fetch(`${API}/games/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const game = await fetchGame(slug);
  if (!game) {
    return { title: 'Game Not Found' };
  }

  const title = `${game.name} — Play & ${game.gameType === 'competitive' ? 'Compete' : 'Earn'}`;
  const description = game.description
    || `Play ${game.name} on GameVesta. ${game.gameType === 'competitive' ? 'Compete with other players for cash prizes in PKR.' : 'Earn real PKR rewards based on your score.'}`;
  const url = `${BASE}/games/${slug}`;
  const image = `${process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games'}/${game.gamePath}/${game.thumbnail || 'images/thumbnail.webp'}`;

  return {
    title,
    description,
    keywords: [game.name, 'play online', 'browser game', 'earn money', 'GameVesta', game.gameType, 'PKR rewards'],
    alternates: { canonical: url },
    openGraph: {
      title: `${game.name} | GameVesta`,
      description,
      url,
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: game.name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${game.name} | GameVesta`,
      description,
      images: [image],
    },
  };
}

export default function GameSlugLayout({ children }) {
  return children;
}
