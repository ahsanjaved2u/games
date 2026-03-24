'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const { signup, isLoggedIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [signedUp, setSignedUp] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) router.replace('/');
  }, [isLoggedIn, router]);

  if (isLoggedIn) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      await signup(form.name, form.email, form.password);
      setSignedUp(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-grid relative min-h-screen flex items-center justify-center px-4 pb-10">
      {/* Background orbs */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-purple)', top: '10%', right: '15%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-cyan)', bottom: '15%', left: '10%', animationDelay: '5s' }} />

      {signedUp ? (
        <div className="glass-card p-8 sm:p-10 w-full relative z-10 animate-fade-in-up text-center" style={{ maxWidth: 448 }}>
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.15))',
            border: '1px solid rgba(0,255,136,0.2)',
          }}>
            <span className="text-3xl">📧</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
            Check Your Email
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
            A verification code has been sent to <strong style={{ color: 'var(--neon-cyan)' }}>{form.email}</strong>. Verify your email before claiming any rewards.
          </p>
          {(() => {
            const domain = form.email?.split('@')[1]?.toLowerCase();
            const mailLinks = {
              'gmail.com': { url: 'https://mail.google.com', label: 'Open Gmail' },
              'yahoo.com': { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail' },
              'yahoo.co.uk': { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail' },
              'outlook.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
              'hotmail.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
              'live.com': { url: 'https://outlook.live.com', label: 'Open Outlook' },
            };
            const ml = mailLinks[domain];
            return ml ? (
              <a href={ml.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold mb-5 transition-all"
                style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.2)', color: 'var(--neon-cyan)', textDecoration: 'none' }}>
                📧 {ml.label} ↗
              </a>
            ) : null;
          })()}
          <div className="flex gap-3 justify-center">
            <button onClick={() => router.push('/verify-email')} className="btn-neon btn-neon-primary px-6 py-2.5 text-sm">
              Enter Code
            </button>
            <button onClick={() => router.push('/')} className="btn-neon px-6 py-2.5 text-sm" style={{ border: '1px solid var(--input-border)', color: 'var(--text-muted)' }}>
              Later
            </button>
          </div>
        </div>
      ) : (

      <div className="glass-card p-8 sm:p-10 w-full relative z-10 animate-fade-in-up" style={{ maxWidth: 448 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(0,229,255,0.15))',
            border: '1px solid rgba(168,85,247,0.2)',
          }}>
            <span className="text-3xl">✨</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Create Account
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Join the arena and start competing
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: 'rgba(255,45,120,0.1)',
            border: '1px solid rgba(255,45,120,0.3)',
            color: 'var(--neon-pink)',
          }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Name
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Your gamer name"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(10,11,26,0.6)',
                border: '1px solid rgba(0,229,255,0.15)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.15)'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Email
            </label>
            <input
              type="email"
              required
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(10,11,26,0.6)',
                border: '1px solid rgba(0,229,255,0.15)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.15)'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Password
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              placeholder="Min 6 characters"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(10,11,26,0.6)',
                border: '1px solid rgba(0,229,255,0.15)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.15)'}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              Confirm Password
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: 'rgba(10,11,26,0.6)',
                border: '1px solid rgba(0,229,255,0.15)',
                color: 'var(--text-primary)',
              }}
              onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
              onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.15)'}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-neon btn-neon-primary w-full text-base py-3.5"
            style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating account...
              </span>
            ) : (
              '✨ Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Already have an account?{' '}
          <Link href="/login" className="font-semibold transition-colors" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
            Log In
          </Link>
        </p>
      </div>

      )}
    </div>
  );
}
