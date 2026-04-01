'use client';

import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    delete timers.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, type = 'success', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev.slice(-4), { id, message, type }]);
    timers.current[id] = setTimeout(() => dismiss(id), duration);
    return id;
  }, [dismiss]);

  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const colors = {
    success: { border: 'rgba(0,255,136,0.3)', bg: 'rgba(0,255,136,0.08)', color: '#00ff88' },
    error: { border: 'rgba(255,45,120,0.3)', bg: 'rgba(255,45,120,0.08)', color: '#ff2d78' },
    info: { border: 'rgba(0,229,255,0.3)', bg: 'rgba(0,229,255,0.08)', color: '#00e5ff' },
    warning: { border: 'rgba(255,217,61,0.3)', bg: 'rgba(255,217,61,0.08)', color: '#ffd93d' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{ position: 'fixed', top: 56, right: 16, zIndex: 99999, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none', maxWidth: 360 }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 12,
              background: 'var(--bg-card)', border: `1px solid ${c.border}`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.3), 0 0 12px ${c.bg}`,
              backdropFilter: 'blur(12px)',
              animation: 'toastIn 0.3s ease-out',
              cursor: 'pointer',
            }} onClick={() => dismiss(t.id)}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{icons[t.type]}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.color }}>{t.message}</span>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
