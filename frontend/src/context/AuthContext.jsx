'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [walletBalance, setWalletBalance] = useState(0);
  const [lockedBalance, setLockedBalance] = useState(0);
  const [availableBalance, setAvailableBalance] = useState(0);
  const router = useRouter();

  // Force-logout helper (used by refreshUser & authFetch when server returns 403)
  const forceLogout = useCallback(() => {
    setToken(null);
    setUser(null);
    setWalletBalance(0);
    setLockedBalance(0);
    setAvailableBalance(0);
    localStorage.removeItem('gz_token');
    localStorage.removeItem('gz_user');
    router.push('/login');
  }, [router]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('gz_token');
      const savedUser = localStorage.getItem('gz_user');
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // corrupt data — clear
      localStorage.removeItem('gz_token');
      localStorage.removeItem('gz_user');
    }
    setLoading(false);
  }, []);

  const fetchBalance = useCallback(async (tk) => {
    const t = tk || token;
    if (!t) return;
    try {
      const res = await fetch(`${API}/wallet/balance`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await res.json();
      if (data.balance !== undefined) setWalletBalance(data.balance);
      if (data.lockedBalance !== undefined) setLockedBalance(data.lockedBalance);
      if (data.availableBalance !== undefined) setAvailableBalance(data.availableBalance);
    } catch { /* ignore */ }
  }, [token]);

  // Silently refresh user profile from server
  const refreshUser = useCallback(async (tk) => {
    const t = tk || token;
    if (!t) return;
    try {
      const res = await fetch(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.status === 403 || res.status === 401) { forceLogout(); return; }
      const data = await res.json();
      if (data.success && data.user) {
        setUser(prev => {
          const merged = { ...prev, ...data.user };
          localStorage.setItem('gz_user', JSON.stringify(merged));
          return merged;
        });
      }
    } catch { /* ignore */ }
  }, [token, forceLogout]);

  // SSE — real-time push from server (block/verify/delete events, instant)
  useEffect(() => {
    if (!token) return;
    const es = new EventSource(`${API}/users/me/stream?token=${token}`);

    es.addEventListener('blocked', () => forceLogout());
    es.addEventListener('deleted', () => forceLogout());
    es.addEventListener('verified', (e) => {
      try {
        const d = JSON.parse(e.data);
        setUser(prev => {
          const merged = { ...prev, emailVerified: d.emailVerified };
          localStorage.setItem('gz_user', JSON.stringify(merged));
          return merged;
        });
      } catch { /* ignore */ }
    });
    es.addEventListener('unblocked', () => refreshUser());
    es.addEventListener('restored', () => refreshUser());
    es.addEventListener('wallet-update', () => fetchBalance());

    return () => es.close();
  }, [token, forceLogout, refreshUser, fetchBalance]);

  // Fetch balance when token is available, then poll every 30s (only when tab visible)
  useEffect(() => {
    if (!token) return;
    fetchBalance();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchBalance();
    }, 30000);
    return () => clearInterval(id);
  }, [token, fetchBalance]);

  // Backfill referralCode for users who logged in before referral system
  useEffect(() => {
    if (!token || !user || user.referralCode) return;
    (async () => {
      try {
        const res = await fetch(`${API}/referrals/my`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.referralCode) {
          const updated = { ...user, referralCode: data.referralCode };
          setUser(updated);
          localStorage.setItem('gz_user', JSON.stringify(updated));
        }
      } catch { /* ignore */ }
    })();
  }, [token, user]);

  const signup = async (name, email, password, referralCode) => {
    const res = await fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, referralCode: referralCode || undefined }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Signup failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('gz_token', data.token);
    localStorage.setItem('gz_user', JSON.stringify(data.user));
    fetchBalance(data.token);
    return data;
  };

  const login = async (email, password) => {
    const res = await fetch(`${API}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Login failed');
    setToken(data.token);
    setUser(data.user);
    localStorage.setItem('gz_token', data.token);
    localStorage.setItem('gz_user', JSON.stringify(data.user));
    fetchBalance(data.token);
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setWalletBalance(0);
    setLockedBalance(0);
    setAvailableBalance(0);
    localStorage.removeItem('gz_token');
    localStorage.removeItem('gz_user');
    router.push('/');
  };


  // Helper to make authenticated API calls
  const authFetch = async (url, options = {}) => {
    const res = await fetch(`${API}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
    // 403 from protect middleware = blocked/deleted → force logout
    if (res.status === 403) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const data = await res.json();
        const msg = data.message || '';
        if (msg.includes('blocked') || msg.includes('deleted')) {
          forceLogout();
          throw new Error(msg);
        }
        throw new Error(msg || `Request failed (403)`);
      }
    }
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server error (${res.status}) — unexpected response format`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
    return data;
  };

  const isAdmin = user?.role === 'admin';

  const updateUser = (updates) => {
    setUser(prev => {
      const merged = { ...prev, ...updates };
      localStorage.setItem('gz_user', JSON.stringify(merged));
      return merged;
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAdmin,
      isLoggedIn: !!user,
      walletBalance,
      lockedBalance,
      availableBalance,
      fetchBalance,
      signup,
      login,
      logout,
      authFetch,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
