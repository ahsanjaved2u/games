'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
  background: 'var(--input-bg)', border: '1px solid var(--input-border)', outline: 'none',
};

function WalletManagement() {
  const { authFetch, fetchBalance } = useAuth();
  const [tab, setTab] = useState('wallets');
  const [wallets, setWallets] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  // Credit/Debit form
  const [showAction, setShowAction] = useState(null);
  const [actionAmount, setActionAmount] = useState('');
  const [actionDesc, setActionDesc] = useState('');
  const [actionGame, setActionGame] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm modal for withdrawal approve/reject
  const [confirmAction, setConfirmAction] = useState(null);

  // User transaction history
  const [viewTxns, setViewTxns] = useState(null);

  // Transactions tab state
  const [allTxns, setAllTxns] = useState([]);
  const [txnPagination, setTxnPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });
  const [txnPage, setTxnPage] = useState(1);
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [txnStatusFilter, setTxnStatusFilter] = useState('');
  const [txnSearch, setTxnSearch] = useState('');
  const [txnSearchInput, setTxnSearchInput] = useState('');
  const [txnLoading, setTxnLoading] = useState(false);
  const [txnGlobalSummary, setTxnGlobalSummary] = useState(null);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 3000);
  };

  const fetchWallets = async () => {
    setLoading(true);
    try {
      const data = await authFetch('/wallet/admin/all');
      setWallets(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const data = await authFetch('/wallet/admin/withdrawals?status=pending');
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchAllTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', txnPage);
      params.set('limit', '50');
      if (txnTypeFilter) params.set('type', txnTypeFilter);
      if (txnStatusFilter) params.set('status', txnStatusFilter);
      if (txnSearch) params.set('search', txnSearch);
      const data = await authFetch(`/wallet/admin/transactions?${params.toString()}`);
      setAllTxns(data.transactions || []);
      setTxnPagination(data.pagination || { page: 1, limit: 50, total: 0, pages: 0 });
    } catch (err) {
      console.error('Failed to fetch transactions:', err.message);
      setAllTxns([]);
    }
    setTxnLoading(false);
  }, [txnPage, txnTypeFilter, txnStatusFilter, txnSearch, authFetch]);

  // Fetch global summary once when transactions tab is opened
  useEffect(() => {
    if (tab === 'transactions' && !txnGlobalSummary) {
      authFetch('/wallet/admin/transactions?limit=1').then(data => {
        setTxnGlobalSummary(data.summary || { totalCredits: 0, totalDebits: 0, totalWithdrawals: 0, net: 0 });
      }).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'wallets') fetchWallets();
    else if (tab === 'withdrawals') fetchWithdrawals();
    else if (tab === 'transactions') fetchAllTransactions();
  }, [tab, fetchAllTransactions]);

  // Fetch pending withdrawals count on mount for the dot indicator
  useEffect(() => { fetchWithdrawals(); }, []);

  // Reset txn page on filter change
  useEffect(() => { setTxnPage(1); }, [txnTypeFilter, txnStatusFilter, txnSearch]);

  const handleAction = async (e) => {
    e.preventDefault();
    const amt = Number(actionAmount);
    if (!amt || amt <= 0) { flash('Enter a valid amount', 'error'); return; }
    setSubmitting(true);
    try {
      const data = await authFetch(`/wallet/admin/${showAction.type}`, {
        method: 'POST',
        body: JSON.stringify({ userId: showAction.userId, amount: amt, description: actionDesc, game: actionGame }),
      });
      flash(data.message || `${showAction.type} successful`);
      setShowAction(null);
      setActionAmount('');
      setActionDesc('');
      setActionGame('');
      fetchWallets();
    } catch (err) {
      flash(err.message || 'Failed', 'error');
    }
    setSubmitting(false);
  };

  const handleWithdrawalAction = async (id, status) => {
    try {
      const data = await authFetch(`/wallet/admin/withdrawals/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      flash(data.message || `Withdrawal ${status}`);
      fetchWithdrawals();
      fetchBalance();  // refresh admin navbar PKR
    } catch (err) {
      flash(err.message || 'Failed', 'error');
    }
    setConfirmAction(null);
  };

  const viewUserHistory = async (userId, userName) => {
    try {
      const data = await authFetch(`/wallet/admin/transactions/${userId}`);
      setViewTxns({ userId, userName, txns: Array.isArray(data) ? data : [] });
    } catch { /* ignore */ }
  };

  const typeConfig = {
    credit: { icon: '💰', color: '#00ff88', sign: '+' },
    debit: { icon: '📤', color: '#ff5c8a', sign: '-' },
    withdrawal: { icon: '🏦', color: '#ffd93d', sign: '-' },
  };

  return (
    <div className="bg-grid relative min-h-screen" style={{ overflow: 'hidden' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: '#00ff88', top: '5%', right: '5%', opacity: 0.3 }} />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', display: 'flex' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>💰 Wallet Management</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {[{ key: 'wallets', label: '👛 All Wallets' }, { key: 'withdrawals', label: '🏦 Pending Withdrawals' }, { key: 'transactions', label: '📋 Transactions' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setViewTxns(null); setShowAction(null); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all relative overflow-hidden"
              style={{
                background: tab === t.key ? 'rgba(0,255,136,0.12)' : 'var(--subtle-overlay)',
                color: tab === t.key ? '#00ff88' : 'var(--text-muted)',
                border: `1px solid ${tab === t.key ? 'rgba(0,255,136,0.25)' : 'var(--subtle-border)'}`,
              }}>
              {t.label}
              {t.key === 'withdrawals' && withdrawals.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ background: '#ff5c8a', boxShadow: '0 0 6px rgba(255,92,138,0.6)' }} />
              )}
            </button>
          ))}
        </div>

        {/* Flash */}
        {msg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: msg.type === 'error' ? 'rgba(255,45,120,0.12)' : 'rgba(0,255,136,0.12)',
            color: msg.type === 'error' ? '#ff5c8a' : '#00ff88',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,45,120,0.25)' : 'rgba(0,255,136,0.25)'}`,
          }}>{msg.text}</div>
        )}

        {/* Credit/Debit Modal */}
        {showAction && (
          <div className="glass-card p-5 mb-6 animate-fade-in-up">
            <h3 className="text-sm font-bold mb-3" style={{ color: showAction.type === 'credit' ? '#00ff88' : '#ff5c8a' }}>
              {showAction.type === 'credit' ? '💰 Credit' : '📤 Debit'} — {showAction.userName}
            </h3>
            <form onSubmit={handleAction} className="flex flex-wrap gap-3">
              <input type="number" min="1" style={{ ...inputStyle, flex: '1 1 120px' }} placeholder="Amount (PKR)" value={actionAmount} onChange={e => setActionAmount(e.target.value)} required />
              <input style={{ ...inputStyle, flex: '1 1 200px' }} placeholder="Description (e.g. Bubble Shooter reward)" value={actionDesc} onChange={e => setActionDesc(e.target.value)} />
              <input style={{ ...inputStyle, flex: '1 1 150px' }} placeholder="Game (optional)" value={actionGame} onChange={e => setActionGame(e.target.value)} />
              <button type="submit" className="btn-neon btn-neon-primary text-sm" disabled={submitting}>
                {submitting ? 'Processing...' : showAction.type === 'credit' ? '✓ Credit' : '✓ Debit'}
              </button>
              <button type="button" onClick={() => setShowAction(null)} className="btn-neon text-sm">Cancel</button>
            </form>
          </div>
        )}

        {/* User Transaction History Modal */}
        {viewTxns && (
          <div className="glass-card p-5 mb-6 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>📜 History — {viewTxns.userName}</h3>
              <button onClick={() => setViewTxns(null)} className="text-xs" style={{ color: '#ff5c8a' }}>✕ Close</button>
            </div>
            {viewTxns.txns.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No transactions</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {viewTxns.txns.map(txn => {
                  const cfg = typeConfig[txn.type] || typeConfig.credit;
                  return (
                    <div key={txn._id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--subtle-overlay)' }}>
                      <span style={{ fontSize: 16 }}>{cfg.icon}</span>
                      <span className="flex-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{txn.description || txn.type}</span>
                      <span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{txn.status}</span>
                      <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.sign}PKR {txn.amount.toLocaleString()}</span>
                      <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(txn.createdAt).toLocaleDateString()}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
          </div>
        ) : tab === 'wallets' ? (
          /* ── Wallets List ── */
          wallets.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No wallets yet. Wallets are created when players sign in.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {wallets.map(w => (
                <div key={w._id} className="glass-card px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--accent-gradient, linear-gradient(135deg, var(--neon-cyan), var(--neon-purple)))' }}>
                      <span className="text-xs font-bold text-white">{w.user?.name?.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{w.user?.name}</p>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{w.user?.email}</p>
                    </div>
                  </div>
                  <span className="text-lg font-black" style={{
                    background: 'linear-gradient(135deg, #00ff88, #00e5ff)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>PKR {w.balance.toLocaleString()}</span>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => setShowAction({ type: 'credit', userId: w.user?._id, userName: w.user?.name })}
                      className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}>
                      + Credit
                    </button>
                    <button onClick={() => setShowAction({ type: 'debit', userId: w.user?._id, userName: w.user?.name })}
                      className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.2)' }}>
                      - Debit
                    </button>
                    <button onClick={() => viewUserHistory(w.user?._id, w.user?.name)}
                      className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(0,229,255,0.1)', color: 'var(--neon-cyan)', border: '1px solid rgba(0,229,255,0.2)' }}>
                      📜 History
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : tab === 'withdrawals' ? (
          /* ── Withdrawals ── */
          withdrawals.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>✅</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No pending withdrawals</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {withdrawals.map(w => {
                const pm = w.paymentMethod || {};
                const methodLabels = { bank: '🏦 Bank Transfer', easypaisa: '📱 EasyPaisa', jazzcash: '📲 JazzCash' };
                return (
                <div key={w._id} className="glass-card px-5 py-4 flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{w.user?.name} <span className="text-[11px] font-normal" style={{ color: 'var(--text-muted)' }}>({w.user?.email})</span></p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {new Date(w.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {w.note || 'No note'}
                      </p>
                    </div>
                    <span className="text-lg font-black" style={{ color: '#ffd93d' }}>PKR {w.amount.toLocaleString()}</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => setConfirmAction({ id: w._id, status: 'completed', name: w.user?.name, amount: w.amount })}
                        className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88', border: '1px solid rgba(0,255,136,0.2)' }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => setConfirmAction({ id: w._id, status: 'rejected', name: w.user?.name, amount: w.amount })}
                        className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: 'rgba(255,45,120,0.1)', color: '#ff5c8a', border: '1px solid rgba(255,45,120,0.2)' }}>
                        ✕ Reject
                      </button>
                    </div>
                  </div>
                  {/* Payment Details */}
                  {pm.method && (
                    <div className="px-3 py-2.5 rounded-lg flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ background: 'var(--subtle-overlay)', border: '1px solid var(--subtle-border)' }}>
                      <span className="font-semibold" style={{ color: 'var(--neon-cyan)' }}>{methodLabels[pm.method] || pm.method}</span>
                      {pm.bankName && <span style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Bank:</span> {pm.bankName}</span>}
                      {pm.accountTitle && <span style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Title:</span> {pm.accountTitle}</span>}
                      {pm.accountNumber && <span style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Acc#:</span> {pm.accountNumber}</span>}
                      {pm.phoneNumber && <span style={{ color: 'var(--text-secondary)' }}><span style={{ color: 'var(--text-muted)' }}>Phone:</span> {pm.phoneNumber}</span>}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )
        ) : null}

        {/* ── Transactions Tab ── */}
        {tab === 'transactions' && (
          txnLoading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary Cards */}
              {txnGlobalSummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Total Credits', value: txnGlobalSummary.totalCredits, color: '#22c55e', prefix: '+₨' },
                  { label: 'Total Debits', value: txnGlobalSummary.totalDebits, color: '#ff5c8a', prefix: '−₨' },
                  { label: 'Withdrawals', value: txnGlobalSummary.totalWithdrawals, color: '#f59e0b', prefix: '₨' },
                  { label: 'Net Flow', value: txnGlobalSummary.net, color: txnGlobalSummary.net >= 0 ? '#22c55e' : '#ff5c8a', prefix: txnGlobalSummary.net >= 0 ? '+₨' : '−₨', absVal: true },
                ].map(c => (
                  <div key={c.label} className="glass-card p-4">
                    <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
                    <p className="text-xl font-bold" style={{ color: c.color }}>{c.prefix}{c.absVal ? Math.abs(c.value).toLocaleString() : c.value.toLocaleString()}</p>
                  </div>
                ))}
              </div>
              )}

              {/* Filters */}
              <div className="glass-card p-4">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Type:</span>
                  {['', 'credit', 'debit', 'withdrawal'].map(t => (
                    <button key={t || 'all'} onClick={() => setTxnTypeFilter(t)}
                      className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                      style={{
                        background: txnTypeFilter === t ? 'rgba(0,229,255,0.14)' : 'var(--subtle-overlay)',
                        border: txnTypeFilter === t ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
                        color: txnTypeFilter === t ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      }}>{t === '' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}</button>
                  ))}
                  <span className="text-xs font-semibold uppercase ml-4" style={{ color: 'var(--text-muted)' }}>Status:</span>
                  {['', 'completed', 'pending', 'rejected'].map(s => (
                    <button key={s || 'all'} onClick={() => setTxnStatusFilter(s)}
                      className="text-xs font-semibold px-3 py-1 rounded-full transition-all"
                      style={{
                        background: txnStatusFilter === s ? 'rgba(0,229,255,0.14)' : 'var(--subtle-overlay)',
                        border: txnStatusFilter === s ? '1px solid rgba(0,229,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
                        color: txnStatusFilter === s ? 'var(--neon-cyan)' : 'var(--text-secondary)',
                      }}>{s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}</button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); setTxnSearch(txnSearchInput.trim()); }} className="flex gap-2">
                  <input type="text" placeholder="Search by user name..." value={txnSearchInput}
                    onChange={(e) => setTxnSearchInput(e.target.value)}
                    className="flex-1 text-sm px-3 py-2 rounded-lg"
                    style={{ background: 'var(--subtle-overlay)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-primary)', outline: 'none' }} />
                  <button type="submit" className="btn-neon text-sm">Search</button>
                  {txnSearch && (
                    <button type="button" className="text-xs px-3 py-1 rounded-full"
                      style={{ background: 'rgba(255,92,138,0.15)', color: '#ff5c8a', border: '1px solid rgba(255,92,138,0.3)' }}
                      onClick={() => { setTxnSearch(''); setTxnSearchInput(''); }}>Clear</button>
                  )}
                </form>
              </div>

              {/* Table */}
              <div className="glass-card overflow-hidden" style={{ maxHeight: '55vh', display: 'flex', flexDirection: 'column' }}>
                {allTxns.length === 0 ? (
                  <div className="text-center py-12">
                    <span style={{ fontSize: 30, display: 'block', marginBottom: 8, opacity: 0.35 }}>📋</span>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto" style={{ overflowY: 'auto', flex: 1 }}>
                    <table className="w-full min-w-[750px]">
                      <thead className="sticky top-0 z-10">
                        <tr style={{ background: 'var(--bg-card, #141428)' }}>
                          {['Date', 'User', 'Type', 'Amount', 'Status', 'Description'].map(h => (
                            <th key={h} className={`text-[10px] uppercase tracking-wider px-4 py-2 ${h === 'Amount' ? 'text-right' : h === 'Type' || h === 'Status' ? 'text-center' : 'text-left'}`}
                              style={{ color: 'var(--text-muted)', background: 'var(--bg-card, #141428)' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allTxns.map(txn => {
                          const tc = { credit: { c: '#22c55e', l: '+ Credit' }, debit: { c: '#ff5c8a', l: '− Debit' }, withdrawal: { c: '#f59e0b', l: '↗ Withdrawal' } }[txn.type] || { c: '#888', l: txn.type };
                          const sc = { completed: '#22c55e', pending: '#f59e0b', rejected: '#ff5c8a' }[txn.status] || '#888';
                          return (
                            <tr key={txn._id} style={{ borderTop: '1px solid var(--subtle-border)' }}>
                              <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                {new Date(txn.createdAt).toLocaleDateString('en-PK', { month: 'short', day: 'numeric', year: 'numeric' })}
                                {' '}{new Date(txn.createdAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)', maxWidth: 150 }}>{txn.user?.name || 'Unknown'}</p>
                                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)', maxWidth: 150 }}>{txn.user?.email || ''}</p>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ color: tc.c, background: tc.c + '1a', border: `1px solid ${tc.c}44` }}>{tc.l}</span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <span className="text-sm font-bold" style={{ color: tc.c }}>₨{txn.amount.toLocaleString()}</span>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-full"
                                  style={{ color: sc, background: sc + '1a' }}>{txn.status}</span>
                              </td>
                              <td className="px-4 py-3">
                                <p className="text-xs truncate" style={{ color: 'var(--text-secondary)', maxWidth: 220 }}>{txn.description || txn.note || '—'}</p>
                                {txn.game && <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Game: {txn.game}</p>}
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
              {txnPagination.pages > 1 && (
                <div className="flex items-center justify-center gap-2">
                  <button disabled={txnPage <= 1} onClick={() => setTxnPage(p => Math.max(1, p - 1))}
                    className="btn-neon text-sm" style={{ opacity: txnPage <= 1 ? 0.4 : 1 }}>← Prev</button>
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {txnPagination.page} of {txnPagination.pages}</span>
                  <button disabled={txnPage >= txnPagination.pages} onClick={() => setTxnPage(p => Math.min(txnPagination.pages, p + 1))}
                    className="btn-neon text-sm" style={{ opacity: txnPage >= txnPagination.pages ? 0.4 : 1 }}>Next →</button>
                </div>
              )}

              <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                {txnPagination.total.toLocaleString()} total transactions
              </p>
            </div>
          )
        )}

        {/* Confirm Modal */}
        {confirmAction && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            onClick={() => setConfirmAction(null)}>
            <div className="glass-card p-6 animate-fade-in-up" style={{ maxWidth: 400, width: '90%' }} onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>
                  {confirmAction.status === 'completed' ? '✅' : '❌'}
                </span>
                <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {confirmAction.status === 'completed' ? 'Approve Withdrawal?' : 'Reject Withdrawal?'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {confirmAction.status === 'completed'
                    ? `PKR ${confirmAction.amount?.toLocaleString()} will be marked as paid to ${confirmAction.name}.`
                    : `PKR ${confirmAction.amount?.toLocaleString()} will be refunded back to ${confirmAction.name}'s wallet.`}
                </p>
              </div>
              <div className="flex gap-3 justify-center">
                <button onClick={() => setConfirmAction(null)}
                  className="text-xs font-semibold px-5 py-2.5 rounded-lg" style={{ background: 'var(--subtle-border)', color: 'var(--text-muted)', border: '1px solid var(--input-border)' }}>
                  Cancel
                </button>
                <button onClick={() => handleWithdrawalAction(confirmAction.id, confirmAction.status)}
                  className="text-xs font-semibold px-5 py-2.5 rounded-lg" style={{
                    background: confirmAction.status === 'completed' ? 'rgba(0,255,136,0.15)' : 'rgba(255,45,120,0.15)',
                    color: confirmAction.status === 'completed' ? '#00ff88' : '#ff5c8a',
                    border: `1px solid ${confirmAction.status === 'completed' ? 'rgba(0,255,136,0.3)' : 'rgba(255,45,120,0.3)'}`,
                  }}>
                  {confirmAction.status === 'completed' ? '✓ Yes, Approve' : '✕ Yes, Reject'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardWalletPage() {
  return (
    <AdminRoute>
      <WalletManagement />
    </AdminRoute>
  );
}
