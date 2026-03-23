'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function AttemptCostModal({
  attemptCost, walletBalance, gameName, color = '#00e5ff',
  onPay, onClose,
}) {
  const [paying, setPaying] = useState(false);
  const canAfford = walletBalance >= attemptCost;

  const handlePay = async () => {
    setPaying(true);
    try { await onPay(); }
    catch { setPaying(false); }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }}>
      <div style={{
        width: '100%', maxWidth: 400, position: 'relative',
        background: 'linear-gradient(145deg, #14142e 0%, #1c1050 50%, #14142e 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 22, overflow: 'hidden',
        animation: 'attemptSlideUp 0.3s ease-out',
        boxShadow: `0 20px 60px rgba(0,0,0,0.5), 0 0 40px ${color}08`,
      }}>
        {/* Accent line */}
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, #a855f7, transparent)` }} />

        {/* Header */}
        <div style={{ padding: '24px 24px 16px', textAlign: 'center' }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 12px', borderRadius: 16,
            background: `linear-gradient(135deg, ${color}20, rgba(168,85,247,0.12))`,
            border: `1px solid ${color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            🎯
          </div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#fff' }}>
            Play This Attempt?
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{gameName}</p>
        </div>

        {/* Body */}
        <div style={{ padding: '0 24px 24px' }}>
          {/* Cost card */}
          <div style={{
            textAlign: 'center', padding: '14px 14px', marginBottom: 14,
            background: 'rgba(255,255,255,0.025)', borderRadius: 14,
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Attempt Cost
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 30, fontWeight: 900, color: '#ffd93d', lineHeight: 1 }}>
              PKR {Number(attemptCost).toLocaleString()}
            </p>
          </div>

          {/* Wallet row */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderRadius: 11,
            background: canAfford ? 'rgba(0,255,136,0.04)' : 'rgba(255,45,120,0.04)',
            border: `1px solid ${canAfford ? 'rgba(0,255,136,0.12)' : 'rgba(255,45,120,0.12)'}`,
            marginBottom: 16,
          }}>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: 600 }}>💰 Wallet</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: canAfford ? '#00ff88' : '#ff5c8a' }}>
              PKR {Number(walletBalance).toLocaleString()}
            </span>
          </div>

          {canAfford ? (
            <>
              <p style={{
                margin: '0 0 16px', fontSize: 12.5, color: 'rgba(255,255,255,0.45)',
                textAlign: 'center', lineHeight: 1.6,
              }}>
                <strong style={{ color: '#ffd93d' }}>PKR {Number(attemptCost).toLocaleString()}</strong> will be
                deducted for this attempt. Score well to earn it back and more!
              </p>

              <button
                onClick={handlePay}
                disabled={paying}
                style={{
                  width: '100%', padding: '14px 0', borderRadius: 13,
                  fontSize: 14, fontWeight: 800, color: '#fff', cursor: paying ? 'wait' : 'pointer',
                  background: paying
                    ? 'rgba(255,255,255,0.08)'
                    : `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                  border: 'none',
                  boxShadow: paying ? 'none' : `0 4px 20px ${color}30`,
                  transition: 'all 0.25s', opacity: paying ? 0.6 : 1,
                  marginBottom: 8,
                }}
              >
                {paying ? '⏳ Processing...' : `⚡ Pay & Play — PKR ${Number(attemptCost).toLocaleString()}`}
              </button>
            </>
          ) : (
            <>
              <div style={{
                padding: '12px 14px', marginBottom: 16, borderRadius: 11,
                background: 'rgba(255,45,120,0.04)', border: '1px solid rgba(255,45,120,0.1)',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: 12.5, color: '#ff5c8a', fontWeight: 700, marginBottom: 3 }}>
                  You need PKR {Number(attemptCost - walletBalance).toLocaleString()} more
                </p>
                <p style={{ margin: 0, fontSize: 11.5, color: 'rgba(255,255,255,0.35)' }}>
                  Top up your wallet to play this attempt.
                </p>
              </div>

              <Link href="/wallet" style={{
                display: 'block', width: '100%', padding: '14px 0', borderRadius: 13,
                fontSize: 14, fontWeight: 800, color: '#fff', textAlign: 'center', textDecoration: 'none',
                background: `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                border: 'none', boxShadow: `0 4px 20px ${color}30`,
                marginBottom: 8,
              }}>
                💳 Top Up Wallet
              </Link>
            </>
          )}

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 13,
              fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
              transition: 'all 0.2s',
            }}
          >
            ← Cancel
          </button>
        </div>
      </div>

      <style>{`
        @keyframes attemptSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
