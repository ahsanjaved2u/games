'use client';

import Link from 'next/link';

const features = [
  { icon: '🧠', title: 'Build Logical Thinking', text: 'Our games are designed to sharpen your problem-solving skills, boost critical thinking, and train your brain — one level at a time.' },
  { icon: '🏆', title: 'Competitive Environment', text: 'Compete with real players, climb leaderboards, and push yourself to improve. A healthy competitive spirit drives growth.' },
  { icon: '💰', title: 'Earn While You Play', text: 'Turn your gaming skills into real earnings. Play smart, score high, and get financially rewarded for your talent.' },
  { icon: '📱', title: 'Play Anywhere', text: 'No downloads, no installs. Just open your browser on any device and start playing instantly.' },
];

export default function AboutPage() {
  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      {/* Glow orbs */}
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 380, maxHeight: 380, background: 'var(--neon-cyan)', top: '-5%', right: '10%' }} />
      <div className="glow-orb" style={{ width: '22vw', height: '22vw', maxWidth: 280, maxHeight: 280, background: 'var(--neon-purple)', bottom: '5%', left: '5%', animationDelay: '4s' }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-12 sm:pt-4 sm:pb-20">

        {/* Hero */}
        <div className="text-center mb-12 animate-fade-in-up">
          <span style={{
            fontSize: 52,
            display: 'inline-block',
            filter: 'drop-shadow(0 0 24px rgba(0,229,255,0.45))',
            marginBottom: 12,
          }}>🕹️</span>

          <h1 className="text-3xl sm:text-4xl font-extrabold leading-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            Welcome to{' '}
            <span style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              GameVesta
            </span>
          </h1>

          <p className="text-sm sm:text-base leading-relaxed" style={{ color: 'var(--text-muted)', maxWidth: 520, margin: '0 auto' }}>
            A skill-based gaming platform where strategy meets reward. Sharpen your mind,
            compete with real players, and earn real money — all from your browser.
          </p>
        </div>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {features.map((f, i) => (
            <div
              key={i}
              className="glass-card p-5 flex items-start gap-4 transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${i * 0.08}s` }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(0,229,255,0.25)';
                e.currentTarget.style.transform = 'translateY(-3px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--glass-border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <span style={{ fontSize: 28, lineHeight: 1, flexShrink: 0, filter: 'drop-shadow(0 0 10px rgba(0,229,255,0.3))' }}>
                {f.icon}
              </span>
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.18), transparent)', marginBottom: 32 }} />

        {/* Mission / Story */}
        <div className="text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <h2 className="text-lg sm:text-xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Our Mission
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-muted)', maxWidth: 500, margin: '0 auto 24px' }}>
            At GameVesta, we're on a mission to make gaming meaningful. We build an ecosystem
            where players develop logical thinking, thrive in a competitive environment, and
            earn financial rewards — all through skill-based browser games that anyone can access.
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{
              background: 'rgba(0,229,255,0.08)',
              color: 'var(--neon-cyan)',
              border: '1px solid rgba(0,229,255,0.2)',
            }}>
              Skill-Based Gaming
            </span>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{
              background: 'rgba(168,85,247,0.08)',
              color: 'var(--neon-purple)',
              border: '1px solid rgba(168,85,247,0.2)',
            }}>
              Real Rewards
            </span>
            <span className="text-xs font-medium px-3 py-1.5 rounded-full" style={{
              background: 'rgba(0,255,136,0.08)',
              color: 'var(--neon-green)',
              border: '1px solid rgba(0,255,136,0.2)',
            }}>
              Community Driven
            </span>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="mt-10 text-center animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,229,255,0.18), transparent)', marginBottom: 32 }} />
          <p className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>
            Want to learn more or partner with us?
          </p>
          <Link
            href="/contact"
            className="inline-block px-6 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
            style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              color: '#fff',
              textDecoration: 'none',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 0 20px color-mix(in srgb, var(--neon-cyan) 30%, transparent)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ✉️ Get in Touch
          </Link>
        </div>
      </div>
    </div>
  );
}
