'use client';

import Link from 'next/link';

const sections = [
  {
    icon: '🎮',
    title: 'Eligibility',
    items: [
      'You must be at least 13 years old to create an account',
      'By signing up, you confirm that all information you provide is accurate',
      'One account per person — duplicate or fake accounts may be suspended',
    ],
  },
  {
    icon: '🏆',
    title: 'Competitions & Fair Play',
    items: [
      'All game scores are validated server-side to prevent manipulation',
      'Using bots, scripts, exploits, or any form of cheating is strictly prohibited',
      'Players caught cheating will be disqualified and may lose their winnings',
      'Competition results and prize distributions are final once confirmed by the system',
    ],
  },
  {
    icon: '💰',
    title: 'Wallet, Payments & Withdrawals',
    items: [
      'Wallet balances reflect your available funds from deposits, winnings, and rewards',
      'Withdrawals are processed after identity verification (if applicable)',
      'GameVesta reserves the right to hold payouts pending fraud review',
      'Entry fees for paid competitions are non-refundable once the game has started',
    ],
  },
  {
    icon: '🎁',
    title: 'Rewards & Bonuses',
    items: [
      'Signup bonuses and promotional rewards are subject to specific terms',
      'Bonus funds may have usage restrictions before withdrawal',
      'GameVesta may modify or discontinue bonus programs at any time',
    ],
  },
  {
    icon: '🚫',
    title: 'Prohibited Conduct',
    items: [
      'Harassment, hate speech, or abusive behavior toward other players',
      'Attempting to exploit bugs, vulnerabilities, or system weaknesses',
      'Sharing your account credentials or letting others play on your behalf',
      'Creating multiple accounts to gain unfair advantages',
    ],
  },
  {
    icon: '⚖️',
    title: 'Account Suspension & Termination',
    items: [
      'We reserve the right to suspend or terminate accounts that violate these terms',
      'Suspended accounts may have their wallet funds frozen pending investigation',
      'You may delete your account at any time through Settings',
      'Upon deletion, your data will be permanently removed as per our Privacy Policy',
    ],
  },
  {
    icon: '🔄',
    title: 'Changes to Terms',
    items: [
      'We may update these terms as the platform evolves',
      'Significant changes will be communicated via email or platform notification',
      'Continued use of GameVesta after changes constitutes acceptance',
    ],
  },
];

export default function TermsPage() {
  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 380, maxHeight: 380, background: 'var(--neon-purple)', top: '-5%', left: '10%' }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 280, maxHeight: 280, background: 'var(--neon-cyan)', bottom: '5%', right: '5%', animationDelay: '4s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12 sm:pt-4 sm:pb-20">

        {/* Hero */}
        <div className="text-center mb-10 animate-fade-in-up">
          <span style={{
            fontSize: 52,
            display: 'inline-block',
            filter: 'drop-shadow(0 0 24px rgba(168,85,247,0.45))',
            marginBottom: 12,
          }}>📜</span>

          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-3" style={{ color: 'var(--text-primary)' }}>
            Terms of <span className="neon-text-purple">Service</span>
          </h1>
          <p className="text-base sm:text-lg" style={{ color: 'var(--text-muted)' }}>
            The rules of the arena. Play fair, win big.
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
                boxShadow: '0 0 20px color-mix(in srgb, var(--neon-purple) 4%, transparent)',
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
                    <span style={{ color: 'var(--neon-purple)', marginTop: 2, flexShrink: 0 }}>▸</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="text-center mt-10 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
          <div className="rounded-2xl p-6" style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--neon-purple) 6%, transparent), color-mix(in srgb, var(--neon-cyan) 6%, transparent))',
            border: '1px solid var(--glass-border)',
          }}>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
              Questions about our terms? We're here to help.
            </p>
            <Link href="/contact" className="btn-neon btn-neon-primary text-sm" style={{ padding: '10px 28px' }}>
              Contact Support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
