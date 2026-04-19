'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const { login, isLoggedIn } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) router.replace('/');
  }, [isLoggedIn, router]);

  if (isLoggedIn) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-grid relative min-h-screen flex items-center justify-center px-4" style={{ overflow: 'hidden' }}>
      {/* Background orbs */}
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', top: '10%', left: '15%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '15%', right: '10%', animationDelay: '5s' }} />

      <div className="glass-card p-8 sm:p-10 w-full relative z-10 animate-fade-in-up" style={{ maxWidth: 448 }}>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(168,85,247,0.15))',
            border: '1px solid rgba(0,229,255,0.2)',
          }}>
            <span className="text-3xl">🎮</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Welcome Back
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Log in to continue your gaming journey
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
              placeholder="••••••••"
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

          <div className="flex justify-end">
            <Link href="/forgot-password" className="text-xs font-medium transition-colors" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              onMouseEnter={e => e.target.style.color = 'var(--neon-cyan)'}
              onMouseLeave={e => e.target.style.color = 'var(--text-muted)'}
            >
              Forgot Password?
            </Link>
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
                Logging in...
              </span>
            ) : (
              '🚀 Log In'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold transition-colors" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
