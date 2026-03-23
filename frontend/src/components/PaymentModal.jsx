'use client';

import { useState } from 'react';

export default function PaymentModal({ game, onClose, onSuccess }) {
  const [tab, setTab] = useState('card'); // 'card' | 'points'
  const [processing, setProcessing] = useState(false);
  const [cardNum, setCardNum] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [pointsCode, setPointsCode] = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    setProcessing(true);
    // Simulate payment delay
    await new Promise(r => setTimeout(r, 1500));
    setProcessing(false);
    onSuccess();
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', borderRadius: 10,
    fontSize: 14, color: '#fff',
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.12)',
    outline: 'none',
  };

  const tabStyle = (active) => ({
    flex: 1, padding: '10px 0', borderRadius: 10,
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 'none', transition: 'all 0.2s',
    background: active ? 'rgba(0,229,255,0.12)' : 'transparent',
    color: active ? '#00e5ff' : 'rgba(255,255,255,0.4)',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      padding: 16,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        width: '100%', maxWidth: 420, borderRadius: 20,
        background: '#0e0e28', border: '1px solid rgba(0,229,255,0.15)',
        boxShadow: '0 0 60px rgba(0,229,255,0.08)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff', margin: 0 }}>Unlock Game</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: '6px 0 0' }}>
            {game.name} — <span style={{ color: '#ffd93d', fontWeight: 700 }}>PKR {game.entryFee}</span>
          </p>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, padding: '12px 24px 0' }}>
          <button style={tabStyle(tab === 'card')} onClick={() => setTab('card')}>💳 Card Payment</button>
          <button style={tabStyle(tab === 'points')} onClick={() => setTab('points')}>⭐ Redeem Points</button>
        </div>

        <form onSubmit={handlePay} style={{ padding: '16px 24px 24px' }}>
          {tab === 'card' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>CARD NUMBER</label>
                <input style={inputStyle} placeholder="4242 4242 4242 4242" value={cardNum} onChange={e => setCardNum(e.target.value)} maxLength={19} required />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>EXPIRY</label>
                  <input style={inputStyle} placeholder="MM/YY" value={expiry} onChange={e => setExpiry(e.target.value)} maxLength={5} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>CVV</label>
                  <input style={inputStyle} placeholder="123" value={cvv} onChange={e => setCvv(e.target.value)} maxLength={4} type="password" required />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>
                Enter your points redemption code to unlock this game.
              </p>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>REDEMPTION CODE</label>
                <input style={inputStyle} placeholder="XXXX-XXXX-XXXX" value={pointsCode} onChange={e => setPointsCode(e.target.value)} required />
              </div>
            </div>
          )}

          <button type="submit" disabled={processing} style={{
            width: '100%', marginTop: 18, padding: '14px 24px', borderRadius: 12,
            fontSize: 15, fontWeight: 800, color: '#fff', cursor: processing ? 'wait' : 'pointer',
            background: processing ? 'rgba(0,229,255,0.15)' : 'linear-gradient(135deg, #00e5ff 0%, #a855f7 100%)',
            border: 'none', boxShadow: '0 0 20px rgba(0,229,255,0.2)',
            transition: 'all 0.2s', opacity: processing ? 0.7 : 1,
          }}>
            {processing ? 'Processing...' : tab === 'card' ? `Pay PKR ${game.entryFee}` : 'Redeem & Unlock'}
          </button>

          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', textAlign: 'center', marginTop: 10 }}>
            🔒 This is a demo payment. No real charges will be made.
          </p>
        </form>
      </div>
    </div>
  );
}
