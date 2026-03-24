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
  const router = useRouter();

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
    } catch { /* ignore */ }
  }, [token]);

  // Fetch balance when token is available, then poll every 30s
  useEffect(() => {
    if (!token) return;
    fetchBalance();
    const id = setInterval(fetchBalance, 30000);
    return () => clearInterval(id);
  }, [token, fetchBalance]);

  const signup = async (name, email, password) => {
    const res = await fetch(`${API}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
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
