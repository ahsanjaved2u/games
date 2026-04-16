'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

function TransactionsPage() {
  const { authFetch } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({ totalCredits: 0, totalDebits: 0, totalWithdrawals: 0, net: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', '50');
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (search) params.set('search', search);

      const data = await authFetch(`/wallet/admin/transactions?${params.toString()}`);
      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalCredits: 0, totalDebits: 0, totalWithdrawals: 0, net: 0 });
      setPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      console.error('Failed to fetch transactions:', err.message);
      setTransactions([]);
    }
    setLoading(false);
  }, [page, typeFilter, statusFilter, search, authFetch]);

  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [typeFilter, statusFilter, search]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const formatDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return dt.toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + dt.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
  };

  const typeColors = {
    credit: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', label: '+ Credit' },
    debit: { color: '#ff5c8a', bg: 'rgba(255,92,138,0.12)', border: 'rgba(255,92,138,0.3)', label: '− Debit' },
    withdrawal: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.3)', label: '↗ Withdrawal' },
  };

  const statusColors = {
    completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.12)' },
    pending: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    rejected: { color: '#ff5c8a', bg: 'rgba(255,92,138,0.12)' },
  };

  const filterBtn = (key, value) => ({
    background: value === key ? 'rgba(0,229,255,0.14)' : 'var(--subtle-overlay)',
    border: value === key ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
    color: value === key ? 'var(--neon-cyan)' : 'var(--text-secondary)',
  });

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: 'var(--neon-purple)', top: '5%', right: '5%' }} />
      <div className="glow-orb" style={{ width: '28vw', height: '28vw', maxWidth: 350, maxHeight: 350, background: 'var(--neon-cyan)', bottom: '10%', left: '5%', animationDelay: '7s' }} />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              📋 All Transactions
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              {pagination.total.toLocaleString()} total transactions
            </p>
          </div>
          <Link href="/dashboard" className="btn-neon text-sm" style={{ textDecoration: 'none' }}>
            ← Dashboard
          </Link>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total Credits', value: summary.totalCredits, color: '#22c55e', prefix: '+₨' },
            { label: 'Total Debits', value: summary.totalDebits, color: '#ff5c8a', prefix: '−₨' },
            { label: 'Withdrawals', value: summary.totalWithdrawals, color: '#f59e0b', prefix: '₨' },
            { label: 'Net Flow', value: summary.net, color: summary.net >= 0 ? '#22c55e' : '#ff5c8a', prefix: summary.net >= 0 ? '+₨' : '−₨', absValue: true },
          ].map((card) => (
            <div key={card.label} className="glass-card p-4">
              <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{card.label}</p>
              <p className="text-xl font-bold" style={{ color: card.color }}>
                {card.prefix}{card.absValue ? Math.abs(card.value).toLocaleString() : card.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="glass-card p-4 mb-4">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Type:</span>
            {['', 'credit', 'debit', 'withdrawal'].map((t) => (
              <button key={t || 'all'} onClick={() => setTypeFilter(t)}
                className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                style={filterBtn(t, typeFilter)}>
                {t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}

            <span className="text-xs font-semibold uppercase ml-4" style={{ color: 'var(--text-muted)' }}>Status:</span>
            {['', 'completed', 'pending', 'rejected'].map((s) => (
              <button key={s || 'all'} onClick={() => setStatusFilter(s)}
                className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                style={filterBtn(s, statusFilter)}>
                {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search by user name..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-1 text-sm px-3 py-2 rounded-lg"
              style={{
                background: 'var(--subtle-overlay)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn-neon text-sm">Search</button>
            {search && (
              <button type="button" className="text-xs px-3 py-1 rounded-full"
                style={{ background: 'rgba(255,92,138,0.15)', color: '#ff5c8a', border: '1px solid rgba(255,92,138,0.3)' }}
                onClick={() => { setSearch(''); setSearchInput(''); }}>
                Clear
              </button>
            )}
          </form>
        </div>

        {/* Transaction Table */}
        <div className="glass-card overflow-hidden" style={{ maxHeight: '65vh', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--neon-cyan)' }} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <span style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: 0.35 }}>📋</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto" style={{ overflowY: 'auto', flex: 1 }}>
              <table className="w-full min-w-[800px]">
                <thead className="sticky top-0 z-20">
                  <tr style={{ background: 'var(--bg-card, #141428)' }}>
                    <th className="text-left text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>Date</th>
                    <th className="text-left text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>User</th>
                    <th className="text-center text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>Type</th>
                    <th className="text-right text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>Amount</th>
                    <th className="text-center text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>Status</th>
                    <th className="text-left text-[10px] uppercase tracking-wider px-4 py-2" style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => {
                    const tc = typeColors[txn.type] || typeColors.credit;
                    const sc = statusColors[txn.status] || statusColors.completed;
                    return (
                      <tr key={txn._id} style={{ borderTop: '1px solid var(--subtle-border)' }}>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {formatDate(txn.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: 160 }}>
                            {txn.user?.name || 'Unknown'}
                          </p>
                          <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', maxWidth: 160 }}>
                            {txn.user?.email || ''}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ color: tc.color, background: tc.bg, border: `1px solid ${tc.border}` }}>
                            {tc.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm font-bold" style={{ color: tc.color }}>
                            ₨{txn.amount.toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                            style={{ color: sc.color, background: sc.bg }}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 250 }}>
                            {txn.description || txn.note || '—'}
                          </p>
                          {txn.game && (
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Game: {txn.game}</p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="btn-neon text-sm"
              style={{ opacity: page <= 1 ? 0.4 : 1 }}>
              ← Prev
            </button>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              disabled={page >= pagination.pages}
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              className="btn-neon text-sm"
              style={{ opacity: page >= pagination.pages ? 0.4 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TransactionsPageWrapper() {
  return (
    <AdminRoute>
      <TransactionsPage />
    </AdminRoute>
  );
}
