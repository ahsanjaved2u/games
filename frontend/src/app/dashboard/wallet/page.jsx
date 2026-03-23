'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminRoute from '@/components/AdminRoute';
import Link from 'next/link';

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
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

  useEffect(() => {
    if (tab === 'wallets') fetchWallets();
    else fetchWithdrawals();
  }, [tab]);

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
          {[{ key: 'wallets', label: '👛 All Wallets' }, { key: 'withdrawals', label: '🏦 Pending Withdrawals' }].map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setViewTxns(null); setShowAction(null); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t.key ? 'rgba(0,255,136,0.12)' : 'rgba(255,255,255,0.04)',
                color: tab === t.key ? '#00ff88' : 'var(--text-muted)',
                border: `1px solid ${tab === t.key ? 'rgba(0,255,136,0.25)' : 'rgba(255,255,255,0.08)'}`,
              }}>{t.label}</button>
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
                    <div key={txn._id} className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
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
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #00e5ff, #a855f7)' }}>
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
        ) : (
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
                    <div className="px-3 py-2.5 rounded-lg flex flex-wrap gap-x-6 gap-y-1 text-xs" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
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
                  className="text-xs font-semibold px-5 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', border: '1px solid rgba(255,255,255,0.1)' }}>
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
