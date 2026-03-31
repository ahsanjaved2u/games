export const metadata = {
  title: 'Leaderboard — Top Players',
  description: 'View the GameVesta leaderboard. See top-ranked players, competition winners, and best scores across all skill-based browser games.',
  alternates: { canonical: 'https://gamevesta.com/leaderboard' },
  openGraph: {
    title: 'Leaderboard | GameVesta',
    description: 'Top-ranked players, competition winners, and best scores across all games on GameVesta.',
    url: 'https://gamevesta.com/leaderboard',
  },
};

export default function LeaderboardLayout({ children }) {
  return children;
}
