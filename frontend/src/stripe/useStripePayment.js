import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';
import { useAuth } from '@/context/AuthContext';

/**
 * useStripePayment — handles the full Stripe top-up flow:
 *  1. Creates a PaymentIntent on the backend
 *  2. Confirms the card payment via Stripe
 *  3. Verifies with backend and credits the wallet
 *
 * Must be used inside a component wrapped by <Elements>.
 */
export function useStripePayment() {
  const stripe = useStripe();
  const elements = useElements();
  const { authFetch } = useAuth();

  /**
   * @param {number} amountPKR - amount in PKR (e.g. 500)
   * @param {string} cardName  - cardholder name
   * @returns {{ balance: number, amount: number }} updated wallet info
   */
  const pay = async (amountPKR, cardName) => {
    if (!stripe || !elements) {
      throw new Error('Stripe is not loaded yet. Please try again.');
    }

    // Step 1: Create PaymentIntent on backend
    const intentData = await authFetch('/stripe/topup', {
      method: 'POST',
      body: JSON.stringify({ amount: amountPKR }),
    });

    if (!intentData?.clientSecret) {
      throw new Error(intentData?.message || 'Failed to initialize payment');
    }

    // Step 2: Confirm card payment via Stripe
    const cardElement = elements.getElement(CardElement);
    const { error, paymentIntent } = await stripe.confirmCardPayment(
      intentData.clientSecret,
      {
        payment_method: {
          card: cardElement,
          billing_details: { name: cardName },
        },
      }
    );

    if (error) {
      throw new Error(error.message);
    }

    // Step 3: Verify with backend, credit wallet
    const creditData = await authFetch('/stripe/verify', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId: paymentIntent.id }),
    });

    if (!creditData?.success) {
      throw new Error(creditData?.message || 'Failed to credit wallet');
    }

    return creditData;
  };

  return { pay, stripeReady: !!(stripe && elements) };
}
