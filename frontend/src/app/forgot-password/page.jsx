'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ── Email provider detection ── */
function getEmailProvider(email) {
  const domain = (email.split('@')[1] || '').toLowerCase();
  if (domain.includes('gmail') || domain.includes('googlemail'))
    return { name: 'Gmail', url: 'https://mail.google.com', mobileUrl: 'googlegmail://' };
  if (domain.includes('yahoo') || domain.includes('ymail'))
    return { name: 'Yahoo Mail', url: 'https://mail.yahoo.com', mobileUrl: 'ymail://' };
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live') || domain.includes('msn'))
    return { name: 'Outlook', url: 'https://outlook.live.com', mobileUrl: 'ms-outlook://' };
  if (domain.includes('icloud') || domain.includes('me.com') || domain.includes('mac.com'))
    return { name: 'iCloud Mail', url: 'https://www.icloud.com/mail', mobileUrl: null };
  if (domain.includes('proton'))
    return { name: 'Proton Mail', url: 'https://mail.proton.me', mobileUrl: null };
  if (domain.includes('zoho'))
    return { name: 'Zoho Mail', url: 'https://mail.zoho.com', mobileUrl: null };
  return null;
}

function isMobile() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
}

function openMailProvider(provider) {
  if (!provider) return;
  if (isMobile() && provider.mobileUrl) {
    // Try app scheme; if it doesn't open in 1.5s, fallback to web
    window.location.href = provider.mobileUrl;
    const fallback = setTimeout(() => {
      if (!document.hidden) window.open(provider.url, '_blank', 'noopener,noreferrer');
    }, 1500);
    const onVisChange = () => { clearTimeout(fallback); document.removeEventListener('visibilitychange', onVisChange); };
    document.addEventListener('visibilitychange', onVisChange);
  } else {
    window.open(provider.url, '_blank', 'noopener,noreferrer');
  }
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginWithToken } = useAuth();

  const emailParam = searchParams.get('email') || '';
  const codeParam = searchParams.get('code') || '';

  // Pre-fill digits from URL code param
  const initialDigits = codeParam.length === 6
    ? codeParam.split('')
    : ['', '', '', '', '', ''];

  // step 1 = enter email, step 2 = enter code + new password
  const [step, setStep] = useState(emailParam ? 2 : 1);
  const [email, setEmail] = useState(emailParam);
  const [digits, setDigits] = useState(initialDigits);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [codeSent, setCodeSent] = useState(!!emailParam);
  const inputRefs = useRef([]);

  const provider = getEmailProvider(email);

  /* ── Step 1: send code ── */
  const handleSendCode = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      setCodeSent(true);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Resend code ── */
  const handleResend = async () => {
    setError('');
    setResending(true);
    try {
      const res = await fetch(`${API}/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  /* ── Step 2: verify code + reset + auto-login ── */
  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    const code = digits.join('');
    if (code.length !== 6) { setError('Please enter all 6 digits'); return; }
    if (newPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, email, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Something went wrong');
      loginWithToken(data.token, data.user);
      router.push('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Digit input helpers ── */
  const handleDigitChange = (idx, val) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...digits];
    next[idx] = val;
    setDigits(next);
    if (val && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleDigitKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!text) return;
    const next = [...digits];
    for (let i = 0; i < 6; i++) next[i] = text[i] || '';
    setDigits(next);
    const focusIdx = Math.min(text.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const inputStyle = {
    background: 'rgba(10,11,26,0.6)',
    border: '1px solid rgba(0,229,255,0.15)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="glass-card p-8 sm:p-10 w-full relative z-10 animate-fade-in-up" style={{ maxWidth: 448 }}>

      {step === 2 ? (
        <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.15))',
              border: '1px solid rgba(0,255,136,0.2)',
            }}>
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Enter Reset Code</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              We sent a 6-digit code to <strong style={{ color: 'var(--neon-cyan)' }}>{email}</strong>
            </p>
          </div>

          {/* Open email provider button */}
          {codeSent && provider && (
            <button
              type="button"
              onClick={() => openMailProvider(provider)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 mb-5"
              style={{
                background: 'rgba(0,229,255,0.08)',
                border: '1px solid rgba(0,229,255,0.2)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.15)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(0,229,255,0.2)'; }}
            >
              📬 Open {provider.name}
            </button>
          )}

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
              background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: 'var(--neon-pink)',
            }}>{error}</div>
          )}

          <form onSubmit={handleReset} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Reset Code
              </label>
              <div className="flex gap-2 justify-center" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigitChange(i, e.target.value)}
                    onKeyDown={e => handleDigitKeyDown(i, e)}
                    className="w-11 h-12 text-center text-lg font-bold rounded-xl outline-none transition-all duration-200"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.5)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.15)'}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
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
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
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
                  Resetting...
                </span>
              ) : (
                '🔐 Reset Password'
              )}
            </button>
          </form>

          <p className="text-center text-xs mt-5" style={{ color: 'var(--text-muted)' }}>
            Didn&apos;t receive the code?{' '}
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="font-semibold"
              style={{ color: 'var(--neon-cyan)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              {resending ? 'Sending...' : 'Resend Code'}
            </button>
          </p>

          <p className="text-center text-xs mt-3">
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setDigits(['','','','','','']); setNewPassword(''); setConfirmPassword(''); setCodeSent(false); }}
              className="font-medium"
              style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              ← Change email
            </button>
          </p>
        </>
      ) : (
        <>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
              background: 'linear-gradient(135deg, rgba(0,229,255,0.15), rgba(168,85,247,0.15))',
              border: '1px solid rgba(0,229,255,0.2)',
            }}>
              <span className="text-3xl">🔑</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Forgot Password
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Enter your email and we&apos;ll send you a reset code
            </p>
          </div>

          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
              background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: 'var(--neon-pink)',
            }}>{error}</div>
          )}

          <form onSubmit={handleSendCode} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
                style={inputStyle}
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
                  Sending...
                </span>
              ) : (
                '📧 Send Reset Code'
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-muted)' }}>
            Remember your password?{' '}
            <Link href="/login" className="font-semibold transition-colors" style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}>
              Log In
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="bg-grid relative min-h-screen flex items-center justify-center px-4" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', top: '10%', left: '15%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '15%', right: '10%', animationDelay: '5s' }} />
      <Suspense fallback={
        <div className="glass-card p-8 text-center" style={{ maxWidth: 448 }}>
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
        </div>
      }>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  );
}

