'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
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
    return data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
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
    return res.json();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      isAdmin,
      isLoggedIn: !!user,
      signup,
      login,
      logout,
      authFetch,
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
