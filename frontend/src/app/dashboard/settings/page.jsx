'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

function SettingsContent() {
  const { authFetch } = useAuth();
  const [signupReward, setSignupReward] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch('/settings');
        if (data.success) {
          setSignupReward(data.settings.signupReward ?? 0);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const data = await authFetch('/settings', {
        method: 'PUT',
        body: JSON.stringify({ signupReward: Number(signupReward) || 0 }),
      });
      if (data.success) {
        setMsg({ type: 'success', text: 'Settings saved!' });
        setSignupReward(data.settings.signupReward ?? 0);
      }
    } catch (err) {
      setMsg({ type: 'error', text: err.message || 'Failed to save' });
    }
    setSaving(false);
    setTimeout(() => setMsg(null), 3000);
  };

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 340, maxHeight: 340, background: 'var(--neon-cyan)', top: '4%', right: '8%', opacity: 0.18 }} />
      <div className="glow-orb" style={{ width: '24vw', height: '24vw', maxWidth: 300, maxHeight: 300, background: 'var(--neon-purple)', bottom: '8%', left: '6%', opacity: 0.13 }} />

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ⚙️ App Settings
          </h1>
        </div>

        {loading ? (
          <div className="glass-card p-8 text-center">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{
              borderColor: 'color-mix(in srgb, var(--neon-cyan) 30%, transparent)',
              borderTopColor: 'transparent',
            }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading settings...</p>
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Signup Reward Card ── */}
            <div className="glass-card p-5 sm:p-6" style={{ border: '1px solid var(--glass-border)' }}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0" style={{
                  background: 'linear-gradient(135deg, #00ff88, var(--neon-cyan))',
                }}>🎁</div>
                <div>
                  <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Signup Reward</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    Amount credited to new user wallets on signup. Set to 0 to disable.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold" style={{ color: 'var(--text-muted)' }}>PKR</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={signupReward}
                    onChange={e => setSignupReward(e.target.value)}
                    className="w-full rounded-xl py-2.5 pl-12 pr-4 text-sm font-semibold outline-none transition-all"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--input-border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => e.target.style.borderColor = 'var(--neon-cyan)'}
                    onBlur={e => e.target.style.borderColor = 'var(--input-border)'}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="btn-neon btn-neon-primary text-sm px-5 py-2.5"
                  style={{ opacity: saving ? 0.6 : 1 }}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>

              {msg && (
                <div className="mt-3 px-4 py-2.5 rounded-xl text-sm font-medium animate-fade-in-up" style={{
                  background: msg.type === 'success' ? 'rgba(0,255,136,0.1)' : 'rgba(255,45,120,0.1)',
                  border: `1px solid ${msg.type === 'success' ? 'rgba(0,255,136,0.3)' : 'rgba(255,45,120,0.3)'}`,
                  color: msg.type === 'success' ? '#00ff88' : '#ff2d78',
                }}>
                  {msg.text}
                </div>
              )}

              <p className="mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {Number(signupReward) > 0
                  ? `New users will receive PKR ${signupReward} in their wallet on signup. A modal will prompt guests to sign up.`
                  : 'Signup reward is disabled. No reward modal will be shown to guests.'}
              </p>
            </div>

            {/* Future settings cards can go here */}

          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardSettingsPage() {
  return (
    <AdminRoute>
      <SettingsContent />
    </AdminRoute>
  );
}
