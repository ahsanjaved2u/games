'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';

export default function WalletPage() {
  const { authFetch, isLoggedIn, walletBalance, fetchBalance } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [payMethod, setPayMethod] = useState('');
  const [payDetails, setPayDetails] = useState({});
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [withdrawStep, setWithdrawStep] = useState(1); // 1=amount, 2=method+details
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const flash = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg(null), 4000);
  };

  useEffect(() => {
    if (!isLoggedIn) { setLoading(false); return; }
    (async () => {
      try {
        const data = await authFetch('/wallet');
        setTransactions(data.transactions || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [isLoggedIn]);

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amt = Number(withdrawAmount);
    if (!amt || amt <= 0) { flash('Enter a valid amount', 'error'); return; }
    if (amt > walletBalance) { flash('Insufficient balance', 'error'); return; }
    if (!payMethod) { flash('Select a payment method', 'error'); return; }

    // Validate required fields per method
    if (payMethod === 'bank') {
      if (!payDetails.bankName || !payDetails.accountNumber || !payDetails.accountTitle) {
        flash('Fill all bank details', 'error'); return;
      }
    } else if (payMethod === 'easypaisa' || payMethod === 'jazzcash') {
      if (!payDetails.accountTitle || !payDetails.phoneNumber) {
        flash('Fill account holder name and phone number', 'error'); return;
      }
    }

    setSubmitting(true);
    try {
      const data = await authFetch('/wallet/withdraw', {
        method: 'POST',
        body: JSON.stringify({
          amount: amt,
          note: withdrawNote,
          paymentMethod: { method: payMethod, ...payDetails },
        }),
      });
      if (data.message) flash(data.message);
      else flash('Withdrawal requested');
      setWithdrawAmount('');
      setWithdrawNote('');
      setPayMethod('');
      setPayDetails({});
      setWithdrawStep(1);
      setShowWithdraw(false);
      fetchBalance();
      const fresh = await authFetch('/wallet');
      setTransactions(fresh.transactions || []);
    } catch (err) {
      flash(err.message || 'Failed', 'error');
    }
    setSubmitting(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-grid relative" style={{ minHeight: 'calc(100vh - 64px)' }}>
        <div className="relative z-10 flex items-center justify-center" style={{ minHeight: 'calc(100vh - 64px)' }}>
          <div className="glass-card p-8 text-center" style={{ maxWidth: 400 }}>
            <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>🔒</span>
            <p className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Login Required</p>
            <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>Sign in to access your wallet</p>
            <Link href="/login" className="btn-neon btn-neon-primary text-sm" style={{ textDecoration: 'none' }}>Log In</Link>
          </div>
        </div>
      </div>
    );
  }

  const typeConfig = {
    credit: { icon: '💰', color: '#00ff88', label: 'Credit', sign: '+' },
    debit: { icon: '📤', color: '#ff5c8a', label: 'Debit', sign: '-' },
    withdrawal: { icon: '🏦', color: '#ff5c8a', label: 'Withdraw', sign: '-' },
  };

  const statusColors = {
    completed: { bg: 'rgba(0,255,136,0.1)', color: '#00ff88', border: 'rgba(0,255,136,0.2)' },
    pending: { bg: 'rgba(255,217,61,0.1)', color: '#ffd93d', border: 'rgba(255,217,61,0.2)' },
    rejected: { bg: 'rgba(255,217,61,0.1)', color: '#ffd93d', border: 'rgba(255,217,61,0.2)' },
  };

  return (
    <div className="bg-grid relative" style={{ overflow: 'hidden', minHeight: 'calc(100vh - 64px)' }}>
      <div className="glow-orb" style={{ width: '30vw', height: '30vw', maxWidth: 400, maxHeight: 400, background: '#00ff88', top: '0%', right: '5%', opacity: 0.4 }} />
      <div className="glow-orb" style={{ width: '25vw', height: '25vw', maxWidth: 300, maxHeight: 300, background: '#a855f7', bottom: '10%', left: '5%', animationDelay: '5s', opacity: 0.3 }} />

      <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">

        {/* ── Balance Card ── */}
        <div className="rounded-2xl px-5 py-4 mb-5 flex items-center justify-between gap-4 relative overflow-hidden" style={{
          background: 'linear-gradient(135deg, rgba(0,255,136,0.06) 0%, rgba(0,229,255,0.04) 50%, rgba(168,85,247,0.06) 100%)',
          border: '1px solid rgba(0,255,136,0.15)',
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -30, width: 100, height: 100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,255,136,0.1), transparent 70%)', pointerEvents: 'none' }} />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: 'var(--text-muted)' }}>Your Balance</p>
            <p className="text-3xl font-black leading-none" style={{
              background: 'linear-gradient(135deg, #00ff88, #00e5ff)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 0 16px rgba(0,255,136,0.3))',
            }}>
              PKR {walletBalance.toLocaleString()}
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Available for withdrawal</p>
          </div>
          <button onClick={() => { setShowWithdraw(!showWithdraw); setWithdrawStep(1); setPayMethod(''); setPayDetails({}); setWithdrawAmount(''); setWithdrawNote(''); }} className="btn-neon text-sm shrink-0" style={{
            background: showWithdraw ? 'rgba(255,217,61,0.12)' : 'rgba(0,255,136,0.08)',
            borderColor: showWithdraw ? 'rgba(255,217,61,0.3)' : 'rgba(0,255,136,0.2)',
            color: showWithdraw ? '#ffd93d' : '#00ff88',
          }}>
            {showWithdraw ? '✕ Cancel' : '🏦 Withdraw'}
          </button>
          <button onClick={() => setShowTopUp(true)} className="btn-neon text-sm shrink-0" style={{
            background: 'rgba(0,229,255,0.08)',
            borderColor: 'rgba(0,229,255,0.25)',
            color: '#00e5ff',
          }}>
            💳 Add Funds
          </button>
        </div>

        {/* ── Withdraw Form ── */}
        {showWithdraw && (
          <div className="glass-card p-5 mb-5 animate-fade-in-up">
            <form onSubmit={handleWithdraw}>
              <div className="flex flex-col gap-3">

                {/* Step 1: Amount */}
                {withdrawStep === 1 && (
                  <>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Amount (PKR)</label>
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        max={walletBalance}
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="Enter amount"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                    </div>
                    <button type="button" onClick={() => {
                      const amt = Number(withdrawAmount);
                      if (!amt || amt <= 0) { flash('Enter a valid amount', 'error'); return; }
                      if (amt > walletBalance) { flash('Insufficient balance', 'error'); return; }
                      setWithdrawStep(2);
                    }} className="btn-neon btn-neon-primary text-sm">
                      Next → Choose Payment Method
                    </button>
                  </>
                )}

                {/* Step 2: Method + Details */}
                {withdrawStep === 2 && (
                  <>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Withdrawing <span style={{ color: '#ffd93d', fontWeight: 800 }}>PKR {Number(withdrawAmount).toLocaleString()}</span></p>
                      <button type="button" onClick={() => setWithdrawStep(1)} className="text-xs" style={{ color: 'var(--neon-cyan)' }}>← Change amount</button>
                    </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-muted)' }}>Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'bank', icon: '🏦', label: 'Bank Transfer' },
                      { key: 'easypaisa', icon: '📱', label: 'EasyPaisa' },
                      { key: 'jazzcash', icon: '📲', label: 'JazzCash' },
                    ].map(m => (
                      <button type="button" key={m.key} onClick={() => { setPayMethod(m.key); setPayDetails({}); }}
                        className="flex flex-col items-center gap-1 p-3 rounded-xl text-xs font-semibold transition-all"
                        style={{
                          background: payMethod === m.key ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1.5px solid ${payMethod === m.key ? 'rgba(0,255,136,0.35)' : 'rgba(255,255,255,0.08)'}`,
                          color: payMethod === m.key ? '#00ff88' : 'var(--text-muted)',
                          transform: payMethod === m.key ? 'scale(1.03)' : 'scale(1)',
                        }}>
                        <span style={{ fontSize: 22 }}>{m.icon}</span>
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Bank Fields ── */}
                {payMethod === 'bank' && (
                  <div className="flex flex-col gap-3 animate-fade-in-up">
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Bank Name</label>
                      <input
                        list="pk-banks"
                        value={payDetails.bankName || ''}
                        onChange={e => setPayDetails(p => ({ ...p, bankName: e.target.value }))}
                        placeholder="Select or type bank name"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                      <datalist id="pk-banks">
                        {['Allied Bank (ABL)','Askari Bank','Bank Alfalah','Bank Al-Habib','Bank of Punjab (BOP)','BankIslami','Faysal Bank','Habib Bank (HBL)','Habib Metropolitan Bank','JS Bank','MCB Bank','Meezan Bank','National Bank of Pakistan (NBP)','Samba Bank','Silk Bank','Soneri Bank','Standard Chartered Pakistan','Summit Bank','UBL (United Bank)','Al Baraka Bank','Dubai Islamic Bank Pakistan','First Women Bank','Khushhali Microfinance Bank','NRSP Microfinance Bank','U Microfinance Bank','Telenor Microfinance Bank (Easypaisa)','Mobilink Microfinance Bank (JazzCash)'].map(b => (
                          <option key={b} value={b} />
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Account Title</label>
                      <input
                        value={payDetails.accountTitle || ''}
                        onChange={e => setPayDetails(p => ({ ...p, accountTitle: e.target.value }))}
                        placeholder="Name on bank account"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Account Number / IBAN</label>
                      <input
                        value={payDetails.accountNumber || ''}
                        onChange={e => setPayDetails(p => ({ ...p, accountNumber: e.target.value }))}
                        placeholder="e.g. PK36SCBL0000001123456702"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* ── EasyPaisa / JazzCash Fields ── */}
                {(payMethod === 'easypaisa' || payMethod === 'jazzcash') && (
                  <div className="flex flex-col gap-3 animate-fade-in-up">
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Account Holder Name</label>
                      <input
                        value={payDetails.accountTitle || ''}
                        onChange={e => setPayDetails(p => ({ ...p, accountTitle: e.target.value }))}
                        placeholder="Name on account"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone Number</label>
                      <input
                        value={payDetails.phoneNumber || ''}
                        onChange={e => setPayDetails(p => ({ ...p, phoneNumber: e.target.value }))}
                        placeholder="e.g. 03001234567"
                        required
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Note (optional) */}
                {payMethod && (
                  <div className="animate-fade-in-up">
                    <label className="text-xs font-semibold mb-1 block" style={{ color: 'var(--text-muted)' }}>Note (optional)</label>
                    <input
                      value={withdrawNote}
                      onChange={e => setWithdrawNote(e.target.value)}
                      placeholder="Any extra info for admin"
                      style={{
                        width: '100%', padding: '10px 14px', borderRadius: 10, fontSize: 14, color: '#fff',
                        background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', outline: 'none',
                      }}
                    />
                  </div>
                )}

                <button type="submit" className="btn-neon btn-neon-primary text-sm" disabled={submitting || !payMethod}>
                  {submitting ? 'Submitting...' : 'Submit Withdrawal Request'}
                </button>
                  </>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Flash */}
        {msg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-medium animate-fade-in-up" style={{
            background: msg.type === 'error' ? 'rgba(255,45,120,0.12)' : 'rgba(0,255,136,0.12)',
            color: msg.type === 'error' ? '#ff5c8a' : '#00ff88',
            border: `1px solid ${msg.type === 'error' ? 'rgba(255,45,120,0.25)' : 'rgba(0,255,136,0.25)'}`,
          }}>{msg.text}</div>
        )}

        {/* ── Transaction History ── */}
        <div>
          <h2 className="text-base font-bold mb-3" style={{ color: 'var(--text-primary)' }}>Transaction History</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderColor: 'rgba(0,229,255,0.3)', borderTopColor: 'transparent' }} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <span style={{ fontSize: 40, display: 'block', marginBottom: 8 }}>📭</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No transactions yet. Play games and earn rewards!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {transactions.map((txn) => {
                const cfg = typeConfig[txn.type] || typeConfig.credit;
                const sc = statusColors[txn.status] || statusColors.completed;
                return (
                  <div key={txn._id} className="glass-card px-4 py-3 flex items-center gap-3">
                    <span style={{ fontSize: 22 }}>{cfg.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{txn.description || cfg.label}</span>
                        {txn.game && <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,229,255,0.08)', color: 'var(--neon-cyan)' }}>{txn.game}</span>}
                        {txn.status !== 'completed' && (
                          <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded" style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>{txn.status}</span>
                        )}
                      </div>
                      <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                        {new Date(txn.createdAt).toLocaleDateString(undefined, { dateStyle: 'medium' })} · {new Date(txn.createdAt).toLocaleTimeString(undefined, { timeStyle: 'short' })}
                        {txn.createdBy?.name && <span> · by {txn.createdBy.name}</span>}
                      </p>
                    </div>
                    <span className="text-base font-bold whitespace-nowrap" style={{ color: txn.status === 'rejected' ? '#ffd93d' : cfg.color }}>
                      {cfg.sign}PKR {txn.amount.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showTopUp && (
        <TopUpModal
          onClose={() => setShowTopUp(false)}
          onSuccess={(amt) => {
            setShowTopUp(false);
            fetchBalance();
            flash(`PKR ${amt.toLocaleString()} added to your wallet!`);
          }}
        />
      )}
    </div>
  );
}
