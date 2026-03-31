'use client';

import { useState } from 'react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [status, setStatus] = useState(null); // 'sending' | 'sent' | 'error'

  const handleChange = e => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) return;

    setStatus('sending');
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('sent');
        setForm({ name: '', email: '', subject: '', message: '' });
        setTimeout(() => setStatus(null), 5000);
      } else {
        setStatus('error');
        setTimeout(() => setStatus(null), 4000);
      }
    } catch {
      setStatus('error');
      setTimeout(() => setStatus(null), 4000);
    }
  };

  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>

      {/* Hero */}
      <div className="relative overflow-hidden pt-0 pb-3">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in srgb, var(--neon-cyan) 6%, transparent), transparent)' }} />
        <div className="max-w-3xl mx-auto px-4 text-center relative z-10">
          <h1
            className="text-2xl sm:text-3xl font-bold"
            style={{
              background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ✉️ Get in Touch
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 pb-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Contact Info Cards */}
          <div className="md:col-span-2 space-y-3">
            {/* Email card */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: 'color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
                  fontSize: 20,
                }}>📧</div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Email Us</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>We typically reply within 24 hours</p>
                </div>
              </div>
              <a
                href="mailto:support@gamevesta.com"
                className="block text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--neon-cyan)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                support@gamevesta.com
              </a>
            </div>

            {/* Website card */}
            <div
              className="rounded-2xl p-4"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid color-mix(in srgb, var(--neon-purple) 10%, transparent)',
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
                  background: 'color-mix(in srgb, var(--neon-purple) 10%, transparent)',
                  fontSize: 20,
                }}>🌐</div>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Website</h3>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Visit our official site</p>
                </div>
              </div>
              <a
                href="https://gamevesta.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: 'var(--neon-purple)', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
              >
                gamevesta.com
              </a>
            </div>

          </div>

          {/* Contact Form */}
          <div className="md:col-span-3">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-5"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid color-mix(in srgb, var(--neon-cyan) 10%, transparent)',
              }}
            >
              <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Send us a message
              </h2>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Fill out the form and your email client will open with your message ready to send.
              </p>

              <div className="space-y-3">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Your Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder="John Doe"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--subtle-border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--neon-cyan) 10%, transparent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--subtle-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Your Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="you@example.com"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--subtle-border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--neon-cyan) 10%, transparent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--subtle-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Subject */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Subject
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    placeholder="How can we help?"
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--subtle-border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--neon-cyan) 10%, transparent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--subtle-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                    Message
                  </label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={3}
                    placeholder="Tell us what's on your mind..."
                    className="w-full px-4 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 resize-none"
                    style={{
                      background: 'var(--input-bg)',
                      border: '1px solid var(--subtle-border)',
                      color: 'var(--text-primary)',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'var(--neon-cyan)'; e.target.style.boxShadow = '0 0 0 3px color-mix(in srgb, var(--neon-cyan) 10%, transparent)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--subtle-border)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={status === 'sending'}
                  className="w-full py-3 rounded-xl text-sm font-semibold transition-all duration-200"
                  style={{
                    background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))',
                    color: '#fff',
                    border: 'none',
                    cursor: status === 'sending' ? 'not-allowed' : 'pointer',
                    opacity: status === 'sending' ? 0.7 : 1,
                  }}
                  onMouseEnter={e => {
                    if (status !== 'sending') {
                      e.currentTarget.style.boxShadow = '0 0 24px color-mix(in srgb, var(--neon-cyan) 25%, transparent)';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {status === 'sending' ? 'Sending...' : '📨 Send Message'}
                </button>

                {/* Success message */}
                {status === 'sent' && (
                  <div
                    className="text-center py-3 rounded-xl text-sm font-medium animate-fade-in-up"
                    style={{
                      background: 'color-mix(in srgb, var(--neon-green) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--neon-green) 20%, transparent)',
                      color: 'var(--neon-green)',
                    }}
                  >
                    ✅ Message sent successfully! We'll get back to you soon.
                  </div>
                )}

                {/* Error message */}
                {status === 'error' && (
                  <div
                    className="text-center py-3 rounded-xl text-sm font-medium animate-fade-in-up"
                    style={{
                      background: 'color-mix(in srgb, var(--neon-purple) 8%, transparent)',
                      border: '1px solid color-mix(in srgb, var(--neon-purple) 20%, transparent)',
                      color: '#ff5c8a',
                    }}
                  >
                    ❌ Failed to send message. Please try again or email us directly.
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
