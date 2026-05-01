import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-pink)', top: '10%', left: '10%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '10%', right: '10%', animationDelay: '5s' }} />

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div style={{ fontSize: 80, marginBottom: 16, filter: 'drop-shadow(0 0 30px rgba(255,45,120,0.4))' }}>🎮</div>

        <h1 className="text-6xl sm:text-8xl font-black mb-2" style={{
          background: 'linear-gradient(135deg, var(--neon-pink), var(--neon-purple))',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          404
        </h1>

        <p className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          Game Over — Page Not Found
        </p>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)', maxWidth: 480, lineHeight: 1.7 }}>
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. While you&apos;re here, why not jump into a quick skill-based game on GameVesta? Top scorers win real PKR cash prizes — based purely on skill, never on chance.
        </p>

        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <Link href="/" className="btn-neon btn-neon-primary text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>
            🏠 Back to Home
          </Link>
          <Link href="/games" className="btn-neon text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>
            🎯 Browse Games
          </Link>
          <Link href="/leaderboard" className="btn-neon text-sm px-6 py-2.5" style={{ textDecoration: 'none' }}>
            🏆 Leaderboard
          </Link>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-2 justify-center text-xs" style={{ color: 'var(--text-muted)', opacity: 0.75 }}>
          <Link href="/about" style={{ color: 'inherit', textDecoration: 'none' }}>About</Link>
          <Link href="/faq" style={{ color: 'inherit', textDecoration: 'none' }}>FAQ</Link>
          <Link href="/contact" style={{ color: 'inherit', textDecoration: 'none' }}>Contact</Link>
          <Link href="/privacy-policy" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</Link>
          <Link href="/terms" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</Link>
        </div>
      </div>
    </div>
  );
}
