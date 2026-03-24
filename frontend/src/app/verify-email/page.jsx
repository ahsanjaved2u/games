'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyEmailPage() {
  const { authFetch, isLoggedIn, user, loading, updateUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [autoSubmitted, setAutoSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace('/login');
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (!loading && user?.emailVerified) {
      setSuccess(true);
    }
  }, [loading, user]);

  // Auto-fill code from URL (e.g. from email link)
  useEffect(() => {
    const urlCode = searchParams.get('code');
    if (urlCode && urlCode.length === 6 && /^\d{6}$/.test(urlCode)) {
      const digits = urlCode.split('');
      setCode(digits);
    }
  }, [searchParams]);

  // Auto-submit when code is filled from URL
  useEffect(() => {
    if (autoSubmitted || !isLoggedIn || loading || success) return;
    const full = code.join('');
    const urlCode = searchParams.get('code');
    if (full.length === 6 && full === urlCode) {
      setAutoSubmitted(true);
      submitCode(full);
    }
  }, [code, isLoggedIn, loading, success, autoSubmitted, searchParams]);

  if (loading || !isLoggedIn) return null;

  // Detect webmail URL from email domain
  const getMailUrl = () => {
    const domain = user?.email?.split('@')[1]?.toLowerCase();
    if (!domain) return null;
    if (domain === 'gmail.com') return { url: 'https://mail.google.com', label: 'Open Gmail', icon: '📧' };
    if (domain === 'yahoo.com' || domain === 'yahoo.co.uk') return { url: 'https://mail.yahoo.com', label: 'Open Yahoo Mail', icon: '📧' };
    if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') return { url: 'https://outlook.live.com', label: 'Open Outlook', icon: '📧' };
    if (domain === 'icloud.com' || domain === 'me.com') return { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail', icon: '📧' };
    if (domain === 'protonmail.com' || domain === 'proton.me') return { url: 'https://mail.proton.me', label: 'Open ProtonMail', icon: '📧' };
    return null;
  };
  const mailLink = getMailUrl();

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newCode = [...code];
    for (let i = 0; i < 6; i++) newCode[i] = pasted[i] || '';
    setCode(newCode);
    const focusIdx = Math.min(pasted.length, 5);
    inputRefs.current[focusIdx]?.focus();
  };

  const submitCode = async (fullCode) => {
    setError('');
    if (!fullCode || fullCode.length < 6) { setError('Enter the full 6-digit code'); return; }
    setSubmitting(true);
    try {
      await authFetch('/users/verify-email', {
        method: 'POST',
        body: JSON.stringify({ code: fullCode }),
      });
      updateUser({ emailVerified: true });
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    submitCode(code.join(''));
  };

  const handleResend = async () => {
    setResending(true);
    setResendMsg('');
    setError('');
    try {
      const data = await authFetch('/users/resend-code', { method: 'POST' });
      setResendMsg(data.message || 'Code sent!');
    } catch (err) {
      setError(err.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="bg-grid relative min-h-screen flex items-center justify-center px-4 pb-10">
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-purple)', top: '10%', right: '15%' }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-cyan)', bottom: '15%', left: '10%', animationDelay: '5s' }} />

      <div className="glass-card p-8 sm:p-10 w-full relative z-10 animate-fade-in-up text-center" style={{ maxWidth: 448 }}>
        {success ? (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
              background: 'linear-gradient(135deg, rgba(0,255,136,0.15), rgba(0,229,255,0.15))',
              border: '1px solid rgba(0,255,136,0.2)',
            }}>
              <span className="text-3xl">✅</span>
            </div>
            <h1 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Email Verified!</h1>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>You're all set. You can now claim rewards and request withdrawals.</p>
            <button onClick={() => router.push('/')} className="btn-neon btn-neon-primary px-8 py-2.5 text-sm">
              Continue
            </button>
          </>
        ) : (
          <>
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.15), rgba(0,229,255,0.15))',
              border: '1px solid rgba(168,85,247,0.2)',
            }}>
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Verify Your Email</h1>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
              Enter the 6-digit code sent to <strong style={{ color: 'var(--neon-cyan)' }}>{user?.email}</strong>
            </p>
            {mailLink && (
              <a
                href={mailLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold mb-6 transition-all"
                style={{
                  background: 'rgba(0,229,255,0.08)',
                  border: '1px solid rgba(0,229,255,0.2)',
                  color: 'var(--neon-cyan)',
                  textDecoration: 'none',
                }}
              >
                {mailLink.icon} {mailLink.label} ↗
              </a>
            )}

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
                background: 'rgba(255,45,120,0.1)', border: '1px solid rgba(255,45,120,0.3)', color: 'var(--neon-pink)',
              }}>
                {error}
              </div>
            )}
            {resendMsg && (
              <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.3)', color: '#00ff88',
              }}>
                {resendMsg}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="flex justify-center gap-2 mb-6" onPaste={handlePaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={el => inputRefs.current[i] = el}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleChange(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    className="w-12 h-14 text-center text-xl font-bold rounded-xl outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(10,11,26,0.6)',
                      border: '1px solid rgba(0,229,255,0.2)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'rgba(0,229,255,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(0,229,255,0.2)'}
                  />
                ))}
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="btn-neon btn-neon-primary w-full text-base py-3"
                style={{ opacity: submitting ? 0.6 : 1, cursor: submitting ? 'not-allowed' : 'pointer' }}
              >
                {submitting ? 'Verifying…' : 'Verify Email'}
              </button>
            </form>

            <p className="text-sm mt-5" style={{ color: 'var(--text-muted)' }}>
              Didn't receive it?{' '}
              <button
                onClick={handleResend}
                disabled={resending}
                className="font-semibold transition-colors"
                style={{ color: 'var(--neon-cyan)', background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {resending ? 'Sending…' : 'Resend Code'}
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
