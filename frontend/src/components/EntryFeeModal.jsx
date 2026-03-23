'use client';

import { useState } from 'react';
import Link from 'next/link';
import TopUpModal from '@/components/TopUpModal';

export default function EntryFeeModal({
  entryFee, walletBalance, gameName, color = '#00e5ff',
  onPay, periodTimeLeft, backHref = '/games',
}) {
  const [paying, setPaying] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const canAfford = walletBalance >= entryFee;

  const handlePay = async () => {
    setPaying(true);
    try { await onPay(); }
    catch { setPaying(false); }
  };

  /* Format period countdown */
  const timeStr = periodTimeLeft
    ? [
        periodTimeLeft.d > 0 && `${periodTimeLeft.d}d`,
        periodTimeLeft.h > 0 && `${periodTimeLeft.h}h`,
        `${periodTimeLeft.m}m`,
        `${periodTimeLeft.s}s`,
      ].filter(Boolean).join(' ')
    : null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'radial-gradient(ellipse at 50% 0%, #1a1045 0%, #0b0b1a 70%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, overflow: 'auto',
    }}>
      {/* Decorative glow */}
      <div style={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)',
        width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none',
        background: `radial-gradient(circle, ${color}12 0%, transparent 70%)`,
      }} />

      <div style={{
        width: '100%', maxWidth: 440, position: 'relative',
        background: 'linear-gradient(145deg, #14142e 0%, #1c1050 50%, #14142e 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, overflow: 'hidden',
        animation: 'entrySlideUp 0.35s ease-out',
        boxShadow: `0 24px 80px rgba(0,0,0,0.6), 0 0 60px ${color}10`,
      }}>
        {/* Glowing top border */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, #a855f7, transparent)` }} />

        {/* Header */}
        <div style={{
          padding: '28px 28px 20px', textAlign: 'center',
          background: `linear-gradient(180deg, ${color}10, transparent)`,
        }}>
          <div style={{
            width: 64, height: 64, margin: '0 auto 14px', borderRadius: 20,
            background: `linear-gradient(135deg, ${color}25, rgba(168,85,247,0.15))`,
            border: `1px solid ${color}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, filter: `drop-shadow(0 0 16px ${color}60)`,
          }}>
            🎮
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>
            Ready to Compete?
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{gameName}</p>
        </div>

        {/* Body */}
        <div style={{ padding: '4px 28px 28px' }}>

          {/* Entry fee card */}
          <div style={{
            textAlign: 'center', padding: '18px 16px', marginBottom: 16,
            background: 'rgba(255,255,255,0.025)', borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.06)',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', inset: 0, opacity: 0.04,
              background: `radial-gradient(circle at 50% 100%, ${color}, transparent 70%)`,
            }} />
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Contest Entry Fee
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 36, fontWeight: 900, color: '#ffd93d', lineHeight: 1 }}>
              PKR {Number(entryFee).toLocaleString()}
            </p>
          </div>

          {/* Session timer */}
          {timeStr && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '10px 14px', marginBottom: 14, borderRadius: 12,
              background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.12)',
            }}>
              <span style={{ fontSize: 14 }}>⏱️</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Session ends in</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: '#c084fc', fontVariantNumeric: 'tabular-nums' }}>{timeStr}</span>
            </div>
          )}

          {/* Wallet row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '11px 16px', borderRadius: 12,
            background: canAfford ? 'rgba(0,255,136,0.04)' : 'rgba(255,45,120,0.04)',
            border: `1px solid ${canAfford ? 'rgba(0,255,136,0.12)' : 'rgba(255,45,120,0.12)'}`,
            marginBottom: 20,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>💰 Wallet Balance</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: canAfford ? '#00ff88' : '#ff5c8a' }}>
              PKR {Number(walletBalance).toLocaleString()}
            </span>
          </div>

          {canAfford ? (
            <>
              {/* Description */}
              <div style={{
                padding: '14px 16px', marginBottom: 20, borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7, textAlign: 'center' }}>
                  <strong style={{ color: '#ffd93d' }}>PKR {Number(entryFee).toLocaleString()}</strong> will be deducted
                  from your wallet. Once paid, enjoy <strong style={{ color: '#fff' }}>unlimited plays</strong> for the
                  entire session — no extra charges, compete as many times as you like!
                </p>
              </div>

              <button
                onClick={handlePay}
                disabled={paying}
                style={{
                  width: '100%', padding: '15px 0', borderRadius: 14,
                  fontSize: 15, fontWeight: 800, color: '#fff', cursor: paying ? 'wait' : 'pointer',
                  background: paying
                    ? 'rgba(255,255,255,0.08)'
                    : `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                  border: 'none',
                  boxShadow: paying ? 'none' : `0 4px 24px ${color}35, 0 0 40px ${color}15`,
                  transition: 'all 0.25s', opacity: paying ? 0.6 : 1,
                  marginBottom: 10, letterSpacing: '0.2px',
                }}
              >
                {paying ? '⏳ Processing...' : `⚡ Pay & Enter — PKR ${Number(entryFee).toLocaleString()}`}
              </button>
            </>
          ) : (
            <>
              <div style={{
                padding: '14px 16px', marginBottom: 20, borderRadius: 12,
                background: 'rgba(255,45,120,0.04)', border: '1px solid rgba(255,45,120,0.1)',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: 13, color: '#ff5c8a', fontWeight: 700, marginBottom: 4 }}>
                  You need PKR {Number(entryFee - walletBalance).toLocaleString()} more to enter
                </p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.5 }}>
                  Top up your wallet to join this contest and start competing!
                </p>
              </div>

              <button onClick={() => setShowTopUp(true)} style={{
                display: 'block', width: '100%', padding: '15px 0', borderRadius: 14,
                fontSize: 15, fontWeight: 800, color: '#fff', textAlign: 'center', textDecoration: 'none',
                background: `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                border: 'none',
                boxShadow: `0 4px 24px ${color}35, 0 0 40px ${color}15`,
                marginBottom: 10, cursor: 'pointer',
              }}>
                💳 Add Funds to Enter
              </button>
            </>
          )}

          <Link
            href={backHref}
            style={{
              display: 'block', width: '100%', padding: '13px 0', borderRadius: 14,
              fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.45)', cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s', textAlign: 'center', textDecoration: 'none',
            }}
          >
            ← Back to Games
          </Link>
        </div>
      </div>

      {showTopUp && (
        <TopUpModal
          color={color}
          neededAmount={Math.max(0, entryFee - walletBalance)}
          onClose={() => setShowTopUp(false)}
          onSuccess={() => setShowTopUp(false)}
        />
      )}
    </div>
  );
}
