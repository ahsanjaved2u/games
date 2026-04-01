'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{
      background: 'var(--bg-secondary)',
      borderTop: '1px solid var(--border-color)',
    }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-3 gap-4 justify-items-center text-center">

          {/* Brand */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              🎮 GameVesta
            </h4>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Your ultimate gaming destination. Play, compete, and climb the leaderboards.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              🔗 Quick Links
            </h4>
            <ul className="space-y-2">
              {[{ label: 'Home', href: '/' }, { label: 'Games', href: '/games' }, { label: 'Leaderboard', href: '/leaderboard' }, { label: 'About', href: '/about' }].map(item => (
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

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider" style={{ color: 'var(--neon-cyan)', fontSize: '11px' }}>
              🛟 Support
            </h4>
            <ul className="space-y-2">
              {[{ label: 'Contact', href: '/contact' }, { label: 'FAQ', href: '/faq' }, { label: 'Privacy Policy', href: '/privacy-policy' }, { label: 'Terms', href: '/terms' }].map(item => (
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

        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3" style={{
          borderTop: '1px solid color-mix(in srgb, var(--neon-cyan) 6%, transparent)',
        }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            © {new Date().getFullYear()} GameVesta. All rights reserved.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Built with ❤️ for gamers
          </p>
        </div>
      </div>
    </footer>
  );
}
