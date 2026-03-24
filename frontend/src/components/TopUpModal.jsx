'use client';

import { useState, useEffect } from 'react';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from '@/stripe/stripeLoader';
import { useAuth } from '@/context/AuthContext';

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      color: '#fff',
      fontFamily: 'inherit',
      fontSize: '15px',
      fontWeight: '600',
      '::placeholder': { color: 'var(--text-muted)' },
      iconColor: '#00e5ff',
    },
    invalid: { color: '#ff5c8a', iconColor: '#ff5c8a' },
  },
  hidePostalCode: true,
  disableLink: true,
};

const brandIcons = {
  visa: '\uD83C\uDFE6',
  mastercard: '\uD83D\uDFE0',
  amex: '\uD83D\uDFE6',
};

function CardBrandBadge({ brand }) {
  const label = brand.charAt(0).toUpperCase() + brand.slice(1);
  const colors = {
    visa: '#1a1f71',
    mastercard: '#eb001b',
    amex: '#006fcf',
  };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px',
      color: '#fff', background: colors[brand] || 'rgba(255,255,255,0.15)',
    }}>
      {label}
    </span>
  );
}

/* Inner form component (must be inside <Elements>) */
function TopUpForm({ onClose, onSuccess, neededAmount, color, finalAmount, setFinalAmount }) {
  const stripe = useStripe();
  const elements = useElements();
  const { authFetch, fetchBalance } = useAuth();

  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState(() => {
    if (neededAmount > 0) {
      const preset = PRESET_AMOUNTS.find(p => p >= neededAmount);
      return preset ? String(preset) : String(Math.ceil(neededAmount));
    }
    return '500';
  });
  const [customAmount, setCustomAmount] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [cardName, setCardName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [cardComplete, setCardComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(false);

  // Saved cards state
  const [savedCards, setSavedCards] = useState([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [selectedCard, setSelectedCard] = useState(null); // null = new card
  const [deletingCard, setDeletingCard] = useState(null);

  const computedAmount = useCustom ? Number(customAmount) : Number(amount);

  useEffect(() => {
    setFinalAmount(computedAmount);
  }, [computedAmount, setFinalAmount]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Fetch saved cards on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await authFetch('/stripe/saved-cards');
        setSavedCards(data.cards || []);
        if (data.cards?.length > 0) setSelectedCard(data.cards[0].id);
      } catch { /* ignore */ }
      setLoadingCards(false);
    })();
  }, [authFetch]);

  const handleAmountNext = () => {
    if (!computedAmount || computedAmount < 50) { setError('Minimum top-up is PKR 50'); return; }
    setError('');
    setStep(2);
  };

  const handleDeleteCard = async (cardId) => {
    setDeletingCard(cardId);
    try {
      await authFetch(`/stripe/saved-cards/${cardId}`, { method: 'DELETE' });
      setSavedCards(prev => prev.filter(c => c.id !== cardId));
      if (selectedCard === cardId) setSelectedCard(null);
    } catch { /* ignore */ }
    setDeletingCard(null);
  };

  // Pay with saved card
  const handlePaySaved = async () => {
    if (!selectedCard) return;
    setError('');
    setProcessing(true);
    try {
      const intentData = await authFetch('/stripe/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: computedAmount, paymentMethodId: selectedCard }),
      });

      // If requires_action (3D Secure), handle it
      if (intentData.status === 'requires_action' && intentData.clientSecret) {
        const { error: confirmErr, paymentIntent } = await stripe.confirmCardPayment(intentData.clientSecret);
        if (confirmErr) throw new Error(confirmErr.message);
        // Verify with backend
        const creditData = await authFetch('/stripe/verify', {
          method: 'POST',
          body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
        });
        if (!creditData?.success) throw new Error(creditData?.message || 'Failed to credit wallet');
      } else if (intentData.status === 'succeeded') {
        // Already succeeded, verify
        const creditData = await authFetch('/stripe/verify', {
          method: 'POST',
          body: JSON.stringify({ paymentIntentId: intentData.paymentIntentId }),
        });
        if (!creditData?.success) throw new Error(creditData?.message || 'Failed to credit wallet');
      } else {
        throw new Error('Unexpected payment status');
      }

      await fetchBalance();
      setProcessing(false);
      setStep(3);
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'Payment failed. Please try again.');
    }
  };

  // Pay with new card
  const handlePayNew = async () => {
    if (!stripe || !elements) { setError('Stripe is still loading.'); return; }
    if (!cardName.trim()) { setError('Enter cardholder name'); return; }
    if (!cardComplete) { setError('Please complete your card details'); return; }
    setError('');
    setProcessing(true);

    try {
      const intentData = await authFetch('/stripe/topup', {
        method: 'POST',
        body: JSON.stringify({ amount: computedAmount, saveCard }),
      });

      if (!intentData?.clientSecret) {
        throw new Error(intentData?.message || 'Failed to initialize payment');
      }

      const cardElement = elements.getElement(CardElement);
      const { error: stripeError, paymentIntent } = await stripe.confirmCardPayment(
        intentData.clientSecret,
        {
          payment_method: {
            card: cardElement,
            billing_details: { name: cardName },
          },
        }
      );

      if (stripeError) throw new Error(stripeError.message);

      const creditData = await authFetch('/stripe/verify', {
        method: 'POST',
        body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
      });

      if (!creditData?.success) throw new Error(creditData?.message || 'Failed to credit wallet');

      await fetchBalance();
      setProcessing(false);
      setStep(3);
    } catch (err) {
      setProcessing(false);
      setError(err.message || 'Payment failed. Please try again.');
    }
  };

  return (
    <div style={{ padding: '20px 24px 24px' }}>

      {/* STEP 1: Amount */}
      {step === 1 && (
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#fff' }}>Add Funds</h2>
          <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)' }}>
            Choose how much to add to your wallet
          </p>

          {neededAmount > 0 && (
            <div style={{
              padding: '10px 14px', marginBottom: 16, borderRadius: 12,
              background: 'rgba(255,45,120,0.07)', border: '1px solid rgba(255,45,120,0.15)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 14 }}>&#x26A0;&#xFE0F;</span>
              <p style={{ margin: 0, fontSize: 12, color: '#ff8ab3', fontWeight: 600 }}>
                You need at least PKR {neededAmount.toLocaleString()} to play
              </p>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {PRESET_AMOUNTS.map(p => {
              const isSelected = !useCustom && String(p) === amount;
              const isEnough = p >= neededAmount;
              return (
                <button key={p} onClick={() => { setAmount(String(p)); setUseCustom(false); setError(''); }}
                  style={{
                    padding: '12px 6px', borderRadius: 12, cursor: 'pointer',
                    background: isSelected ? `linear-gradient(135deg, ${color}20, rgba(168,85,247,0.15))` : 'var(--subtle-overlay)',
                    border: `1px solid ${isSelected ? color : 'var(--subtle-border)'}`,
                    color: isSelected ? color : 'rgba(255,255,255,0.75)',
                    fontWeight: 700, fontSize: 14,
                    boxShadow: isSelected ? `0 0 15px ${color}20` : 'none',
                    transition: 'all 0.2s', position: 'relative',
                  }}
                >
                  {isEnough && neededAmount > 0 && (
                    <span style={{ position: 'absolute', top: -5, right: -5, fontSize: 10, background: '#00ff88', borderRadius: 20, padding: '1px 5px', color: '#000', fontWeight: 800 }}>&#x2713;</span>
                  )}
                  PKR {p.toLocaleString()}
                </button>
              );
            })}
          </div>

          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setUseCustom(true)}
              style={{
                width: '100%', padding: '11px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                background: useCustom ? 'rgba(0,229,255,0.05)' : 'var(--subtle-overlay)',
                border: `1px solid ${useCustom ? color : 'var(--subtle-border)'}`,
                color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
              <span style={{ fontSize: 14 }}>&#x270F;&#xFE0F;</span> Custom amount
            </button>
            {useCustom && (
              <input
                type="number"
                placeholder="Enter amount in PKR"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                min="50"
                autoFocus
                style={{
                  marginTop: 8, width: '100%', padding: '11px 14px', borderRadius: 10, boxSizing: 'border-box',
                  background: 'var(--input-bg)', border: '1px solid rgba(0,229,255,0.4)',
                  color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none',
                  boxShadow: '0 0 0 3px rgba(0,229,255,0.08)',
                }}
              />
            )}
          </div>

          {error && <p style={{ color: '#ff5c8a', fontSize: 12, fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}

          <button onClick={handleAmountNext} style={{
            width: '100%', padding: '14px 0', borderRadius: 14,
            background: `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
            border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            boxShadow: `0 4px 24px ${color}30`,
          }}>
            Continue &#x2014; PKR {(computedAmount || 0).toLocaleString()} &#x2192;
          </button>
        </div>
      )}

      {/* STEP 2: Payment */}
      {step === 2 && (
        <div>
          <button onClick={() => { setStep(1); setError(''); }}
            style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            &#x2190; Back
          </button>

          {/* Amount badge */}
          <div style={{
            textAlign: 'center', marginBottom: 20, padding: '14px 16px', borderRadius: 14,
            background: 'var(--subtle-overlay)', border: '1px solid var(--subtle-border)',
          }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
              Top-Up Amount
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 900, color: '#ffd93d', lineHeight: 1 }}>
              PKR {computedAmount.toLocaleString()}
            </p>
          </div>

          {/* Saved cards section */}
          {!loadingCards && savedCards.length > 0 && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Saved Cards
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {savedCards.map(card => {
                  const isActive = selectedCard === card.id;
                  return (
                    <div key={card.id}
                      onClick={() => setSelectedCard(card.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                        background: isActive ? `rgba(0,229,255,0.06)` : 'var(--subtle-overlay)',
                        border: `1.5px solid ${isActive ? color : 'var(--subtle-border)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Radio dot */}
                      <div style={{
                        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${isActive ? color : 'rgba(255,255,255,0.2)'}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
                      </div>

                      <CardBrandBadge brand={card.brand} />

                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'monospace', letterSpacing: '1px' }}>
                        &#x2022;&#x2022;&#x2022;&#x2022; {card.last4}
                      </span>

                      <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {String(card.expMonth).padStart(2, '0')}/{String(card.expYear).slice(-2)}
                      </span>

                      {/* Delete button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteCard(card.id); }}
                        disabled={deletingCard === card.id}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'rgba(255,255,255,0.2)', fontSize: 14, padding: '2px 4px',
                          transition: 'color 0.2s', flexShrink: 0,
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = '#ff5c8a'}
                        onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.2)'}
                        title="Remove card"
                      >
                        {deletingCard === card.id ? '...' : '&#x2715;'}
                      </button>
                    </div>
                  );
                })}

                {/* Use new card option */}
                <div
                  onClick={() => setSelectedCard(null)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 14px', borderRadius: 12, cursor: 'pointer',
                    background: selectedCard === null ? 'rgba(0,229,255,0.06)' : 'var(--subtle-overlay)',
                    border: `1.5px solid ${selectedCard === null ? color : 'var(--subtle-border)'}`,
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${selectedCard === null ? color : 'rgba(255,255,255,0.2)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {selectedCard === null && <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    + Use a new card
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Saved card quick-pay */}
          {selectedCard && (
            <>
              {error && <p style={{ color: '#ff5c8a', fontSize: 12, fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}

              <button onClick={handlePaySaved} disabled={processing} style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: processing ? 'var(--subtle-border)' : `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: processing ? 'wait' : 'pointer',
                boxShadow: processing ? 'none' : `0 4px 24px ${color}30`,
                transition: 'all 0.2s', opacity: processing ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 12,
              }}>
                {processing ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Processing...
                  </>
                ) : (
                  <>&#x26A1; Pay PKR {computedAmount.toLocaleString()}</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>&#x1F512;</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Secured by</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(99,91,255,0.8)', letterSpacing: '0.5px' }}>Stripe</span>
              </div>
            </>
          )}

          {/* New card form */}
          {selectedCard === null && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>
                  Cardholder Name
                </label>
                <input
                  type="text"
                  value={cardName}
                  onChange={e => setCardName(e.target.value.toUpperCase())}
                  placeholder="YOUR NAME"
                  maxLength={26}
                  style={{
                    width: '100%', padding: '12px 14px', borderRadius: 10, boxSizing: 'border-box',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--subtle-border)',
                    color: '#fff', fontSize: 14, fontWeight: 600, outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  autoComplete="off"
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 5 }}>
                  Card Details
                </label>
                <div style={{
                  padding: '14px 14px', borderRadius: 10,
                  background: 'var(--input-bg)',
                  border: '1px solid var(--subtle-border)',
                  transition: 'border-color 0.2s',
                }}>
                  <CardElement
                    options={CARD_ELEMENT_OPTIONS}
                    onChange={(e) => {
                      setCardComplete(e.complete);
                      if (e.error) setError(e.error.message);
                      else setError('');
                    }}
                  />
                </div>
              </div>

              {/* Save card checkbox */}
              <label style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 16, cursor: 'pointer', userSelect: 'none',
              }}>
                <div
                  onClick={() => setSaveCard(!saveCard)}
                  style={{
                    width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                    background: saveCard ? color : 'var(--subtle-border)',
                    border: `1.5px solid ${saveCard ? color : 'rgba(255,255,255,0.15)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s', cursor: 'pointer',
                  }}
                >
                  {saveCard && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900, lineHeight: 1 }}>&#x2713;</span>}
                </div>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Save this card for future payments
                </span>
              </label>

              {error && <p style={{ color: '#ff5c8a', fontSize: 12, fontWeight: 600, margin: '0 0 12px', textAlign: 'center' }}>{error}</p>}

              <button onClick={handlePayNew} disabled={processing} style={{
                width: '100%', padding: '14px 0', borderRadius: 14,
                background: processing ? 'var(--subtle-border)' : `linear-gradient(135deg, ${color} 0%, #a855f7 100%)`,
                border: 'none', color: '#fff', fontWeight: 800, fontSize: 15, cursor: processing ? 'wait' : 'pointer',
                boxShadow: processing ? 'none' : `0 4px 24px ${color}30`,
                transition: 'all 0.2s', opacity: processing ? 0.6 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                marginBottom: 12,
              }}>
                {processing ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                    Processing...
                  </>
                ) : (
                  <>&#x1F512; Pay PKR {computedAmount.toLocaleString()}</>
                )}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 11 }}>&#x1F512;</span>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>Secured by</span>
                <span style={{ fontSize: 11, fontWeight: 900, color: 'rgba(99,91,255,0.8)', letterSpacing: '0.5px' }}>Stripe</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* STEP 3: Success */}
      {step === 3 && (
        <div style={{ textAlign: 'center', padding: '10px 0 8px' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #00ff88, #00e5ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32,
            boxShadow: '0 0 40px rgba(0,255,136,0.4), 0 0 80px rgba(0,255,136,0.15)',
            animation: 'successPop 0.5s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            &#x2713;
          </div>
          <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 900, color: '#fff' }}>
            PKR {computedAmount.toLocaleString()} Added!
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 13, color: 'var(--text-muted)' }}>
            Your wallet has been topped up successfully.
          </p>
          <button onClick={() => { if (onSuccess) onSuccess(computedAmount); onClose(); }} style={{
            width: '100%', padding: '13px 0', borderRadius: 14,
            background: 'linear-gradient(135deg, #00ff88, #00e5ff)',
            border: 'none', color: '#000', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 24px rgba(0,255,136,0.3)',
          }}>
            Done &#x2014; Let's Play! &#x1F3AE;
          </button>
        </div>
      )}
    </div>
  );
}

/* Main Component (wraps inner form with Stripe Elements) */
export default function TopUpModal({ onClose, onSuccess, neededAmount = 0, color = '#00e5ff' }) {
  const [finalAmount, setFinalAmount] = useState(0);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 20000,
        background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: '100%', maxWidth: 400, position: 'relative',
        background: 'linear-gradient(145deg, #0e0e24 0%, #12103a 60%, #0e0e24 100%)',
        border: '1px solid var(--subtle-border)',
        borderRadius: 24, overflow: 'hidden',
        animation: 'topUpSlideUp 0.3s cubic-bezier(0.34,1.4,0.64,1)',
        boxShadow: '0 30px 100px rgba(0,0,0,0.7), 0 0 60px rgba(0,229,255,0.06)',
        maxHeight: '95vh', overflowY: 'auto',
      }}>
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, #a855f7, transparent)` }} />

        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--subtle-border)',
          border: '1px solid var(--subtle-border)',
          color: 'var(--text-secondary)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, zIndex: 2, transition: 'all 0.2s',
        }}>&#x2715;</button>

        <Elements stripe={stripePromise}>
          <TopUpForm
            onClose={onClose}
            onSuccess={onSuccess}
            neededAmount={neededAmount}
            color={color}
            finalAmount={finalAmount}
            setFinalAmount={setFinalAmount}
          />
        </Elements>
      </div>

      <style>{`
        @keyframes topUpSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes successPop {
          from { transform: scale(0.5); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
