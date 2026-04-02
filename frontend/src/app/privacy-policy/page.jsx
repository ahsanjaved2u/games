'use client';

import Link from 'next/link';

const sections = [
  {
    icon: '🛡️',
    title: 'Information We Collect',
    items: [
      'Account details (name, email) when you sign up',
      'Game scores, entries, and competition history',
      'Wallet & transaction data for deposits, winnings, and withdrawals',
      'Device info and browser type for a smooth experience',
    ],
  },
  {
    icon: '🎯',
    title: 'How We Use Your Data',
    items: [
      'Run competitions, track scores, and distribute prizes fairly',
      'Process wallet transactions and payouts securely',
      'Improve game performance and fix bugs',
      'Send important account or competition notifications',
    ],
  },
  {
    icon: '🔒',
    title: 'Data Protection',
    items: [
      'Passwords are hashed — we never store them in plain text',
      'All connections are encrypted with HTTPS / TLS',
      'Access to your data is restricted to authorized systems only',
      'We never sell or share your personal data with third parties',
    ],
  },
  {
    icon: '🍪',
    title: 'Cookies & Local Storage',
    items: [
      'We use cookies to keep you logged in and remember preferences',
      'Local storage may hold theme settings and session tokens',
      'No third-party advertising or tracking cookies are used',
    ],
  },
  {
    icon: '🎮',
    title: 'Your Rights',
    items: [
      'Access, update, or delete your account data anytime from Settings',
      'Request a full export of your data by contacting support',
      'Opt out of non-essential emails via your profile preferences',
      'Delete your account — your data will be permanently removed',
    ],
  },
  {
    icon: '🤝',
    title: 'Referral Program Data',
    items: [
      'We collect your IP address during signup to detect and prevent referral fraud',
      'Referral relationships (who referred whom) are stored to calculate and distribute bonuses',
      'IP addresses are only compared for fraud detection and are not shared with third parties',
      'Referral earnings and bonus history are stored as part of your wallet transaction records',
    ],
  },
  {
    icon: '📡',
    title: 'Third-Party Services',
    items: [
      'Payment processing is handled by secure, PCI-compliant providers',
      'We may use analytics tools to understand platform usage (no personal data shared)',
      'Game assets are served from our own infrastructure',
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 380, maxHeight: 380, background: 'var(--neon-cyan)', top: '-5%', right: '10%' }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 280, maxHeight: 280, background: 'var(--neon-purple)', bottom: '5%', left: '5%', animationDelay: '4s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12 sm:pt-4 sm:pb-20">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <span style={{
            fontSize: 52,
            display: 'inline-block',
            filter: 'drop-shadow(0 0 24px rgba(0,229,255,0.45))',
            marginBottom: 12,
          }}>🛡️</span>

          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            <span className="neon-text-cyan">Privacy</span> Policy
          </h1>
          <p className="text-base sm:text-lg" style={{ color: 'var(--text-muted)' }}>
            Your data is safe with us. Here's exactly how we handle it.
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
            Last updated: April 2026
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={section.title}
              className="rounded-2xl p-5 sm:p-6 animate-fade-in-up"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 0 20px color-mix(in srgb, var(--neon-cyan) 4%, transparent)',
                animationDelay: `${i * 80}ms`,
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: 24 }}>{section.icon}</span>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                  {section.title}
                </h2>
              </div>
              <ul className="space-y-2 ml-1">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--neon-cyan)', marginTop: 2, flexShrink: 0 }}>▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-10 animate-fade-in-up" style={{ animationDelay: '500ms' }}>
          <div className="rounded-2xl p-6" style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--neon-cyan) 6%, transparent), color-mix(in srgb, var(--neon-purple) 6%, transparent))',
            border: '1px solid var(--glass-border)',
          }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Have questions about your data or privacy?
            </p>
            <Link href="/contact" className="btn-neon btn-neon-primary text-sm" style={{ padding: '10px 28px' }}>
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
