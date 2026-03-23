'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import TopUpModal from '@/components/TopUpModal';

const GAMES_BASE = process.env.NEXT_PUBLIC_GAMES_BASE_URL || '/games';

export default function GameInstructions({ game, onStart, attemptCost = 0, walletBalance = 0, onPayAndPlay, onBalanceAdded }) {
  const [paying, setPaying] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const instructions = game.instructions || [];
  const color = game.color || '#00e5ff';
  const thumbSrc = game.thumbnail ? `${GAMES_BASE}/${game.gamePath}/${game.thumbnail}` : null;
  const isPaid = attemptCost > 0 && !!onPayAndPlay;
  const canAfford = walletBalance >= attemptCost;

  const handlePayClick = async () => {
    setPaying(true);
    try { await onPayAndPlay(); }
    catch { setPaying(false); }
  };

  return (
    <>
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#0b0b1a', display: 'flex', flexDirection: 'column' }}>
      {/* Background image */}
      {thumbSrc && (
        <Image src={thumbSrc} alt="" fill className="object-cover" style={{ opacity: 0.18 }} priority />
      )}

      {/* Glow accents */}
      <div style={{ position: 'absolute', width: 260, height: 260, borderRadius: '50%', background: `radial-gradient(circle, ${color}20, transparent 70%)`, top: '-60px', right: '-40px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.10), transparent 70%)', bottom: '10%', left: '-30px', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '14px 20px 16px', WebkitOverflowScrolling: 'touch' }}>
        {/* Back */}
        <div style={{ width: '100%', maxWidth: 480, marginBottom: 10 }}>
          <Link href="/games" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', transition: 'all 0.2s' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
            Back
          </Link>
        </div>

        {/* Title */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 38, display: 'block', marginBottom: 4, filter: `drop-shadow(0 0 18px ${color}80)` }}>🎮</span>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#fff', margin: '0 0 3px', textShadow: `0 0 20px ${color}50` }}>{game.name}</h1>
          {game.description && (
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', margin: 0, letterSpacing: '0.3px' }}>{game.description}</p>
          )}
        </div>

        {/* Instructions */}
        {instructions.length > 0 && (
          <div style={{ width: '100%', maxWidth: 500, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {instructions.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(6px)', animation: `fadeSlideIn 0.35s ease-out ${i * 0.07}s both` }}>
                <span style={{ fontSize: 26, lineHeight: 1, flexShrink: 0, filter: `drop-shadow(0 0 8px ${color}50)` }}>{item.icon}</span>
                <div>
                  <h3 style={{ fontSize: 14.5, fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>{item.title}</h3>
                  <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.5)', margin: 0, lineHeight: 1.4 }}>{item.text}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Attempt cost section (inline, no separate modal) ── */}
        {isPaid && (
          <div style={{
            width: '100%', maxWidth: 500, marginTop: 16,
            background: 'rgba(255,255,255,0.03)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Cost + Wallet row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>🎯</span>
                <div>
                  <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Per Attempt</p>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: '#ffd93d', lineHeight: 1.1 }}>PKR {Number(attemptCost).toLocaleString()}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Wallet</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: canAfford ? '#00ff88' : '#ff5c8a', lineHeight: 1.1 }}>
                  PKR {Number(walletBalance).toLocaleString()}
                </p>
              </div>
            </div>

            {!canAfford && (
              <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,45,120,0.06)', border: '1px solid rgba(255,45,120,0.12)', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#ff5c8a', fontWeight: 700 }}>
                  You need PKR {Number(attemptCost - walletBalance).toLocaleString()} more
                </p>
                <button onClick={() => setShowTopUp(true)} style={{ fontSize: 11, color: '#00e5ff', textDecoration: 'underline', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>Add funds now →</button>
              </div>
            )}
          </div>
        )}

        {/* Start / Pay & Play button */}
        {isPaid ? (
          canAfford ? (
            <button onClick={handlePayClick} disabled={paying} style={{
              marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', maxWidth: 500, padding: '15px 24px', borderRadius: 14,
              fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff',
              cursor: paying ? 'wait' : 'pointer',
              background: paying ? 'rgba(255,255,255,0.08)' : `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
              border: 'none', boxShadow: paying ? 'none' : `0 0 30px ${color}40, 0 4px 20px rgba(0,0,0,0.4)`,
              transition: 'transform 0.15s, box-shadow 0.2s', opacity: paying ? 0.6 : 1,
            }} onMouseEnter={e => { if (!paying) e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
              {paying ? '⏳ Processing...' : (<><span style={{ fontSize: 20 }}>⚡</span>{`Pay & Play — PKR ${Number(attemptCost).toLocaleString()}`}</>)}
            </button>
          ) : (
            <button onClick={() => setShowTopUp(true)} style={{
              marginTop: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              width: '100%', maxWidth: 500, padding: '15px 24px', borderRadius: 14,
              fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff',
              background: 'linear-gradient(135deg, #ff5c8a 0%, #a855f7 100%)',
              border: 'none', boxShadow: '0 0 30px rgba(255,92,138,0.3), 0 4px 20px rgba(0,0,0,0.4)',
              cursor: 'pointer',
            }}>
              <span style={{ fontSize: 20 }}>💳</span> Add Funds to Play
            </button>
          )
        ) : (
          <button onClick={onStart} style={{
            marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            width: '100%', maxWidth: 500, padding: '15px 24px', borderRadius: 14,
            fontSize: 17, fontWeight: 800, letterSpacing: '0.5px', color: '#fff', cursor: 'pointer',
            background: `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
            border: 'none', boxShadow: `0 0 30px ${color}40, 0 4px 20px rgba(0,0,0,0.4)`,
            transition: 'transform 0.15s, box-shadow 0.2s',
          }} onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; }} onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
            <span style={{ fontSize: 22 }}>▶</span>
            Start Game
          </button>
        )}

        <p style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', textAlign: 'center' }}>
          {isPaid ? 'Score well to earn it back and more!' : 'Best on mobile in portrait mode'}
        </p>
      </div>

      <style>{`
        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>

    {showTopUp && (
      <TopUpModal
        color={color}
        neededAmount={Math.max(0, attemptCost - walletBalance)}
        onClose={() => setShowTopUp(false)}
        onSuccess={(amt) => {
          setShowTopUp(false);
          if (onBalanceAdded) onBalanceAdded(amt);
        }}
      />
    )}
  </>
  );
}
