'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.replace('/');
    }
  }, [user, isAdmin, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid">
        <div className="flex flex-col items-center gap-4 animate-fade-in-up">
          <div className="w-12 h-12 border-3 border-t-transparent rounded-full animate-spin" style={{
            borderColor: 'rgba(0,229,255,0.3)',
            borderTopColor: 'var(--neon-cyan)',
          }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !isAdmin) return null;

  return children;
}
