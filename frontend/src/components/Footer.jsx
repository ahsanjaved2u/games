'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid rgba(0, 229, 255, 0.08)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 lg:col-span-1">
            <h3 className="text-lg font-bold mb-3" style={{
              background: 'linear-gradient(135deg, #00e5ff, #a855f7)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              🎮 GameZone
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Your ultimate gaming destination. Play, compete, and climb the leaderboards.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              Quick Links
            </h4>
            <ul className="space-y-2">
              {['Home', 'Games', 'Leaderboard', 'About'].map(item => (
                <li key={item}>
                  <Link href={`/${item === 'Home' ? '' : item.toLowerCase()}`}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              Support
            </h4>
            <ul className="space-y-2">
              {[{ label: 'Contact', href: '#' }, { label: 'FAQ', href: '/faq' }, { label: 'Privacy Policy', href: '#' }, { label: 'Terms', href: '#' }].map(item => (
                <li key={item.label}>
                  <Link href={item.href}
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              Connect
            </h4>
            <ul className="space-y-2">
              {['Discord', 'Twitter', 'GitHub', 'YouTube'].map(item => (
                <li key={item}>
                  <Link href="#"
                    className="text-sm transition-colors"
                    style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
                    onMouseEnter={e => { e.currentTarget.style.color = 'var(--neon-cyan)'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                  >
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{
          borderTop: '1px solid rgba(0, 229, 255, 0.06)',
        }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} GameZone. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Built with ❤️ for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
