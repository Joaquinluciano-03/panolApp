'use client';
// context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem('panol_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setLoading(false);
  }, []);

  const login = async (credential) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error de login');

    // Guardar token en cookie (para middleware) y localStorage (para cliente)
    document.cookie = `panol_token=${data.token}; path=/; max-age=28800; SameSite=Strict`;
    localStorage.setItem('panol_token', data.token);
    localStorage.setItem('panol_user', JSON.stringify(data.user));
    setUser(data.user);
    return data;
  };

  const logout = () => {
    document.cookie = 'panol_token=; path=/; max-age=0';
    localStorage.removeItem('panol_token');
    localStorage.removeItem('panol_user');
    setUser(null);
    router.push('/login');
  };

  const getToken = () => {
    if (typeof window !== 'undefined') return localStorage.getItem('panol_token');
    return null;
  };

  const authFetch = async (url, options = {}) => {
    const token = getToken();
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, authFetch, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    if (typeof window === 'undefined') {
      return { user: null, loading: true, login: async () => {}, logout: () => {}, authFetch: async () => {}, getToken: () => null };
    }
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
