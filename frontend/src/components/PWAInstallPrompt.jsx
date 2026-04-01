'use client';

import { useState, useEffect } from 'react';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = sessionStorage.getItem('pwa-dismissed');
      if (!dismissed) setShow(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setShow(false);
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    sessionStorage.setItem('pwa-dismissed', '1');
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-80 z-50 animate-fade-in-up" style={{
      background: 'var(--bg-card)', border: '1px solid var(--glass-border)',
      borderRadius: 16, padding: '16px 20px', backdropFilter: 'blur(16px)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    }}>
      <div className="flex items-start gap-3">
        <span style={{ fontSize: 28 }}>📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Install GameVesta</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Add to home screen for instant access — no app store needed.</p>
          <div className="flex gap-2 mt-3">
            <button onClick={handleInstall} className="btn-neon btn-neon-primary text-xs px-4 py-1.5" style={{ borderRadius: 8 }}>Install</button>
            <button onClick={handleDismiss} className="text-xs px-3 py-1.5" style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}>Not now</button>
          </div>
        </div>
      </div>
    </div>
  );
}
